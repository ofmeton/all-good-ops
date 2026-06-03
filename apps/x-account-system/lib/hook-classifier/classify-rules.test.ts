import { classifyRules } from "./classify-rules.ts";
import fixtures from "./__fixtures__/classify-parity.json";

describe("classifyRules parity with classify.py", () => {
  test.each(
    fixtures as Array<{
      input: string;
      expected: {
        primary_hook: string;
        devices: string[];
        confidenceMin: number;
        confidenceMax: number;
      };
    }>,
  )("$input", ({ input, expected }) => {
    const r = classifyRules(input);
    expect(r.primary_hook).toBe(expected.primary_hook);
    for (const d of expected.devices) expect(r.devices).toContain(d);
    expect(r.confidence).toBeGreaterThanOrEqual(expected.confidenceMin);
    expect(r.confidence).toBeLessThanOrEqual(expected.confidenceMax);
  });
});
