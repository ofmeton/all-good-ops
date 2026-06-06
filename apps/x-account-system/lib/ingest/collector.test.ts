import { runCollect } from "./collector.ts";

describe("runCollect", () => {
  test("explores via tool_use then scores and persists", async () => {
    // 1回目: search_tweets を tool_use → 2回目: end_turn
    let turn = 0;
    const fakeAnthropic = {
      messages: {
        create: async (args: { tools?: { name: string }[] }) => {
          turn += 1;
          // scoring 呼び出し（score_materials tool）は tools 名で判別
          const isScoring = (args.tools ?? []).some((t) => t.name === "score_materials");
          if (isScoring) {
            return {
              content: [
                {
                  type: "tool_use",
                  input: {
                    scores: [
                      { id: "1", freshness: 50, velocity: 50, target_fit: 60, overall: 55, reason: "ok" },
                    ],
                  },
                },
              ],
              usage: { input_tokens: 10, output_tokens: 5 },
            };
          }
          if (turn === 1) {
            return {
              stop_reason: "tool_use",
              content: [
                { type: "tool_use", id: "tu1", name: "search_tweets", input: { query: "Claude", queryType: "Latest", via: "keyword" } },
              ],
              usage: { input_tokens: 20, output_tokens: 10 },
            };
          }
          return { stop_reason: "end_turn", content: [{ type: "text", text: "done" }], usage: { input_tokens: 5, output_tokens: 2 } };
        },
      },
    };

    const inserts: unknown[] = [];
    const sb = {
      from: () => ({
        select: () => ({ eq: () => ({ in: async () => ({ data: [], error: null }) }) }),
        insert: async (row: unknown) => {
          inserts.push(row);
          return { error: null };
        },
      }),
    };

    const inserted = await runCollect({
      anthropic: fakeAnthropic as never,
      sb: sb as never,
      twitterApiKey: "k",
      fetchImpl: undefined as never,
      api: {
        searchTweets: async () => [
          { id: "1", text: "Claude new feature", author: { userName: "a" }, createdAt: new Date().toISOString(), likeCount: 100, viewCount: 1000 },
        ],
        getTrends: async () => ["#AI"],
        searchUsers: async () => [],
        getUserFollowings: async () => [],
        getThread: async () => [],
      },
      now: Date.now(),
    });

    expect(inserted).toBe(1);
    expect(inserts).toHaveLength(1);
    expect((inserts[0] as { meta: { scores: { overall: number } } }).meta.scores.overall).toBe(55);
  });
});
