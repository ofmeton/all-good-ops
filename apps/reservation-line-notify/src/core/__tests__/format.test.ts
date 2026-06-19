import { describe, it, expect } from "vitest";
import { formatSummary } from "../format";
import { mergeIntoBucket } from "../aggregate";
import { parseReservationMail } from "../parse";
import { SAMPLE_ICE, SAMPLE_NOSAGYO, SAMPLE_SANSAKU } from "./fixtures";

let b = mergeIntoBucket(null, parseReservationMail(SAMPLE_ICE)!);
b = mergeIntoBucket(b, parseReservationMail(SAMPLE_NOSAGYO)!);
b = mergeIntoBucket(b, parseReservationMail(SAMPLE_SANSAKU)!);

describe("formatSummary", () => {
  const text = formatSummary(b);
  it("件数とアクティビティ名を含む", () => {
    expect(text).toContain("リクエストされた体験（3件）");
    expect(text).toContain("棚田米アイスづくりと野草茶体験");
    expect(text).toContain("棚田散策");
  });
  it("欠損料金は ¥- 表示", () => expect(text).toContain("¥-"));
  it("合計は記載分のみ", () => expect(text).toContain("合計 ¥25,000（料金記載分のみ）"));
  it("顧客名・宿泊施設・ダッシュボードURLを含む", () => {
    expect(text).toContain("Tanaka Asami");
    expect(text).toContain("わたや Roopt葉山上山口");
    expect(text).toContain("dashboard=1");
  });
});
