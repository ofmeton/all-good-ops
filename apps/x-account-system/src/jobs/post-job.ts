/**
 * post-job.ts — W3-2
 *
 * 投稿系 job orchestrator: idea→draft→editor→LINE承認push
 *
 * Phase 1: AUTONOMOUS_PUBLISH=false 前提。
 * このジョブは X に絶対に投稿しない。
 * draft 生成 + editor 審査 + LINE 承認依頼のみ。
 *
 * 実際の publish は W4-2 (LINE postback handler) が担う。
 */

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { withTrace, recordSkip } from "../../lib/trace/with-trace.js";
import type { TraceMeta } from "../../lib/trace/types.js";
import { draftForX } from "../../lib/writer/writer-x.js";
import { runEditor } from "../../lib/editor/pipeline.js";
import { classifyRules } from "../../lib/hook-classifier/classify-rules.js";
import { getKillSwitchState } from "../../lib/safety/kill-switch.js";
import { pushLine, pushLineMessages } from "../../lib/line/line-client.js";
import { getRecentStyleFeedback } from "../../lib/feedback/style-feedback.js";
import { ruleLabelJa } from "../../lib/editor/rule-labels.js";
import { recordLineMessage } from "../../lib/line/message-map.js";
import { segmentForPublish } from "../../lib/publisher/format-post.js";
import type { PublishFormat } from "../../lib/publisher/types.js";
import type { CoreIdea } from "../../lib/writer/types.js";
import type { EditorInput, EditorOutput } from "../../lib/editor/types.js";
import type { DraftOutput } from "../../lib/writer/types.js";
import type { Env } from "../worker.js";

// ============================================================
// Supabase client factory (mirrors kill-switch.ts / editor/db.ts pattern)
// ============================================================
let _supabase: SupabaseClient | null = null;

export function getSupabase(env: Env): SupabaseClient | null {
  if (_supabase) return _supabase;
  const url = env.SUPABASE_URL || process.env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _supabase = createClient(url, key, {
    db: { schema: process.env.SUPABASE_SCHEMA || "xad" },
  }) as unknown as SupabaseClient;
  return _supabase;
}

// ============================================================
// CoreIdeaRow — DB row shape (core_ideas table, 0002 + 0007 migration)
// ============================================================
export type CoreIdeaRow = {
  id: string;
  topic?: string | null;
  title?: string | null;
  summary?: string | null;
  primary_hook?: string | null;
  fmat?: string | null;
  category: string;            // 'paraphrase' | 'first_hand' | 'industry_sop'
  audience?: string | null;
  source_material_ids?: string[];
  meta?: Record<string, unknown> | null;
};

// ============================================================
// toCoreIdea — DB row → CoreIdea
// ============================================================
export function toCoreIdea(row: CoreIdeaRow): CoreIdea {
  return {
    id: row.id,
    topic: row.topic ?? row.title ?? row.summary ?? "(no topic)",
    primaryHook: (
      row.primary_hook ??
      (row.meta?.primaryHook as string | undefined) ??
      "tips_enum"
    ) as CoreIdea["primaryHook"],
    fmat: (
      row.fmat ??
      (row.meta?.fmat as string | undefined) ??
      "medium"
    ) as CoreIdea["fmat"],
    contentType: row.category as CoreIdea["contentType"],
    audience: row.audience ?? (row.meta?.audience as string | undefined) ?? "非エンジニアの経営者",
    sourceMaterialIds: row.source_material_ids ?? [],
  };
}

