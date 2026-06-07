/**
 * lib/check/run-check.ts — チェックAg(MA checker) 本体。
 *
 * compose が作る post_drafts(editor_status='pending', human_approval_status='pending')
 * を、MA チェッカーAg が **重複＋ファクト（嘘フィルタ）** で点検し、人間承認(LINE)に回す。
 * MA 駆動は lib/ma/run-session.ts。出力契約は lib/check/check-prompts.ts の submit_check。
 *
 * 完全 soft: 何も自動 block しない。点検成功なら editor_status は**常に 'approved'**
 *   （rejected にしない）。verdict/flags は記録のみ。人間承認が本当のゲート。
 * 冪等: editor_status='pending' のみ拾う＝点検済(approved)は再処理されない（状態遷移で
 *   冪等。claim 機構は作らない）。
 * 失敗（res.ok false / stub / submit 未呼び出し / update 失敗）: editor_status は pending
 *   据置（再点検可）・errorCount++。stub は本番設定ミスなので必ず弾く（draft 化しない）。
 * 観測: run_trace.output に perDraft 計測を返す（flag 率/重複率/ファクト疑い率の計測基盤）。
 * DDL なし（editor_status 既存 enum で完結）。
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
  /** 結果種別（trace に残す。console だけにしない）。push_failed=承認済だがLINE未送(要手動回収)、raced=他ランが先取り。 */
  outcome?: "ok" | "stub" | "no_submit" | "update_failed" | "push_failed" | "raced" | MaFailTerminal;
  stub?: boolean;
  error?: string;
}

type MaFailTerminal = "timeout" | "terminated" | "error" | "idle";

export interface CheckRunResult {
  checked: number;
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
  if (rows.length === 0) return { checked: 0, flagged: 0, errorCount: 0, perDraft };

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

    // 成功 → 完全 soft: 常に approved。verdict/flags は記録のみ。
    const flags = Array.isArray(captured.flags) ? captured.flags : [];
    const risk: "low" | "high" = captured.risk_level === "high" ? "high" : "low";
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

    // CAS: editor_status='pending' の行だけ approve（並行 check 実行の二重 pushApproval 窓を閉じる）。
    const { data: updated, error: updErr } = await sb
      .from("post_drafts")
      .update({
        editor_status: "approved",
        risk_level: risk,
        risk_reasons: flags,
        editor_output: editorOutputLike,
      })
      .eq("id", d.id)
      .eq("editor_status", "pending")
      .select("id");
    if (updErr) {
      // update 失敗: pending 据置（再点検可）。push しない（二重通知防止）。
      errorCount++;
      perDraft.push({ draftId: d.id, outcome: "update_failed", error: updErr.message });
      log.warn(`[check] approve update FAILED for ${d.id}: ${updErr.message}`);
      continue;
    }
    if (!updated || updated.length === 0) {
      // 別ランが先に approve 済（CAS が 0 行）。二重通知しない。errorCount は上げない。
      perDraft.push({ draftId: d.id, outcome: "raced" });
      log.warn(`[check] ${d.id} already approved by another run (raced) — skip pushApproval.`);
      continue;
    }

    try {
      await pushApproval(deps.env, d.id, d.body, editorOutputLike, d.fmat);
    } catch (e) {
      // approve は済（editor_status='approved'）が LINE 未送。冪等再点検は pending のみ拾うため
      // 自動回収不能＝本番は手動承認/再送で回収。outcome を push_failed にして失敗走査で取りこぼさない。
      errorCount++;
      perDraft.push({
        draftId: d.id, outcome: "push_failed", verdict: captured.verdict, risk_level: risk,
        duplicate: captured.duplicate, factcheck: captured.factcheck, flagCount: flags.length,
        error: `pushApproval failed: ${String(e)}`,
      });
      log.warn(`[check] pushApproval FAILED for ${d.id} (approved-but-not-notified, 要手動回収): ${String(e)}`);
      continue;
    }

    checked++;
    if (captured.verdict === "flag") flagged++;
    perDraft.push({
      draftId: d.id, outcome: "ok", verdict: captured.verdict, risk_level: risk,
      duplicate: captured.duplicate, factcheck: captured.factcheck, flagCount: flags.length,
    });
    log.info?.(`[check] ${d.id} verdict=${captured.verdict} dup=${captured.duplicate} fact=${captured.factcheck} flags=${flags.length} risk=${risk}`);
  }

  return { checked, flagged, errorCount, perDraft, ...(recentFetchFailed ? { recentFetchFailed: true } : {}) };
}
