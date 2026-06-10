import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { runMaSession } from "../ma/run-session.js";
import { getAgentRef as getAgentRefDefault } from "../ma/agent-registry.js";
import { buildSnapshot, defaultSnapshotDeps, renderSnapshotText } from "./snapshot.ts";
import { defaultToolDeps, makeToolHandler, type ToolDeps } from "./tools.ts";
import { costJpyFor } from "../cost/cost-of.js";
import { recordCostLedger } from "../cost/cost-ledger.js";
import { pushLine } from "../line/line-client.js";

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

// ---------------------------------------------------------------------------
// Production deps
// ---------------------------------------------------------------------------

const ANALYST_AGENT_KEY = "x-optimizer-analyst";
const ANALYST_MODEL = "claude-opus-4-8";

let _analystSb: SupabaseClient | null = null;
function getAnalystSb(): SupabaseClient | null {
  if (process.env.IN_MEMORY_FALLBACK === "true") return null;
  if (!_analystSb && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    _analystSb = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { db: { schema: (process.env.SUPABASE_SCHEMA || "public") as "public" } },
    );
  }
  return _analystSb;
}

export function defaultAnalystDeps(): AnalystDeps {
  const sb = getAnalystSb();
  // Capture session usage across runSession→recordCost
  let capturedUsage: { input_tokens: number; output_tokens: number } | undefined;

  return {
    async buildSnapshotText() {
      const snapshot = await buildSnapshot(defaultSnapshotDeps());
      return renderSnapshotText(snapshot);
    },

    async getAgentRef() {
      if (!sb) return null;
      try {
        const ref = await getAgentRefDefault(sb, ANALYST_AGENT_KEY);
        return { id: ref.agentId, version: ref.version, environmentId: ref.environmentId };
      } catch (e) {
        console.warn("[optimizer-analyst] getAgentRef failed (fail-open):", String(e));
        return null;
      }
    },

    async runSession(args) {
      const res = await runMaSession({
        apiKey: process.env.ANTHROPIC_API_KEY,
        agentRef: { id: args.agentRef.id, version: args.agentRef.version },
        environmentId: args.environmentId,
        userMessage: args.userMessage,
        customToolHandler: args.customToolHandler,
      });
      // Capture usage for cost recording
      const usage = res.sessionUsage as { input_tokens?: number; output_tokens?: number } | undefined;
      if (usage) {
        capturedUsage = { input_tokens: usage.input_tokens ?? 0, output_tokens: usage.output_tokens ?? 0 };
      }
      return { ok: res.ok };
    },

    toolDeps: defaultToolDeps(),

    async countProposalsSince(sinceMs) {
      if (!sb) return 0;
      try {
        const { count, error } = await sb
          .from("optimizer_proposal")
          .select("id", { count: "exact", head: true })
          .gte("created_at", new Date(sinceMs).toISOString());
        if (error) return 0;
        return count ?? 0;
      } catch {
        return 0;
      }
    },

    async notify(summary) {
      const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
      const userId = process.env.LINE_USER_ID_OFMETON;
      if (!token || !userId) {
        console.warn("[optimizer-analyst] notify skipped: LINE env vars missing");
        return;
      }
      try {
        await pushLine(userId, summary, token);
      } catch (e) {
        console.warn("[optimizer-analyst] notify failed (fail-open):", String(e));
      }
    },

    async recordCost() {
      if (!sb || !capturedUsage) return;
      const inTok = capturedUsage.input_tokens;
      const outTok = capturedUsage.output_tokens;
      const costJpy = costJpyFor(ANALYST_MODEL, inTok, outTok);
      await recordCostLedger(sb, {
        category: "optimizer_analyst",
        costJpy,
        unitCount: inTok + outTok,
        meta: { model: ANALYST_MODEL },
      });
    },
  };
}

export async function runOptimizerAnalyst(deps: AnalystDeps = defaultAnalystDeps()): Promise<AnalystResult> {
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
