import {
  buildDraftImagePrompts,
  buildGeneratedPhotoAttachments,
  estimateDraftImageCostJpy,
  normalizeOutline,
} from "./draft-images.ts";

describe("draft image prompt builder", () => {
  test("visual_hint を優先し、デザイン制約を含む", () => {
    const prompts = buildDraftImagePrompts([
      {
        role: "問題提起",
        key_message: "AI導入で失敗する理由",
        visual_hint: "Before/After の2カラム。左に手作業の山、右に自動化フロー。文字は『3時間→10分』",
      },
    ]);

    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toMatchObject({ blockIndex: 0, role: "問題提起" });
    expect(prompts[0].prompt).toContain("3時間→10分");
    expect(prompts[0].prompt).toContain("Noto Sans Heavy");
    expect(prompts[0].prompt).toContain("#FFD400");
    expect(prompts[0].prompt).toContain("一目で伝わる infographic");
  });

  test("visual_hint 欠落時は key_message にフォールバック", () => {
    const prompts = buildDraftImagePrompts([{ role: "結論", key_message: "小さく始めて毎週改善" }]);
    expect(prompts[0].prompt).toContain("小さく始めて毎週改善");
  });
});

describe("draft image pure helpers", () => {
  test("normalizeOutline は境界で欠損を安全側に寄せる", () => {
    expect(normalizeOutline([
      { role: " 導入 ", key_message: " 要点 ", visual_hint: "" },
      "bad",
    ])).toEqual([
      { role: "導入", key_message: "要点", visual_hint: undefined },
      { role: undefined, key_message: undefined, visual_hint: undefined },
    ]);
  });

  test("attachments builder は blockIndex 順・source generated で整形する", () => {
    const attachments = buildGeneratedPhotoAttachments([
      { blockIndex: 2, role: "まとめ", sourceUrl: "https://cdn/2.png", promptUsed: "p2" },
      { blockIndex: 0, role: "導入", sourceUrl: "https://cdn/0.png", promptUsed: "p0" },
    ]);

    expect(attachments).toEqual([
      {
        kind: "upload",
        mediaType: "photo",
        source: "generated",
        blockIndex: 0,
        role: "導入",
        sourceUrl: "https://cdn/0.png",
        promptUsed: "p0",
      },
      {
        kind: "upload",
        mediaType: "photo",
        source: "generated",
        blockIndex: 2,
        role: "まとめ",
        sourceUrl: "https://cdn/2.png",
        promptUsed: "p2",
      },
    ]);
  });

  test("cost estimate は image_low の 1 枚単価から算出する", () => {
    expect(estimateDraftImageCostJpy(2)).toBe(2.45);
  });
});
