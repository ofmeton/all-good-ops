import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { toTimeBand, toHookKey } from "../optimizer/reward-extractor.js";
import { resolveRuntimeParams, RUNTIME_PARAM_IDS, RUNTIME_PARAM_BOUNDS } from "../params/runtime-params.js";
import type { Snapshot, CollectionSnapshot, CollectionPoolYield } from "./types.ts";

const num = (x: unknown): number => (typeof x === "number" && Number.isFinite(x) ? x : 0);

/** loadCollection が読む生集計（cost_ledger meta + funnel カウント + pool + levers）。 */
export interface CollectionRaw {
  windowDays: number;
  cost: { exploreJpy: number; scoringJpy: number; translateJpy: number };
  funnel: {
    fetched: number; deduped: number; pruned: number; fineScored: number;
    inserted: number; queued: number; drafted: number; approved: number; published: number;
  };
  poolYield: Record<string, { selected: number; queued: number }>;
  explorationHighScoreRate: number | null;
  levers: Array<{ paramId: string; value: number; min: number; max: number }>;
}

/**
 * 生集計 → 派生指標（純関数・決定的・テスト対象）。
 * totalJpy / jpy_per_queued / jpy_per_approved / pool 別 queuedRate を導出する。0 除算は null/0。
 */
export function buildCollectionMetrics(raw: CollectionRaw): CollectionSnapshot {
  const totalJpy = raw.cost.exploreJpy + raw.cost.scoringJpy + raw.cost.translateJpy;
  const poolYield: Record<string, CollectionPoolYield> = {};
  for (const [k, v] of Object.entries(raw.poolYield)) {
    poolYield[k] = { selected: v.selected, queued: v.queued, queuedRate: v.selected > 0 ? v.queued / v.selected : 0 };
  }
  return {
    windowDays: raw.windowDays,
    cost: { ...raw.cost, totalJpy },
    funnel: raw.funnel,
    jpyPerQueued: raw.funnel.queued > 0 ? totalJpy / raw.funnel.queued : null,
    jpyPerApproved: raw.funnel.approved > 0 ? totalJpy / raw.funnel.approved : null,
    poolYield,
    explorationHighScoreRate: raw.explorationHighScoreRate,
    levers: raw.levers,
  };
}

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
  lines.push(`\n## cost(窓内JPY): ${Object.entries(s.cost).map(([k, v]) => `${k}=${v}`).join(" / ") || "なし"}`);
  if (s.collection) lines.push(renderCollectionSection(s.collection));
  lines.push(`\n## 過去提案: ${s.recentProposals.length} 件（${s.recentProposals.map((p) => `${p.scope}/${p.rank}${p.implemented ? "✓" : ""}`).join(", ") || "なし"}）`);
  return lines.join("\n");
}

/** 収集 ROI セクション（AD-4）。目的関数＝¥当たり品質最大化を明文化して analyst に読ませる。 */
function renderCollectionSection(c: CollectionSnapshot): string {
  const f = c.funnel;
  const j2 = (v: number | null) => (v == null ? "n/a" : v.toFixed(2));
  const lines: string[] = [];
  lines.push(`\n## 収集 ROI（直近 ${c.windowDays} 日）`);
  lines.push("目的関数: **コスト最小化でなく ¥当たり品質最大化**。主=approved_yield_per_jpy（¥/approved を下げる＝¥当たり承認品質を上げる）/ 従=published_engagement_per_jpy / guard=exploration_high_score_rate（剪定が価値を捨てていないか）。");
  lines.push(`- cost: explore=${c.cost.exploreJpy.toFixed(1)} scoring=${c.cost.scoringJpy.toFixed(1)} translate=${c.cost.translateJpy.toFixed(1)} total=${c.cost.totalJpy.toFixed(1)} JPY`);
  lines.push(`- funnel: fetched=${f.fetched} deduped=${f.deduped} pruned=${f.pruned} fine_scored=${f.fineScored} inserted=${f.inserted} queued=${f.queued} drafted=${f.drafted} approved=${f.approved} published=${f.published}`);
  lines.push(`- jpy_per_queued=${j2(c.jpyPerQueued)} / jpy_per_approved=${j2(c.jpyPerApproved)}（主目的関数）`);
  const pools = Object.entries(c.poolYield);
  lines.push(`- pool別yield: ${pools.length ? pools.map(([k, v]) => `${k}: selected=${v.selected} queued=${v.queued} rate=${v.queuedRate.toFixed(2)}`).join(" / ") : "（enforce run のみ母数あり・現状なし）"}`);
  lines.push(`- exploration_high_score_rate(guard)=${c.explorationHighScoreRate == null ? "n/a" : c.explorationHighScoreRate.toFixed(3)}`);
  lines.push(`- 現レバー値/bounds: ${c.levers.map((l) => `${l.paramId}=${l.value}[${l.min},${l.max}]`).join(" / ")}`);
  lines.push("収集 ROI に改善余地があれば scope=collector_lever で提案可（reviewer が meta.apply={paramId,value} を付け tier-P 適用）。");
  return lines.join("\n");
}

