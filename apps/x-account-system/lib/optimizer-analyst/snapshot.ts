import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { toTimeBand, toHookKey } from "../optimizer/reward-extractor.js";
import type { Snapshot } from "./types.ts";

export type PerfRow = { timeBand: string; hook: string; xFormat: string; pcr: number; urlLinkClicks: number };
type Group = Record<string, { n: number; avgPcr: number; avgUrlClicks: number }>;

function groupBy(rows: PerfRow[], key: keyof PerfRow): Group {
  const acc: Record<string, { n: number; pcr: number; url: number }> = {};
  for (const r of rows) {
    const k = String(r[key]);
    acc[k] ??= { n: 0, pcr: 0, url: 0 };
    acc[k].n += 1; acc[k].pcr += r.pcr; acc[k].url += r.urlLinkClicks;
  }
  const out: Group = {};
  for (const [k, v] of Object.entries(acc)) {
    out[k] = { n: v.n, avgPcr: v.pcr / v.n, avgUrlClicks: v.url / v.n };
  }
  return out;
}

export function aggregateLeverPerformance(rows: PerfRow[]): Snapshot["leverPerformance"] {
  return { timeBand: groupBy(rows, "timeBand"), hook: groupBy(rows, "hook"), xFormat: groupBy(rows, "xFormat") };
}

export function renderSnapshotText(s: Snapshot): string {
  const lines: string[] = [];
  lines.push(`# 観測スナップショット（直近 ${s.windowDays} 日 / 計測投稿 ${s.postsMeasured} 件）`);
  lines.push(`\n## レバー別 performance（avg PCR / avg url_clicks / n）`);
  for (const [axis, g] of Object.entries(s.leverPerformance)) {
    lines.push(`### ${axis}`);
    for (const [k, v] of Object.entries(g)) lines.push(`- ${k}: pcr=${v.avgPcr.toFixed(4)} url=${v.avgUrlClicks.toFixed(1)} n=${v.n}`);
  }
  lines.push(`\n## 承認/却下理由`);
  for (const a of s.approvalReasons) lines.push(`- [${a.status}] risk=${a.riskLevel ?? "-"}: ${a.reason}`);
  lines.push(`\n## funnel: materials=${s.funnel.materials} coreIdeas=${s.funnel.coreIdeas} drafts=${s.funnel.drafts} approved=${s.funnel.approved} published=${s.funnel.published} measured=${s.funnel.measured}`);
  lines.push(`\n## cost(当月JPY): ${Object.entries(s.cost).map(([k, v]) => `${k}=${v}`).join(" / ") || "なし"}`);
  lines.push(`\n## 過去提案: ${s.recentProposals.length} 件（${s.recentProposals.map((p) => `${p.scope}/${p.rank}${p.implemented ? "✓" : ""}`).join(", ") || "なし"}）`);
  return lines.join("\n");
}

export interface SnapshotDeps {
  loadPerfRows: () => Promise<PerfRow[]>;
  loadApprovalReasons: () => Promise<Snapshot["approvalReasons"]>;
  loadFunnel: () => Promise<Snapshot["funnel"]>;
  loadCost: () => Promise<Snapshot["cost"]>;
  loadRecentProposals: () => Promise<Snapshot["recentProposals"]>;
  windowDays?: number;
}

// ---------------------------------------------------------------------------
// Production snapshot deps (real Supabase)
// ---------------------------------------------------------------------------

let _snapshotSb: SupabaseClient | null = null;
function getSnapshotSb(): SupabaseClient | null {
  if (process.env.IN_MEMORY_FALLBACK === "true") return null;
  if (!_snapshotSb && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    _snapshotSb = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { db: { schema: (process.env.SUPABASE_SCHEMA || "public") as "public" } },
    );
  }
  return _snapshotSb;
}

function snapshotFmatKey(fmat: string | null): string {
  switch (fmat) {
    case "short": return "short";
    case "medium": return "medium";
    case "long": return "long";
    case "thread": return "thread";
    default: return "short";
  }
}

/**
 * Production SnapshotDeps — reads from Supabase (xad schema). All queries fail-open.
 */
