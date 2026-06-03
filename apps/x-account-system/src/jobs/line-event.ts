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
import { runEditor } from "../../lib/editor/pipeline.js";
import { reviseDraftForX } from "../../lib/writer/writer-x.js";
import {
  addStyleFeedback,
  getRecentStyleFeedback,
} from "../../lib/feedback/style-feedback.js";
import {
  buildEditorInput,
  persistDraft,
  pushApproval,
  toCoreIdea,
} from "./post-job.js";
import type { CoreIdeaRow } from "./post-job.js";
import type { EditorOutput } from "../../lib/editor/types.js";
import type { CoreIdea } from "../../lib/writer/types.js";
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
import { lookupDraftByMessage } from "../../lib/line/message-map.js";
import { classifyReplyIntent } from "../../lib/feedback/intent-classifier.js";

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
// handleApprove — load draft, claim, publish, record results
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

  // 2. Idempotency fast-path: already has published_at → no-op
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
  const priorApprovalStatus = draft.human_approval_status;
  const nowIso = new Date().toISOString();

  // 4. Atomic claim: set published_at + approved ONLY if published_at IS NULL.
  //    If another invocation already claimed it, .select("id") returns 0 rows.
  const { data: claimData, error: claimErr } = await sb
    .from("post_drafts")
    .update({ published_at: nowIso, human_approval_status: "approved" })
    .eq("id", draftId)
    .is("published_at", null)
    .select("id");

  if (claimErr) {
    console.error("[line-event] post_drafts claim error:", claimErr.message);
    throw new Error(`[line-event] post_drafts claim failed: ${claimErr.message}`);
  }

  const claimed = Array.isArray(claimData) ? claimData : [];
  if (claimed.length === 0) {
    // Another invocation already claimed this draft — it is being (or was) published.
    await notify(env, `ℹ️ draft_id=${draftId} は既に処理済み/公開済みです`);
    return;
  }

  // 5. Attempt to publish (claim is held; roll back on failure)
  let result: Awaited<ReturnType<typeof publishToX>>;
  try {
    result = await publishToX({
      draftId,
      body: draft.body,
      fmat,
      editorOutput,
      dryRun: false,
      highRiskApproved: true,
      noBackoff: false,
    });
  } catch (publishErr) {
    // Roll back claim so the draft is re-approvable
    await sb
      .from("post_drafts")
      .update({ published_at: null, human_approval_status: priorApprovalStatus })
      .eq("id", draftId);
    throw publishErr;
  }

  if (result.status === "published" && result.tweetId) {
    // published_at + human_approval_status already committed in the claim step.

    // 5a. Insert posted_records
    const { error: insertErr } = await sb.from("posted_records").insert({
      trace_id: crypto.randomUUID(),
      draft_id: draftId,
      platform: "x",
      platform_post_id: result.tweetId,
      scheduled_at: nowIso,
      posted_at: nowIso,
      via_fallback: false,
    });
    if (insertErr) {
      // Non-fatal: post is already live on X; log for reconciliation.
      console.error("[line-event] posted_records insert error (post IS live on X):", insertErr.message);
    }

    // 5b. Update core_ideas.status = 'published'
    const { error: ideaErr } = await sb
      .from("core_ideas")
      .update({ status: "published" })
      .eq("id", draft.core_idea_id);
    if (ideaErr) {
      console.error("[line-event] core_ideas update error:", ideaErr.message);
    }

    // 5c. Success notification
    await notify(
      env,
      `✅ 投稿完了\ndraft_id: ${draftId}\ntweetId: ${result.tweetId}\nposted_at: ${nowIso}`,
    );
  } else {
    // blocked or failed — roll back the claim so the draft is re-approvable
    const { error: rollbackErr } = await sb
      .from("post_drafts")
      .update({ published_at: null, human_approval_status: priorApprovalStatus })
      .eq("id", draftId);
    if (rollbackErr) {
      console.error("[line-event] claim rollback error:", rollbackErr.message);
    }

    const reason =
      result.status === "blocked"
        ? `blocked: ${result.blockedReason ?? "unknown"}`
        : result.error ?? "unknown error";
    await notify(env, `⚠️ 投稿失敗 (${result.status}): ${reason}\ndraft_id: ${draftId}`);
  }
}

