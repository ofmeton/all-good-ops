/**
 * lib/check/check-prompts.test.ts
 * SUBMIT_CHECK_TOOL の出力契約（source_grounded boolean＋required）と
 * buildCheckSystemPrompt が「元ネタ含有判定→含めば web_search 呼ばない」を優先指示することを検証。
 */
import { SUBMIT_CHECK_TOOL, buildCheckSystemPrompt } from "./check-prompts";

describe("SUBMIT_CHECK_TOOL", () => {
  test("source_grounded を boolean プロパティとして持つ", () => {
    const props = SUBMIT_CHECK_TOOL.input_schema.properties as Record<string, { type: string; description?: string }>;
    expect(props.source_grounded).toBeDefined();
    expect(props.source_grounded.type).toBe("boolean");
    expect(typeof props.source_grounded.description).toBe("string");
  });

  test("source_grounded を required に含む", () => {
    const required = SUBMIT_CHECK_TOOL.input_schema.required as string[];
    expect(required).toContain("source_grounded");
    // 既存の必須も維持
    expect(required).toEqual(expect.arrayContaining(["verdict", "risk_level", "duplicate", "factcheck"]));
  });
});

describe("buildCheckSystemPrompt", () => {
  const prompt = buildCheckSystemPrompt();

  test("元ネタツイートの含有判定を優先する旨を指示", () => {
    expect(prompt).toContain("元ネタ");
    expect(prompt).toContain("source_grounded");
  });

  test("元ネタに含まれれば web_search を呼ばない旨を指示", () => {
    // 含有判定で OK になるパス（web_search を呼ばない）が明記されている
    expect(prompt).toMatch(/含[まめ].*web_search を呼ばない/s);
  });

  test("元ネタに無い新情報・数字のみ web_search で裏取りする旨を指示", () => {
    expect(prompt).toContain("新情報");
    expect(prompt).toContain("web_search");
  });

  test("元ネタ未提供なら従来どおり web_search する旨を指示", () => {
    expect(prompt).toMatch(/元ネタ.*(無|な|未提供|提供されていない)/s);
  });

  test("出力節で source_grounded を必須として出す旨を明記", () => {
    // submit_check の出力に source_grounded を含める指示
    const outputSection = prompt.slice(prompt.indexOf("## 出力"));
    expect(outputSection).toContain("source_grounded");
  });
});
