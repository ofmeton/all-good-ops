import { aggregateLeverPerformance, renderSnapshotText } from "./snapshot.ts";
import type { Snapshot } from "./types.ts";

describe("aggregateLeverPerformance", () => {
  test("groups rows by band/hook/fmat with avg pcr & url_clicks", () => {
    const rows = [
      { timeBand: "morning", hook: "number_lead", xFormat: "short", pcr: 0.04, urlLinkClicks: 4 },
      { timeBand: "morning", hook: "number_lead", xFormat: "short", pcr: 0.06, urlLinkClicks: 6 },
      { timeBand: "noon", hook: "other", xFormat: "medium", pcr: 0.02, urlLinkClicks: 0 },
    ];
    const out = aggregateLeverPerformance(rows);
    expect(out.timeBand.morning).toEqual({ n: 2, avgPcr: 0.05, avgUrlClicks: 5 });
    expect(out.timeBand.noon).toEqual({ n: 1, avgPcr: 0.02, avgUrlClicks: 0 });
    expect(out.hook.number_lead.n).toBe(2);
    expect(out.xFormat.short.avgUrlClicks).toBe(5);
  });
  test("empty → empty groups", () => {
    expect(aggregateLeverPerformance([])).toEqual({ timeBand: {}, hook: {}, xFormat: {} });
  });
});

describe("renderSnapshotText", () => {
  test("renders a non-empty human-readable digest mentioning windowDays and funnel", () => {
    const snap: Snapshot = {
      windowDays: 30,
      leverPerformance: { timeBand: { morning: { n: 2, avgPcr: 0.05, avgUrlClicks: 5 } }, hook: {}, xFormat: {} },
      approvalReasons: [{ status: "rejected", reason: "煽りすぎ", riskLevel: "high" }],
      funnel: { materials: 50, coreIdeas: 20, drafts: 18, approved: 12, published: 12, measured: 12 },
      cost: { writer: 300 },
      recentProposals: [],
      postsMeasured: 12,
    };
    const text = renderSnapshotText(snap);
    expect(text).toContain("30");
    expect(text).toContain("morning");
    expect(text).toContain("煽りすぎ");
    expect(text).toContain("published");
  });
});