// ============================================================
// handleReject — mark draft rejected and return core_idea to queue
// ============================================================
async function handleReject(draftId: string, env: Env): Promise<void> {
  const sb = getSupabase(env);
  if (!sb) {
    console.error("[line-event] Supabase not configured");
    return;
  }

  // 1. Update post_drafts.human_approval_status = 'rejected'
  const { data: draftData, error } = await sb
    .from("post_drafts")
    .update({ human_approval_status: "rejected" })
    .eq("id", draftId)
    .select("id, core_idea_id");

  if (error) {
    console.error("[line-event] post_drafts reject update error:", error.message);
    await notify(env, `⚠️ 却下処理エラー: DBエラー (${error.message})`);
    return;
  }

  // 2. Return the core_idea to the queue (status → 'draft') so it can be re-processed
  const rows = Array.isArray(draftData) ? draftData : [];
  const coreIdeaId: string | null = rows.length > 0
    ? (rows[0] as { id: string; core_idea_id: string }).core_idea_id
    : null;

  if (coreIdeaId) {
    const { error: ideaErr } = await sb
      .from("core_ideas")
      .update({ status: "draft" })
      .eq("id", coreIdeaId);
    if (ideaErr) {
      console.error("[line-event] core_ideas revert error:", ideaErr.message);
    }
  } else {
    console.warn("[line-event] handleReject: could not determine core_idea_id for draft", draftId);
  }

  await notify(env, `🚫 却下しました\ndraft_id: ${draftId}`);
}

// ============================================================
// Japanese feedback commands — 覚えて: / 修正:
// 全角コロン「：」と半角「:」の両方を受け付け、前後 whitespace を trim。
// ============================================================
function parseFeedbackCommand(
  text: string,
): { kind: "remember" | "revise"; instruction: string } | null {
  const trimmed = text.trim();
  // 「覚えておいて」も許容。コロンの後ろに本文。
  const remember = trimmed.match(/^覚えて(おいて)?\s*[:：]\s*([\s\S]+)$/);
  if (remember) {
    const instruction = remember[2].trim();
    if (instruction) return { kind: "remember", instruction };
  }
  const revise = trimmed.match(/^修正\s*[:：]\s*([\s\S]+)$/);
  if (revise) {
    const instruction = revise[1].trim();
    if (instruction) return { kind: "revise", instruction };
  }
  return null;
}

// ============================================================
// handleRememberFeedback — 覚えて: <text>
// 継続参考ガイダンスとして保存する (draft 不要)。
// ============================================================
async function handleRememberFeedback(instruction: string, env: Env): Promise<void> {
  await addStyleFeedback(env, "remember", instruction);
  await notify(env, `覚えました（今後の参考にします）: ${instruction}`);
}

// ============================================================
// 修正対象の post_drafts row (revise で必要な列)
// ============================================================
type ReviseDraftRow = {
  id: string;
  core_idea_id: string;
  body: string;
  fmat: string | null;
  scheduled_date: string | null;
  slot: string | null;
};

// ============================================================
// loadCoreIdeaForRevise — core_ideas を引いて CoreIdea を復元
// 見つからなければ post_drafts の fmat から最小 CoreIdea を再構成。
// ============================================================
async function loadCoreIdeaForRevise(
  sb: SupabaseClient,
  draft: ReviseDraftRow,
): Promise<CoreIdea> {
  const { data, error } = await sb
    .from("core_ideas")
    .select("id, topic, title, summary, primary_hook, fmat, category, audience, source_material_ids, meta")
    .eq("id", draft.core_idea_id)
    .maybeSingle();

  if (!error && data) {
    return toCoreIdea(data as CoreIdeaRow);
  }

  // フォールバック: post_drafts の情報だけで最小 CoreIdea を再構成。
  return toCoreIdea({
    id: draft.core_idea_id,
    fmat: draft.fmat ?? "medium",
    category: "first_hand",
  });
}

