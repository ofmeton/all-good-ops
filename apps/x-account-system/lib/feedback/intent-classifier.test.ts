/**
 * intent-classifier.test.ts
 *
 * Tests: classifyReplyIntent
 *   - IN_MEMORY_FALLBACK → deterministic stub (no Anthropic call)
 *   - live path → Anthropic Haiku tool_use mocked, model id + schema asserted
 *   - empty → none
 *   - tool_use absent → none (safe)
 */

// ---- mock Anthropic SDK BEFORE imports ----
const mockCreate = jest.fn();
jest.mock("@anthropic-ai/sdk", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

import { classifyReplyIntent } from "./intent-classifier.ts";

describe("classifyReplyIntent — fallback stub (no LLM)", () => {
  beforeAll(() => {
    process.env.IN_MEMORY_FALLBACK = "true";
  });
  afterAll(() => {
    delete process.env.IN_MEMORY_FALLBACK;
  });
  beforeEach(() => jest.clearAllMocks());

  test("approve keyword → approve, no Anthropic call", async () => {
    const out = await classifyReplyIntent("これでOK、投稿して");
    expect(out.intent).toBe("approve");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test("reject keyword → reject", async () => {
    expect((await classifyReplyIntent("これはボツで")).intent).toBe("reject");
  });

  test("revise keyword → revise with instruction", async () => {
    const out = await classifyReplyIntent("もっと短くして");
    expect(out.intent).toBe("revise");
    expect(out.instruction).toBe("もっと短くして");
  });

  test("remember keyword → remember with note", async () => {
    const out = await classifyReplyIntent("今後は絵文字控えめで");
    expect(out.intent).toBe("remember");
    expect(out.note).toBe("今後は絵文字控えめで");
  });

  test("empty → none", async () => {
    expect((await classifyReplyIntent("   ")).intent).toBe("none");
  });

  test("unrelated → none", async () => {
    expect((await classifyReplyIntent("おはよう")).intent).toBe("none");
  });
});

describe("classifyReplyIntent — live path (Anthropic mocked)", () => {
  beforeAll(() => {
    delete process.env.IN_MEMORY_FALLBACK;
    process.env.ANTHROPIC_API_KEY = "sk-test";
  });
  afterAll(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });
  beforeEach(() => jest.clearAllMocks());

  test("uses Haiku model + classify tool, returns normalized result", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "tool_use",
          name: "classify_reply_intent",
          input: { intent: "revise", instruction: " もっと具体的に " },
        },
      ],
    });

    const out = await classifyReplyIntent("具体例を足して");
    expect(out.intent).toBe("revise");
    expect(out.instruction).toBe("もっと具体的に"); // trimmed

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const arg = mockCreate.mock.calls[0][0];
    expect(arg.model).toBe("claude-haiku-4-5-20251001");
    expect(arg.tools[0].name).toBe("classify_reply_intent");
    expect(arg.tool_choice).toEqual({ type: "tool", name: "classify_reply_intent" });
    expect(arg.max_tokens).toBeLessThanOrEqual(512);
  });

  test("no tool_use in response → none (safe)", async () => {
    mockCreate.mockResolvedValue({ content: [{ type: "text", text: "??" }] });
    const out = await classifyReplyIntent("わからない文");
    expect(out.intent).toBe("none");
  });

  test("invalid intent value → normalized to none", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "tool_use", name: "classify_reply_intent", input: { intent: "bogus" } }],
    });
    const out = await classifyReplyIntent("foo");
    expect(out.intent).toBe("none");
  });
});
