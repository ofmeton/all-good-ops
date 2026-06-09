/**
 * lib/check/run-check.ts — チェックAg(MA checker) 本体。
 *
 * compose が作る post_drafts(editor_status='pending', human_approval_status='pending')
 * を、MA チェッカーAg が **重複＋ファクト（嘘フィルタ）** で点検し、人間承認(LINE)に回す。
 * MA 駆動は lib/ma/run-session.ts。出力契約は lib/check/check-prompts.ts の submit_check。
 *
 * flag → 差し戻し再生成（上限つき）:
 *   - factcheck=suspicious（明らかな嘘/変な数字）または duplicate=similar（重複）で **引っかかったら差し戻す**:
 *     draft を editor_status='rejected'（CAS）にし、core_idea.source_material_ids の素材を再 queue
 *     （composed_at/claim=null・compose_attempts++・last_check_flags=flags）→ compose が再生成。pushApproval しない。
 *   - 再生成回数（素材 meta.compose_attempts の最大）が cfg.maxRedoAttempts 以上なら **差し戻さず**
 *     approved+flags+pushApproval（人間へ）。outcome=flagged_max_retry。これでループは必ず停止する。
 *   - factcheck=unverifiable（調べても不明）/ ok は従来どおり approved+（flags）+pushApproval（人間が最終ゲート）。
 * 冪等: editor_status='pending' のみ拾う＝処理済(approved/rejected)は再処理されない。approve/reject とも
 *   CAS（.eq("editor_status","pending")）で並行二重処理を防ぐ。
 * 失敗（res.ok false / stub / submit 未呼び出し / update 失敗）: editor_status は pending
 *   据置（再点検可）・errorCount++。stub は本番設定ミスなので必ず弾く（draft 化しない）。
 * 観測: run_trace.output に perDraft 計測を返す（flag 率/重複率/差し戻し率の計測基盤）。
 * DDL なし（editor_status 既存 enum の rejected + materials_store.meta jsonb で完結）。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TraceMeta } from "../trace/types.js";
import type { EditorOutput } from "../editor/types.js";
import { runMaSession } from "../ma/run-session.js";
import { getAgentRef as getAgentRefDefault, type AgentRef } from "../ma/agent-registry.js";
import { fetchRecentPostBodies } from "../editor/db.js";
import { CHECK_CONFIG, type CheckConfig } from "./check-config.js";
import { costUsdFor, costJpyFor } from "../cost/cost-of.js";
import { insertSessionEvents, recordRunSession } from "../trace/session-event-store.js";
import type { SessionEventInput } from "../trace/types.js";
import type { Env } from "../../src/worker.js";

/** 永続 checker agent の registry key（ma_agents.agent_key / x-checker.agent.yaml と一致）。 */
const CHECKER_AGENT_KEY = "x-checker";

/** pushApproval の最小シグネチャ（post-job.ts:290 と互換）。注入 or 既定 import。 */
type PushApprovalFn = (
  env: Env,
  dbDraftId: string,
  body: string,
  out: EditorOutput,
  fmat: string,
) => Promise<void>;

export interface RunCheckDeps {
  env: Env;
  sb: SupabaseClient;
  apiKey?: string;
  config?: CheckConfig;
  runId?: string;
  now?: () => number;
  onTrace?: (m: TraceMeta) => void;
  /** テスト注入用（既定 runMaSession）。実 API を叩かずに wiring を検証する。 */
  runSession?: typeof runMaSession;
  /** テスト注入用（既定 agent-registry.getAgentRef）。実 DB を叩かずに永続参照を解決する。 */
  getAgentRef?: (sb: SupabaseClient, key: string) => Promise<AgentRef>;
  /** テスト注入用（既定 post-job の pushApproval を遅延 import）。 */
  pushApproval?: PushApprovalFn;
  /** テスト注入用（既定 fetchRecentPostBodies）。重複比較用の直近本文取得。 */
  fetchRecent?: typeof fetchRecentPostBodies;
  logger?: { warn: (m: string) => void; info?: (m: string) => void };
}