// ============================================================
// jstDate — Asia/Tokyo YYYY-MM-DD
// ============================================================
function jstDate(d: Date): string {
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

// ============================================================
// guardsPass — kill-switch check
// ============================================================
async function guardsPass(env: Env, slot: string): Promise<boolean> {
  const state = await getKillSwitchState();
  if (!state.publishing_enabled) {
    await notifyLine(
      env,
      `[${slot}] kill-switch 有効 → 投稿スキップ (resume_at: ${state.resume_at ?? "manual"})`,
    );
    return false;
  }
  // TODO(W5): brownout check (budget threshold guard)
  return true;
}

// ============================================================
// dequeueIdeaRow — pick 1 draft core_idea, atomically mark it 'approved'
// core_ideas status enum: 'draft' | 'approved' | 'published' | 'rejected' | 'archived'
// ============================================================
async function dequeueIdeaRow(
  env: Env,
  _slot: string,
): Promise<CoreIdeaRow | null> {
  const sb = getSupabase(env);
  if (!sb) return null;

  const { data, error } = await sb
    .from("core_ideas")
    .select("id, topic, title, summary, primary_hook, fmat, category, audience, source_material_ids, meta")
    .eq("status", "draft")
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`dequeueIdeaRow select: ${error.message}`);
  if (!data) return null;

  // Atomically mark as 'approved' to avoid double-consumption.
  // Use .select("id") to verify the UPDATE actually claimed the row
  // (Supabase returns error=null even if 0 rows matched without .select).
  const { data: claimData, error: updErr } = await sb
    .from("core_ideas")
    .update({ status: "approved" })
    .eq("id", (data as CoreIdeaRow).id)
    .eq("status", "draft")  // optimistic lock: only update if still 'draft'
    .select("id");

  if (updErr) throw new Error(`dequeueIdeaRow update: ${updErr.message}`);

  const claimed = Array.isArray(claimData) ? claimData : [];
  if (claimed.length === 0) {
    // Another consumer claimed this idea between our SELECT and UPDATE — skip this run.
    return null;
  }

  return data as CoreIdeaRow;
}

// ============================================================
// persistDraft — upsert post_drafts
// post_drafts columns: id, trace_id, core_idea_id, platform, variant_index,
//   fmat, body, primary_hook, editor_status, human_approval_status,
//   editor_output (0007), scheduled_date (0007), slot (0007),
//   writer_draft_id (0007), risk_level, risk_reasons, cost_usd
// Unique index: (scheduled_date, slot) → idempotent re-run
// ============================================================
export async function persistDraft(
  env: Env,
  opts: {
    id: string;          // dbDraftId (UUID)
    idea: CoreIdea;
    draft: DraftOutput;
    out: EditorOutput;
    slot: string;
    date: string;        // YYYY-MM-DD JST
    /** 計装で確定済みの hook 分類。未指定時は本文を分類器にかける (従来挙動)。 */
    primaryHook?: string;
    /** 観測ダッシュボード run_id (0013)。指定時のみ run_id カラムに記録。 */
    runId?: string;
  },
): Promise<void> {
  const sb = getSupabase(env);
  if (!sb) throw new Error("persistDraft: Supabase not configured");

  const { id, idea, draft, out, slot, date, primaryHook, runId } = opts;

  const row: Record<string, unknown> = {
    id,
    trace_id: id,                                    // reuse dbDraftId as trace_id
    core_idea_id: idea.id,
    platform: "x" as const,
    variant_index: 0,
    fmat: idea.fmat,
    body: draft.body,
    editor_status: out.decision,                     // 'approved' | 'rejected'
    human_approval_status: "pending" as const,
    editor_output: out as unknown as Record<string, unknown>,
    writer_draft_id: draft.draftId,                  // writer's non-UUID id
    // post_drafts.primary_hook は Editor の 4 分類 (failure_story/business_repro/critique/tips_enum)。
    // idea.primaryHook は Writer 12 種で CHECK 制約に違反するため、本文を分類器にかけた 4 種を使う。
    primary_hook: primaryHook ?? classifyRules(draft.body).primary_hook,
    scheduled_date: date,
    slot,
    risk_level: out.riskLevel,
    risk_reasons: out.riskReasons,
    cost_usd: (draft.llmCostUsd ?? 0) + (out.llmCostUsd ?? 0),
  };
  if (runId) row.run_id = runId;

  const { error } = await sb
    .from("post_drafts")
    .upsert(row, { onConflict: "scheduled_date,slot" });

  if (error) throw new Error(`persistDraft upsert: ${error.message}`);
}

