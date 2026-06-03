/**
 * format-post.test.ts — segmentForPublish / weightedLen
 *
 * 本番バグ回帰防止: thread 本文の足場ラベル/区切りを除去し、実スレッド用の
 * クリーンなセグメント配列に変換できること。長文単独形式の自動分割も検証。
 */
import { segmentForPublish, weightedLen, X_WEIGHTED_LIMIT } from "./format-post.ts";

// 本番で起きた実例の形 (スレッドN本目 + --- 区切り)
const REAL_THREAD_BODY = [
  "スレッド1本目",
  "",
  "非エンジニアの経営者向け。AI で経理を自動化した話。",
  "",
  "---",
  "",
  "スレッド2本目",
  "",
  "まず請求書の仕分けをルール化して、テンプレに落とし込んだ。",
  "",
  "---",
  "",
  "スレッド3本目",
  "",
  "結論: 判断軸を固定して SOP 化すれば自動化できる。",
].join("\n");

describe("weightedLen", () => {
  test("ASCII は 1、日本語は 2 でカウント", () => {
    expect(weightedLen("abc")).toBe(3);
    expect(weightedLen("あいう")).toBe(6); // 3 chars * 2
    expect(weightedLen("a あ")).toBe(1 + 1 + 2); // a + space + JP
  });

  test("空文字は 0", () => {
    expect(weightedLen("")).toBe(0);
  });
});

describe("segmentForPublish — thread", () => {
  const segments = segmentForPublish(REAL_THREAD_BODY, "thread");

  test("3 セグメントに分割される", () => {
    expect(segments).toHaveLength(3);
  });

  test("どのセグメントにも足場ラベル/区切りが含まれない", () => {
    for (const seg of segments) {
      expect(seg).not.toMatch(/スレッド\s*\d+\s*本目/);
      expect(seg).not.toMatch(/^---$/m);
      expect(seg.trim().length).toBeGreaterThan(0);
    }
  });

  test("クリーンな本文が順序通り入る", () => {
    expect(segments[0]).toContain("経理を自動化した話");
    expect(segments[1]).toContain("請求書の仕分け");
    expect(segments[2]).toContain("SOP 化すれば自動化");
  });

  test("em dash / 長音 だけの区切り行も分割される", () => {
    const body = "一本目の本文。\n—\n二本目の本文。\nー\n三本目の本文。";
    const segs = segmentForPublish(body, "thread");
    expect(segs).toHaveLength(3);
  });

  test("(1/3) や 1/3 単独行のラベルも除去", () => {
    const body = "(1/3)\n本文A\n---\n2/3\n本文B";
    const segs = segmentForPublish(body, "thread");
    expect(segs).toHaveLength(2);
    expect(segs[0]).toBe("本文A");
    expect(segs[1]).toBe("本文B");
  });
});

describe("segmentForPublish — non-thread", () => {
  test("short は本文そのまま 1 セグメント", () => {
    const body = "短い投稿です。";
    expect(segmentForPublish(body, "short")).toEqual([body]);
  });

  test("非 thread でも単独行ラベルは除去", () => {
    const body = "1本目\n本文だけ残る";
    expect(segmentForPublish(body, "short")).toEqual(["本文だけ残る"]);
  });

  test("文中の『本目』は除去しない", () => {
    const body = "これは3本目のペンです。";
    expect(segmentForPublish(body, "short")).toEqual([body]);
  });

  test("280 weighted 超の long 非 thread は分割せず 1 投稿のまま (長文形式の意図を尊重)", () => {
    // long はその形式で投稿する意図 (X Premium 長文)。分割しない。
    const para1 = "あ".repeat(120) + "。"; // ~242 weighted
    const para2 = "い".repeat(120) + "。";
    const body = `${para1}\n\n${para2}`;
    const segs = segmentForPublish(body, "long");
    expect(segs).toHaveLength(1);
    expect(segs[0]).toBe(body);
  });

  test("medium も超長でも 1 投稿のまま (分割しない)", () => {
    const body = "あ".repeat(400) + "。"; // ~802 weighted
    const segs = segmentForPublish(body, "medium");
    expect(segs).toHaveLength(1);
  });

  test("非 thread はラベルだけ除去し本文を 1 投稿で返す", () => {
    const body = "スレッド1本目\n\n本文テキストです。";
    const segs = segmentForPublish(body, "long");
    expect(segs).toHaveLength(1);
    expect(segs[0]).not.toMatch(/スレッド\s*\d+\s*本目/);
    expect(segs[0]).toContain("本文テキストです。");
  });
});

describe("segmentForPublish — edge cases", () => {
  test("空本文でも非空配列を返す", () => {
    expect(segmentForPublish("", "short")).toHaveLength(1);
  });

  test("ラベル/区切りだけの本文でも非空配列", () => {
    const segs = segmentForPublish("スレッド1本目\n---\nスレッド2本目", "thread");
    expect(segs.length).toBeGreaterThanOrEqual(1);
  });
});
