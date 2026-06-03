/**
 * LINE 5 ステップ Interviewer flow (PR-D)
 *
 * SSoT: main-design-all-versions.md §6.2.5 LINE 完結方式
 *
 * Phase 0.5 fallback:
 *   IN_MEMORY_FALLBACK=true → Supabase 呼ばず in-memory map に session を保持
 *   LINE_DRY_RUN=true → 送信は console.log のみ
 *
 * 公開許諾 gate:
 *   Step 4 で consent_explicit に対し 'granted' を得た時のみ
 *   materials_store に publication_consent='granted' で INSERT
 *   denied / 曖昧 → INSERT せず session を internal_only で完了
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { pushLine } from "../line/line-client.ts";
import {
  parseConsent,
  pickPattern,
  renderQuestion,
} from "./questions.ts";
import type {
  Answer,
  Industry,
  InterviewSession,
  MaterialDraft,
  Question,
  StepName,
} from "./types.ts";

const stepOrder: StepName[] = [
  "kickoff",
  "dig_attempt",
  "dig_metrics",
  "consent_gate",
  "closure",
];

function isFallback(): boolean {
  return process.env.IN_MEMORY_FALLBACK === "true";
}

function isDryRun(): boolean {
  return process.env.LINE_DRY_RUN === "true" || isFallback();
}

let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (isFallback()) return null;
  if (
    !_supabase &&
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    _supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { db: { schema: process.env.SUPABASE_SCHEMA || "public" } },
    );
  }
  return _supabase;
}

/**
 * In-memory session store for Phase 0.5 fallback.
 * 本番では Supabase の interview_records テーブルに永続化する。
 */
const sessionStore = new Map<string, InterviewSession>();

export function createSession(args: {
  id: string;
  line_user_id: string;
  industry: Industry;
  topic: string;
}): InterviewSession {
  const now = new Date().toISOString();
  const session: InterviewSession = {
    id: args.id,
    line_user_id: args.line_user_id,
    current_step: "kickoff",
    industry: args.industry,
    topic: args.topic,
    answers: [],
    publication_consent: "pending",
    finalized: false,
    created_at: now,
    updated_at: now,
  };
  sessionStore.set(args.id, session);
  return session;
}

export function getSession(id: string): InterviewSession | undefined {
  return sessionStore.get(id);
}

/**
 * 現状の Step に応じた次の質問を返す。
 * - finalized → null
 * - consent_gate で denied 確定 → null (closure を skip して session 完了)
 */
export async function nextQuestion(
  session: InterviewSession,
): Promise<Question | null> {
  if (session.finalized) return null;

  // consent_gate で既に denied になっていれば closure に進む権利を与える
  // (closure では投稿予定日を聞かず、別途 thank-you に短絡)
  const stepAnswers = session.answers.filter((a) => a.step === session.current_step);
  const turn = stepAnswers.length;

  const pattern_id = pickPattern(session.current_step, turn);
  const q = renderQuestion(
    session.current_step,
    pattern_id,
    session.industry,
    session.topic,
  );
  return q;
}

/**
 * 質問への回答を記録し、次の Step に進むか判定する。
 * Step 進行の rule:
 *   kickoff: 1 turn で次へ
 *   dig_attempt: 1 turn で次へ
 *   dig_metrics: 1 turn で次へ
 *   consent_gate: consent_explicit を尋ねた turn で確定 → 次へ (denied は finalize 直行)
 *   closure: 1 turn で finalized=true
 */
export async function recordAnswer(
  session: InterviewSession,
  answer: Answer,
): Promise<void> {
  session.answers.push(answer);
  session.updated_at = new Date().toISOString();

  // consent_gate の consent_explicit 回答だけ特別に publication_consent を更新
  if (
    answer.step === "consent_gate" &&
    answer.pattern_id === "consent_explicit"
  ) {
    session.publication_consent = parseConsent(answer.answer_text);
  }

  // Step 進行
  const currIdx = stepOrder.indexOf(session.current_step);
  const stepAnswers = session.answers.filter(
    (a) => a.step === session.current_step,
  );

  if (session.current_step === "consent_gate") {
    // client_redact の後 consent_explicit を 1 ターン以上聞いた段階で確定
    const explicitDone = stepAnswers.some(
      (a) => a.pattern_id === "consent_explicit",
    );
    if (explicitDone) {
      if (session.publication_consent === "denied") {
        // denied 即 finalize (closure 飛ばし)
        session.finalized = true;
        session.current_step = "closure";
      } else {
        session.current_step = "closure";
      }
    }
    // client_redact だけ済 → consent_gate のままで consent_explicit を次ターン
  } else if (session.current_step === "closure") {
    session.finalized = true;
  } else {
    // kickoff / dig_attempt / dig_metrics は 1 turn で次へ
    if (currIdx < stepOrder.length - 1) {
      session.current_step = stepOrder[currIdx + 1];
    }
  }

  sessionStore.set(session.id, session);
}

