import { describe, test, expect } from "vitest";
import {
  fmtJst,
  jstDateStr,
  jstDateAtOffset,
  isWeekendJstDate,
  candidateSlotsForDate,
  toPlanRows,
  validateReservation,
  validateMarks,
  preview,
  attachmentSummary,
  PEAK_HOURS_WEEKDAY,
  PEAK_HOURS_WEEKEND,
} from "./schedule-logic";
import type { Attachment } from "./drafts-logic";

describe("fmtJst", () => {
  test("+09:00 ISO → MM-DD(曜) HH:00", () => {
    expect(fmtJst("2026-06-09T07:00:00+09:00")).toBe("06-09(火) 07:00");
    expect(fmtJst("2026-06-13T17:00:00+09:00")).toBe("06-13(土) 17:00");
  });
  test("別 TZ(+00:00) でも JST に補正して表示", () => {
    // 2026-06-08T22:00:00Z == 2026-06-09T07:00:00+09:00
    expect(fmtJst("2026-06-08T22:00:00+00:00")).toBe("06-09(火) 07:00");
  });
  test("不正 ISO はそのまま返す", () => {
    expect(fmtJst("not-a-date")).toBe("not-a-date");
  });
});

describe("jstDateStr / jstDateAtOffset", () => {
  test("jstDateStr は JST 日付を返す", () => {
    expect(jstDateStr("2026-06-08T22:00:00+00:00")).toBe("2026-06-09");
    expect(jstDateStr("bad")).toBeNull();
  });
  test("jstDateAtOffset: 当日/翌日", () => {
    const now = new Date("2026-06-08T13:00:00+09:00").getTime();
    expect(jstDateAtOffset(now, 0)).toBe("2026-06-08");
    expect(jstDateAtOffset(now, 1)).toBe("2026-06-09");
  });
});

describe("isWeekendJstDate", () => {
  test("平日/週末判定", () => {
    expect(isWeekendJstDate("2026-06-09")).toBe(false); // 火
    expect(isWeekendJstDate("2026-06-13")).toBe(true); // 土
    expect(isWeekendJstDate("2026-06-14")).toBe(true); // 日
  });
});

describe("candidateSlotsForDate", () => {
  const noonMon = new Date("2026-06-08T13:00:00+09:00").getTime();

  test("平日: 午後実行で過去帯(7,8,12)は出ず未来ピーク(15,17)のみ", () => {
    expect(candidateSlotsForDate("2026-06-08", { nowMs: noonMon })).toEqual([
      "2026-06-08T15:00:00+09:00",
      "2026-06-08T17:00:00+09:00",
    ]);
  });

  test("翌日(平日)は全ピーク帯 5 枠", () => {
    const got = candidateSlotsForDate("2026-06-09", { nowMs: noonMon });
    expect(got).toHaveLength(PEAK_HOURS_WEEKDAY.length);
    expect(got[0]).toBe("2026-06-09T07:00:00+09:00");
  });

  test("週末は 3 枠", () => {
    const got = candidateSlotsForDate("2026-06-13", { nowMs: noonMon });
    expect(got).toHaveLength(PEAK_HOURS_WEEKEND.length);
  });

  test("excludeISO と同一スロットは除外（TZ 表記揺れも一致）", () => {
    const got = candidateSlotsForDate("2026-06-09", {
      nowMs: noonMon,
      excludeISO: ["2026-06-08T22:00:00+00:00"], // == 06-09 07:00 JST
    });
    expect(got).not.toContain("2026-06-09T07:00:00+09:00");
    expect(got[0]).toBe("2026-06-09T08:00:00+09:00");
  });
});

describe("toPlanRows", () => {
  test("正常な plan を PlanRow[] に", () => {
    expect(
      toPlanRows([
        { draftId: "a", scheduledForISO: "2026-06-09T07:00:00+09:00" },
        { draftId: "b", scheduledForISO: "2026-06-09T08:00:00+09:00" },
      ]),
    ).toEqual([
      { draftId: "a", scheduledForISO: "2026-06-09T07:00:00+09:00" },
      { draftId: "b", scheduledForISO: "2026-06-09T08:00:00+09:00" },
    ]);
  });
  test("不正要素は捨てる / 配列以外は []", () => {
    expect(toPlanRows([{ draftId: "a" }, null, "x", { scheduledForISO: "z" }])).toEqual([]);
    expect(toPlanRows(undefined)).toEqual([]);
    expect(toPlanRows({})).toEqual([]);
  });
});

describe("validateReservation", () => {
  test("正常", () => {
    const r = validateReservation({
      draftId: "d1",
      scheduledFor: "2026-06-09T07:00:00+09:00",
      scheduledPostId: "x1",
    });
    expect(r).toEqual({
      ok: true,
      value: { draftId: "d1", scheduledFor: "2026-06-09T07:00:00+09:00", scheduledPostId: "x1" },
    });
  });
  test("scheduledPostId は任意（空は付けない）", () => {
    const r = validateReservation({ draftId: "d1", scheduledFor: "2026-06-09T07:00:00+09:00" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.scheduledPostId).toBeUndefined();
  });
  test("draftId 空 / 不正日時を弾く", () => {
    expect(validateReservation({ draftId: "", scheduledFor: "2026-06-09T07:00:00+09:00" }).ok).toBe(false);
    expect(validateReservation({ draftId: "d1", scheduledFor: "nope" }).ok).toBe(false);
    expect(validateReservation(null).ok).toBe(false);
  });
});

describe("validateMarks", () => {
  test("正常配列", () => {
    const r = validateMarks([
      { draftId: "d1", scheduledFor: "2026-06-09T07:00:00+09:00" },
      { draftId: "d2", scheduledFor: "2026-06-09T08:00:00+09:00" },
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toHaveLength(2);
  });
  test("draft 重複を弾く", () => {
    const r = validateMarks([
      { draftId: "d1", scheduledFor: "2026-06-09T07:00:00+09:00" },
      { draftId: "d1", scheduledFor: "2026-06-09T08:00:00+09:00" },
    ]);
    expect(r.ok).toBe(false);
  });
  test("同一スロット重複を弾く（TZ 表記揺れも検知）", () => {
    const r = validateMarks([
      { draftId: "d1", scheduledFor: "2026-06-09T07:00:00+09:00" },
      { draftId: "d2", scheduledFor: "2026-06-08T22:00:00+00:00" }, // 同一時刻
    ]);
    expect(r.ok).toBe(false);
  });
  test("配列以外 → error", () => {
    expect(validateMarks({}).ok).toBe(false);
  });
});

describe("preview / attachmentSummary", () => {
  test("preview は 1 行化 + 切り詰め", () => {
    expect(preview("a\n b   c")).toBe("a b c");
    expect(preview("x".repeat(100), 10)).toBe(`${"x".repeat(10)}…`);
  });
  test("attachmentSummary: 写真枚数 + 動画 deep-link", () => {
    const att: Attachment[] = [
      { kind: "upload", mediaType: "photo", sourceUrl: "u1", sourceMaterialId: "m1" },
      { kind: "upload", mediaType: "photo", sourceUrl: "u2", sourceMaterialId: "m2" },
    ];
    expect(attachmentSummary({ attachments: att, body: "本文" })).toBe("📎写真2");
    expect(
      attachmentSummary({ attachments: null, body: "見て https://x.com/a/status/1/video/1" }),
    ).toBe("🎬動画");
    expect(attachmentSummary({ attachments: null, body: "ただの本文" })).toBe("");
  });
});
