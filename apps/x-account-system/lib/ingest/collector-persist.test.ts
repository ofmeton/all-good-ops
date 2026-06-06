import { dedupCandidates, buildMaterialRow } from "./collector-persist.ts";
import type { ScoredCandidate } from "./collector-scoring.ts";

function scored(id: string): ScoredCandidate {
  return {
    tweet: {
      id,
      text: `t${id}`,
      author: { userName: "a" },
      createdAt: "x",
      media: [{ type: "photo", url: "u" }],
      lang: "en",
      isReply: false,
      conversationId: "c1",
      tweetUrl: "https://x.com/a/status/" + id,
      likeCount: 10,
      retweetCount: 2,
      replyCount: 1,
      quoteCount: 3,
      bookmarkCount: 4,
      viewCount: 100,
    },
    discovery: { via: "keyword", query: "Claude" },
    scores: { freshness: 1, velocity: 2, target_fit: 3, overall: 4 },
    scoreReason: "r",
    costJpy: 0.1,
  };
}

describe("collector-persist", () => {
  test("dedup drops ids already in store and in-batch dups", async () => {
    const sb = {
      from: () => ({
        select: () => ({
          eq: () => ({
            in: async () => ({ data: [{ meta: { tweet_id: "1" } }], error: null }),
          }),
        }),
      }),
    };
    const out = await dedupCandidates(sb as never, [scored("1"), scored("2"), scored("2")]);
    expect(out.map((c) => c.tweet.id)).toEqual(["2"]);
  });

  test("buildMaterialRow maps all fields", () => {
    const row = buildMaterialRow(scored("9"), "redacted t9", false);
    expect(row.source_type).toBe("x_inspirations");
    expect(row.source_ref).toBe("a");
    expect(row.meta.tweet_id).toBe("9");
    expect(row.meta.scores.overall).toBe(4);
    expect(row.meta.discovery.via).toBe("keyword");
    expect(row.meta.media).toEqual([{ type: "photo", url: "u" }]);
    expect(row.meta.selection_status).toBe("collected");
    expect(row.meta.engagement).toEqual({
      like: 10,
      retweet: 2,
      reply: 1,
      quote: 3,
      bookmark: 4,
      view: 100,
    });
  });
});