// ============================================================
// buildEditorInput — CoreIdea + body から EditorInput を組み立てる
// runPostJob と line-event(修正) で共有
// ============================================================
export function buildEditorInput(
  idea: CoreIdea,
  body: string,
  dbDraftId: string,
  sourceMaterialTexts?: string[],
): EditorInput {
  return {
    traceId: crypto.randomUUID(),
    draftId: dbDraftId,
    coreIdeaId: idea.id,
    platform: "x",
    body,
    fmat: idea.fmat as EditorInput["fmat"],
    sourceMaterialIds: idea.sourceMaterialIds,
    // X6 出典グラウンディング (事実チェック) 用の素材本文。空なら X6 は skip。
    sourceMaterialTexts: sourceMaterialTexts ?? [],
    hasAffiliateLink: false,
    // R2(実体験行) を種別で出し分け: first_hand のみ必須、paraphrase/industry_sop は skip
    contentType: idea.contentType as EditorInput["contentType"],
  };
}

// ============================================================
// fetchSourceMaterialTexts — materials_store から redacted_text/raw_text を取得
// X6 出典グラウンディング (事実チェック) に渡す。
// Supabase 未設定 / IDs 空 / エラー時は [] を返す (X6 は skip)。
// ============================================================
export async function fetchSourceMaterialTexts(
  env: Env,
  materialIds: string[],
): Promise<string[]> {
  if (!materialIds || materialIds.length === 0) return [];
  const sb = getSupabase(env);
  if (!sb) return [];
  const { data, error } = await sb
    .from("materials_store")
    .select("redacted_text, raw_text")
    .in("id", materialIds);
  if (error) {
    console.warn("[post-job] fetchSourceMaterialTexts error:", error.message);
    return [];
  }
  const rows = Array.isArray(data) ? data : [];
  return rows
    .map((r) => {
      const row = r as { redacted_text?: unknown; raw_text?: unknown };
      // redaction 済みを優先。無ければ raw を使う。
      const t =
        (typeof row.redacted_text === "string" && row.redacted_text) ||
        (typeof row.raw_text === "string" && row.raw_text) ||
        "";
      return t;
    })
    .filter((t) => typeof t === "string" && t.trim().length > 0);
}

// ============================================================
// fmat → 日本語ラベル
// ============================================================
const FMAT_JP_LABEL: Record<string, string> = {
  short: "短文",
  medium: "中尺",
  long: "長文",
  thread: "スレッド",
  article: "記事",
  carousel: "カルーセル",
};

