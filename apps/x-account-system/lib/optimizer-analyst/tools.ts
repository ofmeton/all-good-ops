import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { toTimeBand, toHookKey } from "../optimizer/reward-extractor.js";
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

// ---------------------------------------------------------------------------
// Production deps (real Supabase)
// ---------------------------------------------------------------------------

let _sb: SupabaseClient | null = null;
function getToolsSb(): SupabaseClient | null {
  if (process.env.IN_MEMORY_FALLBACK === "true") return null;
  if (!_sb && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    _sb = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { db: { schema: (process.env.SUPABASE_SCHEMA || "public") as "public" } },
    );
  }
  return _sb;
}

function fmatKey(fmat: string | null): string {
  switch (fmat) {
    case "short": return "short";
    case "medium": return "medium";
    case "long": return "long";
    case "thread": return "thread";
    default: return "short";
  }
}

/**
 * Production ToolDeps — reads from Supabase (xad schema).
 * All queries are fail-open: errors return {} / [] and log warn.
 */
export function defaultToolDeps(): ToolDeps {
  const sb = getToolsSb();

  if (!sb) {
    // IN_MEMORY_FALLBACK or missing creds → no-op stub
    return {
      getLeverPerformance: async () => ({}),
      getApprovalReasons: async () => ([]),
      getPostDetail: async () => ({}),
      getFunnelStats: async () => ({}),
      getOptimizerState: async () => ({}),
      getRecentProposals: async () => ([]),
      saveProposal: async () => { throw new Error("no Supabase client"); },
    };
  }

  return {
    async getLeverPerformance(input) {
      try {
        const inp = (input ?? {}) as Record<string, unknown>;
        const windowDays = typeof inp.window_days === "number" ? inp.window_days : 30;
        const cutoff = new Date(Date.now() - windowDays * 24 * 3600 * 1000).toISOString();

        const { data, error } = await sb
          .from("posted_records")
          .select(
            `posted_at,
             post_drafts!draft_id ( primary_hook, devices, fmat ),
             performance_metrics!posted_record_id ( pcr, url_link_clicks )`,
          )
          .gte("posted_at", cutoff);

        if (error || !data) return {};

        type Row = {
          posted_at: string;
          post_drafts: { primary_hook: string | null; devices: string[] | null; fmat: string | null } | null;
          performance_metrics: Array<{ pcr: number | null; url_link_clicks: number | null }> | null;
        };

        const acc: {
          timeBand: Record<string, { n: number; pcr: number; url: number }>;
          hook: Record<string, { n: number; pcr: number; url: number }>;
          xFormat: Record<string, { n: number; pcr: number; url: number }>;
        } = { timeBand: {}, hook: {}, xFormat: {} };

        for (const r of (data as unknown as Row[])) {
          const perf = r.performance_metrics?.[0];
          if (!perf) continue;
          const pcr = perf.pcr ?? 0;
          const url = perf.url_link_clicks ?? 0;

          const tb = toTimeBand(new Date(r.posted_at));
          const hk = toHookKey(r.post_drafts?.primary_hook ?? null, r.post_drafts?.devices ?? []);
          const fm = fmatKey(r.post_drafts?.fmat ?? null);

          for (const [axis, key] of [[acc.timeBand, tb as string], [acc.hook, hk as string], [acc.xFormat, fm]] as const) {
            const a = axis as Record<string, { n: number; pcr: number; url: number }>;
            a[key] ??= { n: 0, pcr: 0, url: 0 };
            a[key].n += 1; a[key].pcr += pcr; a[key].url += url;
          }
        }

        const summarize = (raw: Record<string, { n: number; pcr: number; url: number }>) => {
          const out: Record<string, { n: number; avgPcr: number; avgUrlClicks: number }> = {};
          for (const [k, v] of Object.entries(raw)) out[k] = { n: v.n, avgPcr: v.pcr / v.n, avgUrlClicks: v.url / v.n };
          return out;
        };

        // Also attempt to fetch current posteriors from optimizer_state
        let posteriors: unknown = undefined;
        try {
          const { data: st } = await sb.from("optimizer_state").select("state").maybeSingle();
          if (st) posteriors = (st as { state?: unknown }).state;
        } catch { /* fail-open */ }

        return { timeBand: summarize(acc.timeBand), hook: summarize(acc.hook), xFormat: summarize(acc.xFormat), posteriors };
      } catch (e) {
        console.warn("[optimizer-analyst] getLeverPerformance error (fail-open):", String(e));
        return {};
      }
    },

    async getApprovalReasons(input) {
      try {
        const inp = (input ?? {}) as Record<string, unknown>;
        const status = typeof inp.status === "string" ? inp.status : "all";
        let q = sb.from("post_drafts")
          .select("human_approval_status, approval_reason, risk_level")
          .not("approval_reason", "is", null)
          .order("created_at", { ascending: false })
          .limit(30);
        if (status === "approved") q = q.eq("human_approval_status", "approved");
        else if (status === "rejected") q = q.eq("human_approval_status", "rejected");
        const { data, error } = await q;
        if (error || !data) return [];
        return (data as Array<{ human_approval_status: string; approval_reason: string; risk_level: string | null }>)
          .map((r) => ({ status: r.human_approval_status, reason: r.approval_reason, riskLevel: r.risk_level }));
      } catch (e) {
        console.warn("[optimizer-analyst] getApprovalReasons error (fail-open):", String(e));
        return [];
      }
    },

    async getPostDetail(input) {
      try {
        const { draft_id } = (input ?? {}) as Record<string, unknown>;
        if (typeof draft_id !== "string") return { error: "draft_id required" };

        const { data: draft, error: dErr } = await sb
          .from("post_drafts")
          .select("id, body, editor_output, fmat, primary_hook, writer_session_id, checker_session_id, human_approval_status")
          .eq("id", draft_id)
          .maybeSingle();
        if (dErr || !draft) return { error: dErr?.message ?? "not found" };

        let perf: { impressions: number | null; pcr: number | null; url_link_clicks: number | null } | null = null;
        try {
          const prRes = await sb.from("posted_records").select("id").eq("draft_id", draft_id).maybeSingle();
          if (prRes.data?.id) {
            const pmRes = await sb
              .from("performance_metrics")
              .select("impressions, pcr, url_link_clicks")
              .eq("posted_record_id", prRes.data.id)
              .maybeSingle();
            perf = pmRes.data as typeof perf;
          }
        } catch { /* fail-open */ }

        // Session text join is complex — return draft + performance; session text omitted.
        return { draft, performance: perf ?? null, note: "writer/checker session_event text omitted (join complexity)" };
      } catch (e) {
        console.warn("[optimizer-analyst] getPostDetail error (fail-open):", String(e));
        return {};
      }
    },

    async getFunnelStats() {
      try {
        const [matRes, ciRes, draftRes, approvedRes, publishedRes, perfRes] = await Promise.all([
          sb.from("materials_store").select("id", { count: "exact", head: true }),
          sb.from("core_ideas").select("id", { count: "exact", head: true }),
          sb.from("post_drafts").select("id", { count: "exact", head: true }),
          sb.from("post_drafts").select("id", { count: "exact", head: true }).eq("human_approval_status", "approved"),
          sb.from("post_drafts").select("id", { count: "exact", head: true }).not("published_at", "is", null),
          sb.from("performance_metrics").select("posted_record_id", { count: "exact", head: true }),
        ]);
        return {
          materials: matRes.count ?? 0,
          coreIdeas: ciRes.count ?? 0,
          drafts: draftRes.count ?? 0,
          approved: approvedRes.count ?? 0,
          published: publishedRes.count ?? 0,
          measured: perfRes.count ?? 0,
        };
      } catch (e) {
        console.warn("[optimizer-analyst] getFunnelStats error (fail-open):", String(e));
        return {};
      }
    },

    async getOptimizerState() {
      try {
        const { data, error } = await sb.from("optimizer_state").select("state").maybeSingle();
        if (error || !data) return {};
        return (data as { state: unknown }).state ?? {};
      } catch (e) {
        console.warn("[optimizer-analyst] getOptimizerState error (fail-open):", String(e));
        return {};
      }
    },

    async getRecentProposals() {
      try {
        const { data, error } = await sb
          .from("optimizer_proposal")
          .select("proposal_type, scope, rank, accepted, implemented, created_at")
          .order("created_at", { ascending: false })
          .limit(20);
        if (error || !data) return [];
        return data;
      } catch (e) {
        console.warn("[optimizer-analyst] getRecentProposals error (fail-open):", String(e));
        return [];
      }
    },

    async saveProposal(p) {
      const { error } = await sb.from("optimizer_proposal").insert({
        proposal_type: p.proposal_type,
        scope: p.scope,
        hypothesis: p.hypothesis,
        evidence: p.evidence,
        rank: p.rank,
      });
      if (error) throw new Error(`saveProposal failed: ${error.message}`);
    },
  };
}
