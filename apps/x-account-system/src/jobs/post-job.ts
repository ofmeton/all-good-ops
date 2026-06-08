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
import { pushLine } from "../../lib/line/line-client.js";
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
// pushApproval — LINE は「承認待ちが出た」通知のみ（承認/編集は承認UIで）
//   approve/reject ボタン・本文全文 push・Flex カード・line_message_map 紐づけは
//   廃止した（T3 承認UX 一本化）。署名は維持（run-check / line-event の per-draft
//   呼び出しと CAS idempotency をそのまま保つ＝draft ごとに 1 通）。
//   PII 保護: 本文は通知に載せない（承認UIで確認する）。
// ============================================================
export async function pushApproval(
  env: Env,
  _dbDraftId: string,
  _body: string,
  out: EditorOutput,
  _fmat: string,
): Promise<void> {
  const to = env.LINE_USER_ID_OFMETON || process.env.LINE_USER_ID_OFMETON || "";
  const token = env.LINE_CHANNEL_ACCESS_TOKEN || process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
  const uiUrl = env.APPROVAL_UI_URL || process.env.APPROVAL_UI_URL || "";

  const riskBadge = out.riskLevel === "high" ? "⚠️ HIGH RISK" : "✅ low risk";
  const lines = [
    `📝 新しい投稿候補が承認待ちです [${riskBadge}]`,
    uiUrl ? `承認UI: ${uiUrl}` : "承認UIで本文を確認し、承認/却下してください。",
  ];
  await pushLine(to, lines.join("\n"), token);
}