export interface SnapshotDeps {
  loadPerfRows: () => Promise<PerfRow[]>;
  loadApprovalReasons: () => Promise<Snapshot["approvalReasons"]>;
  loadFunnel: () => Promise<Snapshot["funnel"]>;
  loadCost: () => Promise<Snapshot["cost"]>;
  loadRecentProposals: () => Promise<Snapshot["recentProposals"]>;
  /** P4 収集 ROI（AD-4）。未提供/未取得は null。 */
  loadCollection?: () => Promise<CollectionSnapshot | null>;
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
 *
 * P4 dual window（AD-4）:
 *   - leverWindowDays（既定 30）: lever performance（posted_at の窓）。**maturity lag** で
 *     posted_at <= now-3d を要求し、計測が成熟していない直近 post を除く。
 *   - collectionWindowDays（既定 7）: cost / 収集 ROI（created_at の窓）。loadCost も窓基準
 *     （旧「当月」は月初に空になる問題があった）。
 */
export function defaultSnapshotDeps(leverWindowDays = 30, collectionWindowDays = 7): SnapshotDeps {
  const sb = getSnapshotSb();
  const windowDays = leverWindowDays;
  // maturity lag: posted_at がこの時刻より新しい post は計測未成熟として lever 集計から除外。
  const MATURITY_LAG_DAYS = 3;

  if (!sb) {
    return {
      windowDays,
      loadPerfRows: async () => [],
      loadApprovalReasons: async () => [],
      loadFunnel: async () => ({ materials: 0, coreIdeas: 0, drafts: 0, approved: 0, published: 0, measured: 0 }),
      loadCost: async () => ({}),
      loadRecentProposals: async () => [],
      loadCollection: async () => null,
    };
  }

  return {
    windowDays,

    async loadPerfRows() {
      try {
        const cutoff = new Date(Date.now() - windowDays * 24 * 3600 * 1000).toISOString();
        const lagCutoff = new Date(Date.now() - MATURITY_LAG_DAYS * 24 * 3600 * 1000).toISOString();
        const { data, error } = await sb
          .from("posted_records")
          .select(
            `posted_at,
             post_drafts!draft_id ( primary_hook, devices, fmat ),
             performance_metrics!posted_record_id ( pcr, url_link_clicks )`,
          )
          .gte("posted_at", cutoff)
          .lte("posted_at", lagCutoff); // maturity lag（未成熟 post を除外）

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
        // P4: 「当月」→「窓内 created_at 範囲」へ。月初に当月集計が空になる問題を解消し、
        // 収集 ROI（collectionWindowDays）と同じ時間窓でコストを見る。
        const cutoff = new Date(Date.now() - collectionWindowDays * 24 * 3600 * 1000).toISOString();
        const { data, error } = await sb
          .from("cost_ledger")
          .select("category, cost_jpy")
          .gte("created_at", cutoff);
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

    /**
     * P4 収集 ROI（AD-4）。窓=collectionWindowDays（created_at 基準）。全て fail-open（失敗は null）。
     *   - cost / 収集 funnel(fetched/deduped/pruned/fine_scored/inserted) = cost_ledger(collector) の meta 集計。
     *   - queued/drafted/approved/published = materials_store / post_drafts の窓内カウント。
     *   - pool 別 yield = materials_store.meta.selection_pool（enforce run のみ母数あり）。
     *   - exploration_high_score_rate = cost_ledger meta.shadow の集計（shadow run のみ・無ければ null）。
     *   - levers = runtime_params の現在値 + bounds。
     */
    async loadCollection(): Promise<CollectionSnapshot | null> {
      try {
        const cutoff = new Date(Date.now() - collectionWindowDays * 24 * 3600 * 1000).toISOString();
        const raw: CollectionRaw = {
          windowDays: collectionWindowDays,
          cost: { exploreJpy: 0, scoringJpy: 0, translateJpy: 0 },
          funnel: { fetched: 0, deduped: 0, pruned: 0, fineScored: 0, inserted: 0, queued: 0, drafted: 0, approved: 0, published: 0 },
          poolYield: {},
          explorationHighScoreRate: null,
          levers: [],
        };

        // 1) cost + collect-run funnel + guard（cost_ledger collector の meta 集計）。
        const { data: ledger } = await sb
          .from("cost_ledger").select("meta").eq("category", "collector").gte("created_at", cutoff);
        let ehsNum = 0, ehsDen = 0;
        for (const row of (ledger ?? []) as Array<{ meta: Record<string, unknown> | null }>) {
          const m = (row.meta ?? {}) as Record<string, unknown>;
          const b = (m.breakdown ?? {}) as Record<string, unknown>;
          raw.cost.exploreJpy += num(b.exploreJpy);
          raw.cost.scoringJpy += num(b.scoringJpy);
          raw.cost.translateJpy += num(b.translateJpy);
          raw.funnel.fetched += num(m.fetched);
          raw.funnel.deduped += num(m.deduped);
          raw.funnel.fineScored += num(m.scored);
          raw.funnel.inserted += num(m.inserted);
          raw.funnel.pruned += num((m.pruned as { count?: unknown } | null)?.count);
          const ehs = (m.shadow as { exploration_high_score_rate?: unknown } | null)?.exploration_high_score_rate;
          if (typeof ehs === "number" && Number.isFinite(ehs)) { ehsNum += ehs; ehsDen += 1; }
        }
        raw.explorationHighScoreRate = ehsDen > 0 ? ehsNum / ehsDen : null;

        // 2) queued / drafted / approved / published（窓内）。
        const [queuedRes, draftRes, approvedRes, publishedRes] = await Promise.all([
          sb.from("materials_store").select("id", { count: "exact", head: true })
            .eq("source_type", "x_inspirations").gte("created_at", cutoff).eq("meta->>selection_status", "queued"),
          sb.from("post_drafts").select("id", { count: "exact", head: true }).gte("created_at", cutoff),
          sb.from("post_drafts").select("id", { count: "exact", head: true }).gte("created_at", cutoff).eq("human_approval_status", "approved"),
          sb.from("post_drafts").select("id", { count: "exact", head: true }).gte("created_at", cutoff).not("published_at", "is", null),
        ]);
        raw.funnel.queued = queuedRes.count ?? 0;
        raw.funnel.drafted = draftRes.count ?? 0;
        raw.funnel.approved = approvedRes.count ?? 0;
        raw.funnel.published = publishedRes.count ?? 0;

        // 3) pool 別 yield（enforce run のみ meta.selection_pool あり）。
        const { data: pooled } = await sb
          .from("materials_store").select("meta")
          .eq("source_type", "x_inspirations").gte("created_at", cutoff)
          .not("meta->>selection_pool", "is", null).limit(2000);
        for (const row of (pooled ?? []) as Array<{ meta: Record<string, unknown> | null }>) {
          const m = (row.meta ?? {}) as Record<string, unknown>;
          const pool = m.selection_pool;
          if (typeof pool !== "string") continue;
          raw.poolYield[pool] ??= { selected: 0, queued: 0 };
          raw.poolYield[pool].selected += 1;
          if (m.selection_status === "queued") raw.poolYield[pool].queued += 1;
        }

        // 4) 現レバー値 + bounds。
        const rp = await resolveRuntimeParams(sb as never);
        raw.levers = RUNTIME_PARAM_IDS.map((id) => ({
          paramId: id, value: rp[id], min: RUNTIME_PARAM_BOUNDS[id].min, max: RUNTIME_PARAM_BOUNDS[id].max,
        }));

        return buildCollectionMetrics(raw);
      } catch (e) {
        console.warn("[optimizer-analyst] loadCollection error (fail-open):", String(e));
        return null;
      }
    },
  };
}

export async function buildSnapshot(deps: SnapshotDeps): Promise<Snapshot> {
  const windowDays = deps.windowDays ?? 30;
  const [rows, approvalReasons, funnel, cost, recentProposals, collection] = await Promise.all([
    deps.loadPerfRows(), deps.loadApprovalReasons(), deps.loadFunnel(), deps.loadCost(), deps.loadRecentProposals(),
    deps.loadCollection ? deps.loadCollection() : Promise.resolve(null),
  ]);
  return {
    windowDays,
    leverPerformance: aggregateLeverPerformance(rows),
    approvalReasons, funnel, cost, recentProposals,
    postsMeasured: rows.length,
    collection,
  };
}
