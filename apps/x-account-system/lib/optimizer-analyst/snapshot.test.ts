import { aggregateLeverPerformance, renderSnapshotText, buildCollectionMetrics, type CollectionRaw } from "./snapshot.ts";
import type { Snapshot, CollectionSnapshot } from "./types.ts";

function collectionRaw(over: Partial<CollectionRaw> = {}): CollectionRaw {
  return {
    windowDays: 7,
    cost: { exploreJpy: 30, scoringJpy: 60, translateJpy: 10 },
    funnel: { fetched: 200, deduped: 150, pruned: 50, fineScored: 100, inserted: 80, queued: 20, drafted: 18, approved: 10, published: 8 },
    poolYield: { topK: { selected: 60, queued: 15 }, exploration: { selected: 10, queued: 1 } },
    explorationHighScoreRate: 0.05,
    levers: [{ paramId: "collector_shortlist_top_k", value: 60, min: 20, max: 120 }],
    ...over,
  };
}

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
    // collection 未設定なら収集 ROI セクションは出ない。
    expect(text).not.toContain("収集 ROI");
  });
});

describe("buildCollectionMetrics", () => {
  test("totalJpy / jpy_per_queued / jpy_per_approved / pool queuedRate を導出", () => {
    const c = buildCollectionMetrics(collectionRaw());
    expect(c.cost.totalJpy).toBe(100); // 30+60+10
    expect(c.jpyPerQueued).toBeCloseTo(100 / 20, 9); // 5
    expect(c.jpyPerApproved).toBeCloseTo(100 / 10, 9); // 10
    expect(c.poolYield.topK.queuedRate).toBeCloseTo(15 / 60, 9);
    expect(c.poolYield.exploration.queuedRate).toBeCloseTo(1 / 10, 9);
    expect(c.explorationHighScoreRate).toBe(0.05);
    expect(c.windowDays).toBe(7);
  });

  test("queued/approved=0 は jpy_per_* が null（0 除算しない）", () => {
    const c = buildCollectionMetrics(collectionRaw({
      funnel: { fetched: 10, deduped: 10, pruned: 0, fineScored: 10, inserted: 5, queued: 0, drafted: 0, approved: 0, published: 0 },
    }));
    expect(c.jpyPerQueued).toBeNull();
    expect(c.jpyPerApproved).toBeNull();
  });

  test("pool selected=0 は queuedRate=0（0 除算しない）", () => {
    const c = buildCollectionMetrics(collectionRaw({ poolYield: { safeguard: { selected: 0, queued: 0 } } }));
    expect(c.poolYield.safeguard.queuedRate).toBe(0);
  });
});

describe("renderSnapshotText with collection (収集 ROI)", () => {
  function snapWithCollection(collection: CollectionSnapshot | null): Snapshot {
    return {
      windowDays: 14,
      leverPerformance: { timeBand: {}, hook: {}, xFormat: {} },
      approvalReasons: [],
      funnel: { materials: 0, coreIdeas: 0, drafts: 0, approved: 0, published: 0, measured: 0 },
      cost: { collector: 100 },
      recentProposals: [],
      postsMeasured: 0,
      collection,
    };
  }

  test("収集 ROI セクションに目的関数・funnel・レバー・collector_lever を出す", () => {
    const c = buildCollectionMetrics(collectionRaw());
    const text = renderSnapshotText(snapWithCollection(c));
    expect(text).toContain("収集 ROI");
    expect(text).toContain("¥当たり品質最大化");
    expect(text).toContain("approved_yield_per_jpy");
    expect(text).toContain("jpy_per_approved");
    expect(text).toContain("collector_shortlist_top_k=60[20,120]");
    expect(text).toContain("collector_lever");
    // cost ラベルは「窓内JPY」（当月→窓へ変更）。
    expect(text).toContain("cost(窓内JPY)");
  });

  test("collection=null は収集 ROI セクションを出さない", () => {
    const text = renderSnapshotText(snapWithCollection(null));
    expect(text).not.toContain("収集 ROI");
  });
});
