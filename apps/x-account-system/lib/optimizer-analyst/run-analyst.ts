import { makeToolHandler, type ToolDeps } from "./tools.ts";

export interface AnalystDeps {
  buildSnapshotText: () => Promise<string>;
  getAgentRef: () => Promise<{ id: string; version?: string; environmentId?: string } | null>;
  runSession: (args: {
    userMessage: string;
    agentRef: { id: string; version?: string };
    environmentId?: string;
    customToolHandler: (n: string, i: unknown) => Promise<string>;
  }) => Promise<{ ok: boolean }>;
  toolDeps?: ToolDeps;
  countProposalsSince: (sinceMs: number) => Promise<number>;
  notify: (summary: string) => Promise<void>;
  recordCost: () => Promise<void>;
  now?: () => number;
}

export interface AnalystResult { ok: boolean; proposals: number }

export async function runOptimizerAnalyst(deps: AnalystDeps): Promise<AnalystResult> {
  const now = deps.now ?? Date.now;
  const startedMs = now();
  const ref = await deps.getAgentRef();
  if (!ref) return { ok: false, proposals: 0 };

  const snapshotText = await deps.buildSnapshotText();
  const userMessage = `${snapshotText}\n\n---\n上記の観測を分析し、改善提案を submit_proposal で記録してください（最大5件）。`;

  const handler = deps.toolDeps ? makeToolHandler(deps.toolDeps) : async () => "ok";

  const res = await deps.runSession({
    userMessage,
    agentRef: { id: ref.id, version: ref.version },
    environmentId: ref.environmentId,
    customToolHandler: handler,
  });
  await deps.recordCost();

  const proposals = await deps.countProposalsSince(startedMs);
  await deps.notify(`optimizer-analyst: ${proposals} 件の提案を記録（session ok=${res.ok}）`);
  return { ok: res.ok, proposals };
}
