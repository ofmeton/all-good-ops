/**
 * line-event.ts — W4-2
 *
 * LINE postback/text-message handler for admin approval flow.
 *
 * Handles:
 *   postback.data === "approve:<dbDraftId>"
 *   postback.data === "reject:<dbDraftId>"
 *   message.text  === "approve:<dbDraftId>"  (text-only fallback)
 *   message.text  === "reject:<dbDraftId>"   (text-only fallback)
 *
 * On approve:
 *   1. Load post_drafts row (incl. editor_output jsonb)
 *   2. Idempotency check: if published_at already set → push "既に公開済" and return
 *   3. Build PublishRequest from stored editor_output (NEVER re-run runEditor)
 *   4. publishToX (highRiskApproved=true, dryRun=false)
 *   5. On published: insert posted_records, update post_drafts, update core_ideas
 *
 * On reject:
 *   1. Update post_drafts.human_approval_status = 'rejected'
 *   2. Push acknowledgement
 *
 * W4-3 will extend this handler for interviewer text flow.
 */

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publishToX } from "../../lib/publisher/x-publisher.js";
import { pushLine } from "../../lib/line/line-client.js";
import type { EditorOutput } from "../../lib/editor/types.js";
import type { PublishFormat } from "../../lib/publisher/types.js";
import type { Env } from "../worker.js";

// ============================================================
// Supabase client factory (same pattern as post-job.ts)
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
// post_drafts row shape (columns we need)
// ============================================================
type PostDraftRow = {
  id: string;
  core_idea_id: string;
  body: string;
  fmat: string | null;
  published_at: string | null;
  human_approval_status: string;
  editor_output: EditorOutput | null;
};

// ============================================================
// LINE helpers
// ============================================================
function lineUserId(env: Env): string {
  return env.LINE_USER_ID_OFMETON || process.env.LINE_USER_ID_OFMETON || "";
}
function lineToken(env: Env): string {
  return env.LINE_CHANNEL_ACCESS_TOKEN || process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
}

async function notify(env: Env, message: string): Promise<void> {
  const to = lineUserId(env);
  const token = lineToken(env);
  if (!to || !token) {
    console.warn("[line-event] LINE credentials not set, skipping push");
    return;
  }
  await pushLine(to, message, token);
}

// ============================================================
// Extract approve/reject intent from LINE event payload
// Returns { action: 'approve' | 'reject', draftId: string } or null
// ============================================================
function parseApprovalIntent(
  payload: unknown,
): { action: "approve" | "reject"; draftId: string } | null {
  if (typeof payload !== "object" || payload === null) return null;
  const ev = payload as Record<string, unknown>;

  let data: string | null = null;

  // postback event
  if (ev.type === "postback") {
    const postback = ev.postback as Record<string, unknown> | undefined;
    if (typeof postback?.data === "string") {
      data = postback.data;
    }
  }

  // text message fallback
  if (ev.type === "message") {
    const msg = ev.message as Record<string, unknown> | undefined;
    if (msg?.type === "text" && typeof msg?.text === "string") {
      data = msg.text.trim();
    }
  }

  if (!data) return null;

  const approveMatch = data.match(/^approve:(.+)$/);
  if (approveMatch) return { action: "approve", draftId: approveMatch[1].trim() };

  const rejectMatch = data.match(/^reject:(.+)$/);
  if (rejectMatch) return { action: "reject", draftId: rejectMatch[1].trim() };

  return null;
}