export function defaultSnapshotDeps(windowDays = 30): SnapshotDeps {
  const sb = getSnapshotSb();

  if (!sb) {
    return {
      windowDays,
      loadPerfRows: async () => [],
      loadApprovalReasons: async () => [],
      loadFunnel: async () => ({ materials: 0, coreIdeas: 0, drafts: 0, approved: 0, published: 0, measured: 0 }),
      loadCost: async () => ({}),
      loadRecentProposals: async () => [],
    };
  }

  return {
    windowDays,

    async loadPerfRows() {
      try {
        const cutoff = new Date(Date.now() - windowDays * 24 * 3600 * 1000).toISOString();
        const { data, error } = await sb
          .from("posted_records")
          .select(
            `posted_at,
             post_drafts!draft_id ( primary_hook, devices, fmat ),
             performance_metrics!posted_record_id ( pcr, url_link_clicks )`,
          )
          .gte("posted_at", cutoff);

        if (error || !data) return [];

        type Row = {
          posted_at: string;
          post_drafts: { primary_hook: string | null; devices: string[] | null; fmat: string | null } | null;
          performance_metrics: Array<{ pcr: number | null; url_link_clicks: number | null }> | null;
        };

        return (data as unknown as Row[]).flatMap((r) => {
          const perf = r.performance_metrics?.[0];
          if (!perf) return [];
          return [{
            timeBand: toTimeBand(new Date(r.posted_at)),
            hook: toHookKey(r.post_drafts?.primary_hook ?? null, r.post_drafts?.devices ?? []),
            xFormat: snapshotFmatKey(r.post_drafts?.fmat ?? null),
            pcr: perf.pcr ?? 0,
            urlLinkClicks: perf.url_link_clicks ?? 0,
          }];
        });
      } catch (e) {
        console.warn("[optimizer-analyst] loadPerfRows error (fail-open):", String(e));
        return [];
      }
    },

    async loadApprovalReasons() {
      try {
        const { data, error } = await sb
          .from("post_drafts")
          .select("human_approval_status, approval_reason, risk_level")
          .not("approval_reason", "is", null)
          .order("created_at", { ascending: false })
          .limit(30);
        if (error || !data) return [];
        return (data as Array<{ human_approval_status: string; approval_reason: string; risk_level: string | null }>)
          .map((r) => ({ status: r.human_approval_status, reason: r.approval_reason, riskLevel: r.risk_level }));
      } catch (e) {
        console.warn("[optimizer-analyst] loadApprovalReasons error (fail-open):", String(e));
        return [];
      }
    },

    async loadFunnel() {
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
        console.warn("[optimizer-analyst] loadFunnel error (fail-open):", String(e));
        return { materials: 0, coreIdeas: 0, drafts: 0, approved: 0, published: 0, measured: 0 };
      }
    },

    async loadCost() {
      try {
        // Current month UTC
        const now = new Date();
        const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
        const { data, error } = await sb
          .from("cost_ledger")
          .select("category, cost_jpy")
          .eq("month", month);
        if (error || !data) return {};
        const out: Record<string, number> = {};
        for (const row of (data as Array<{ category: string; cost_jpy: number }>)) {
          out[row.category] = (out[row.category] ?? 0) + row.cost_jpy;
        }
        return out;
      } catch (e) {
        console.warn("[optimizer-analyst] loadCost error (fail-open):", String(e));
        return {};
      }
    },

    async loadRecentProposals() {
      try {
        const { data, error } = await sb
          .from("optimizer_proposal")
          .select("proposal_type, scope, rank, accepted, implemented")
          .order("created_at", { ascending: false })
          .limit(20);
        if (error || !data) return [];
        return data as Snapshot["recentProposals"];
      } catch (e) {
        console.warn("[optimizer-analyst] loadRecentProposals error (fail-open):", String(e));
        return [];
      }
    },
  };
}

export async function buildSnapshot(deps: SnapshotDeps): Promise<Snapshot> {
  const windowDays = deps.windowDays ?? 30;
  const [rows, approvalReasons, funnel, cost, recentProposals] = await Promise.all([
    deps.loadPerfRows(), deps.loadApprovalReasons(), deps.loadFunnel(), deps.loadCost(), deps.loadRecentProposals(),
  ]);
  return {
    windowDays,
    leverPerformance: aggregateLeverPerformance(rows),
    approvalReasons, funnel, cost, recentProposals,
    postsMeasured: rows.length,
  };
}
