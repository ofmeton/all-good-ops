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
import { fetchRecentPostBodies } from "../editor/db.js";
import { CHECK_CONFIG, type CheckConfig } from "./check-config.js";
import { buildCheckSystemPrompt, SUBMIT_CHECK_TOOL } from "./check-prompts.js";
import type { Env } from "../../src/worker.js";

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
  flags?: string[];
}

interface DraftRow {
  id: string;
  body: string;
  fmat: string;
  core_idea_id: string | null;
  run_id: string | null;
}

/** 内蔵 agent toolset（web_search/web_fetch のみ有効。bash/file/code 無効）。 */
const WEB_TOOLSET = {
  type: "agent_toolset_20260401",
  default_config: { enabled: false },
  configs: [
    { name: "web_search", enabled: true },
    { name: "web_fetch", enabled: true },
  ],
};

function usdFor(model: string, tokensIn = 0, tokensOut = 0): number {
  // ざっくりレート（/claude-api のモデル表）。cost_usd 概算用。
  const rate = model.includes("haiku")
    ? { i: 1, o: 5 }
    : model.includes("opus")
      ? { i: 5, o: 25 }
      : { i: 3, o: 15 }; // sonnet 既定
  return (tokensIn / 1_000_000) * rate.i + (tokensOut / 1_000_000) * rate.o;
}

export async function runCheck(deps: RunCheckDeps): Promise<CheckRunResult> {
  const cfg = deps.config ?? CHECK_CONFIG;
  const sb = deps.sb;
  const runSession = deps.runSession ?? runMaSession;
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
    const userMessage =
      `次の X 投稿ドラフトを点検してください。\n\n# ドラフト本文\n${d.body}` +
      recentBlock +
      `\n\n必要なら web_search でファクト確認し、最後に submit_check を呼んでください。`;

    let captured: SubmitCheck | undefined;
    const customToolHandler = (name: string, input: unknown): string => {
      if (name === "submit_check") {
        captured = input as SubmitCheck;
        return "received";
      }
      return `No handler for tool "${name}".`;
    };

    let res;
    try {
      res = await runSession({
        apiKey: deps.apiKey,
        agent: {
          name: "x-checker",
          model: cfg.checkerModel,
          system: buildCheckSystemPrompt(),
          tools: [WEB_TOOLSET as never, SUBMIT_CHECK_TOOL as never],
        },
        userMessage,
        customToolHandler,
        timeoutMs: cfg.timeoutMs,
        now: deps.now,
        onTrace: deps.onTrace,
      });
    } catch (e) {
      res = { ok: false, terminal: "error" as const, error: String(e) } as Awaited<ReturnType<typeof runMaSession>>;
    }

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

    // 成功 → verdict 別ルーティング。flags/cost を計算。
    // closure(approveAndPush)からの参照で TS が undefined narrowing を失うため非 null const に固定。
    const cap = captured;
    const flags = Array.isArray(cap.flags) ? cap.flags : [];
    const risk: "low" | "high" = cap.risk_level === "high" ? "high" : "low";
    const inTok = (res.sessionUsage as { input_tokens?: number } | undefined)?.input_tokens ?? 0;
    const outTok = (res.sessionUsage as { output_tokens?: number } | undefined)?.output_tokens ?? 0;
    const costUsd = usdFor(cfg.checkerModel, inTok, outTok);
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
          duplicate: cap.duplicate, factcheck: cap.factcheck, flagCount: flags.length,
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
        duplicate: cap.duplicate, factcheck: cap.factcheck, flagCount: flags.length,
        ...(attempts !== undefined ? { attempts } : {}),
      });
      log.info?.(`[check] ${d.id} outcome=${outcome} verdict=${cap.verdict} dup=${cap.duplicate} fact=${cap.factcheck} flags=${flags.length} risk=${risk}`);
    };

    // 差し戻し条件: 嘘(suspicious) or 重複(similar)。unverifiable/ok は従来どおり人間へ。
    const needsRedo = cap.factcheck === "suspicious" || cap.duplicate === "similar";
    if (!needsRedo) {
      await approveAndPush("ok");
      continue;
    }

    // 差し戻し候補 → core_idea.source_material_ids の素材を引き、再生成回数を確認。
    // 読取エラー（一過性 DB エラー）と「素材が本当に無い（枯渇）」は区別する。
    let matRows: Array<{ id: string; meta: Record<string, unknown> | null }> = [];
    let readFailed = false;
    if (d.core_idea_id) {
      const { data: ci, error: ciErr } = await sb
        .from("core_ideas")
        .select("source_material_ids")
        .eq("id", d.core_idea_id)
        .single();
      if (ciErr) {
        readFailed = true;
        log.warn(`[check] core_idea read failed for ${d.id} (ci=${d.core_idea_id}): ${ciErr.message}`);
      } else {
        const ids = ((ci as { source_material_ids?: string[] } | null)?.source_material_ids ?? []) as string[];
        if (ids.length > 0) {
          const { data: mats, error: matErr } = await sb
            .from("materials_store")
            .select("id, meta")
            .in("id", ids);
          if (matErr) { readFailed = true; log.warn(`[check] materials read failed for ${d.id}: ${matErr.message}`); }
          else matRows = (mats ?? []) as Array<{ id: string; meta: Record<string, unknown> | null }>;
        }
      }
    }

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
      duplicate: cap.duplicate, factcheck: cap.factcheck, flagCount: flags.length,
      attempts: maxAttempts + 1, ...(matErrMsg ? { error: `partial material requeue failed: ${matErrMsg}` } : {}),
    });
    log.warn(`[check] ${d.id} SENT BACK for redo (dup=${cap.duplicate} fact=${cap.factcheck} attempts=${maxAttempts + 1}/${cfg.maxRedoAttempts}) — ${flags.join("; ")}`);
  }

  return { checked, approved, sentBack, flagged, errorCount, perDraft, ...(recentFetchFailed ? { recentFetchFailed: true } : {}) };
}
