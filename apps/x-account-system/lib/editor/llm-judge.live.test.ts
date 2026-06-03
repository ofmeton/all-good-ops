/**
 * LLM judge live path test — exercises callAnthropicJudge (real code path)
 * by mocking @anthropic-ai/sdk. Does NOT set IN_MEMORY_FALLBACK.
 */

// Ensure stub path is NOT taken
delete process.env.IN_MEMORY_FALLBACK;

jest.mock("@anthropic-ai/sdk", () => {
  const MockAnthropic = class {
    messages = {
      create: async () => ({
        content: [
          {
            type: "tool_use",
            name: "judge",
            input: {
              r1_workflow_theme: { status: "pass", reason: "ok" },
              r3_no_enemy: { status: "pass", reason: "ok" },
              r6_assertive_conclusion: { status: "pass", reason: "ok" },
              x2_stealth_disclosure_text: { status: "pass", reason: "ok" },
              x4_audience_line: { status: "pass", reason: "ok" },
              x5_proper_noun_assist: { status: "pass", reason: "ok" },
            },
          },
        ],
        usage: { input_tokens: 1500, output_tokens: 500 },
      }),
    };
  };
  return {
    __esModule: true,
    default: MockAnthropic,
  };
});

import { runLlmJudge } from "./llm-judge.ts";

test("callAnthropicJudge: tool_use を LlmJudgeResult に map", async () => {
  process.env.ANTHROPIC_API_KEY = "test-key";

  const r = await runLlmJudge({
    body: "業務自動化で仕組み化を実現した事例です。中小企業向け。",
    hasAffiliateLink: false,
    format: "short",
    platform: "x",
  });

  expect(r.r1_workflow_theme.status).toBe("pass");
  expect(r.r3_no_enemy.status).toBe("pass");
  expect(r.r6_assertive_conclusion.status).toBe("pass");
  expect(r.x2_stealth_disclosure_text.status).toBe("pass");
  expect(r.x4_audience_line.status).toBe("pass");
  expect(r.x5_proper_noun_assist.status).toBe("pass");
  expect(r.costUsd).toBeGreaterThan(0);
});

test("callAnthropicJudge: costUsd is calculated from token usage", async () => {
  process.env.ANTHROPIC_API_KEY = "test-key";

  const r = await runLlmJudge({
    body: "テストコンテンツ",
    hasAffiliateLink: false,
    format: "short",
    platform: "x",
  });

  // 1500 input tokens * 3/1M + 500 output tokens * 15/1M = 0.0045 + 0.0075 = 0.012
  expect(r.costUsd).toBeCloseTo(0.012, 5);
});
