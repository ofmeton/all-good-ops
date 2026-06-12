import {
  computePrior,
  computeFloorReason,
  isAiOfficialSource,
  selectForScoring,
  buildPrerankParams,
  spearmanRho,
  type PrerankParams,
} from "./collector-prerank.ts";
import { computeHints, type Candidate } from "./collector-scoring.ts";
import { COLLECTOR_CONFIG } from "./collector-config.ts";

const NOW = Date.parse("2026-06-12T00:00:00Z");

function tw(id: string, over: Partial<Candidate["tweet"]> = {}) {
  return {
    id,
    text: `text ${id}`,
    author: { userName: "rando" },
    createdAt: new Date(NOW - 3600_000).toISOString(), // 1h 前
    likeCount: 10,
    viewCount: 1000,
    ...over,
  } as Candidate["tweet"];
}

function cand(id: string, via: Candidate["discovery"]["via"] = "keyword", twOver: Partial<Candidate["tweet"]> = {}, query = "q"): Candidate {
  return { tweet: tw(id, twOver), discovery: { via, query } };
}

const params: PrerankParams = buildPrerankParams(COLLECTOR_CONFIG);

/** 決定的 rng（線形合同法）。テストで exploration を再現可能に。 */
function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

describe("buildPrerankParams overrides（P3 runtime lever overlay）", () => {
  it("override 無し → config default（挙動不変）", () => {
    const p = buildPrerankParams(COLLECTOR_CONFIG);
    expect(p.shortlistTopK).toBe(COLLECTOR_CONFIG.shortlistTopK);
    expect(p.explorationQuota).toBe(COLLECTOR_CONFIG.explorationQuota);
    expect(p.maxAgeHours).toBe(COLLECTOR_CONFIG.prerankMaxAgeHours);
  });
  it("override 値で K/quota/age を上書きする", () => {
    const p = buildPrerankParams(COLLECTOR_CONFIG, { shortlistTopK: 30, explorationQuota: 8, maxAgeHours: 60 });
    expect(p.shortlistTopK).toBe(30);
    expect(p.explorationQuota).toBe(8);
    expect(p.maxAgeHours).toBe(60);
    // 非 runtime レバーは config のまま。
    expect(p.tau).toBe(COLLECTOR_CONFIG.prerankTau);
    expect(p.freshnessProtectHours).toBe(COLLECTOR_CONFIG.freshnessProtectHours);
  });
  it("一部のみ override → 残りは config default", () => {
    const p = buildPrerankParams(COLLECTOR_CONFIG, { shortlistTopK: 40 });
    expect(p.shortlistTopK).toBe(40);
    expect(p.explorationQuota).toBe(COLLECTOR_CONFIG.explorationQuota);
    expect(p.maxAgeHours).toBe(COLLECTOR_CONFIG.prerankMaxAgeHours);
  });
});

describe("computePrior", () => {
  test("新鮮・高velocity・高engagement ほど prior が高い", () => {
    const fresh = computePrior(computeHints(tw("a", { createdAt: new Date(NOW - 600_000).toISOString(), likeCount: 500, viewCount: 1000 }), NOW), "keyword", params);
    const stale = computePrior(computeHints(tw("b", { createdAt: new Date(NOW - 200 * 3600_000).toISOString(), likeCount: 1, viewCount: 100000 }), NOW), "keyword", params);
    expect(fresh).toBeGreaterThan(stale);
  });

  test("viaBoost が加算される（同条件なら trend > fixed）", () => {
    const h = computeHints(tw("a"), NOW);
    expect(computePrior(h, "trend", params)).toBeGreaterThan(computePrior(h, "fixed", params));
  });
});

describe("computeFloorReason", () => {
  test("empty_text: 本文空は age 無関係に floor", () => {
    const t = tw("a", { text: "   " });
    expect(computeFloorReason(t, computeHints(t, NOW), false, params)).toBe("empty_text");
  });

  test("stale_low_velocity: 古い∧低velocity∧非ai_official で floor", () => {
    const t = tw("a", { createdAt: new Date(NOW - 100 * 3600_000).toISOString(), likeCount: 0, retweetCount: 0, bookmarkCount: 0, viewCount: 10 });
    expect(computeFloorReason(t, computeHints(t, NOW), false, params)).toBe("stale_low_velocity");
  });

  test("免除: ai_official は stale でも floor しない", () => {
    const t = tw("a", { createdAt: new Date(NOW - 100 * 3600_000).toISOString(), likeCount: 0, viewCount: 10 });
    expect(computeFloorReason(t, computeHints(t, NOW), true, params)).toBeNull();
  });

  test("免除: fresh-protect（age<6h）は stale 条件でも floor しない", () => {
    // age 3h（<6h）だが velocity 低い → fresh-protect で温存。
    const t = tw("a", { createdAt: new Date(NOW - 3 * 3600_000).toISOString(), likeCount: 0, viewCount: 10 });
    expect(computeFloorReason(t, computeHints(t, NOW), false, params)).toBeNull();
  });

  test("免除: createdAt parse 不能は温存（floor しない）", () => {
    const t = tw("a", { createdAt: "not-a-date", text: "ok" });
    expect(computeFloorReason(t, computeHints(t, NOW), false, params)).toBeNull();
  });
});

