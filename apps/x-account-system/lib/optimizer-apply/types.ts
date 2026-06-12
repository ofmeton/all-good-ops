import type { OptimizerState } from "../optimizer/types.ts";

/** optimizer_proposal の 1 行（apply-engine が読む列）。 */
export type ProposalRow = {
  id: string;
  proposal_type: string;
  scope: string;
  hypothesis: string;
  evidence: Record<string, unknown>;
  rank: "A" | "B" | "C" | null;
  accepted: boolean | null;
  implemented: boolean | null;
  reviewer_reason: string | null;
  meta: Record<string, unknown> | null;
};

/** reviewer が accept 時に付与する tier-T / tier-P 構造化変更（{paramId, value}）。 */
export type ApplyDescriptor = { paramId: string; value: number };

/** T=Beta posterior(optimizer_state) / P=runtime_params 数値レバー / config/prompt=手動 / noop / blocked。 */
export type Tier = "T" | "P" | "config" | "prompt" | "noop" | "blocked";

export type ApplyEngineResult = {
  applied: number; // tier-T 数値適用
  noop: number;    // acknowledgment（measurement/anomaly/operational・構造なし）
  skipped: number; // config/prompt（手動推奨）
  blocked: number; // 🔒
  errors: number;
};

export type ApplyDeps = {
  /** accepted=true かつ implemented でない・未処理（meta.apply_status 未設定）の提案。 */
  loadAcceptedProposals: () => Promise<ProposalRow[]>;
  /** 適用成功: implemented=true, implemented_at, meta patch をマージ。 */
  markImplemented: (id: string, metaPatch: Record<string, unknown>) => Promise<void>;
  /** 非適用（blocked/skip/error）: implemented は変えず meta.apply_status と理由を記録。 */
  markSkipped: (id: string, applyStatus: string, note: string) => Promise<void>;
  loadOptimizerState: (now?: Date) => Promise<OptimizerState>;
  saveOptimizerState: (s: OptimizerState) => Promise<void>;
  snapshotState: (ts?: Date) => Promise<{ snapshotId: string }>;
  rollbackToSnapshot: (snapshotId: string) => Promise<unknown>;
  /** tier-P 適用: runtime_params に clip→upsert。{paramId, before, after}（before=rollback handle）。 */
  applyTierP: (paramId: string, value: number) => Promise<{ paramId: string; before: number | null; after: number }>;
  /** tier-P rollback: before へ書戻し（null=削除で復帰）。 */
  rollbackTierP: (paramId: string, before: number | null) => Promise<void>;
  notify: (summary: string) => Promise<void>;
};
