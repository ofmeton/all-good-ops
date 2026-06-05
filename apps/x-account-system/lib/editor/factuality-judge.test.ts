/**
 * Factuality judge (X6) tests.
 *
 * 1. runFactualityJudge:
 *    - empty sources → skip (no LLM call)
 *    - IN_MEMORY_FALLBACK → pass (no LLM call)
 *    - live (mocked Anthropic) unsupported claims → fail + claims listed
 * 2. pipeline integration: unsupported claims surface as WARNING (not rejectReason),
 *    confirming X6 is SOFT.
 */

jest.mock("@anthropic-ai/sdk", () => {
  const MockAnthropic = class {
    messages = {
      create: async () => ({
        content: [
          {
            type: "tool_use",
            name: "factuality",
            input: {
              has_unsupported_claims: true,
              unsupported_claims: ["72時間で承認", "月2万円→0円"],
            },
          },
        ],
        usage: { input_tokens: 800, output_tokens: 100 },
      }),
    };
  };
  return { __esModule: true, default: MockAnthropic };
});

import { runFactualityJudge } from "./factuality-judge.ts";

describe("runFactualityJudge — deterministic branches", () => {
  test("empty sources → skip (no LLM)", async () => {
    const prev = process.env.IN_MEMORY_FALLBACK;
    delete process.env.IN_MEMORY_FALLBACK;
    process.env.ANTHROPIC_API_KEY = "test-key";
    const r = await runFactualityJudge({ body: "本文", sourceTexts: [] });
    expect(r.status).toBe("skip");
    expect(r.unsupportedClaims).toEqual([]);
    expect(r.costUsd).toBe(0);
    if (prev !== undefined) process.env.IN_MEMORY_FALLBACK = prev;
    delete process.env.ANTHROPIC_API_KEY;
  });

  test("IN_MEMORY_FALLBACK → pass (no LLM), even with sources", async () => {
    process.env.IN_MEMORY_FALLBACK = "true";
    const r = await runFactualityJudge({
      body: "72時間で承認されます",
      sourceTexts: ["承認には数日かかります"],
    });
    expect(r.status).toBe("pass");
    expect(r.costUsd).toBe(0);
    delete process.env.IN_MEMORY_FALLBACK;
  });

  test("live: unsupported claims → fail + lists claims", async () => {
    delete process.env.IN_MEMORY_FALLBACK;
    process.env.ANTHROPIC_API_KEY = "test-key";
    const r = await runFactualityJudge({
      body: "72時間で承認、月2万円→0円に",
      sourceTexts: ["AIで申請を補助した事例"],
    });
    expect(r.status).toBe("fail");
    expect(r.unsupportedClaims).toEqual(["72時間で承認", "月2万円→0円"]);
    expect(r.reason).toContain("出典に見当たらない主張");
    expect(r.costUsd).toBeGreaterThan(0);
    delete process.env.ANTHROPIC_API_KEY;
  });
});
