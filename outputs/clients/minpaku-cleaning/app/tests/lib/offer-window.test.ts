import { describe, expect, it } from "vitest";
import { isWithinWindow, offerWindow, offsetOf } from "@/lib/offer-window";

describe("offer-window", () => {
  it("checkout 当日から checkout+3 日までを既定範囲にする", () => {
    expect(offerWindow("2026-05-27", null)).toEqual({
      start: "2026-05-27",
      end: "2026-05-30",
    });
  });

  it("次チェックインが checkout+3 より早ければそこで切る", () => {
    expect(offerWindow("2026-05-27", "2026-05-29")).toEqual({
      start: "2026-05-27",
      end: "2026-05-29",
    });
  });

  it("次チェックインが checkout+3 以降なら +3 キャップを使う", () => {
    expect(offerWindow("2026-05-27", "2026-06-03")).toEqual({
      start: "2026-05-27",
      end: "2026-05-30",
    });
  });

  it("offset を JST 日付差で返す", () => {
    expect(offsetOf("2026-05-27", "2026-05-27")).toBe(0);
    expect(offsetOf("2026-05-28", "2026-05-27")).toBe(1);
    expect(offsetOf("2026-05-30", "2026-05-27")).toBe(3);
  });

  it("範囲境界を inclusive に検証する", () => {
    expect(isWithinWindow("2026-05-27", "2026-05-27", "2026-05-30")).toBe(true);
    expect(isWithinWindow("2026-05-30", "2026-05-27", "2026-05-30")).toBe(true);
    expect(isWithinWindow("2026-05-31", "2026-05-27", "2026-05-30")).toBe(false);
  });
});
