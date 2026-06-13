/**
 * lib/curation/compose-prompts.test.ts
 * P2 リファクタ後:
 *  - buildWriterSystemPrompt は **テンプレ非依存の base**（target/リサーチ/掟/進め方）。
 *    テンプレ patch は system に焼かない（永続 agent の system は固定・テンプレは user 側）。
 *  - buildComposeUserBlocks がテンプレ patch + 希望 fmat + 再生成フラグを userMessage 用に組む。
 */
import { buildWriterSystemPrompt, buildComposeUserBlocks, SUBMIT_DRAFT_TOOL } from "./compose-prompts";
import { COMPOSE_TEMPLATES, DEFAULT_TEMPLATE_ID, HOOK_STRENGTH_LABEL } from "./compose-templates";

describe("buildWriterSystemPrompt — テンプレ非依存 base", () => {
  test("target / リサーチ / 掟 / 進め方 / submit_draft を含む", () => {
    const p = buildWriterSystemPrompt();
    expect(p).toContain("執筆エージェント");
    expect(p).toContain("## リサーチ");
    expect(p).toContain("## 掟");
    expect(p).toContain("## 進め方");
    expect(p).toContain("構成設計（outline）");
    expect(p).toContain("submit_draft");
  });

  test("テンプレ固有 patch（型本文）は base に焼かない", () => {
    const p = buildWriterSystemPrompt();
    // 黄金型の patch 見出しは system に出ない（user 側へ移送）
    expect(p).not.toContain("## 投稿の型（チャエン黄金型）");
    // 引数を取らない（テンプレ非依存）
    expect(buildWriterSystemPrompt.length).toBe(0);
  });
});

describe("buildComposeUserBlocks — テンプレ/fmat/再生成を userMessage 用に組む", () => {
  const gold = COMPOSE_TEMPLATES[DEFAULT_TEMPLATE_ID];

  test("テンプレ patch（骨子 + 固有 patch）が入る（既定テンプレに解決）", () => {
    const blocks = buildComposeUserBlocks(DEFAULT_TEMPLATE_ID);
    expect(blocks).toContain("## この投稿の型（骨子）");
    expect(blocks).toContain(gold.tone);
    expect(blocks).toContain(HOOK_STRENGTH_LABEL[gold.hookStrength]);
    expect(blocks).toContain(gold.systemPromptPatch);
  });

  test("未知 templateId は既定テンプレ patch にフォールバック", () => {
    const blocks = buildComposeUserBlocks("no_such");
    expect(blocks).toContain(gold.tone);
  });

  test("fmat 指定で希望フォーマット指示が入る（記事=X 長文単発・分割しない）", () => {
    const blocks = buildComposeUserBlocks(DEFAULT_TEMPLATE_ID, "article");
    expect(blocks).toContain("# 希望フォーマット");
    expect(blocks).toContain("指定フォーマット=記事（X 長文単発）");
    expect(blocks).toContain("スレッドのように分割しない");
  });

  test("fmat=thread でスレッド分割指示（tweets に1本ずつ・1本目=フック・最大8本）が入る", () => {
    const blocks = buildComposeUserBlocks(DEFAULT_TEMPLATE_ID, "thread");
    expect(blocks).toContain("# 参考にする書き方の知見（このフォーマットで効くもの）");
    expect(blocks).toContain("tight 2-4本");
    expect(blocks).toContain("# 希望フォーマット");
    expect(blocks).toContain("指定フォーマット=スレッド");
    expect(blocks).toContain("tweets に1ツイートずつ");
    expect(blocks).toContain("1本目=フック");
    expect(blocks).toContain("最大8本");
    // article 限定の「分割しない」文言は thread には出さない
    expect(blocks).not.toContain("分割しない");
  });

  test("fmat 未指定では希望フォーマット指示を入れない", () => {
    const blocks = buildComposeUserBlocks(DEFAULT_TEMPLATE_ID, null);
    expect(blocks).not.toContain("# 希望フォーマット");
    expect(blocks).toContain("# 参考にする書き方の知見（このフォーマットで効くもの）");
    expect(blocks).toContain("## 共通知見");
    expect(blocks).not.toContain("## thread 知見");
  });

  test("label 欠落 fmat でも raw 値で指示を出す（黙って無指示にしない）", () => {
    const blocks = buildComposeUserBlocks(DEFAULT_TEMPLATE_ID, "weird_fmat");
    expect(blocks).toContain("# 希望フォーマット");
    expect(blocks).toContain("指定フォーマット=weird_fmat");
  });

  test("redoFlags があれば『前回の指摘』ブロックが入る", () => {
    const blocks = buildComposeUserBlocks(DEFAULT_TEMPLATE_ID, null, ["数字が事実と異なる", "重複気味"]);
    expect(blocks).toContain("# 前回の指摘（必ず避けて書き直す）");
    expect(blocks).toContain("- 数字が事実と異なる");
    expect(blocks).toContain("- 重複気味");
  });

  test("redoFlags 空/未指定では『前回の指摘』を入れない", () => {
    expect(buildComposeUserBlocks(DEFAULT_TEMPLATE_ID)).not.toContain("前回の指摘");
    expect(buildComposeUserBlocks(DEFAULT_TEMPLATE_ID, null, [])).not.toContain("前回の指摘");
  });
});

describe("SUBMIT_DRAFT_TOOL — outline 契約", () => {
  test("outline を optional property として公開し required には含めない", () => {
    const props = SUBMIT_DRAFT_TOOL.input_schema.properties as Record<string, unknown>;
    const required = SUBMIT_DRAFT_TOOL.input_schema.required as string[];
    expect(props.outline).toMatchObject({
      type: "array",
      items: {
        type: "object",
        properties: {
          role: { type: "string" },
          key_message: { type: "string" },
        },
      },
    });
    expect(required).not.toContain("outline");
  });
});
