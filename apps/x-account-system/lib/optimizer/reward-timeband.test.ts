/**
 * Stage 2A — toTimeBand は post の公開タイムスタンプ (posted_at) から
 * JST の投稿時間帯 band を導出する。
 *
 * 旧実装は post_drafts.slot (= "agent-xxxx" の固定値) を読んでいたため
 * 常に "morning" に fallback し、posting_time posterior が学習できなかった。
 *
 * JST band 定義 (initial-values §3.1 の 5 band):
 *   morning   05–10
 *   noon      11–13
 *   afternoon 14–17
 *   evening   18–22
 *   midnight  23–04
 */
import { toTimeBand } from "./reward-extractor.ts";

describe("toTimeBand — JST band from posted_at timestamp", () => {
  test.each([
    ["2026-06-01T00:00:00Z", "morning"], // JST 09:00
    ["2026-06-01T03:00:00Z", "noon"], // JST 12:00
    ["2026-06-01T06:00:00Z", "afternoon"], // JST 15:00
    ["2026-06-01T10:00:00Z", "evening"], // JST 19:00
    ["2026-06-01T13:30:00Z", "evening"], // JST 22:30 (evening 上端)
    ["2026-06-01T15:00:00Z", "midnight"], // JST 00:00
    ["2026-06-01T19:00:00Z", "midnight"], // JST 04:00 (midnight 上端)
    ["2026-06-01T20:00:00Z", "morning"], // JST 05:00 (morning 下端 境界)
  ])("%s → %s", (iso, band) => {
    expect(toTimeBand(new Date(iso))).toBe(band);
  });
});
