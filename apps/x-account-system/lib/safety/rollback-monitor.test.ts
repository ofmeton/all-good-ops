/**
 * rollback-monitor.test.ts (PR-D)
 */
import { evaluateRollback } from "./rollback-monitor.ts";

describe("evaluateRollback", () => {
  test("no drop → no trigger", () => {
    const r = evaluateRollback({
      pcr_current: 0.012,
      pcr_baseline: 0.011,
      impressions_current: 5000,
      impressions_baseline: 4800,
    });
    expect(r.triggered).toBe(false);
    expect(r.reasons.length).toBe(0);
  });

  test("PCR -30% → trigger", () => {
    const r = evaluateRollback({
      pcr_current: 0.007,
      pcr_baseline: 0.010,
      impressions_current: 5000,
      impressions_baseline: 5000,
    });
    expect(r.triggered).toBe(true);
    expect(r.reasons[0]).toContain("PCR drop");
    expect(r.pcr_drop_pct).toBeLessThanOrEqual(-30);
  });

  test("Impressions -50% → trigger", () => {
    const r = evaluateRollback({
      pcr_current: 0.011,
      pcr_baseline: 0.010,
      impressions_current: 2500,
      impressions_baseline: 5000,
    });
    expect(r.triggered).toBe(true);
    expect(r.reasons.some((s) => s.includes("Impressions"))).toBe(true);
    expect(r.impressions_drop_pct).toBeLessThanOrEqual(-50);
  });

  test("PCR -25% (under threshold) + Impressions -45% (under threshold) → no trigger", () => {
    const r = evaluateRollback({
      pcr_current: 0.0075,
      pcr_baseline: 0.010,
      impressions_current: 2750,
      impressions_baseline: 5000,
    });
    expect(r.triggered).toBe(false);
  });

  test("baseline null → no trigger (insufficient data)", () => {
    const r = evaluateRollback({
      pcr_current: 0.005,
      pcr_baseline: null,
      impressions_current: 1000,
      impressions_baseline: null,
    });
    expect(r.triggered).toBe(false);
  });

  test("rollback_steps is 0 (Phase 0.5 stub)", () => {
    const r = evaluateRollback({
      pcr_current: 0.001,
      pcr_baseline: 0.010,
      impressions_current: 100,
      impressions_baseline: 5000,
    });
    expect(r.triggered).toBe(true);
    expect(r.rollback_steps).toBe(0); // PR-C 完了まで stub
  });
});
