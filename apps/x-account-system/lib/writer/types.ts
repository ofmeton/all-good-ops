/**
 * Writer X types (PR-B)
 *
 * SSoT: outputs/improvements/x-account-design-consolidated/main-design-all-versions.md §6.4
 *       outputs/improvements/x-account-design-consolidated/initial-values-design.md §3, §4.1
 *
 * Writer は CoreIdea を入力に取り、X 投稿用の draft body を生成する。
 * Phase 0.5 (IN_MEMORY_FALLBACK=true) では Anthropic SDK を呼ばず stub body を返す。
 */

export type WriterFormat = "short" | "medium" | "long" | "thread" | "article";

export type PrimaryHook =
  | "number"
  | "question"
  | "failure_story"
  | "contrast"
  | "tips_enum"
  | "first_hand"
  | "translation"
  | "opinion"
  | "industry_sop"
  | "business_repro"
  | "paraphrase"
  | "critique";

export type ContentType =
  | "translation"
  | "paraphrase"
  | "opinion"
  | "first_hand"
  | "industry_sop"
  | "failure_story";

/**
 * CoreIdea: Writer の入力。selecting Agent (PR-C) または手動キュレーションで生成。
 * Phase 0.5 では手動 fixture から渡す。
 */
export type CoreIdea = {
  id: string;
  topic: string;
  primaryHook: PrimaryHook;
  fmat: WriterFormat;
  contentType: ContentType;
  citationSource?: string;
  audience: string;
  sourceMaterialIds: string[];
};

export type DraftRequest = {
  idea: CoreIdea;
  /** writer-x ローカル test 向けに固定 traceId を渡したい場合に指定 */
  traceId?: string;
};

export type DraftOutput = {
  draftId: string;
  body: string;
  primaryHook: PrimaryHook;
  estimatedScore: number;
  llmCostUsd: number;
  /** Phase 0.5 stub では "stub"、live API では "anthropic-sonnet-4.6" 等 */
  generator: "stub" | "anthropic-sonnet-4.6";
};