export interface CheckPerDraft {
  draftId: string;
  verdict?: "ok" | "flag";
  risk_level?: "low" | "high";
  duplicate?: "ok" | "similar";
  factcheck?: "ok" | "suspicious" | "unverifiable";
  /** 主張・数字が元ネタツイート由来か（checker の含有判定。観測用）。 */
  source_grounded?: boolean;
  flagCount?: number;
  /** 差し戻し/上限到達時の再生成回数（素材 meta.compose_attempts の最大ベース）。 */
  attempts?: number;
  /**
   * 結果種別（trace に残す。console だけにしない）。
   * sent_back=差し戻し再生成へ、flagged_max_retry=上限到達で人間へ、
   * push_failed=承認済だがLINE未送(要手動回収)、raced=他ランが先取り。
   */
  outcome?:
    | "ok"
    | "sent_back"
    | "flagged_max_retry"
    | "stub"
    | "no_submit"
    | "update_failed"
    | "push_failed"
    | "raced"
    | "check_read_failed"
    | "requeue_failed"
    | MaFailTerminal;
  /** 永続 MA session の id（run_trace.output に載せ、後続 1B が checker↔draft を相関）。 */
  maSessionId?: string;
  stub?: boolean;
  error?: string;
}

type MaFailTerminal = "timeout" | "terminated" | "error" | "idle";

export interface CheckRunResult {
  checked: number;
  /** approved+pushApproval まで到達した件数（ok/unverifiable/flagged_max_retry）。 */
  approved: number;
  /** 差し戻し（draft rejected + 素材再 queue）した件数。queue が compose 再生成を連鎖 enqueue するトリガ。 */
  sentBack: number;
  flagged: number;
  errorCount: number;
  perDraft: CheckPerDraft[];
  /** 重複比較用の直近投稿取得に失敗した（=この run の重複チェックは劣化）。 */
  recentFetchFailed?: boolean;
}

interface SubmitCheck {
  verdict: "ok" | "flag";
  risk_level: "low" | "high";
  duplicate: "ok" | "similar";
  factcheck: "ok" | "suspicious" | "unverifiable";
  /** 主張・数字が元ネタツイート由来か（含有判定）。MA 欠落時は undefined。 */
  source_grounded?: boolean;
  flags?: string[];
}

interface DraftRow {
  id: string;
  body: string;
  fmat: string;
  core_idea_id: string | null;
  run_id: string | null;
}

/** 元ネタ素材（点検の一次ソース＋差し戻し時の再 queue 対象）。 */
interface SourceMaterial {
  id: string;
  raw_text: string;
  meta: Record<string, unknown> | null;
}

/**
 * draft の core_idea から元ネタ素材（raw_text + meta）を取得する。
 * - core_idea_id null / source_material_ids 空 → materials:[]・readFailed:false（degrade。元ネタ無しで点検続行）。
 * - core_ideas / materials_store の読取エラー → readFailed:true（呼び元で warn 済・redo は据置で次ラン再点検）。
 * 点検注入（raw_text）と差し戻し再 queue（meta.compose_attempts）の両方で 1 回の取得を共用する。
 */
export async function fetchSourceMaterials(
  sb: SupabaseClient,
  coreIdeaId: string | null,
  log: { warn: (m: string) => void } = console,
): Promise<{ materials: SourceMaterial[]; readFailed: boolean }> {
  if (!coreIdeaId) return { materials: [], readFailed: false };
  // maybeSingle: 行なし（参照切れ・削除済み core_idea）は data:null/error:null で返る。
  // .single() だと 0 行が PGRST116 エラー→恒久 readFailed→毎ラン check_read_failed＋MA 再走で
  // 無限ストールする。行なしは「元ネタ枯渇」の degrade として redo の human escalation に流す。
  const { data: ci, error: ciErr } = await sb
    .from("core_ideas")
    .select("source_material_ids")
    .eq("id", coreIdeaId)
    .maybeSingle();
  if (ciErr) {
    log.warn(`[check] core_idea read failed (ci=${coreIdeaId}): ${ciErr.message}`);
    return { materials: [], readFailed: true };
  }
  // ci == null: 行が存在しない（恒久状態）→ readFailed せず枯渇 degrade。
  if (ci == null) return { materials: [], readFailed: false };
  const ids = ((ci as { source_material_ids?: string[] } | null)?.source_material_ids ?? []) as string[];
  if (ids.length === 0) return { materials: [], readFailed: false };
  const { data: mats, error: matErr } = await sb
    .from("materials_store")
    .select("id, raw_text, meta")
    .in("id", ids);
  if (matErr) {
    log.warn(`[check] materials read failed (ci=${coreIdeaId}): ${matErr.message}`);
    return { materials: [], readFailed: true };
  }
  return { materials: (mats ?? []) as SourceMaterial[], readFailed: false };
}

