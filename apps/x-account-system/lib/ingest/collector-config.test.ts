import { COLLECTOR_CONFIG } from "./collector-config.ts";

describe("COLLECTOR_CONFIG (改善レバー SSOT)", () => {
  test("has all levers with sane defaults", () => {
    expect(COLLECTOR_CONFIG.watchlist.length).toBe(28);
    expect(COLLECTOR_CONFIG.autoPromoteDiscoveredSources).toBe(false);
    expect(COLLECTOR_CONFIG.trendWoeids).toContain(23424977); // US（海外先取り）
    expect(COLLECTOR_CONFIG.scoringWeights.target_fit).toBeGreaterThan(0);
    expect(COLLECTOR_CONFIG.maxFetchPerRun).toBeGreaterThan(0);
    expect(COLLECTOR_CONFIG.maxExploreIterations).toBeGreaterThan(0);
    expect(COLLECTOR_CONFIG.scoringModel).toMatch(/claude/);
    expect(COLLECTOR_CONFIG.scoringBatchSize).toBeGreaterThan(0);
  });
});
