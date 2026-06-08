/**
 * lib/curation/compose-templates.test.ts — resolveTemplate のフォールバック挙動 +
 * 全テンプレが構造化フィールドを持つ検証 + renderTemplatePrompt スナップショット。
 */
import {
  resolveTemplate,
  renderTemplatePrompt,
  COMPOSE_TEMPLATES,
  DEFAULT_TEMPLATE_ID,
} from "./compose-templates";

const HOOK_TYPES = ["速報", "逆張り", "数字", "共感", "問い", "権威"];
const HOOK_STRENGTHS = ["strong", "medium", "soft"];

describe("COMPOSE_TEMPLATES — 全テンプレの構造化フィールド", () => {
  const entries = Object.entries(COMPOSE_TEMPLATES);

  test("型1（チャエン黄金）は維持されている", () => {
    expect(COMPOSE_TEMPLATES.template_chaen_gold).toBeDefined();
  });

  test("2 種以上のテンプレが登録されている", () => {
    expect(entries.length).toBeGreaterThanOrEqual(2);
  });

  test.each(entries)("%s が全構造化フィールドを満たす", (id, tpl) => {
    expect(tpl.id).toBe(id);
    expect(typeof tpl.name).toBe("string");
    expect(tpl.name.length).toBeGreaterThan(0);
    expect(typeof tpl.description).toBe("string");
    expect(typeof tpl.tone).toBe("string");
    expect(tpl.tone.length).toBeGreaterThan(0);
    expect(Array.isArray(tpl.structure)).toBe(true);
    expect(tpl.structure.length).toBeGreaterThan(0);
    expect(HOOK_TYPES).toContain(tpl.hookType);
    expect(HOOK_STRENGTHS).toContain(tpl.hookStrength);
    expect(typeof tpl.systemPromptPatch).toBe("string");
    expect(tpl.systemPromptPatch.length).toBeGreaterThan(0);
  });

  test.each(entries)("%s の renderTemplatePrompt スナップショット", (id, tpl) => {
    expect(renderTemplatePrompt(tpl)).toMatchSnapshot(id);
  });
});

describe("resolveTemplate", () => {
  test("既知 id はそのテンプレを返す", () => {
    expect(resolveTemplate("template_chaen_gold").id).toBe("template_chaen_gold");
  });

  test("未知 id は default テンプレにフォールバック", () => {
    expect(resolveTemplate("no_such_template").id).toBe(DEFAULT_TEMPLATE_ID);
  });

  test("undefined / null は default テンプレ", () => {
    expect(resolveTemplate(undefined).id).toBe(DEFAULT_TEMPLATE_ID);
    expect(resolveTemplate(null).id).toBe(DEFAULT_TEMPLATE_ID);
  });

  test("default テンプレが registry に存在し patch を持つ", () => {
    const tpl = COMPOSE_TEMPLATES[DEFAULT_TEMPLATE_ID];
    expect(tpl).toBeDefined();
    expect(tpl.systemPromptPatch.length).toBeGreaterThan(0);
  });

  test("prototype 汚染を踏まない（'constructor' 等は default）", () => {
    expect(resolveTemplate("constructor").id).toBe(DEFAULT_TEMPLATE_ID);
    expect(resolveTemplate("toString").id).toBe(DEFAULT_TEMPLATE_ID);
  });
});
