import { describe, it, expect, vi } from "vitest";
import { judgeRelevance } from "@/lib/enrichment/relevance";
import * as anth from "@/lib/anthropic";

describe("judgeRelevance", () => {
  it("returns score + category", async () => {
    vi.spyOn(anth, "callJson").mockResolvedValueOnce({
      score: 85,
      reason: "Direct Claude Code use case",
      category: "tips",
    });

    const result = await judgeRelevance({
      body: "Claude Code helped me ship X in 30 min",
      author: "demo",
    });

    expect(result.score).toBe(85);
    expect(result.category).toBe("tips");
  });

  it("can mark low-relevance items", async () => {
    vi.spyOn(anth, "callJson").mockResolvedValueOnce({
      score: 20,
      reason: "GPT-only content",
      category: "other",
    });

    const result = await judgeRelevance({
      body: "GPT-4 generated this image for me",
      author: "demo",
    });

    expect(result.score).toBe(20);
  });
});
