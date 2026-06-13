// lib/optimizer-analyst/types.ts
export type ProposalType =
  | "anomaly_alert" | "operational_friction" | "measurement_request"
  | "config_change" | "structural_change";

/** submit_proposal が optimizer_proposal に書く 1 提案。 */
export interface ProposalInput {
  proposal_type: ProposalType;
  scope: string;            // 例 "writer_prompt" | "editor_threshold" | "collector_query" | "lever_bandit"
  hypothesis: string;       // 主張（何をどう変えると何が良くなるか）
  evidence: Record<string, unknown>; // 数値根拠（jsonb）
  rank: "A" | "B" | "C";
}

/** P4 収集 ROI（AD-4）: ¥当たり品質を測る pool 別 yield。 */
export interface CollectionPoolYield {
  selected: number;
  queued: number;
  /** queued / selected（0 除算は 0）。 */
  queuedRate: number;
}

/**
 * P4 収集 ROI スナップショット（AD-4）。目的関数は「コスト最小化でなく ¥当たり品質最大化」。
 * 主=approved_yield_per_jpy(=1/jpyPerApproved)、従=published_engagement_per_jpy、
 * guard=explorationHighScoreRate（剪定が捨てている価値の不偏監視）。
 */
export interface CollectionSnapshot {
  windowDays: number;
  cost: { exploreJpy: number; scoringJpy: number; translateJpy: number; totalJpy: number };
  funnel: {
    fetched: number; deduped: number; pruned: number; fineScored: number;
    inserted: number; queued: number; drafted: number; approved: number; published: number;
  };
  /** total cost / queued（queued=0 は null）。 */
  jpyPerQueued: number | null;
  /** total cost / approved（approved=0 は null）。主目的関数の逆数。 */
  jpyPerApproved: number | null;
  /** selection_pool（safeguard/topK/exploration）別の選抜→queued 転換。enforce run のみ母数あり。 */
  poolYield: Record<string, CollectionPoolYield>;
  /** guard: exploration pool が高 fine だった率（剪定の機会損失監視）。算出不能は null。 */
  explorationHighScoreRate: number | null;
  /** 現レバー値 + bounds（人間が tier-P 提案を判断するための現在地）。 */
  levers: Array<{ paramId: string; value: number; min: number; max: number }>;
}

/** seed スナップショット（集約結果）。 */
export interface Snapshot {
  windowDays: number;
  leverPerformance: {
    timeBand: Record<string, { n: number; avgPcr: number; avgUrlClicks: number }>;
    hook: Record<string, { n: number; avgPcr: number; avgUrlClicks: number }>;
    xFormat: Record<string, { n: number; avgPcr: number; avgUrlClicks: number }>;
  };
  approvalReasons: Array<{ status: string; reason: string; riskLevel: string | null }>;
  funnel: { materials: number; coreIdeas: number; drafts: number; approved: number; published: number; measured: number };
  cost: Record<string, number>; // category -> jpy（窓内 created_at 範囲。P4 で当月→窓へ変更）
  recentProposals: Array<{ proposal_type: string; scope: string; rank: string; accepted: boolean | null; implemented: boolean | null }>;
  postsMeasured: number;
  /** P4 収集 ROI（AD-4）。未取得（IN_MEMORY_FALLBACK 等）は null。 */
  collection?: CollectionSnapshot | null;
}
