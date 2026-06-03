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
import {
  createSession,
  loadSession,
  nextQuestion,
  recordAnswer,
  saveSession,
} from "../../lib/interviewer/line-flow.js";
import type { Answer } from "../../lib/interviewer/types.js";

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
// handleInterviewText — W4-3: text message → interviewer flow
// ============================================================

/**
 * Extract lineUserId and text from a LINE message event.
 * Returns null if the event is not a text message.
 */
function parseTextMessage(payload: unknown): { lineUserId: string; text: string } | null {
  if (typeof payload !== "object" || payload === null) return null;
  const ev = payload as Record<string, unknown>;
  if (ev.type !== "message") return null;

  const msg = ev.message as Record<string, unknown> | undefined;
  if (msg?.type !== "text" || typeof msg?.text !== "string") return null;

  const source = ev.source as Record<string, unknown> | undefined;
  const lineUserId = (typeof source?.userId === "string" && source.userId) ||
    lineUserId_env(undefined);
  if (!lineUserId) return null;

  return { lineUserId, text: msg.text.trim() };
}

function lineUserId_env(env: Env | undefined): string {
  return (env?.LINE_USER_ID_OFMETON) || process.env.LINE_USER_ID_OFMETON || "";
}

async function handleInterviewText(
  lineUserId: string,
  text: string,
  env: Env,
): Promise<void> {
  const token = lineToken(env);
  const sessionId = lineUserId; // 1:1 user→session; id = lineUserId

  // Load or create session
  let session = await loadSession(sessionId);
  if (!session || session.finalized) {
    // Start a new interview session (default industry=generic, topic=業務改善)
    session = createSession({
      id: sessionId,
      line_user_id: lineUserId,
      industry: "generic",
      topic: "業務改善",
    });
  }

  // Get next question BEFORE recording (so we know what step/pattern this answer belongs to)
  const currentQ = await nextQuestion(session);
  if (!currentQ) {
    // Session already finalized or no more questions
    if (token && lineUserId) {
      await pushLine(lineUserId, "インタビューは完了しています。ありがとうございました！", token);
    }
    return;
  }

  // Record the user's answer to the current question
  const answer: Answer = {
    step: currentQ.step,
    pattern_id: currentQ.pattern_id,
    question_text: currentQ.text,
    answer_text: text,
    received_at: new Date().toISOString(),
  };
  await recordAnswer(session, answer);

  // Save updated session to DB
  await saveSession(session);

  // Get the next question to ask (after advancing)
  const nextQ = await nextQuestion(session);

  if (!nextQ || session.finalized) {
    // Interview complete
    if (token && lineUserId) {
      await pushLine(
        lineUserId,
        "インタビューありがとうございました！素材を受け付けました。投稿準備が整いましたらお知らせします。",
        token,
      );
    }
  } else {
    // Send next question
    if (token && lineUserId) {
      await pushLine(lineUserId, nextQ.text, token);
    }
  }
}

// ============================================================
// Authorization helper — extract sender userId from LINE event payload
// ============================================================
function eventSenderId(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const src = (payload as Record<string, unknown>).source as Record<string, unknown> | undefined;
  return typeof src?.userId === "string" ? src.userId : null;
}

// ============================================================
// Main export
// ============================================================
export async function handleLineEvent(payload: unknown, env: Env): Promise<void> {
  // Authorization: only the admin (operator) may drive any LINE action.
  // The webhook signature proves the request came from LINE, but NOT who sent it —
  // without this, any LINE user could send `approve:<id>` and trigger a public X post.
  const adminId = lineUserId(env);
  const senderId = eventSenderId(payload);
  if (!adminId || senderId !== adminId) {
    console.warn("[line-event] unauthorized sender ignored", { senderId });
    return;
  }

  const intent = parseApprovalIntent(payload);

  if (intent) {
    if (intent.action === "approve") {
      await handleApprove(intent.draftId, env);
    } else {
      await handleReject(intent.draftId, env);
    }
    return;
  }

  // W4-3: text message → interviewer flow
  const textMsg = parseTextMessage(payload);
  if (textMsg) {
    await handleInterviewText(textMsg.lineUserId, textMsg.text, env);
  }
}
