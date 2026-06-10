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