/**
 * Step 5 closure 完了後に呼ばれ、materials_store へ INSERT + MaterialDraft を返す。
 *
 * - publication_consent='granted' の時のみ INSERT 実行
 * - denied / fallback では DB 操作なし、in-memory MaterialDraft のみ
 */
export async function finalizeSession(
  session: InterviewSession,
): Promise<MaterialDraft> {
  if (!session.finalized) {
    throw new Error(`session ${session.id} not finalized yet`);
  }

  const facts = extractFacts(session.answers);
  const raw_text = session.answers.map((a) => `Q: ${a.question_text}\nA: ${a.answer_text}`).join("\n\n");

  // 投稿予定日 (closure step の details_dig answer から拾う)
  const closureAnswer = session.answers.find((a) => a.step === "closure");
  const scheduled_publish_date = closureAnswer ? parseScheduleHint(closureAnswer.answer_text) : undefined;

  const draft: MaterialDraft = {
    session_id: session.id,
    industry: session.industry,
    topic: session.topic,
    raw_text,
    facts,
    publication_consent: session.publication_consent === "granted" ? "granted" : "denied",
    consent_method: "line",
    consent_obtained_at: new Date().toISOString(),
    scheduled_publish_date,
  };

  if (session.publication_consent === "granted") {
    const material_id = await insertMaterialsStore(session, draft);
    draft.material_id = material_id;
    session.material_id = material_id;
  }

  return draft;
}

/**
 * Anthropic-grade LINE Messaging API 送信 (axios).
 * Phase 0.5 では LINE_DRY_RUN=true で stdout 代替。
 */
export async function sendLineMessage(
  to: string,
  text: string,
): Promise<{ status: "sent" | "dry_run"; reply?: unknown }> {
  if (isDryRun()) {
    console.log(`[LINE DRY-RUN] to=${to} message: ${text.slice(0, 200)}${text.length > 200 ? "..." : ""}`);
    return { status: "dry_run" };
  }
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.warn("[LINE] LINE_CHANNEL_ACCESS_TOKEN not set, falling back to dry-run");
    console.log(`[LINE DRY-RUN] to=${to} message: ${text.slice(0, 200)}`);
    return { status: "dry_run" };
  }
  await pushLine(to, text, token);
  return { status: "sent" };
}

// ---------------------------------------------------------------------------
// internal helpers
// ---------------------------------------------------------------------------
function extractFacts(answers: Answer[]): MaterialDraft["facts"] {
  const facts: MaterialDraft["facts"] = {};
  for (const a of answers) {
    if (a.pattern_id === "failure_recall") {
      facts.attempt_summary = a.answer_text;
    } else if (a.pattern_id === "tool_drill") {
      facts.tool_stack = a.answer_text
        .split(/[,、\s/]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .slice(0, 10);
    } else if (a.pattern_id === "metrics_quant") {
      facts.before_after = a.answer_text;
    } else if (a.pattern_id === "time_pressure") {
      facts.metrics = a.answer_text;
    }
  }
  return facts;
}

function parseScheduleHint(text: string): string | undefined {
  const iso = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  // 「明日」「今週金曜」等は parse せず undefined を返す (Phase 1+ で NL date parse)
  return undefined;
}

async function insertMaterialsStore(
  session: InterviewSession,
  draft: MaterialDraft,
): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) {
    // fallback では in-memory uuid を返す
    return `mat_${session.id}_${Date.now()}`;
  }
  const { data, error } = await supabase
    .from("materials_store")
    .insert({
      source_type: "manual",
      source_ref: session.id,
      raw_text: draft.raw_text,
      redacted_text: draft.raw_text, // Phase 0.5 では DLP は別 PR、後で更新
      publication_consent: "granted",
      consent_obtained_from: "self",
      consent_obtained_at: draft.consent_obtained_at,
      consent_method: "line",
      purpose: "public_post",
      retention: "1y",
      verified_failure_story: !!draft.facts.attempt_summary,
      meta: {
        interviewer: {
          industry: draft.industry,
          topic: draft.topic,
          scheduled_publish_date: draft.scheduled_publish_date,
          facts: draft.facts,
        },
      },
    })
    .select("id")
    .single();
  if (error) {
    throw new Error(`materials_store insert failed: ${error.message}`);
  }
  return data.id as string;
}
