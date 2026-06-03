/**
 * Editor 6+5 pipeline types (PR-A)
 *
 * SSoT: outputs/improvements/x-account-design-consolidated/main-design-all-versions.md §11 v10.3
 *
 * Base 6:
 *   R1 業務仕組み化テーマに繋がるか (LLM judge)
 *   R2 実体験要素 1 行 (regex + LLM 補助)
 *   R3 対象は意見、敵は作らない (LLM judge)
 *   R4 対立構図フィルタ (forbidden phrases regex)
 *   R5 直近 2 週で類似投稿なし (embedding cos sim ≥ 0.85 → fail)
 *   R6 結論の断定性 (LLM judge: 末尾 200 字に hedge がないか)
 *
 * Extension 5:
 *   X1 Hook 強度 ≥ 0.4 (classify.py confidence)
 *   X2 ステマ表記 (hasAffiliateLink=true なら #PR|#広告|アフィリエイト regex 必須)
 *   X3 verified failure_story 月 ≤ 4 (primary_hook='failure_story' の場合のみ厳格 gate)
 *   X4 読者像 1 行明示 (regex + LLM 補助)
 *   X5 DLP redaction + 固有名詞 mask
 *
 * 業法 risk は flag のみ (reject ではない、riskLevel='high' に昇格)
 */

export type PlatformId = "x" | "instagram" | "note";
export type RuleStatus = "pass" | "fail" | "skip";

export type RuleId =
  | "R1_workflow_theme"
  | "R2_first_hand_line"
  | "R3_no_enemy"
  | "R4_no_conflict_phrase"
  | "R5_no_duplicate_14d"
  | "R6_assertive_conclusion"
  | "X1_hook_strength"
  | "X2_stealth_disclosure"
  | "X3_failure_story_verified"
  | "X4_audience_line"
  | "X5_dlp_and_proper_noun"
  | "X6_source_grounding";

export type EditorFormat =
  | "short"
  | "medium"
  | "long"
  | "thread"
  | "carousel"
  | "article";

export type AcquisitionRoute = "A" | "B" | "C";

export type EditorInput = {
  traceId: string;
  draftId: string;
  coreIdeaId: string;
  platform: PlatformId;
  body: string;
  fmat: EditorFormat;
  sourceMaterialIds: string[];
  /**
   * X6 出典グラウンディング (事実チェック) 用の素材本文。
   * sourceMaterialIds に対応する materials_store の redacted_text/raw_text。
   * 空/未指定なら X6 は skip (pass-through)。
   */
  sourceMaterialTexts?: string[];
  hasAffiliateLink: boolean;
  /**
   * コンテンツ種別 (core_ideas.category 由来)。R2 実体験行は first_hand のみ必須。
   * 未指定時は first_hand 扱い (後方互換: 従来どおり R2 を適用)。
   */
  contentType?: "paraphrase" | "first_hand" | "industry_sop";
  acquisitionRoute?: AcquisitionRoute;
  /**
   * v10.3 §4.6.4 高リスク承認モード判定に使う追加メタデータ。
   * 提示する数字や顧客由来情報がある場合に true 入力。
   */
  hasNumbers?: boolean;
  isClientDerived?: boolean;
  /**
   * Pipeline 実行時刻 (テスト時に固定したい場合のみ指定。デフォルトは new Date())
   */
  now?: Date;
};

export type EditorRuleResult = {
  rule: RuleId;
  status: RuleStatus;
  reason?: string;
  evidence?: Record<string, unknown>;
  durationMs: number;
};

export type EditorRiskLevel = "low" | "high";

export type EditorOutput = {
  draftId: string;
  decision: "approved" | "rejected";
  rejectReasons: RuleId[];
  /** soft ルール(品質)の fail。却下せず、LINE 承認文に警告として付記する。 */
  warnings: Array<{ rule: RuleId; reason: string }>;
  rules: EditorRuleResult[];
  riskLevel: EditorRiskLevel;
  riskReasons: string[];
  businessLawRiskFlag: boolean;
  businessLawKeywords: string[];
  totalDurationMs: number;
  llmCostUsd: number;
};

/**
 * Stage 2 LLM judge の bundled 戻り値。
 * 1 リクエストで R1 / R3 / R6 / X2 / X4 / X5 補助 を一括判定する。
 */
export type LlmJudgeResult = {
  r1_workflow_theme: { status: RuleStatus; reason: string };
  r3_no_enemy: { status: RuleStatus; reason: string };
  r6_assertive_conclusion: { status: RuleStatus; reason: string };
  x2_stealth_disclosure_text: { status: RuleStatus; reason: string };
  x4_audience_line: { status: RuleStatus; reason: string };
  x5_proper_noun_assist: { status: RuleStatus; reason: string };
  costUsd: number;
};

/**
 * Stage 0 並列実行の結果コンテナ。
 */
export type Stage0Result = {
  redact: {
    needsConsent: boolean;
    highRiskHits: number;
    findings: Array<{ category: string; matched: string }>;
  };
  containsHighRisk: boolean;
  hookClassification: {
    primary_hook: string;
    confidence: number;
    devices: string[];
  };
  businessLaw: {
    flag: boolean;
    keywords: string[];
  };
};
