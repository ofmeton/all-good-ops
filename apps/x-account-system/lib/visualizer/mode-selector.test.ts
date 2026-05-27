/**
 * mode-selector tests.
 *
 * 検証:
 *   - weighted random で initial-values §3.7 比率に従う (image 70 / video 15 / text_only 15)
 *   - 境界 (rand=0.69 → image, rand=0.84 → video, rand=0.99 → text_only)
 *   - switchback は ISO 週番号 mod 3 で order 巡回
 *   - 1000 サンプルでの分布が誤差 ±3pp 以内
 */

import {
  MODE_WEIGHTS,
  selectModeBySwitchback,
  selectVisualizerMode,
} from "./mode-selector.ts";
import type { VisualizerMode } from "./types.ts";

describe("selectVisualizerMode (boundary)", () => {
  test("rand=0 → image", () => {
    expect(selectVisualizerMode(() => 0)).toBe("image");
  });
  test("rand=0.69 → image (just under 0.70)", () => {
    expect(selectVisualizerMode(() => 0.69)).toBe("image");
  });
  test("rand=0.70 → video (boundary)", () => {
    expect(selectVisualizerMode(() => 0.7)).toBe("video");
  });
  test("rand=0.84 → video (just under 0.85)", () => {
    expect(selectVisualizerMode(() => 0.84)).toBe("video");
  });
  test("rand=0.85 → text_only (boundary)", () => {
    expect(selectVisualizerMode(() => 0.85)).toBe("text_only");
  });
  test("rand=0.99 → text_only", () => {
    expect(selectVisualizerMode(() => 0.99)).toBe("text_only");
  });
  test("rand=1.0 → text_only (edge)", () => {
    expect(selectVisualizerMode(() => 1.0)).toBe("text_only");
  });
});

describe("selectVisualizerMode (distribution)", () => {
  test("1000 samples within ±3pp of SSOT", () => {
    const counts: Record<VisualizerMode, number> = {
      image: 0,
      video: 0,
      text_only: 0,
    };
    // mulberry32-like simple seeded PRNG (deterministic)
    let s = 0xc0ffee;
    const seeded = (): number => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
    const N = 1000;
    for (let i = 0; i < N; i++) {
      counts[selectVisualizerMode(seeded)]++;
    }
    const tolerance = 0.03;
    for (const mode of Object.keys(MODE_WEIGHTS) as VisualizerMode[]) {
      const empirical = counts[mode] / N;
      const expected = MODE_WEIGHTS[mode];
      expect(Math.abs(empirical - expected)).toBeLessThanOrEqual(tolerance);
    }
  });
});

describe("selectModeBySwitchback", () => {
  test("week 0 → image", () => {
    const date = new Date(Date.UTC(2026, 0, 1)); // Jan 1: dayOfYear=0, week=0
    expect(selectModeBySwitchback(date)).toBe("image");
  });
  test("week 1 → video", () => {
    const date = new Date(Date.UTC(2026, 0, 8)); // dayOfYear=7, week=1
    expect(selectModeBySwitchback(date)).toBe("video");
  });
  test("week 2 → text_only", () => {
    const date = new Date(Date.UTC(2026, 0, 15)); // dayOfYear=14, week=2
    expect(selectModeBySwitchback(date)).toBe("text_only");
  });
  test("week 3 → image (cycle)", () => {
    const date = new Date(Date.UTC(2026, 0, 22)); // dayOfYear=21, week=3, %3=0
    expect(selectModeBySwitchback(date)).toBe("image");
  });
});
