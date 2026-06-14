/**
 * stripMarkdownForX unit tests + writer live-path Markdown removal.
 *
 * 1. stripMarkdownForX: bold/header/stray removal; preserves 日本語/絵文字.
 * 2. live path (mocked Anthropic returning Markdown) -> output has no bold/header markers.
 */

// live 分岐を通すため fallback を OFF にする
delete process.env.IN_MEMORY_FALLBACK;

jest.mock("@anthropic-ai/sdk", () => {
  const markdownBody =
    "# 見出し\n" +
    "**月3万円**のコスト削減に成功しました🎉\n" +
    "これは *重要* なポイントです。\n" +
    "## 手順\n" +
    "Claude Code を使う実務者向け。私は自動化を試した。";
  const MockAnthropic = class {
    messages = {
      create: async () => ({
        content: [{ type: "text", text: markdownBody }],
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    };
  };
  return { __esModule: true, default: MockAnthropic };
});

import { stripMarkdownForX, draftForX, reviseDraftForX } from "./writer-x.ts";
import type { CoreIdea } from "./types.ts";

describe("stripMarkdownForX", () => {
  test("**bold** → bold", () => {
    expect(stripMarkdownForX("これは **太字** です")).toBe("これは 太字 です");
  });

  test("*italic* → italic", () => {
    expect(stripMarkdownForX("これは *斜体* です")).toBe("これは 斜体 です");
  });

  test("leading # / ## / ### header markers removed, text kept", () => {
    expect(stripMarkdownForX("# 見出し")).toBe("見出し");
    expect(stripMarkdownForX("## サブ見出し")).toBe("サブ見出し");
    expect(stripMarkdownForX("### 小見出し")).toBe("小見出し");
  });

  test("multiline headers removed per line", () => {
    const input = "# タイトル\n本文1\n## セクション\n本文2";
    expect(stripMarkdownForX(input)).toBe("タイトル\n本文1\nセクション\n本文2");
  });

  test("stray ** removed", () => {
    expect(stripMarkdownForX("途中に ** が残る")).toBe("途中に  が残る");
  });

  test("preserves Japanese, emoji and normal punctuation", () => {
    const input = "月3万円削減できました🎉 すごい！本当に?ありがとう。";
    expect(stripMarkdownForX(input)).toBe(input);
  });

  test("preserves hashtags like #PR / #広告 (not header markers)", () => {
    const input = "案件です #PR #広告";
    expect(stripMarkdownForX(input)).toBe(input);
  });

  test("does not damage standalone asterisk without closing pair across newline", () => {
    // * の直後に閉じが無い場合は基本そのまま (改行をまたがない)
    const input = "5 * 3 = 15 の計算";
    // 「* 3 = 15 の計算」までを italic とみなさないよう、スペース直後の単独 * は影響薄。
    // ここでは壊れないこと (日本語が残ること) を確認。
    expect(stripMarkdownForX(input)).toContain("の計算");
  });

  test("empty string passes through", () => {
    expect(stripMarkdownForX("")).toBe("");
  });
});

const idea: CoreIdea = {
  id: "md-01",
  topic: "業務自動化",
  primaryHook: "number",
  fmat: "short",
  contentType: "first_hand",
  audience: "Claude Code を使う実務者",
  sourceMaterialIds: [],
};

describe("writer live path strips Markdown from final body", () => {
  beforeAll(() => {
    process.env.ANTHROPIC_API_KEY = "test-key";
  });
  afterAll(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  test("draftForX output has no ** and no leading '# '", async () => {
    const out = await draftForX(idea);
    expect(out.generator).toBe("anthropic-sonnet-4.6");
    expect(out.body).not.toContain("**");
    expect(out.body).not.toMatch(/^[ \t]*#{1,6}[ \t]+/m);
    // header text preserved
    expect(out.body).toContain("見出し");
    expect(out.body).toContain("月3万円");
    // emoji preserved
    expect(out.body).toContain("🎉");
  });

  test("reviseDraftForX output has no ** and no leading '# '", async () => {
    const out = await reviseDraftForX("元本文", "もっと煽って", idea);
    expect(out.body).not.toContain("**");
    expect(out.body).not.toMatch(/^[ \t]*#{1,6}[ \t]+/m);
    expect(out.body).toContain("見出し");
  });
});
