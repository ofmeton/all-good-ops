import { callClaudeTraced } from "./llm-trace.js";

test("text 応答: text と usage を返す", async () => {
  const fakeClient = {
    messages: { create: async () => ({
      content: [{ type: "text", text: "hello" }],
      usage: { input_tokens: 10, output_tokens: 3 },
    }) },
  };
  const out = await callClaudeTraced(fakeClient as never, {
    params: { model: "claude-haiku-4-5", max_tokens: 100, system: "sys",
              messages: [{ role: "user", content: "user-prompt" }] },
    promptText: "sys\n\nuser-prompt",
  });
  expect(out.text).toBe("hello");
  expect(out.toolUse).toBeUndefined();
  expect(out.meta.tokensIn).toBe(10);
  expect(out.meta.tokensOut).toBe(3);
  expect(out.meta.promptText).toContain("user-prompt");
});

test("tool_use 応答: toolUse の input を捕捉する", async () => {
  const fakeClient = {
    messages: { create: async () => ({
      content: [{ type: "tool_use", name: "core_ideas", input: { ideas: [1, 2] } }],
      usage: { input_tokens: 5, output_tokens: 8 },
    }) },
  };
  const out = await callClaudeTraced(fakeClient as never, {
    params: { model: "claude-sonnet-4-5", max_tokens: 100,
              tool_choice: { type: "tool", name: "core_ideas" },
              messages: [{ role: "user", content: "p" }] },
    promptText: "p",
  });
  expect(out.text).toBe("");
  expect(out.toolUse).toEqual({ ideas: [1, 2] });
  expect(out.meta.tokensOut).toBe(8);
});