/** 元ネタ素材 → checker ユーザーメッセージ用ブロック（raw_text＋translation 併記）。空なら空文字。 */
function buildSourceBlock(materials: SourceMaterial[]): string {
  if (materials.length === 0) return "";
  const lines = materials.map((m, i) => {
    const t = m.meta && typeof m.meta.translation === "string" ? `\n[日本語訳] ${m.meta.translation}` : "";
    return `${i + 1}. ${m.raw_text}${t}`;
  });
  return `\n\n# 元ネタツイート（ファクト判定の一次ソース）\n` + lines.join("\n\n");
}

export async function runCheck(deps: RunCheckDeps): Promise<CheckRunResult> {
  const cfg = deps.config ?? CHECK_CONFIG;
  const sb = deps.sb;
  const runSession = deps.runSession ?? runMaSession;
  const resolveAgentRef = deps.getAgentRef ?? getAgentRefDefault;
  const fetchRecent = deps.fetchRecent ?? fetchRecentPostBodies;
  const log = deps.logger ?? console;
  const perDraft: CheckPerDraft[] = [];
  let checked = 0;
  let approved = 0;
  let sentBack = 0;
  let flagged = 0;
  let errorCount = 0;

  // 既定 pushApproval は post-job から遅延 import（注入時はそちらを優先、テストで実 LINE を叩かない）。
  const pushApproval =
    deps.pushApproval ?? (await import("../../src/jobs/post-job.js")).pushApproval;

  // 1. 点検対象読取: editor_status='pending' AND human_approval_status='pending'
  const { data: drafts, error: readErr } = await sb
    .from("post_drafts")
    .select("id, body, fmat, core_idea_id, run_id")
    .eq("editor_status", "pending")
    .eq("human_approval_status", "pending")
    .limit(cfg.maxCheckPerRun);
  if (readErr) throw new Error(`[check] read failed: ${readErr.message}`);
  const rows = (drafts ?? []) as DraftRow[];
  if (rows.length === 0) return { checked: 0, approved: 0, sentBack: 0, flagged: 0, errorCount: 0, perDraft };

  // 2. 直近投稿の本文を 1 回取得（重複比較用、ループ外）。
  let recentBlock = "";
  let recentFetchFailed = false;
  try {
    const recent = await fetchRecent(cfg.recentPostsLookbackDays);
    if (recent.length > 0) {
      recentBlock =
        `\n\n# 直近の投稿（重複チェック用）\n` +
        recent.map((r, i) => `${i + 1}. ${r.body}`).join("\n");
    }
  } catch (e) {
    // 取得失敗は致命ではないが、この run の重複チェックは劣化（ファクトのみ点検）。
    // silent にしない: run 結果(recentFetchFailed)で可視化し、duplicate は ok と区別する。
    recentFetchFailed = true;
    log.warn(`[check] fetchRecentPostBodies failed (重複チェック劣化): ${String(e)}`);
  }

  // 3. 各ドラフトを MA checker で点検
  for (const d of rows) {
    // 元ネタ素材を per-draft 1 回取得（点検注入＋差し戻し再 queue で共用）。
    // 読取失敗は warn＋degrade（元ネタ無しで点検は続行・redo は readFailed で次ラン据置）。
    const { materials: sourceMaterials, readFailed } = await fetchSourceMaterials(sb, d.core_idea_id, log);
    const sourceBlock = buildSourceBlock(sourceMaterials);
    // 観測: core_idea はあるのに元ネタが 1 件も注入できない異常（参照切れ/source_material_ids 空/
    // materials 欠落＝上流データ欠落の疑い）を可視化。null core_idea の正常 degrade と区別する。
    if (d.core_idea_id && !readFailed && sourceMaterials.length === 0)
      log.info?.(`[check] ${d.id} core_idea=${d.core_idea_id} だが元ネタ素材 0 件 — 上流データ欠落の疑い（degrade して点検続行）。`);

    // 注入順: # ドラフト本文 → # 元ネタツイート → # 直近の投稿。
    const userMessage =
      `次の X 投稿ドラフトを点検してください。\n\n# ドラフト本文\n${d.body}` +
      sourceBlock +
      recentBlock +
      `\n\nまず元ネタツイートに主張・数字が含まれるか判定し、含まれない新情報のみ web_search で裏取りして、最後に submit_check を呼んでください。`;

    // 永続 checker agent 参照を解決（miss=未 bootstrap は throw）。誤処理防止: 解決不能なら
    // 点検せず pending 据置で error 計上（bootstrap 後に再点検可）。
    let agentRef: AgentRef;
    try {
      agentRef = await resolveAgentRef(sb, CHECKER_AGENT_KEY);
    } catch (e) {
      errorCount++;
      perDraft.push({ draftId: d.id, outcome: "error", error: String(e) });
      log.warn(`[check] agent ref unresolved for ${d.id}: ${String(e)}`);
      continue;
    }

    let captured: SubmitCheck | undefined;
    const customToolHandler = (name: string, input: unknown): string => {
      if (name === "submit_check") {
        captured = input as SubmitCheck;
        return "received";
      }
      return `No handler for tool "${name}".`;
    };

    const sessionEvents: SessionEventInput[] = [];
    let res;
    try {
      res = await runSession({
        apiKey: deps.apiKey,
        // 永続経路: 既存 agent/environment を再利用。system/tools は agent 側に焼かれている
        // ため session 起動時は渡さない（handler のみ host 側で注入）。
        agentRef: { id: agentRef.agentId, version: agentRef.version },
        environmentId: agentRef.environmentId,
        userMessage,
        customToolHandler,
        timeoutMs: cfg.timeoutMs,
        now: deps.now,
        onEvent: (e) => sessionEvents.push(e),
        // onTrace は runSession に委譲せず自前で発火（costJpy を載せるため。下記参照）。
      });
    } catch (e) {
      res = { ok: false, terminal: "error" as const, error: String(e) } as Awaited<ReturnType<typeof runMaSession>>;
    }
    // 永続 session id を perDraft/run_trace.output 用に捕捉（後続 1B が checker↔draft を相関）。
    const maSessionId = res.ids?.session;
    // 1B 観測: checker session を永続化＋draft に checker_session_id を相関（fail-open）。
    if (maSessionId) {
      await insertSessionEvents(maSessionId, "checker", sessionEvents);
      await recordRunSession({ runId: deps.runId ?? "", stageId: "check", sessionId: maSessionId, agentKey: "checker" });
      try {
        await sb.from("post_drafts").update({ checker_session_id: maSessionId }).eq("id", d.id);
      } catch {
        /* fail-open: 相関欠落でも点検本処理は継続 */
      }
    }

    // cost/trace は token を消費した全経路で発火する（失敗 session も計上）。
    // run-compose と同じく stub/!ok ガードの前で 1 回だけ通知＝失敗で焼いた token を
    // 取りこぼさず brownout が暴走（失敗→再 enqueue ループ）を見落とさない。
    // 計上は token usage のみ。MA built-in web_search のサーバ費は session usage 外＝未計上。
    const inTok = (res.sessionUsage as { input_tokens?: number } | undefined)?.input_tokens ?? 0;
    const outTok = (res.sessionUsage as { output_tokens?: number } | undefined)?.output_tokens ?? 0;
    const costUsd = costUsdFor(cfg.checkerModel, inTok, outTok);
    const costJpy = costJpyFor(cfg.checkerModel, inTok, outTok);
    deps.onTrace?.({ model: cfg.checkerModel, tokensIn: inTok, tokensOut: outTok, costJpy });

    // stub は本番では設定ミス（IN_MEMORY_FALLBACK 誤設定/キー欠落）。点検成立とみなさず pending 据置。
    if (res.stub) {
      errorCount++;
      perDraft.push({ draftId: d.id, outcome: "stub", stub: true });
      log.warn(`[check] MA session returned stub for ${d.id} — IN_MEMORY_FALLBACK misconfig? leave pending.`);
      continue;
    }

    if (!res.ok || !captured) {
      // 失敗: editor_status は pending 据置（再点検可）。理由を perDraft に残す。
      errorCount++;
      const outcome: CheckPerDraft["outcome"] =
        res.ok && !captured ? "no_submit" : ((res.terminal as MaFailTerminal) ?? "error");
      perDraft.push({ draftId: d.id, outcome, error: res.error });
      log.warn(`[check] no verdict for ${d.id} outcome=${outcome}${res.error ? ` err=${res.error}` : ""}`);
      continue;
    }

    // 成功 → verdict 別ルーティング。flags を計算（cost は上で算出・発火済）。
    // closure(approveAndPush)からの参照で TS が undefined narrowing を失うため非 null const に固定。
    const cap = captured;
    const flags = Array.isArray(cap.flags) ? cap.flags : [];
    const risk: "low" | "high" = cap.risk_level === "high" ? "high" : "low";
    // 元ネタ含有判定（観測用）。MA 欠落時は undefined のまま perDraft に残す。
    const sourceGrounded = typeof cap.source_grounded === "boolean" ? cap.source_grounded : undefined;
    if (costUsd === 0) log.warn(`[check] cost 0 for checked ${d.id} — sessionUsage missing? (web_search 費は別途未計上)`);

    const editorOutputLike: EditorOutput = {
      draftId: d.id,
      decision: "approved",
      rejectReasons: [],
      // flags を {rule,reason} 形に（rule=flag のため LINE カードに flag 文がそのまま出る）。
      warnings: flags.map((f) => ({ rule: f as EditorOutput["warnings"][number]["rule"], reason: f })),
      rules: [],
      riskLevel: risk,
      riskReasons: flags,
      businessLawRiskFlag: false,
      businessLawKeywords: [],
      totalDurationMs: 0,
      llmCostUsd: costUsd,
    };

    // approve + pushApproval（ok/unverifiable/flagged_max_retry 共通）。CAS で並行二重 push を防ぐ。
    const approveAndPush = async (
      outcome: "ok" | "flagged_max_retry",
      attempts?: number,
    ): Promise<void> => {
      const { data: updated, error: updErr } = await sb
        .from("post_drafts")
        .update({ editor_status: "approved", risk_level: risk, risk_reasons: flags, editor_output: editorOutputLike })
        .eq("id", d.id)
        .eq("editor_status", "pending")
        .select("id");
      if (updErr) {
        // update 失敗: pending 据置（再点検可）。push しない（二重通知防止）。
        errorCount++;
        perDraft.push({ draftId: d.id, outcome: "update_failed", error: updErr.message });
        log.warn(`[check] approve update FAILED for ${d.id}: ${updErr.message}`);
        return;
      }
      if (!updated || updated.length === 0) {
        // 別ランが先に処理済（CAS が 0 行）。二重通知しない。errorCount は上げない。
        perDraft.push({ draftId: d.id, outcome: "raced" });
        log.warn(`[check] ${d.id} already processed by another run (raced) — skip pushApproval.`);
        return;
      }
      try {
        await pushApproval(deps.env, d.id, d.body, editorOutputLike, d.fmat);
      } catch (e) {
        // approve は済（editor_status='approved'）が LINE 未送。冪等再点検は pending のみ拾うため
        // 自動回収不能＝本番は手動承認/再送で回収。outcome を push_failed にして失敗走査で取りこぼさない。
        errorCount++;
        perDraft.push({
          draftId: d.id, outcome: "push_failed", verdict: cap.verdict, risk_level: risk,
          duplicate: cap.duplicate, factcheck: cap.factcheck, source_grounded: sourceGrounded, flagCount: flags.length,
          ...(attempts !== undefined ? { attempts } : {}),
          error: `pushApproval failed: ${String(e)}`,
        });
        log.warn(`[check] pushApproval FAILED for ${d.id} (approved-but-not-notified, 要手動回収): ${String(e)}`);
        return;
      }
      checked++;
      approved++;
      if (cap.verdict === "flag") flagged++;
      perDraft.push({
        draftId: d.id, outcome, verdict: cap.verdict, risk_level: risk,
        duplicate: cap.duplicate, factcheck: cap.factcheck, source_grounded: sourceGrounded, flagCount: flags.length,
        ...(attempts !== undefined ? { attempts } : {}),
        ...(maSessionId ? { maSessionId } : {}),
      });
      log.info?.(`[check] ${d.id} outcome=${outcome} verdict=${cap.verdict} dup=${cap.duplicate} fact=${cap.factcheck} sg=${sourceGrounded} flags=${flags.length} risk=${risk}`);
    };

    // 差し戻し条件: 嘘(suspicious) or 重複(similar)。unverifiable/ok は従来どおり人間へ。
    const needsRedo = cap.factcheck === "suspicious" || cap.duplicate === "similar";
    if (!needsRedo) {
      await approveAndPush("ok");
      continue;
    }

    // 差し戻し候補 → ループ先頭で取得済の素材/readFailed を再利用（重複読取しない）。
    // 読取エラー（一過性 DB エラー）と「素材が本当に無い（枯渇）」は区別する。
    const matRows = sourceMaterials;

    // 読取エラーは「再生成不能」と確定せず pending 据置で次ラン再点検（suspicious を誤 approve しない）。
    if (readFailed) {
      errorCount++;
      perDraft.push({ draftId: d.id, outcome: "check_read_failed", verdict: cap.verdict, error: "core_idea/materials read failed (retry next run)" });
      log.warn(`[check] ${d.id} redo read failed — leave pending for retry.`);
      continue;
    }

    const attemptsArr = matRows.map((m) => Number((m.meta ?? {}).compose_attempts ?? 0) || 0);
    const maxAttempts = attemptsArr.length ? Math.max(...attemptsArr) : 0;

    // 素材が本当に無い（枯渇）＝再生成できない → 人間へ。上限到達も人間へ。
    if (matRows.length === 0 || maxAttempts >= cfg.maxRedoAttempts) {
      if (matRows.length === 0)
        log.warn(`[check] ${d.id} flagged but no source materials to redo — escalate to human.`);
      await approveAndPush("flagged_max_retry", matRows.length === 0 ? undefined : maxAttempts);
      continue;
    }

    // 差し戻し: draft を CAS で rejected（並行 approve 窓を閉じる）。
    const rejectOutput: EditorOutput = { ...editorOutputLike, decision: "rejected" };
    const { data: rejected, error: rejErr } = await sb
      .from("post_drafts")
      .update({ editor_status: "rejected", risk_level: risk, risk_reasons: flags, editor_output: rejectOutput })
      .eq("id", d.id)
      .eq("editor_status", "pending")
      .select("id");
    if (rejErr) {
      errorCount++;
      perDraft.push({ draftId: d.id, outcome: "update_failed", error: rejErr.message });
      log.warn(`[check] reject update FAILED for ${d.id}: ${rejErr.message}`);
      continue;
    }
    if (!rejected || rejected.length === 0) {
      // 別ランが先に処理済（CAS 0 行）。素材は触らない（二重再 queue 防止）。
      perDraft.push({ draftId: d.id, outcome: "raced" });
      log.warn(`[check] ${d.id} already processed by another run (raced) — skip send-back.`);
      continue;
    }

    // 素材を再 queue（compose が再 pick）: composed_at/claim=null・compose_attempts++・last_check_flags=flags。
    let matErrMsg: string | undefined;
    let matOk = 0;
    for (const m of matRows) {
      const prev = m.meta ?? {};
      const prevAttempts = Number(prev.compose_attempts ?? 0) || 0;
      const { error: mErr } = await sb
        .from("materials_store")
        .update({
          meta: { ...prev, composed_at: null, compose_claimed_at: null, compose_attempts: prevAttempts + 1, last_check_flags: flags },
        })
        .eq("id", m.id);
      if (mErr) {
        matErrMsg = mErr.message;
        log.warn(`[check] material requeue FAILED for ${m.id} (draft ${d.id}): ${mErr.message}`);
      } else matOk++;
    }

    // 素材を 1 件も再 queue できなかった: draft は既に rejected なので、放置するとネタが消える
    // (compose は composed_at!=null で再 pick しない)。draft を pending に revert し次ラン再点検へ。
    if (matOk === 0) {
      const { error: revErr } = await sb.from("post_drafts").update({ editor_status: "pending" }).eq("id", d.id);
      if (revErr) log.warn(`[check] revert-to-pending FAILED for ${d.id} (要手動回収): ${revErr.message}`);
      errorCount++;
      perDraft.push({ draftId: d.id, outcome: "requeue_failed", verdict: cap.verdict, error: `material requeue failed: ${matErrMsg}` });
      log.warn(`[check] ${d.id} requeue failed (no material requeued) — reverted draft to pending for retry.`);
      continue;
    }

    checked++;
    sentBack++;
    if (cap.verdict === "flag") flagged++;
    perDraft.push({
      draftId: d.id, outcome: "sent_back", verdict: cap.verdict, risk_level: risk,
      duplicate: cap.duplicate, factcheck: cap.factcheck, source_grounded: sourceGrounded, flagCount: flags.length,
      attempts: maxAttempts + 1, ...(maSessionId ? { maSessionId } : {}),
      ...(matErrMsg ? { error: `partial material requeue failed: ${matErrMsg}` } : {}),
    });
    log.warn(`[check] ${d.id} SENT BACK for redo (dup=${cap.duplicate} fact=${cap.factcheck} sg=${sourceGrounded} attempts=${maxAttempts + 1}/${cfg.maxRedoAttempts}) — ${flags.join("; ")}`);
  }

  return { checked, approved, sentBack, flagged, errorCount, perDraft, ...(recentFetchFailed ? { recentFetchFailed: true } : {}) };
}
