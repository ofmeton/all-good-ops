/**
 * thread-contract.test.ts — スレッド wire-format の単一契約 整合テスト
 *
 * WRITER (THREAD_FORMAT_GUIDE) / PUBLISHER (segmentForPublish) / label-strip が
 * 同じ delimiter・同じ制約を共有していることを round-trip / legacy / drift-guard で担保する。
 * このテストが落ちる = 巨大 1 ツイート化の本番バグが再混入する silent drift の兆候。
 */
import { segmentForPublish, weightedLen, X_WEIGHTED_LIMIT } from "./format-post.ts";
import {
  THREAD_DELIMITER,
  THREAD_TWEET_MAX_WEIGHTED,
} from "./thread-format.ts";
import { THREAD_FORMAT_GUIDE } from "../writer/system-prompts.ts";

/** writer が出力すべき正準フォーマット (ラベルなし・THREAD_DELIMITER 単独行区切り) を組み立てる。 */
function buildWriterThread(tweets: string[]): string {
  return tweets.join(`\n\n${THREAD_DELIMITER}\n\n`);
}

const REALISTIC_TWEETS = [
  "経理の請求書仕分け、毎月5時間かけてた。AIにルールを渡したら15分で終わるようになった話。",
  "まずやったのは判断軸の言語化。「この取引先はこの勘定科目」を全部テキストに書き出した。",
  "次にテンプレ化。書き出した判断軸をプロンプトに固定して、明細を貼るだけで仕分け案が出る形にした。",
  "結論。自動化の本体はツールじゃなく判断軸のSOP化。ここを固めれば非エンジニアでも回せる。",
];

describe("thread-contract — writer→publisher round-trip", () => {
  test("正準フォーマット (N本・ラベルなし) は N セグメントにクリーン分割される", () => {
    const N = REALISTIC_TWEETS.length;
    const output = buildWriterThread(REALISTIC_TWEETS);
    const segments = segmentForPublish(output, "thread");

    expect(segments).toHaveLength(N);
    for (const seg of segments) {
      // delimiter が残っていない
      expect(seg).not.toContain(THREAD_DELIMITER);
      // 位置ラベルが残っていない
      expect(seg).not.toMatch(/スレッド\s*\d+\s*本目/);
      expect(seg).not.toMatch(/^\s*\d+\s*\/\s*\d+\s*$/m);
      // trim 済み・非空
      expect(seg).toBe(seg.trim());
      expect(seg.length).toBeGreaterThan(0);
      // weighted ≤ 280
      expect(weightedLen(seg)).toBeLessThanOrEqual(THREAD_TWEET_MAX_WEIGHTED);
    }
    // 本文が順序通り保たれる
    expect(segments[0]).toContain("請求書仕分け");
    expect(segments[N - 1]).toContain("SOP化");
  });

  test("可変 N でも常に segment 数 = ツイート数", () => {
    for (const n of [1, 2, 5, 8]) {
      const tweets = Array.from({ length: n }, (_, i) => `${i + 1}番目のツイート本文です。`);
      const segs = segmentForPublish(buildWriterThread(tweets), "thread");
      expect(segs).toHaveLength(n);
    }
  });
});

describe("thread-contract — legacy ラベル draft の後方互換", () => {
  test("「スレッドN本目」ラベル付きの旧フォーマットもラベルなしで分割される", () => {
    const legacy = [
      "スレッド1本目",
      "",
      "AIで経理を自動化した話。",
      "",
      THREAD_DELIMITER,
      "",
      "スレッド2本目",
      "",
      "判断軸を言語化してテンプレに落とした。",
    ].join("\n");

    const segs = segmentForPublish(legacy, "thread");
    expect(segs).toHaveLength(2);
    expect(segs[0]).toBe("AIで経理を自動化した話。");
    expect(segs[1]).toBe("判断軸を言語化してテンプレに落とした。");
    for (const seg of segs) {
      expect(seg).not.toMatch(/スレッド\s*\d+\s*本目/);
      expect(seg).not.toContain(THREAD_DELIMITER);
    }
  });
});

describe("thread-contract — drift guard", () => {
  test("writer prompt は正準 delimiter を含む", () => {
    expect(THREAD_FORMAT_GUIDE).toContain(THREAD_DELIMITER);
  });

  test("splitter は writer prompt が指示する delimiter で分割する", () => {
    // prompt に書かれた delimiter とまったく同じ文字列で 2 本を区切る
    const t1 = "前半の本文。";
    const t2 = "後半の本文。";
    const output = `${t1}\n${THREAD_DELIMITER}\n${t2}`;
    const segs = segmentForPublish(output, "thread");
    expect(segs).toEqual([t1, t2]);
  });

  test("X_WEIGHTED_LIMIT は契約定数と一致 (別リテラル化していない)", () => {
    expect(X_WEIGHTED_LIMIT).toBe(THREAD_TWEET_MAX_WEIGHTED);
  });
});
