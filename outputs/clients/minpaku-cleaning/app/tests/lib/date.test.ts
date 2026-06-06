import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { todayInJST, tomorrowInJST, startOfTodayJstIso } from "@/lib/date";

// Date のみフェイク（タイマー・ネットワークは実物のまま）。
// 実行マシンの TZ に依存せず JST 基準の計算が正しいことを検証する。
describe("JST 日付ユーティリティ（ランタイム TZ 非依存）", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // 2026-06-06 12:00 JST = 2026-06-06 03:00 UTC（UTC でも JST でも同日）
    vi.setSystemTime(new Date("2026-06-06T03:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("todayInJST は JST の当日 YYYY-MM-DD", () => {
    expect(todayInJST()).toBe("2026-06-06");
  });

  it("tomorrowInJST は JST の翌日 YYYY-MM-DD", () => {
    expect(tomorrowInJST()).toBe("2026-06-07");
  });

  it("startOfTodayJstIso は JST 当日 00:00 の瞬間（= 前日 15:00 UTC）", () => {
    expect(new Date(startOfTodayJstIso()).toISOString()).toBe(
      "2026-06-05T15:00:00.000Z",
    );
  });

  it("JST 早朝（UTC では前日）でも当日の日付がずれない", () => {
    // 2026-06-06 02:00 JST = 2026-06-05 17:00 UTC（UTC では前日）
    vi.setSystemTime(new Date("2026-06-05T17:00:00Z"));
    expect(todayInJST()).toBe("2026-06-06");
    expect(tomorrowInJST()).toBe("2026-06-07");
    expect(new Date(startOfTodayJstIso()).toISOString()).toBe(
      "2026-06-05T15:00:00.000Z",
    );
  });
});