// ============================================================
// pushApproval — LINE で承認依頼
// 2 メッセージを 1 push で送る:
//   (a) plain text = 投稿本文の全文 (コピーしやすいクリーンな本文)
//   (b) Flex カード = 形式 / 品質メモ / 承認・却下ボタン / draft_id (本文は省略しメタのみ)
// W4-2 が postback "approve:<dbDraftId>" / "reject:<dbDraftId>" で処理する。
// 引用リプライ紐づけ: Flex カードの message_id を line_message_map に保存する。
// ============================================================
export async function pushApproval(
  env: Env,
  dbDraftId: string,
  body: string,
  out: EditorOutput,
  fmat: string,
): Promise<void> {
  const to = env.LINE_USER_ID_OFMETON || process.env.LINE_USER_ID_OFMETON || "";
  const token = env.LINE_CHANNEL_ACCESS_TOKEN || process.env.LINE_CHANNEL_ACCESS_TOKEN || "";

  // (a) 実際に投稿されるクリーンなセグメント (足場ラベル・区切りを除去済) を
  //     プレビューする。thread は 【1/N】 で番号付け表示するが、これは表示専用で
  //     実投稿ツイートには 【1/N】 は含まれない (publisher が segmentForPublish した本文のみ投稿)。
  //     LINE text message の上限は 5000 字。控えめに 4900 字で cap。
  const MAX_TEXT = 4900;
  const segments = segmentForPublish(body, fmat as PublishFormat);
  const previewBody =
    segments.length > 1
      ? segments
          .map((seg, i) => `【${i + 1}/${segments.length}】\n${seg}`)
          .join("\n\n")
      : (segments[0] ?? body);
  const fullBody =
    previewBody.length > MAX_TEXT ? previewBody.slice(0, MAX_TEXT) + "\n…(省略)" : previewBody;

  const riskBadge = out.riskLevel === "high" ? "⚠️ HIGH RISK" : "✅ low risk";
  const headerText = `📝 投稿承認依頼 [${riskBadge}]`;
  const fmatLabel = FMAT_JP_LABEL[fmat] ?? fmat;
  const formatLine = `形式: ${fmatLabel} / ${body.length}字`;

  // (3) 品質警告を日本語化 (RuleId → JP)。
  const warnings = out.warnings ?? [];
  const warnLine =
    warnings.length > 0
      ? `⚠️ 品質メモ: ${warnings.map((w) => ruleLabelJa(w.rule)).join(" / ")}`
      : null;

  // 本文プレビュー (カードは本文を載せず短い先頭プレビューのみ)。
  const preview = body.length > 60 ? body.slice(0, 60) + "…" : body;
  const altText = `投稿承認依頼: ${body.slice(0, 80)}`;

  // Flex bubble: header(リスク) + body(形式/品質メモ/プレビュー/draft_id) + footer(ボタン + ヒント)
  const bodyContents: Array<Record<string, unknown>> = [
    { type: "text", text: formatLine, size: "sm", color: "#666666", wrap: true },
  ];
  if (warnLine) {
    bodyContents.push({
      type: "text",
      text: warnLine,
      size: "sm",
      color: "#C0392B",
      wrap: true,
    });
  }
  bodyContents.push({ type: "separator", margin: "md" });
  bodyContents.push({
    type: "text",
    text: `本文(全文は上のメッセージ): ${preview}`,
    wrap: true,
    size: "sm",
    color: "#444444",
    margin: "md",
  });
  bodyContents.push({
    type: "text",
    text: `draft_id: ${dbDraftId}`,
    size: "xxs",
    color: "#AAAAAA",
    margin: "md",
    wrap: true,
  });

  const flexContents = {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: headerText,
          weight: "bold",
          size: "md",
          wrap: true,
          color: out.riskLevel === "high" ? "#C0392B" : "#1B7F4B",
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: bodyContents,
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          spacing: "sm",
          contents: [
            {
              type: "button",
              style: "primary",
              color: "#1B7F4B",
              action: {
                type: "postback",
                label: "✅ 承認",
                data: `approve:${dbDraftId}`,
                displayText: `approve:${dbDraftId}`,
              },
            },
            {
              type: "button",
              style: "secondary",
              action: {
                type: "postback",
                label: "❌ 却下",
                data: `reject:${dbDraftId}`,
                displayText: `reject:${dbDraftId}`,
              },
            },
          ],
        },
        {
          type: "text",
          text: "このカードに引用リプライで「直して」等の自由文でもOK / 修正: <指示> / 覚えて: <指示>",
          size: "xxs",
          color: "#888888",
          wrap: true,
        },
      ],
    },
  };

  // (1)(4) 1 push で 2 メッセージ送信。レスポンスの sentMessages[1].id (カード) を紐づける。
  const messages = [
    { type: "text", text: fullBody },
    { type: "flex", altText, contents: flexContents },
  ];
  const resp = await pushLineMessages(to, messages, token);

  // (4) カード (2件目) の message_id を draft_id と紐づけて保存。
  const cardMessageId = resp.sentMessages?.[1]?.id;
  if (cardMessageId) {
    await recordLineMessage(env, cardMessageId, dbDraftId);
  }
}

// ============================================================
// notifyLine — admin への汎用通知
// ============================================================
async function notifyLine(env: Env, message: string): Promise<void> {
  const to = env.LINE_USER_ID_OFMETON || process.env.LINE_USER_ID_OFMETON || "";
  const token = env.LINE_CHANNEL_ACCESS_TOKEN || process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
  if (!to || !token) {
    console.warn("[post-job] notifyLine: LINE_USER_ID_OFMETON or token not set, skipping");
    return;
  }
  await pushLine(to, message, token);
}

