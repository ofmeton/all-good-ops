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
import { draftForX } from "../../lib/writer/writer-x.js";
import { runEditor } from "../../lib/editor/pipeline.js";
import { getKillSwitchState } from "../../lib/safety/kill-switch.js";
import { pushLine } from "../../lib/line/line-client.js";
import type { CoreIdea } from "../../lib/writer/types.js";
import type { EditorInput, EditorOutput } from "../../lib/editor/types.js";
import type { DraftOutput } from "../../lib/writer/types.js";
import type { Env } from "../worker.js";

// ============================================================
// Supabase client factory (mirrors kill-switch.ts / editor/db.ts pattern)
// ============================================================
let _supabase: SupabaseClient | null = null;

function getSupabase(env: Env): SupabaseClient | null {
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
type CoreIdeaRow = {
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
function toCoreIdea(row: CoreIdeaRow): CoreIdea {
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

  // Atomically mark as 'approved' to avoid double-consumption
  const { error: updErr } = await sb
    .from("core_ideas")
    .update({ status: "approved" })
    .eq("id", (data as CoreIdeaRow).id)
    .eq("status", "draft");  // optimistic lock: only update if still 'draft'

  if (updErr) throw new Error(`dequeueIdeaRow update: ${updErr.message}`);

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
async function persistDraft(
  env: Env,
  opts: {
    id: string;          // dbDraftId (UUID)
    idea: CoreIdea;
    draft: DraftOutput;
    out: EditorOutput;
    slot: string;
    date: string;        // YYYY-MM-DD JST
  },
): Promise<void> {
  const sb = getSupabase(env);
  if (!sb) return;

  const { id, idea, draft, out, slot, date } = opts;

  const row = {
    id,
    trace_id: id,                                    // reuse dbDraftId as trace_id
    core_idea_id: idea.id,
    platform: "x" as const,
    variant_index: 0,
    fmat: idea.fmat,
    body: draft.body,
    primary_hook: idea.primaryHook,
    editor_status: out.decision,                     // 'approved' | 'rejected'
    human_approval_status: "pending" as const,
    editor_output: out as unknown as Record<string, unknown>,
    writer_draft_id: draft.draftId,                  // writer's non-UUID id
    scheduled_date: date,
    slot,
    risk_level: out.riskLevel,
    risk_reasons: out.riskReasons,
    cost_usd: (draft.llmCostUsd ?? 0) + (out.llmCostUsd ?? 0),
  };

  const { error } = await sb
    .from("post_drafts")
    .upsert(row, { onConflict: "scheduled_date,slot" });

  if (error) throw new Error(`persistDraft upsert: ${error.message}`);
}

// ============================================================
// pushApproval — LINE メッセージで承認依頼
// W4-2 が postback "approve:<dbDraftId>" / "reject:<dbDraftId>" で処理する
// ============================================================
async function pushApproval(
  env: Env,
  dbDraftId: string,
  body: string,
  out: EditorOutput,
): Promise<void> {
  const to = env.LINE_USER_ID_OFMETON || process.env.LINE_USER_ID_OFMETON || "";
  const token = env.LINE_CHANNEL_ACCESS_TOKEN || process.env.LINE_CHANNEL_ACCESS_TOKEN || "";

  const preview = body.slice(0, 100) + (body.length > 100 ? "…" : "");
  const riskBadge = out.riskLevel === "high" ? "⚠️ HIGH RISK" : "✅ low risk";

  const message = [
    `📝 投稿承認依頼 [${riskBadge}]`,
    `---`,
    preview,
    `---`,
    `draft_id: ${dbDraftId}`,
    `承認: approve:${dbDraftId}`,
    `却下: reject:${dbDraftId}`,
    `(この ID を含む返信で承認/却下が確定します)`,
  ].join("\n");

  await pushLine(to, message, token);
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
// runPostJob — main entry point
// ============================================================
export async function runPostJob(slot: string, env: Env): Promise<void> {
  if (!(await guardsPass(env, slot))) return;

  const row = await dequeueIdeaRow(env, slot);
  if (!row) {
    await notifyLine(env, `[${slot}] core_ideas が空 — スキップ`);
    return;
  }

  const idea = toCoreIdea(row);
  const draft = await draftForX(idea);

  const dbDraftId = crypto.randomUUID();

  const ein: EditorInput = {
    traceId: crypto.randomUUID(),
    draftId: dbDraftId,
    coreIdeaId: idea.id,
    platform: "x",
    body: draft.body,
    fmat: idea.fmat as EditorInput["fmat"],
    sourceMaterialIds: idea.sourceMaterialIds,
    hasAffiliateLink: false,
  };

  const out = await runEditor(ein);

  await persistDraft(env, {
    id: dbDraftId,
    idea,
    draft,
    out,
    slot,
    date: jstDate(new Date()),
  });

  if (out.decision === "approved") {
    await pushApproval(env, dbDraftId, draft.body, out);
  } else {
    await logRejectToDigest(env, dbDraftId, out.rejectReasons);
  }
}
