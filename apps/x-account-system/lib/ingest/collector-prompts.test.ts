import {
  TARGET_DEFINITION,
  buildExploreSystemPrompt,
  buildScoringSystemPrompt,
} from "./collector-prompts.ts";

describe("collector-prompts (判断レバー)", () => {
  test("target definition は chaen 層", () => {
    expect(TARGET_DEFINITION).toContain("Claude Code を既にある程度使っていて");
    expect(TARGET_DEFINITION).toContain("保存・共有したくなるネタ");
  });
  test("explore prompt は海外トレンド先取りと全保存方針を含む", () => {
    const p = buildExploreSystemPrompt();
    expect(p).toContain("海外");
    expect(p).toMatch(/除外しない|全件/);
  });
  test("scoring prompt は3軸を含む", () => {
    const p = buildScoringSystemPrompt();
    expect(p).toContain("freshness");
    expect(p).toContain("velocity");
    expect(p).toContain("target_fit");
  });
});
