import { describe, it, expect, vi } from "vitest";
import { extractPattern } from "@/lib/enrichment/pattern";
import * as anth from "@/lib/anthropic";

describe("extractPattern", () => {
  it("returns buzz_pattern + hook + visual_hint", async () => {
    vi.spyOn(anth, "callJson").mockResolvedValueOnce({
      buzz_pattern: "before-after",
      hook_structure: "数値見出し",
      visual_hint: "screenshot",
    });

    const result = await extractPattern({
      body: "Before: 8 hours. After: 30 min with Claude Code.",
      category: "case",
    });

    expect(result.buzz_pattern).toBe("before-after");
    expect(result.visual_hint).toBe("screenshot");
  });
});
