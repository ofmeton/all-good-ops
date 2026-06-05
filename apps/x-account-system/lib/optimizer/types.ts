/**
 * Optimizer (Thompson Sampling) 型定義 — PR-C
 *
 * SSoT:
 *   - outputs/improvements/x-account-design-consolidated/initial-values-design.md §3 / §8
 *   - outputs/improvements/x-account-design-consolidated/main-design-all-versions.md §2.6, §7.2
 *
 * 8 Optimizer 対象パラメータ (initial-values §3):
 *   1. posting_time     (Beta / Discrete 5 band, empirical Bayes)
 *   2. hook_distribution (Beta / Dirichlet, failure_story は Thompson 適用外)
 *   3. publishing_lag    (Discrete 4 軸, paraphrase/translation/opinion/first_hand)
 *   4. content_type_axis (Dirichlet α=(1,2,3,4))
 *   5. citation_explicit_rate (Beta(13,7))
 *   6. x_format_ratio    (Beta(2,8) 弱 prior、Current SSOT v10.3)
 *   7. visualizer_mode   (Dirichlet α=(7,1.5,1.5))
 *   8. industry_sop_rate (Beta(4,16))
 *
 * 死守パラメータ (§8.3) は guards.ts で sample 後 hard-clip。
 * 自由パラメータ (§8.4) のレンジも guards.ts で clip。
 */

export type DistType = "beta" | "dirichlet" | "discrete";

/**
 * 各 sub-parameter の posterior 状態。
 *
 * - beta:       params = { alpha, beta }
 * - dirichlet:  params = { alphas: number[] } (categories は labels で別途持つ)
 * - discrete:   params = { weights: number[] }
 */
export type ParameterPosterior = {
  /** 例: "posting_time_morning", "hook_number_lead", "industry_sop_rate" */
  paramId: string;
  distType: DistType;
  /** Beta / Dirichlet / Discrete 共通の数値袋 (sampling 時にキーで参照) */
  params: Record<string, number | number[]>;
  /** カテゴリ名 (Dirichlet/Discrete のとき alpha/weights と並列) */
  categories?: string[];
  /** Optimizer 動作のためのメタ情報 */
  meta?: {
    successCount?: number;
    failureCount?: number;
    /** Thompson 適用外フラグ (例: verified failure_story) */
    thompsonExempt?: boolean;
    /** 死守による hard clip 対象 */
    guardLocked?: boolean;
    /** 信頼度推定値 (= alpha / (alpha + beta) の絶対偏差等、§3 表記) */
    confidence?: number;
    note?: string;
  };
};

/**
 * 8 領域の posterior コンテナ。
 *
 * timeBand / hooks / contentAxis / visualizer は paramId 集合で表現される。
 * SSOT v10.3 Style Guide v1.3 互換。
 */