describe("isAiOfficialSource", () => {
  const ai = params.aiOfficialHandles;
  test("実著者が ai_official watchlist なら true（経路問わず）", () => {
    expect(isAiOfficialSource(cand("a", "keyword", { author: { userName: "AnthropicAI" } }), ai)).toBe(true);
  });
  test("fixed 経路で query が from:<ai_official> を含めば true", () => {
    expect(isAiOfficialSource(cand("a", "fixed", { author: { userName: "rando" } }, "from:OpenAI min_faves:10"), ai)).toBe(true);
  });
  test("非 ai_official かつ keyword は false", () => {
    expect(isAiOfficialSource(cand("a", "keyword", { author: { userName: "rando" } }, "claude"), ai)).toBe(false);
  });
});

describe("selectForScoring", () => {
  test("safeguard: ai_official 著者は無条件 selected（floor 評価しない）", () => {
    // stale な ai_official（普通なら floor 相当）でも safeguard で残る。
    const c = cand("ai1", "keyword", { author: { userName: "OpenAI" }, createdAt: new Date(NOW - 300 * 3600_000).toISOString(), likeCount: 0, viewCount: 5 });
    const r = selectForScoring([c], params, seededRng(1), NOW);
    expect(r.selected.map((s) => s.candidate.tweet.id)).toContain("ai1");
    expect(r.selected.find((s) => s.candidate.tweet.id === "ai1")?.pool).toBe("safeguard");
    expect(r.pruned).toHaveLength(0);
  });

  test("topK: prior 上位 K のみ selected、残りは below_shortlist で pruned", () => {
    const p: PrerankParams = { ...params, shortlistTopK: 2, explorationQuota: 0 };
    // velocity 差で prior 順を作る（like 多いほど上位）。全て keyword・1h 前・本文あり（floor 回避）。
    const cands = [
      cand("hi", "keyword", { likeCount: 900 }),
      cand("mid", "keyword", { likeCount: 400 }),
      cand("lo1", "keyword", { likeCount: 5 }),
      cand("lo2", "keyword", { likeCount: 3 }),
    ];
    const r = selectForScoring(cands, p, seededRng(1), NOW);
    expect(r.selected.map((s) => s.candidate.tweet.id).sort()).toEqual(["hi", "mid"]);
    expect(r.pruned.map((x) => x.reason)).toEqual(["below_shortlist", "below_shortlist"]);
    expect(r.poolCounts.topK).toBe(2);
  });

  test("exploration: 残余から via 層化で E 件・rng で決定的・selected に重複なし", () => {
    const p: PrerankParams = { ...params, shortlistTopK: 1, explorationQuota: 2 };
    const cands = [
      cand("top", "keyword", { likeCount: 999 }),
      cand("k1", "keyword", { likeCount: 50 }),
      cand("k2", "keyword", { likeCount: 40 }),
      cand("t1", "trend", { likeCount: 30 }),
      cand("t2", "trend", { likeCount: 20 }),
    ];
    const r = selectForScoring(cands, p, seededRng(7), NOW);
    const ids = r.selected.map((s) => s.candidate.tweet.id);
    expect(ids).toContain("top"); // topK
    expect(r.poolCounts.exploration).toBe(2);
    // 層化: keyword/trend それぞれから 1 件ずつ（round-robin）。
    const explored = r.selected.filter((s) => s.pool === "exploration").map((s) => s.candidate.tweet.id);
    expect(explored).toHaveLength(2);
    const vias = new Set(explored.map((id) => cands.find((c) => c.tweet.id === id)!.discovery.via));
    expect(vias).toEqual(new Set(["keyword", "trend"]));
    // 重複排除: 全 selected id は一意。
    expect(new Set(ids).size).toBe(ids.length);
    // 決定性: 同 seed で同結果。
    const r2 = selectForScoring(cands, p, seededRng(7), NOW);
    expect(r2.selected.map((s) => s.candidate.tweet.id)).toEqual(ids);
  });

  test("floor された候補は topK/exploration の母数に入らない", () => {
    const p: PrerankParams = { ...params, shortlistTopK: 10, explorationQuota: 5 };
    const cands = [
      cand("good", "keyword", { likeCount: 100 }),
      cand("empty", "keyword", { text: "" }),
    ];
    const r = selectForScoring(cands, p, seededRng(1), NOW);
    expect(r.selected.map((s) => s.candidate.tweet.id)).toEqual(["good"]);
    expect(r.pruned).toEqual([expect.objectContaining({ reason: "empty_text" })]);
  });
});

describe("spearmanRho", () => {
  test("完全単調一致は 1", () => {
    expect(spearmanRho([{ a: 1, b: 10 }, { a: 2, b: 20 }, { a: 3, b: 30 }])).toBeCloseTo(1, 6);
  });
  test("完全逆相関は -1", () => {
    expect(spearmanRho([{ a: 1, b: 30 }, { a: 2, b: 20 }, { a: 3, b: 10 }])).toBeCloseTo(-1, 6);
  });
  test("n<2 は null", () => {
    expect(spearmanRho([{ a: 1, b: 1 }])).toBeNull();
  });
});
