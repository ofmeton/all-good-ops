/**
 * Interviewer types (PR-D)
 *
 * SSoT: main-design-all-versions.md §6.2 LINE 完結 Interviewer
 *
 * 5 ステップ質問パターン:
 *   Step 1 kickoff       - 業務トピック提示 (業種別キーワード注入 / v10.3 C-2)
 *   Step 2 dig_attempt   - 試行錯誤の質問
 *   Step 3 dig_metrics   - 数値 / Before-After 引き出し
 *   Step 4 consent_gate  - 公開許諾 gate (materials_store.publication_consent='granted')
 *   Step 5 closure       - 投稿予定日 + thank-you
 *
 * 質問パターン 8 種 (pattern_id でログ):
 *   quick_recap / details_dig / metrics_quant / failure_recall
 *   tool_drill / time_pressure / client_redact / consent_explicit
 */

export type StepName =
  | "kickoff"
  | "dig_attempt"
  | "dig_metrics"
  | "consent_gate"
  | "closure";

export type PatternId =
  | "quick_recap"
  | "details_dig"
  | "metrics_quant"
  | "failure_recall"
  | "tool_drill"
  | "time_pressure"
  | "client_redact"
  | "consent_explicit";

export type Industry =
  // 4 本柱 (本人事業) + 関連業界キーワード注入対象
  | "rice_cream"        // RICE CREAM 店舗 (フード / 小売)
  | "tutoring"          // 家庭教師
  | "minpaku"           // 民泊清掃 / 民泊運営
  | "web_production"    // HP / LP 制作
  | "ai_automation"     // AI 自動化代行 (将来上位事業)
  | "generic";

export interface InterviewSession {
  /** ULID-ish session id (Phase 0.5 では nanoid). */
  id: string;
  /** LINE user id (ofmeton 単独運用なので 1 値固定だが拡張に備えて持つ). */
  line_user_id: string;
  /** 現在 Step. */
  current_step: StepName;
  /** 確定済 industry (kickoff 時に固定). */
  industry: Industry;
  /** 作業トピック (kickoff で確定). */
  topic: string;
  /** これまでの Q&A. */
  answers: Answer[];
  /** materials_store INSERT 済 id (consent_gate で granted の時に書く). */
  material_id?: string;
  /** 公開許諾 state. */
  publication_consent: "pending" | "granted" | "denied";
  /** session 完了状態. */
  finalized: boolean;
  /** 開始時刻 (ISO). */
  created_at: string;
  /** 最終更新 (ISO). */
  updated_at: string;
}

export interface Question {
  step: StepName;
  pattern_id: PatternId;
  /** LINE 送信用 text. */
  text: string;
  /** 期待される回答粒度 (parse hint). */
  expects: "free_text" | "number_or_period" | "yes_no" | "consent_yes_no";
}

export interface Answer {
  step: StepName;
  pattern_id: PatternId;
  question_text: string;
  answer_text: string;
  /** 受信時刻 (ISO). */
  received_at: string;
}

/**
 * Step 5 closure 後に produce される、materials_store / core_ideas 投入用 draft.
 * Phase 0.5 fallback では DB INSERT を skip して in-memory のみ返す。
 */
export interface MaterialDraft {
  session_id: string;
  industry: Industry;
  topic: string;
  raw_text: string;
  /** Step 1-3 で集めた事実 (raw text の構造化). */
  facts: {
    attempt_summary?: string;
    metrics?: string;
    before_after?: string;
    tool_stack?: string[];
  };
  publication_consent: "granted" | "denied";
  consent_method: "line";
  consent_obtained_at?: string;
  /** Step 5 で確定した投稿予定日 (ISO date). */
  scheduled_publish_date?: string;
  /** materials_store 行 id (granted 時のみ). */
  material_id?: string;
}
