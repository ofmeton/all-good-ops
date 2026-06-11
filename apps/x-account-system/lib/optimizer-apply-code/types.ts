import type { ProposalRow } from "../optimizer-apply/types.ts";

export type { ProposalRow };

export type ImplementResult = { ok: boolean; log: string };
export type ReviewResult = { verdict: "APPROVE" | "REJECT"; reasons: string[] };
export type DiffInfo = { files: string[]; diffText: string };
export type DeployResult = { deployed: ("ma-bootstrap" | "wrangler")[]; maVersions?: Record<string, string> };
export type Outcome = "applied_code" | "pr_pending" | "blocked" | "error" | "dry_run_ok";

export type CodeApplyOptions = { dryRun?: boolean; cap?: number; onlyId?: string };

export type CodeApplyResult = {
  processed: number;
  applied: number;
  prPending: number;
  blocked: number;
  errors: number;
  details: { id: string; outcome: Outcome; prUrl?: string; note?: string }[];
};

export type Workspace = { dir: string; branch: string };

export type CodeApplyDeps = {
  /** worker 側 tier-T/noop 処理を発火（fail-open） */
  enqueueWorkerApply: () => Promise<void>;
  /** MAIN_REPO が main・クリーンであることを保証（merge 前提条件）。失敗時 throw。 */
  preflight: () => Promise<void>;
  /** accepted ∧ 未実装 ∧ apply_status∈(null,'skipped_manual') ∧ tier∈{config,prompt} を cap 件まで */
  loadTargets: (cap: number) => Promise<ProposalRow[]>;
  createWorkspace: (id: string) => Promise<Workspace>;
  runImplementer: (ws: Workspace, p: ProposalRow) => Promise<ImplementResult>;
  runFixer: (ws: Workspace, p: ProposalRow, reasons: string[]) => Promise<ImplementResult>;
  /** prompts 変更時に ma:render を流し成果物を commit（変更なしなら no-op） */
  renderArtifacts: (ws: Workspace) => Promise<void>;
  collectDiff: (ws: Workspace) => Promise<DiffInfo>;
  /** jest 全体 + tsc -p src/tsconfig.json */
  runChecks: (ws: Workspace) => Promise<{ ok: boolean; output: string }>;
  runReviewer: (ws: Workspace, p: ProposalRow, diff: DiffInfo) => Promise<ReviewResult>;
  pushAndCreatePr: (ws: Workspace, pr: { title: string; body: string }, draft: boolean) => Promise<{ prUrl: string }>;
  mergePr: (prUrl: string) => Promise<{ sha: string }>;
  deploy: (files: string[]) => Promise<DeployResult>;
  cleanupWorkspace: (ws: Workspace, keepBranch: boolean) => Promise<void>;
  markApplied: (id: string, metaPatch: Record<string, unknown>) => Promise<void>;
  markStatus: (id: string, applyStatus: string, note: string) => Promise<void>;
  notify: (msg: string) => Promise<void>;
};

export type RollbackHandle = { git_sha?: string; pr_url?: string; deployed?: string[] };

export type CodeRollbackDeps = Pick<
  CodeApplyDeps,
  | "createWorkspace" | "collectDiff" | "runChecks" | "pushAndCreatePr"
  | "mergePr" | "deploy" | "cleanupWorkspace" | "renderArtifacts" | "notify" | "preflight"
> & {
  getRollbackHandle: (id: string) => Promise<RollbackHandle | null>;
  revertCommit: (ws: Workspace, sha: string) => Promise<void>;
  markRolledBack: (id: string) => Promise<void>;
};