// ============================================================
// logRejectToDigest — rejected draft を digest に記録
// (簡易実装: LINE に通知。digest 永続化は W4-3 以降で拡張)
// ============================================================
async function logRejectToDigest(
  env: Env,
  dbDraftId: string,
  rejectReasons: string[],
): Promise<void> {
  const reasons = rejectReasons.join(", ") || "(no reasons)";
  await notifyLine(
    env,
    `❌ 投稿却下 draft_id=${dbDraftId}\n理由: ${reasons}`,
  );
}

// ============================================================
// editorOutcome — editor の business 判定を run_trace の outcome に導出
//   rejected            → "rejected"
//   approved + warnings  → "warned"
//   approved + 警告なし   → "approved"
// ============================================================
export function editorOutcome(e: Pick<EditorOutput, "decision" | "warnings">): string {
  if (e.decision === "rejected") return "rejected";
  return (e.warnings?.length ?? 0) > 0 ? "warned" : "approved";
}

// ============================================================
// traced — rid があれば withTrace で包み、無ければ素通し (完全後方互換)
//   rid === "" の経路は trace を一切呼ばず既存挙動を維持する。
// ============================================================
async function traced<T>(
  ctx: ExecutionContext | undefined,
  rid: string,
  stageId: string,
  input: unknown,
  fn: () => Promise<{ result: T; output?: unknown; outcome?: string; meta?: TraceMeta }>,
): Promise<T> {
  if (!rid) return (await fn()).result;
  return withTrace(ctx, { runId: rid, stageId, input }, fn);
}

// ============================================================
// runPostJob — main entry point
//   ctx/runId は観測ダッシュボード計装用 (A9)。runId が無ければ trace は一切付かず
//   従来挙動を完全維持する (後方互換)。
// ============================================================
export async function runPostJob(
  slot: string,
  env: Env,
  ctx?: ExecutionContext,
  runId?: string,
): Promise<void> {
  const rid = runId ?? "";

  if (!(await guardsPass(env, slot))) return;

  const row = await dequeueIdeaRow(env, slot);
  if (!row) {
    await notifyLine(env, `[${slot}] core_ideas が空 — スキップ`);
    return;
  }

  const idea = toCoreIdea(row);

  // 過去のユーザー指摘を SOFT reference として draft 生成に注入する。
  const refFb = await getRecentStyleFeedback(env);

  // Writer
  const draft = await traced(ctx, rid, "writer", { core_idea: idea.topic }, async () => {
    const d = await draftForX(idea, refFb);
    return { result: d, output: { body: d.body, primary_hook: d.primaryHook }, meta: d._trace };
  });

  const dbDraftId = crypto.randomUUID();

  // Hook 分類 (本文 → 4 分類)。persistDraft でも使う primary_hook を確定する。
  const hook = await traced(ctx, rid, "hook-classifier", { body: draft.body }, async () => {
    const h = classifyRules(draft.body);
    return { result: h, output: { primary_hook: h.primary_hook } };
  });

  // X6 出典グラウンディング (事実チェック) 用に素材本文を取得して editor に渡す。
  const sourceTexts = await fetchSourceMaterialTexts(env, idea.sourceMaterialIds);
  const ein = buildEditorInput(idea, draft.body, dbDraftId, sourceTexts);

  // Editor
  const out = await traced(ctx, rid, "editor", { body: draft.body }, async () => {
    const e = await runEditor(ein);
    return {
      result: e,
      output: { decision: e.decision, warnings: e.warnings },
      outcome: editorOutcome(e),
      meta: e._trace,
    };
  });

  await persistDraft(env, {
    id: dbDraftId,
    idea,
    draft,
    out,
    slot,
    date: jstDate(new Date()),
    primaryHook: hook.primary_hook,
    runId: rid || undefined,
  });

  if (out.decision === "approved") {
    await traced(ctx, rid, "line-approval", { draft_id: dbDraftId }, async () => {
      await pushApproval(env, dbDraftId, draft.body, out, idea.fmat);
      return { result: undefined, outcome: "requested" };
    });
  } else {
    if (rid) {
      await recordSkip(ctx, {
        runId: rid,
        stageId: "line-approval",
        outcome: "editor_rejected",
      });
    }
    await logRejectToDigest(env, dbDraftId, out.rejectReasons);
  }
}
