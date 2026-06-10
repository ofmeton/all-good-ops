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
  cost: Record<string, number>; // category -> jpy（当月）
  recentProposals: Array<{ proposal_type: string; scope: string; rank: string; accepted: boolean | null; implemented: boolean | null }>;
  postsMeasured: number;
}
