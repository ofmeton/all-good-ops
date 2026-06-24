import { describe, it, expect } from "vitest";
import { formatSingle, formatRawFallback } from "../format";
import { parseReservationMail } from "../parse";
import { SAMPLE_ICE, SAMPLE_SANSAKU } from "./fixtures";

describe("formatSingle", () => {
  const ice = formatSingle(parseReservationMail(SAMPLE_ICE)!);

  it("単一アクティビティ名を含む", () => {
    expect(ice).toContain("棚田米アイスづくりと野草茶体験");
  });
  it("他のアクティビティは含まない（集約しない）", () => {
    expect(ice).not.toContain("棚田散策");
    expect(ice).not.toContain("リクエストされた体験");
  });
  it("参加人数・宿泊施設・顧客名を含む", () => {
    expect(ice).toContain("大人3名");        // 参加人数
    expect(ice).toContain("わたや Roopt葉山上山口");
    expect(ice).toContain("Tanaka Asami 様");
  });
  it("承認/NG リンクは承認URL(r=)で、ダッシュボードURLではない", () => {
    expect(ice).toContain("承認/NG はこちら");
    expect(ice).toContain("r=");
    expect(ice).not.toContain("dashboard=1");
  });
  it("料金を表示する", () => expect(ice).toContain("¥12,500"));
  it("欠損料金は ¥- 表示", () => {
    const sansaku = formatSingle(parseReservationMail(SAMPLE_SANSAKU)!);
    expect(sansaku).toContain("¥-");
  });
});

describe("formatRawFallback", () => {
  it("件名と本文を含む警告文", () => {
    const t = formatRawFallback("件名X", "本文Y");
    expect(t).toContain("自動整形できませんでした");
    expect(t).toContain("件名X");
    expect(t).toContain("本文Y");
  });
});
