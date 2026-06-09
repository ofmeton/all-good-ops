/**
 * lib/cost/cost-of.test.ts — 純関数 cost-of の単価突合・丸め・default 検証。
 */
import { costUsdFor, costJpyFor, USD_JPY_RATE } from "./cost-of";

describe("cost-of", () => {
  test("USD_JPY_RATE は 150 で集約されている", () => {
    expect(USD_JPY_RATE).toBe(150);
  });

  test("family 突合: sonnet は COST_MODEL_ROWS の 3/15", () => {
    // 1M in + 1M out = 3 + 15 = 18 USD
    expect(costUsdFor("claude-sonnet-4-6", 1_000_000, 1_000_000)).toBeCloseTo(18, 6);
  });

  test("exact override: claude-opus-4-8 は 5/25（family 解決より前に exact-match）", () => {
    // opus-4-8 公式確定単価 5/25。family 既定 opus 15/75 は 3 倍過大なので
    // exact-match override で正す。1M in + 1M out = 5 + 25 = 30 USD
    expect(costUsdFor("claude-opus-4-8", 1_000_000, 1_000_000)).toBeCloseTo(30, 6);
    // costJpyFor 連動: 30 USD * 150 = 4500 JPY
    expect(costJpyFor("claude-opus-4-8", 1_000_000, 1_000_000)).toBe(4500);
  });

  test("family fallback: exact override 無しの opus 系は family 15/75 に解決（既存挙動維持）", () => {
    // 1M in + 1M out = 15 + 75 = 90 USD
    expect(costUsdFor("claude-opus-4-7", 1_000_000, 1_000_000)).toBeCloseTo(90, 6);
  });

  test("family 突合: haiku は COST_MODEL_ROWS に行が無いので fallback 1/5（既存 usdFor 互換）", () => {
    // 1M in + 1M out = 1 + 5 = 6 USD
    expect(costUsdFor("claude-haiku-4-5", 1_000_000, 1_000_000)).toBeCloseTo(6, 6);
  });

  test("未突合 model は console.warn し opus default 15/75 にフォールバック（brownout fail-high）", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      // family token を含まない model → unmatched → 安全側 opus 15/75 = 90 USD
      expect(costUsdFor("gpt-image-2-low", 1_000_000, 1_000_000)).toBeCloseTo(90, 6);
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  test("costJpyFor は usd * 150 を小数2桁に丸める", () => {
    // haiku 6 USD * 150 = 900 JPY
    expect(costJpyFor("claude-haiku-4-5", 1_000_000, 1_000_000)).toBe(900);
    // 端数: sonnet 4444 in tok → 4444/1e6*3 = 0.013332 usd * 150 = 1.9998 → 2.00
    expect(costJpyFor("claude-sonnet-4-6", 4444, 0)).toBe(2);
    // 小数が残るケース: 2 桁に収まる
    const v = costJpyFor("claude-sonnet-4-6", 7000, 0); // 0.021 usd * 150 = 3.15
    expect(v).toBe(3.15);
  });

  test("tokens 0 は 0 を返す", () => {
    expect(costUsdFor("claude-sonnet-4-6", 0, 0)).toBe(0);
    expect(costJpyFor("claude-sonnet-4-6", 0, 0)).toBe(0);
    expect(costUsdFor("claude-haiku-4-5")).toBe(0);
  });
});
