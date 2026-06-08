/**
 * lib/curation/compose-prompts.test.ts — 執筆 system prompt の合成。
 * 構造化フィールド（tone/structure/hookType/hookStrength）と systemPromptPatch の
 * 併用が prompt に出ること、未知 id でも既定テンプレで合成されることを検証する。
 */
import { buildWriterSystemPrompt } from "./compose-prompts";
import {
  COMPOSE_TEMPLATES,
  DEFAULT_TEMPLATE_ID,
  HOOK_STRENGTH_LABEL,
  renderTemplatePrompt,
} from "./compose-templates";

describe("buildWriterSystemPrompt — 構造化テンプレ合成", () => {
  const gold = COMPOSE_TEMPLATES[DEFAULT_TEMPLATE_ID];

  test("既定テンプレの tone / structure / hookType / フック強度 が prompt に出る", () => {
    const prompt = buildWriterSystemPrompt(DEFAULT_TEMPLATE_ID);
    expect(prompt).toContain(gold.tone);
    for (const step of gold.structure) {
      expect(prompt).toContain(step);
    }
    expect(prompt).toContain(gold.hookType);
    expect(prompt).toContain(HOOK_STRENGTH_LABEL[gold.hookStrength]);
  });

  test("systemPromptPatch を併用する（骨子ブロックと patch の両方が出る）", () => {
    const prompt = buildWriterSystemPrompt(DEFAULT_TEMPLATE_ID);
    expect(prompt).toContain("## この投稿の型（骨子）");
    expect(prompt).toContain(gold.systemPromptPatch);
  });

  test("未知 id でも既定テンプレの骨子で合成される", () => {
    const prompt = buildWriterSystemPrompt("no_such_template");
    expect(prompt).toContain(gold.tone);
    expect(prompt).toContain(gold.hookType);
  });
});

describe("renderTemplatePrompt", () => {
  test("骨子ブロック + systemPromptPatch を含む", () => {
    const tpl = COMPOSE_TEMPLATES[DEFAULT_TEMPLATE_ID];
    const out = renderTemplatePrompt(tpl);
    expect(out).toContain("## この投稿の型（骨子）");
    expect(out).toContain(tpl.tone);
    expect(out).toContain(tpl.structure.join(" → "));
    expect(out).toContain(HOOK_STRENGTH_LABEL[tpl.hookStrength]);
    expect(out).toContain(tpl.systemPromptPatch);
  });

  test("referenceNote があれば由来として出る", () => {
    const out = renderTemplatePrompt({
      id: "x",
      name: "x",
      description: "x",
      tone: "硬めの speed 重視",
      structure: ["フック", "意味づけ"],
      hookType: "速報",
      hookStrength: "strong",
      referenceNote: "参考アカ @example の型",
      systemPromptPatch: "patch本文",
    });
    expect(out).toContain("参考アカ @example の型");
  });
});
