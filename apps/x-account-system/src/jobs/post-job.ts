/**
 * post-job.ts — 共有ヘルパ群
 *
 * 旧 runPostJob オーケストレータは撤去済 (legacy pipeline retire)。
 * 現在は line-event (LINE 承認/修正フロー) と check (run-check) が共有する
 * ヘルパのみを提供する:
 *   getSupabase / toCoreIdea / CoreIdeaRow / persistDraft /
 *   buildEditorInput / fetchSourceMaterialTexts / pushApproval
 *
 * X API 直投は廃止済。実際の publish は chrome-devtools 予約投稿が担う。
 */

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyRules } from "../../lib/hook-classifier/classify-rules.js";
import { pushLineMessages } from "../../lib/line/line-client.js";
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
// line-event(修正フロー) と check(run-check) で共有
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