// ============================================================
// loadTargetDraftForRevise — 修正/自由文の対象 draft を解決する。
//   targetDraftId 指定あり (引用リプライ) → その draft を引く。
//   なければ 最新の pending かつ未公開の下書き (created_at desc)。
// ============================================================
async function loadTargetDraftForRevise(
  sb: SupabaseClient,
  targetDraftId: string | null,
): Promise<{ row: ReviseDraftRow | null; error: string | null }> {
  if (targetDraftId) {
    const { data, error } = await sb
      .from("post_drafts")
      .select("id, core_idea_id, body, fmat, scheduled_date, slot")
      .eq("id", targetDraftId)
      .is("published_at", null)
      .maybeSingle();
    if (error) return { row: null, error: error.message };
    if (data) return { row: data as ReviseDraftRow, error: null };
    // 引用先が見つからない (公開済 or 不明) → latest-pending にフォールバック。
  }

  const { data, error } = await sb
    .from("post_drafts")
    .select("id, core_idea_id, body, fmat, scheduled_date, slot")
    .eq("human_approval_status", "pending")
    .is("published_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { row: null, error: error.message };
  return { row: (data as ReviseDraftRow) ?? null, error: null };
}

// ============================================================
// handleReviseFeedback — 修正: <text>
// 引用リプライ先 (targetDraftId) があればその draft、なければ
// 直近の pending かつ未公開の post_drafts を書き直して再送する。
// ============================================================
async function handleReviseFeedback(
  instruction: string,
  env: Env,
  targetDraftId: string | null = null,
): Promise<void> {
  const sb = getSupabase(env);
  if (!sb) {
    console.error("[line-event] Supabase not configured");
    return;
  }

  // 1. 対象の下書きを解決 (引用先 → なければ latest-pending)。
  const { row: data, error } = await loadTargetDraftForRevise(sb, targetDraftId);

  if (error) {
    console.error("[line-event] revise select error:", error);
    await notify(env, `⚠️ 修正処理エラー: DBエラー (${error})`);
    return;
  }
  if (!data) {
    await notify(env, "対象の下書きが見つかりません");
    return;
  }

  const draft = data;
  const idea = await loadCoreIdeaForRevise(sb, draft);

  // 2. 過去フィードバックを SOFT reference として注入し書き直す。
  const refFb = await getRecentStyleFeedback(env);
  const revised = await reviseDraftForX(draft.body, instruction, idea, refFb);

  // 3. 同じ dbDraftId / 行で editor を再実行。
  const ein = buildEditorInput(idea, revised.body, draft.id);
  const out = await runEditor(ein);

  // 4. 同じ post_drafts 行を upsert (id / scheduled_date / slot を維持)。
  await persistDraft(env, {
    id: draft.id,
    idea,
    draft: revised,
    out,
    slot: draft.slot ?? "manual",
    date: draft.scheduled_date ?? new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" }),
  });

  // 5. 修正指示も継続参考として保存。
  await addStyleFeedback(env, "revise", instruction, draft.id);

  // 6. editor 判定に応じて再送 / 却下理由を返す。
  if (out.decision === "approved") {
    await pushApproval(env, draft.id, revised.body, out, idea.fmat);
  } else {
    const reasons = out.rejectReasons.join(", ") || "(no reasons)";
    await notify(
      env,
      `⚠️ 修正後も editor が却下しました\n理由: ${reasons}\nもう一度「修正: <指示>」で調整できます。\ndraft_id: ${draft.id}`,
    );
  }
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

/**
 * 引用リプライの quotedMessageId を取り出す。
 * LINE message event では payload.message.quotedMessageId に引用元 message id が入る。
 * 引用なしなら null。
 */
function parseQuotedMessageId(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const ev = payload as Record<string, unknown>;
  if (ev.type !== "message") return null;
  const msg = ev.message as Record<string, unknown> | undefined;
  const q = msg?.quotedMessageId;
  return typeof q === "string" && q.length > 0 ? q : null;
}

/**
 * 引用元 message id から対象 draft_id を解決する (なければ null)。
 * 失敗しても throw しない (latest-pending fallback がある)。
 */
async function resolveQuotedDraftId(payload: unknown, env: Env): Promise<string | null> {
  const quoted = parseQuotedMessageId(payload);
  if (!quoted) return null;
  try {
    return await lookupDraftByMessage(env, quoted);
  } catch (e) {
    console.warn("[line-event] lookupDraftByMessage failed:", (e as Error).message);
    return null;
  }
}

/**
 * 進行中の interview session があるか (free-text を interview に回すべきか) を判定する。
 * finalized でない session が存在すれば interview-flow。
 */
async function hasActiveInterview(lineUserId: string): Promise<boolean> {
  try {
    const session = await loadSession(lineUserId);
    return !!session && !session.finalized;
  } catch (e) {
    console.warn("[line-event] loadSession check failed:", (e as Error).message);
    return false;
  }
}

// ============================================================
// handleFreeTextIntent — 自由文 (ボタンでも 修正:/覚えて: でもない) を
// Haiku で意図判定して処理する。対象 draft は引用先 → なければ latest-pending。
// ============================================================
async function handleFreeTextIntent(
  text: string,
  env: Env,
  targetDraftId: string | null,
): Promise<void> {
  const result = await classifyReplyIntent(text);

  switch (result.intent) {
    case "approve": {
      const id = await resolveLatestPendingDraftId(env, targetDraftId);
      if (!id) {
        await notify(env, "承認対象の下書きが見つかりません");
        return;
      }
      await handleApprove(id, env);
      return;
    }
    case "reject": {
      const id = await resolveLatestPendingDraftId(env, targetDraftId);
      if (!id) {
        await notify(env, "却下対象の下書きが見つかりません");
        return;
      }
      await handleReject(id, env);
      return;
    }
    case "revise": {
      const instruction = result.instruction || text;
      await handleReviseFeedback(instruction, env, targetDraftId);
      return;
    }
    case "remember": {
      await handleRememberFeedback(result.note || text, env);
      return;
    }
    case "approve_and_remember": {
      const id = await resolveLatestPendingDraftId(env, targetDraftId);
      if (id) await handleApprove(id, env);
      await addStyleFeedback(env, "remember", result.note || text, id ?? undefined);
      await notify(env, "覚えました（今後の参考にします）");
      return;
    }
    case "none":
    default:
      await notify(
        env,
        "判断できませんでした。「承認」「却下」「修正: <指示>」「覚えて: <指示>」のいずれかで指示してください。" +
          "（カードに引用リプライすると対象を特定できます）",
      );
      return;
  }
}

/**
 * approve/reject の対象 draft_id を解決する。
 * targetDraftId (引用先) があればそれを使い、なければ latest-pending を引く。
 */
async function resolveLatestPendingDraftId(
  env: Env,
  targetDraftId: string | null,
): Promise<string | null> {
  if (targetDraftId) return targetDraftId;
  const sb = getSupabase(env);
  if (!sb) return null;
  const { data, error } = await sb
    .from("post_drafts")
    .select("id")
    .eq("human_approval_status", "pending")
    .is("published_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[line-event] resolveLatestPendingDraftId error:", error.message);
    return null;
  }
  if (!data) return null;
  const id = (data as { id?: unknown }).id;
  return typeof id === "string" ? id : null;
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

  // 1. approve:/reject: (postback + text) → 即処理 (LLM を呼ばない cheap path)。
  const intent = parseApprovalIntent(payload);
  if (intent) {
    if (intent.action === "approve") {
      await handleApprove(intent.draftId, env);
    } else {
      await handleReject(intent.draftId, env);
    }
    return;
  }

  const textMsg = parseTextMessage(payload);
  if (!textMsg) return;

  // 引用リプライ先 (あれば) から対象 draft_id を先に解決する。
  const quotedDraftId = await resolveQuotedDraftId(payload, env);

  // 2/3. 明示プレフィックス 覚えて: / 修正: → 即処理 (LLM を呼ばない cheap path)。
  const fb = parseFeedbackCommand(textMsg.text);
  if (fb) {
    if (fb.kind === "remember") {
      await handleRememberFeedback(fb.instruction, env);
    } else {
      // 修正: 引用先 draft → なければ latest-pending。
      await handleReviseFeedback(fb.instruction, env, quotedDraftId);
    }
    return;
  }

  // 4. interview-flow message → interview。
  if (await hasActiveInterview(textMsg.lineUserId)) {
    await handleInterviewText(textMsg.lineUserId, textMsg.text, env);
    return;
  }

  // 5. else 自由文 → Haiku で意図判定して処理 (free-text のみ LLM)。
  await handleFreeTextIntent(textMsg.text, env, quotedDraftId);
}
