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
// 投稿層は Phase 1 で「予約待ちストック化」へ移行。X API 直投 (publishToX) は
// 承認フローから切り離した。実投稿は Phase 2 の chrome-devtools 予約投稿が担う。
import { pushLine } from "../../lib/line/line-client.js";
import { runEditor } from "../../lib/editor/pipeline.js";
import { reviseDraftForX } from "../../lib/writer/writer-x.js";
import {
  addStyleFeedback,
  getRecentStyleFeedback,
} from "../../lib/feedback/style-feedback.js";
import {
  buildEditorInput,
  fetchSourceMaterialTexts,
  persistDraft,
  pushApproval,
  toCoreIdea,
} from "./post-job.js";
import type { CoreIdeaRow } from "./post-job.js";
import type { CoreIdea } from "../../lib/writer/types.js";
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
import { withTrace } from "../../lib/trace/with-trace.js";

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
// resolveRunIdForDraft — draft の run_id を引いて trace 相関に使う。
//   fetchDraft は draftId → { run_id? } | null を返す関数 (DI でテスト可能)。
//   run_id 無し / draft 無しなら undefined (後方互換: trace を諦め既存処理のみ)。
// ============================================================
export async function resolveRunIdForDraft(
  draftId: string,
  fetchDraft: (id: string) => Promise<{ run_id?: string | null } | null>,
): Promise<string | undefined> {
  const d = await fetchDraft(draftId);
  return d?.run_id ?? undefined;
}

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
// 承認/却下は承認UI(xad-dashboard /approval)へ一本化した。
// LINE 側の approve/reject ボタン・ハンドラ・自由文 approve/reject 経路は撤去し、
// 「承認はUIで」と案内する。LINE に残すのは 修正:/覚えて: と interview のみ。
// ============================================================
const APPROVE_VIA_UI_MSG =
  "✅ 承認・却下は承認画面（/approval）で行ってください。本文の編集もそこでできます。";

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
  run_id?: string | null;
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
      .select("id, core_idea_id, body, fmat, scheduled_date, slot, run_id")
      .eq("id", targetDraftId)
      .is("published_at", null)
      .maybeSingle();
    if (error) return { row: null, error: error.message };
    if (data) return { row: data as ReviseDraftRow, error: null };
    // 引用先が見つからない (公開済 or 不明) → latest-pending にフォールバック。
  }

  const { data, error } = await sb
    .from("post_drafts")
    .select("id, core_idea_id, body, fmat, scheduled_date, slot, run_id")
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
  ctx?: ExecutionContext,
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

  // A10: 元 run があれば writer/editor 再実行を revision として記録する。
  //      run_id 無し (旧 draft) なら trace を諦め既存処理のみ (後方互換)。
  const runId = draft.run_id ?? undefined;

  // 2. 過去フィードバックを SOFT reference として注入し書き直す。
  const refFb = await getRecentStyleFeedback(env);
  const revised = runId
    ? await withTrace(
        ctx,
        { runId, stageId: "writer", input: { revision: true } },
        async () => {
          const d = await reviseDraftForX(draft.body, instruction, idea, refFb);
          return { result: d, output: { body: d.body } };
        },
      )
    : await reviseDraftForX(draft.body, instruction, idea, refFb);

  // 3. 同じ dbDraftId / 行で editor を再実行。
  //    X6 出典グラウンディング (事実チェック) 用に素材本文を取得して渡す。
  const sourceTexts = await fetchSourceMaterialTexts(env, idea.sourceMaterialIds);
  const ein = buildEditorInput(idea, revised.body, draft.id, sourceTexts);
  const out = runId
    ? await withTrace(
        ctx,
        { runId, stageId: "editor", input: { revision: true } },
        async () => {
          const e = await runEditor(ein);
          return {
            result: e,
            output: { decision: e.decision },
            outcome: e.decision,
          };
        },
      )
    : await runEditor(ein);

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
    if (runId) {
      await withTrace(
        ctx,
        { runId, stageId: "line-approval", input: { revision: true } },
        async () => {
          await pushApproval(env, draft.id, revised.body, out, idea.fmat);
          return { result: undefined, outcome: "requested" };
        },
      );
    } else {
      await pushApproval(env, draft.id, revised.body, out, idea.fmat);
    }
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
  ctx?: ExecutionContext,
): Promise<void> {
  const result = await classifyReplyIntent(text);

  switch (result.intent) {
    case "approve":
    case "reject":
      // 承認/却下は承認UIへ一本化。LINE では受け付けず案内する。
      await notify(env, APPROVE_VIA_UI_MSG);
      return;
    case "revise": {
      const instruction = result.instruction || text;
      await handleReviseFeedback(instruction, env, targetDraftId, ctx);
      return;
    }
    case "remember": {
      await handleRememberFeedback(result.note || text, env);
      return;
    }
    case "approve_and_remember": {
      // メモは保存（remember は残置）。承認自体はUIで。
      await addStyleFeedback(env, "remember", result.note || text);
      await notify(env, `覚えました（今後の参考にします）。\n${APPROVE_VIA_UI_MSG}`);
      return;
    }
    case "none":
    default:
      await notify(
        env,
        "判断できませんでした。「修正: <指示>」「覚えて: <指示>」のいずれかで指示してください。" +
          "（承認・却下は承認画面 /approval で行います）",
      );
      return;
  }
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
export async function handleLineEvent(
  payload: unknown,
  env: Env,
  ctx?: ExecutionContext,
): Promise<void> {
  // Authorization: only the admin (operator) may drive any LINE action.
  // The webhook signature proves the request came from LINE, but NOT who sent it —
  // without this, any LINE user could send `approve:<id>` and trigger a public X post.
  const adminId = lineUserId(env);
  const senderId = eventSenderId(payload);
  if (!adminId || senderId !== adminId) {
    console.warn("[line-event] unauthorized sender ignored", { senderId });
    return;
  }

  // 承認/却下は承認UIへ一本化（LINE の approve:/reject: postback 経路は撤去）。
  // text message のみ受け付ける（postback / follow 等は parseTextMessage が null → no-op）。
  const textMsg = parseTextMessage(payload);
  if (!textMsg) return;

  // 旧 approve:/reject: テキストが来た場合は承認UIへ案内（誤操作の取りこぼし防止）。
  if (/^(approve|reject):/.test(textMsg.text)) {
    await notify(env, APPROVE_VIA_UI_MSG);
    return;
  }

  // 引用リプライ先 (あれば) から対象 draft_id を先に解決する。
  const quotedDraftId = await resolveQuotedDraftId(payload, env);

  // 2/3. 明示プレフィックス 覚えて: / 修正: → 即処理 (LLM を呼ばない cheap path)。
  const fb = parseFeedbackCommand(textMsg.text);
  if (fb) {
    if (fb.kind === "remember") {
      await handleRememberFeedback(fb.instruction, env);
    } else {
      // 修正: 引用先 draft → なければ latest-pending。
      await handleReviseFeedback(fb.instruction, env, quotedDraftId, ctx);
    }
    return;
  }

  // 4. interview-flow message → interview。
  if (await hasActiveInterview(textMsg.lineUserId)) {
    await handleInterviewText(textMsg.lineUserId, textMsg.text, env);
    return;
  }

  // 5. else 自由文 → Haiku で意図判定して処理 (free-text のみ LLM)。
  await handleFreeTextIntent(textMsg.text, env, quotedDraftId, ctx);
}
