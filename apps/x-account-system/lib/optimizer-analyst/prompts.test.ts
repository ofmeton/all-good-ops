import { buildOptimizerAnalystSystemPrompt } from "./prompts.ts";

test("system prompt enforces propose-only and 🔒 invariants", () => {
  const p = buildOptimizerAnalystSystemPrompt();
  expect(p).toContain("submit_proposal");
  expect(p.toLowerCase()).toContain("propose");
  expect(p).toContain("first_hand");
  expect(p).toContain("FORBIDDEN_PHRASES");
  expect(p).toContain("SAFETY_GUARDRAILS");
});

test("P4: collection ROI 目的関数と collector_lever scope を明示する", () => {
  const p = buildOptimizerAnalystSystemPrompt();
  expect(p).toContain("collector_lever");
  expect(p).toContain("¥当たり品質最大化");
  expect(p).toContain("approved_yield_per_jpy");
});
