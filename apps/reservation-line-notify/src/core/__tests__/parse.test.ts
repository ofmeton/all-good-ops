import { describe, it, expect } from "vitest";
import { parseReservationMail, parseFee, extractReservationKey } from "../parse";
import { SAMPLE_ICE, SAMPLE_SANSAKU } from "./fixtures";

describe("parseFee", () => {
  it("カンマ・円つきを数値化", () => expect(parseFee("12,500円")).toBe(12500));
  it("不明は null", () => expect(parseFee("（不明）")).toBeNull());
  it("空欄は null", () => expect(parseFee("")).toBeNull());
});

describe("extractReservationKey", () => {
  it("r= 先頭トークン（%20スペース除去）", () => {
    expect(extractReservationKey(SAMPLE_ICE.body)).toBe("ac23a431");
  });
});

describe("parseReservationMail", () => {
  it("主要フィールドを抽出", () => {
    const p = parseReservationMail(SAMPLE_ICE)!;
    expect(p.reservationKey).toBe("ac23a431");
    expect(p.activity.name).toBe("棚田米アイスづくりと野草茶体験");
    expect(p.activity.date).toBe("2026-08-13");
    expect(p.activity.time).toBe("15:40~17:00");
    expect(p.activity.fee).toBe(12500);
    expect(p.activity.dedupId).toBe("ac23a431_tanada-ice_20260813"); // %20正規化済
    expect(p.customer.name).toBe("Tanaka Asami");
    expect(p.customer.email).toBe("y.shino.earth@gmail.com");
    expect(p.stay.facility).toBe("わたや Roopt葉山上山口");
    expect(p.stay.headcount).toBe("大人3 子供1 幼児0");
    expect(p.dashboardUrl).toContain("dashboard=1");
  });

  it("料金欠損は fee=null", () => {
    const p = parseReservationMail(SAMPLE_SANSAKU)!;
    expect(p.activity.fee).toBeNull();
    expect(p.activity.time).toBe("15:00~15:30");
  });

  it("予約通知でない本文は null", () => {
    const p = parseReservationMail({ messageId: "x", subject: "x", body: "ただの雑談", receivedAt: "2026-06-17T00:00:00+09:00" });
    expect(p).toBeNull();
  });
});
