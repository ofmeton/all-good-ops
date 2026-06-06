import {
  computeHints,
  scoreCandidates,
  type Candidate,
  type ScoredCandidate,
} from "./collector-scoring.ts";

function cand(id: string, ageH: number, likes: number): Candidate {
  const created = new Date(Date.now() - ageH * 3600_000).toISOString();
  return {
    tweet: {
      id,
      text: `t${id}`,
      author: { userName: "a" },
      createdAt: created,
      likeCount: likes,
      retweetCount: 0,
      viewCount: 1000,
    },
    discovery: { via: "fixed", query: "from:a" },
  };
}

describe("computeHints", () => {
  test("fresh + high engagement → higher velocity hint", () => {
    const h = computeHints(cand("1", 1, 100).tweet, Date.now());
    expect(h.age_hours).toBeCloseTo(1, 0);
    expect(h.velocity_per_hour).toBeGreaterThan(0);
    expect(h.engagement_rate).toBeCloseTo(0.1, 1);
  });
});

describe("scoreCandidates", () => {
  test("maps tool_use scores onto candidates", async () => {
    const fakeClient = {
      messages: {
        create: async () => ({
          content: [
            {
              type: "tool_use",
              input: {
                scores: [
                  {
                    id: "1",
                    freshness: 80,
                    velocity: 70,
                    target_fit: 90,
                    overall: 82,
                    reason: "新機能の速報",
                  },
                ],
              },
            },
          ],
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      },
    };
    const out: ScoredCandidate[] = await scoreCandidates(
      fakeClient as never,
      [cand("1", 1, 100)],
      { now: Date.now(), batchSize: 20, model: "claude-sonnet-4-5" },
    );
    expect(out).toHaveLength(1);
    expect(out[0].scores.overall).toBe(82);
    expect(out[0].scores.target_fit).toBe(90);
    expect(out[0].scoreReason).toBe("新機能の速報");
    expect(out[0].costJpy).toBeGreaterThan(0);
  });

  test("missing score falls back to zeros (全保存・除外しない)", async () => {
    const fakeClient = {
      messages: {
        create: async () => ({
          content: [{ type: "tool_use", input: { scores: [] } }],
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      },
    };
    const out = await scoreCandidates(fakeClient as never, [cand("1", 1, 1)], {
      now: Date.now(),
      batchSize: 20,
      model: "claude-sonnet-4-5",
    });
    expect(out).toHaveLength(1);
    expect(out[0].scores.overall).toBe(0);
    expect(out[0].scoreReason).toMatch(/未採点|スコア欠落/);
  });

  test("non-array scores (e.g. string) → candidate returned with zeros, no throw", async () => {
    const fakeClient = {
      messages: {
        create: async () => ({
          content: [{ type: "tool_use", input: { scores: "oops" } }],
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      },
    };
    const out = await scoreCandidates(fakeClient as never, [cand("1", 1, 1)], {
      now: Date.now(),
      batchSize: 20,
      model: "claude-sonnet-4-5",
    });
    expect(out).toHaveLength(1);
    expect(out[0].scores.freshness).toBe(0);
    expect(out[0].scores.velocity).toBe(0);
    expect(out[0].scores.target_fit).toBe(0);
    expect(out[0].scores.overall).toBe(0);
    expect(out[0].scoreReason).toMatch(/未採点|スコア欠落/);
  });

  test("string score field is coerced to number", async () => {
    const fakeClient = {
      messages: {
        create: async () => ({
          content: [
            {
              type: "tool_use",
              input: {
                scores: [
                  {
                    id: "1",
                    freshness: "80",
                    velocity: "70",
                    target_fit: "90",
                    overall: "82",
                    reason: "string fields",
                  },
                ],
              },
            },
          ],
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      },
    };
    const out = await scoreCandidates(fakeClient as never, [cand("1", 1, 1)], {
      now: Date.now(),
      batchSize: 20,
      model: "claude-sonnet-4-5",
    });
    expect(out).toHaveLength(1);
    expect(typeof out[0].scores.freshness).toBe("number");
    expect(out[0].scores.freshness).toBe(80);
    expect(out[0].scores.velocity).toBe(70);
    expect(out[0].scores.target_fit).toBe(90);
    expect(out[0].scores.overall).toBe(82);
  });

  test("multi-batch: 3 candidates with batchSize:2 → all 3 returned", async () => {
    const calls: unknown[][] = [];
    const fakeClient = {
      messages: {
        create: async (_params: unknown) => {
          const p = _params as { messages: { content: string }[] };
          const body = p.messages[0].content;
          // Parse ids from the user prompt lines (each line is JSON)
          const ids: string[] = [];
          for (const line of body.split("\n")) {
            try {
              const obj = JSON.parse(line) as { id?: string };
              if (obj.id) ids.push(obj.id);
            } catch {
              /* skip non-JSON lines */
            }
          }
          calls.push(ids);
          return {
            content: [
              {
                type: "tool_use",
                input: {
                  scores: ids.map((id) => ({
                    id,
                    freshness: 70,
                    velocity: 60,
                    target_fit: 80,
                    overall: 70,
                    reason: `ok-${id}`,
                  })),
                },
              },
            ],
            usage: { input_tokens: 20, output_tokens: 10 },
          };
        },
      },
    };
    const out = await scoreCandidates(
      fakeClient as never,
      [cand("1", 1, 10), cand("2", 2, 20), cand("3", 3, 30)],
      { now: Date.now(), batchSize: 2, model: "claude-sonnet-4-5" },
    );
    expect(out).toHaveLength(3);
    expect(calls).toHaveLength(2); // batch1:[1,2], batch2:[3]
    expect(out.map((c) => c.tweet.id)).toEqual(["1", "2", "3"]);
    out.forEach((c) => expect(c.scores.overall).toBe(70));
  });
});