export type OptimizerState = {
  /** 状態の世代 (snapshot rollback 用) */
  generation: number;
  /** ISO timestamp - 直近 update 時刻 */
  updatedAt: string;
  /** 直近 snapshot ID (rollbackToSnapshot 用) */
  lastSnapshotId?: string;
  /** style_guide.version (active) に紐付け */
  styleGuideVersion: string;

  // 1. 投稿時間帯 (5 band Beta) — initial-values §3.1
  postingTime: {
    morning: ParameterPosterior;
    noon: ParameterPosterior;
    afternoon: ParameterPosterior;
    evening: ParameterPosterior;
    midnight: ParameterPosterior;
  };

  // 2. Hook 配分 — initial-values §3.2 (number/negation/question/emotion/authority/promise/other)
  hookDistribution: {
    number_lead: ParameterPosterior;
    negation_lead: ParameterPosterior;
    question_lead: ParameterPosterior;
    emotion_lead: ParameterPosterior;
    authority_lead: ParameterPosterior;
    promise_lead: ParameterPosterior;
    other: ParameterPosterior;
    /** verified failure_story は thompsonExempt = true (月 ≤ 4 上限制約のみ) */
    failure_story_verified_cap_per_month: ParameterPosterior;
  };

  // 3. publishing_lag (4 軸 Discrete 範囲) — initial-values §3.3
  publishingLag: ParameterPosterior;

  // 4. 4 排他軸 (translation / paraphrase / opinion / first_hand) — initial-values §3.4
  contentAxis: ParameterPosterior; // Dirichlet α=(1,2,3,4)

  // 5. citation_explicit_rate — initial-values §3.5
  citationExplicitRate: ParameterPosterior; // Beta(13, 7)

  // 6. X format 比率 (Current SSOT v10.3 50/25/10/10-15) — initial-values §3.6.1
  xFormatRatio: {
    short: ParameterPosterior;
    medium: ParameterPosterior;
    long: ParameterPosterior;
    thread: ParameterPosterior;
  };

  // 7. Visualizer モード (image/video/text) — initial-values §3.7
  visualizerMode: ParameterPosterior; // Dirichlet α=(7, 1.5, 1.5)
  /** image 内訳の AI 生成画像率 (§8.3 ≤ 10% 死守) */
  visualizerImageAiGen: ParameterPosterior; // Beta(0.5, 9.5) 相当の lower

  // 8. industry_sop 投稿率 — initial-values §3.8
  industrySopRate: ParameterPosterior; // Beta(4, 16) = mean 20%
};

/**
 * 1 投稿の Reward 観測。
 *
 * SuccessSignal は posterior 更新の入力になる。
 *
 * success 判定:
 *   - PCR が直近 30 日母集団の top 30% に入っているか OR
 *   - url_link_clicks が median を超えるか
 */
export type SuccessSignal = {
  draftId: string;
  postedAt: Date;
  impression: number;
  pcr: number;
  urlLinkClicks: number;
  /** 投稿時に使われた meta (どの band, hook, format, visual, content axis にカウント) */
  attribution: {
    timeBand: keyof OptimizerState["postingTime"];
    hook: keyof OptimizerState["hookDistribution"] | null;
    /** 4 排他軸の index 0=translation 1=paraphrase 2=opinion 3=first_hand */
    contentAxisIndex: 0 | 1 | 2 | 3;
    xFormat: keyof OptimizerState["xFormatRatio"];
    /** Visualizer Dirichlet index 0=image 1=video 2=text */
    visualizerIndex: 0 | 1 | 2;
    isIndustrySop: boolean;
    isFailureStoryVerified: boolean;
  };
  /** PCR top 30% OR url_link_clicks > median */
  success: boolean;
};

/**
 * Optimizer 更新時の 1 パラメータ差分。
 * before/after は posterior の dump (params 中身)。
 */
export type ParameterChange = {
  paramId: string;
  distType: DistType;
  before: Record<string, number | number[]>;
  after: Record<string, number | number[]>;
  reason: string;
};

/**
 * 異常検知 reason — rollback 発動時に書き残す。
 */
export type AnomalyReason =
  | "pcr_drop_30_percent_7d"
  | "impression_drop_50_percent_7d"
  | "guard_violation_after_clip";

/**
 * §8.3 死守 制約定義 (guards.ts が使う)。
 */
export type GuardRule = {
  paramId: string;
  /** 上限制約 (例: AI 画像 ≤ 10%) */
  upperBound?: number;
  /** 下限制約 (例: first_hand ≥ 30%) */
  lowerBound?: number;
  /** 月 4 上限のような discrete cap */
  monthlyCap?: number;
  /** 完全固定 (例: hashtag 0) */
  fixedValue?: number;
  note: string;
};

/**
 * runOptimizerUpdate の戻り値。
 */
export type OptimizerUpdateResult = {
  before: OptimizerState;
  after: OptimizerState;
  changes: ParameterChange[];
  rolledBack: boolean;
  anomalyReasons: AnomalyReason[];
  signalsObserved: number;
  durationMs: number;
};
