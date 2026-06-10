import { buildOptimizerAnalystSystemPrompt } from "./prompts.ts";

test("system prompt enforces propose-only and 🔒 invariants", () => {
  const p = buildOptimizerAnalystSystemPrompt();
  expect(p).toContain("submit_proposal");
  expect(p.toLowerCase()).toContain("propose");
  expect(p).toContain("first_hand");
  expect(p).toContain("FORBIDDEN_PHRASES");
  expect(p).toContain("SAFETY_GUARDRAILS");
});
