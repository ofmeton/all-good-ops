import type { ProposalInput, ProposalType } from "./types.ts";

const RANKS = ["A", "B", "C"] as const;
const PROPOSAL_TYPES: ProposalType[] = [
  "anomaly_alert", "operational_friction", "measurement_request", "config_change", "structural_change",
];

export interface ToolDeps {
  getLeverPerformance: (input: unknown) => Promise<unknown>;
  getApprovalReasons: (input: unknown) => Promise<unknown>;
  getPostDetail: (input: unknown) => Promise<unknown>;
  getFunnelStats: (input: unknown) => Promise<unknown>;
  getOptimizerState: (input: unknown) => Promise<unknown>;
  getRecentProposals: (input: unknown) => Promise<unknown>;
  saveProposal: (p: ProposalInput) => Promise<void>;
}

const customTool = (name: string, description: string, properties: Record<string, unknown>, required: string[]) => ({
  type: "custom" as const, name, description,
  input_schema: { type: "object", properties, required },
});

export const OPTIMIZER_ANALYST_TOOL_REGISTRY = {
  optimizer_analyst_tools: [
    customTool("get_lever_performance", "握る3レバー(time/hook/format)の値別 performance と posterior を取得", { window_days: { type: "number" } }, []),
    customTool("get_approval_reasons", "直近の承認/却下理由と draft の結末を取得", { status: { type: "string", enum: ["approved", "rejected", "all"] } }, []),
    customTool("get_post_detail", "特定 draft の本文/editor判定/writer・checkerの思考/performance を取得", { draft_id: { type: "string" } }, ["draft_id"]),
    customTool("get_funnel_stats", "素材→承認→公開→performance の変換をソース別に取得", {}, []),
    customTool("get_optimizer_state", "現 posterior と直近変化/異常を取得", {}, []),
    customTool("get_recent_proposals", "過去提案と採否/効果を取得", {}, []),
  ],
  submit_proposal: customTool(
    "submit_proposal",
    "改善提案を 1 件記録する。複数回呼んでよい。proposal_type/scope/hypothesis/evidence/rank を渡す。実行はしない（人間が後で適用）。",
    {
      proposal_type: { type: "string", enum: PROPOSAL_TYPES },
      scope: { type: "string", description: "対象（例 writer_prompt / editor_threshold / collector_query / lever_bandit）" },
      hypothesis: { type: "string" },
      evidence: { type: "object", description: "数値根拠(jsonb)" },
      rank: { type: "string", enum: ["A", "B", "C"] },
    },
    ["proposal_type", "scope", "hypothesis", "rank"],
  ),
};

function validateProposal(input: unknown): ProposalInput | null {
  const o = (input ?? {}) as Record<string, unknown>;
  if (!PROPOSAL_TYPES.includes(o.proposal_type as ProposalType)) return null;
  if (typeof o.scope !== "string" || !o.scope) return null;
  if (typeof o.hypothesis !== "string" || !o.hypothesis) return null;
  if (!RANKS.includes(o.rank as (typeof RANKS)[number])) return null;
  return {
    proposal_type: o.proposal_type as ProposalType,
    scope: o.scope, hypothesis: o.hypothesis,
    evidence: (o.evidence && typeof o.evidence === "object") ? (o.evidence as Record<string, unknown>) : {},
    rank: o.rank as "A" | "B" | "C",
  };
}

export function makeToolHandler(deps: ToolDeps) {
  return async (name: string, input: unknown): Promise<string> => {
    try {
      switch (name) {
        case "get_lever_performance": return JSON.stringify(await deps.getLeverPerformance(input));
        case "get_approval_reasons": return JSON.stringify(await deps.getApprovalReasons(input));
        case "get_post_detail": return JSON.stringify(await deps.getPostDetail(input));
        case "get_funnel_stats": return JSON.stringify(await deps.getFunnelStats(input));
        case "get_optimizer_state": return JSON.stringify(await deps.getOptimizerState(input));
        case "get_recent_proposals": return JSON.stringify(await deps.getRecentProposals(input));
        case "submit_proposal": {
          const p = validateProposal(input);
          if (!p) return "invalid proposal: proposal_type/scope/hypothesis/rank are required";
          await deps.saveProposal(p);
          return "ok: proposal recorded";
        }
        default: return `unknown tool: ${name}`;
      }
    } catch (e) {
      return `tool error (${name}): ${String(e)}`;
    }
  };
}