// ============================================================
// handleApprove — load draft, publish, record results
// ============================================================
async function handleApprove(draftId: string, env: Env): Promise<void> {
  const sb = getSupabase(env);
  if (!sb) {
    console.error("[line-event] Supabase not configured");
    return;
  }

  // 1. Load post_drafts row
  const { data, error } = await sb
    .from("post_drafts")
    .select("id, core_idea_id, body, fmat, published_at, human_approval_status, editor_output")
    .eq("id", draftId)
    .maybeSingle();

  if (error) {
    console.error("[line-event] post_drafts select error:", error.message);
    await notify(env, `⚠️ 承認処理エラー: DBエラー (${error.message})`);
    return;
  }

  if (!data) {
    await notify(env, `⚠️ draft_id=${draftId} が見つかりません`);
    return;
  }

  const draft = data as PostDraftRow;

  // 2. Idempotency check
  if (draft.published_at !== null) {
    await notify(env, `ℹ️ draft_id=${draftId} は既に公開済です (published_at: ${draft.published_at})`);
    return;
  }

  // 3. Restore EditorOutput from jsonb — NEVER re-run runEditor
  const editorOutput = draft.editor_output;
  if (!editorOutput) {
    await notify(env, `⚠️ draft_id=${draftId} の editor_output が保存されていません`);
    return;
  }

  const fmat = (draft.fmat ?? "medium") as PublishFormat;

  // 4. publishToX (highRiskApproved=true because a HUMAN approved, dryRun=false)
  const result = await publishToX({
    draftId,
    body: draft.body,
    fmat,
    editorOutput,
    dryRun: false,
    highRiskApproved: true,
    noBackoff: false,
  });

  if (result.status === "published" && result.tweetId) {
    const now = new Date().toISOString();

    // 5a. Insert posted_records
    const { error: insertErr } = await sb.from("posted_records").insert({
      trace_id: crypto.randomUUID(),
      draft_id: draftId,
      platform: "x",
      platform_post_id: result.tweetId,
      scheduled_at: now,
      posted_at: now,
      via_fallback: false,
    });
    if (insertErr) {
      console.error("[line-event] posted_records insert error:", insertErr.message);
    }

    // 5b. Update post_drafts: human_approval_status + published_at
    const { error: draftErr } = await sb
      .from("post_drafts")
      .update({ human_approval_status: "approved", published_at: now })
      .eq("id", draftId);
    if (draftErr) {
      console.error("[line-event] post_drafts update error:", draftErr.message);
    }

    // 5c. Update core_ideas.status = 'published'
    const { error: ideaErr } = await sb
      .from("core_ideas")
      .update({ status: "published" })
      .eq("id", draft.core_idea_id);
    if (ideaErr) {
      console.error("[line-event] core_ideas update error:", ideaErr.message);
    }

    // 5d. Success notification
    await notify(
      env,
      `✅ 投稿完了\ndraft_id: ${draftId}\ntweetId: ${result.tweetId}\nposted_at: ${now}`,
    );
  } else {
    // blocked or failed — leave state unchanged, push reason
    const reason =
      result.status === "blocked"
        ? `blocked: ${result.blockedReason ?? "unknown"}`
        : result.error ?? "unknown error";
    await notify(env, `⚠️ 投稿失敗 (${result.status}): ${reason}\ndraft_id: ${draftId}`);
  }
}

// ============================================================
// handleReject — mark draft rejected
// ============================================================
async function handleReject(draftId: string, env: Env): Promise<void> {
  const sb = getSupabase(env);
  if (!sb) {
    console.error("[line-event] Supabase not configured");
    return;
  }

  const { error } = await sb
    .from("post_drafts")
    .update({ human_approval_status: "rejected" })
    .eq("id", draftId);

  if (error) {
    console.error("[line-event] post_drafts reject update error:", error.message);
    await notify(env, `⚠️ 却下処理エラー: DBエラー (${error.message})`);
    return;
  }

  await notify(env, `🚫 却下しました\ndraft_id: ${draftId}`);
}

// ============================================================
// Main export
// ============================================================
export async function handleLineEvent(payload: unknown, env: Env): Promise<void> {
  const intent = parseApprovalIntent(payload);

  if (!intent) {
    // W4-3 will extend this for interviewer text flow
    // For now: no-op / TODO marker
    return;
  }

  if (intent.action === "approve") {
    await handleApprove(intent.draftId, env);
  } else {
    await handleReject(intent.draftId, env);
  }
}
