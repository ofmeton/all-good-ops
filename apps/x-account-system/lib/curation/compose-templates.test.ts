/**
 * lib/curation/compose-templates.test.ts — resolveTemplate のフォールバック挙動。
 */
import { resolveTemplate, COMPOSE_TEMPLATES, DEFAULT_TEMPLATE_ID } from "./compose-templates";

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
