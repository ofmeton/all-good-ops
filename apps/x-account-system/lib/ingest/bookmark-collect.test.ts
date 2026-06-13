import { runBookmarkCollect } from "./bookmark-collect.ts";

function bookmarkFetch(tweets: unknown[]): typeof fetch {
  return (async () =>
    ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ tweets }),
    }) as Response) as unknown as typeof fetch;
}

function scoringAnthropic() {
  const state = { scoredIds: [] as string[] };
  const anthropic = {
    messages: {
      create: async (args: { tools?: { name: string }[]; messages?: Array<{ content: string }> }) => {
        const isScoring = (args.tools ?? []).some((t) => t.name === "score_materials");
        if (!isScoring) throw new Error("unexpected non-scoring messages.create in bookmark collect test");
        const content = args.messages?.[0]?.content ?? "";
        const ids = content.split("\n").slice(1).filter(Boolean).map((l) => JSON.parse(l).id as string);
        state.scoredIds.push(...ids);
        const scores = ids.map((id) => ({
          id,
          freshness: 50,
          velocity: 50,
          target_fit: 60,
          overall: 55,
          reason: "ok",
        }));
        return { content: [{ type: "tool_use", input: { scores } }], usage: { input_tokens: 10, output_tokens: 5 } };
      },
    },
  };
  return { anthropic, state };
}

function makeSbWithExisting(existing: Set<string>, inserts: unknown[]) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          in: async (_col: string, ids: string[]) => ({
            data: ids.filter((id) => existing.has(id)).map((id) => ({ meta: { tweet_id: id } })),
            error: null,
          }),
        }),
      }),
      insert: async (row: unknown) => {
        inserts.push(row);
        return { error: null };
      },
    }),
  };
}

function tweet(id: string) {
  return {
    id,
    text: `bookmark ${id}`,
    author: { userName: "alice" },
    createdAt: new Date("2026-06-13T00:00:00.000Z").toISOString(),
    lang: "ja",
    likeCount: 10,
    viewCount: 100,
    isReply: false,
    conversationId: id,
  };
}

describe("runBookmarkCollect", () => {
  test("bookmarks → score → persist as x_inspirations with discovery.via=bookmark", async () => {
    const inserts: unknown[] = [];
    const { anthropic } = scoringAnthropic();
    const stats = await runBookmarkCollect({
      anthropic: anthropic as never,
      sb: makeSbWithExisting(new Set(), inserts) as never,
      twitterApiKey: "k",
      loginCookie: "cookie",
      proxy: "http://proxy.example",
      fetchImpl: bookmarkFetch([tweet("b1")]),
      now: Date.now(),
    });

    expect(stats.inserted).toBe(1);
    expect(stats.fetched).toBe(1);
    expect(stats.deduped).toBe(1);
    expect(stats.scored).toBe(1);
    expect(inserts).toHaveLength(1);
    const row = inserts[0] as { source_type: string; meta: { discovery: { via: string; query: string } } };
    expect(row.source_type).toBe("x_inspirations");
    expect(row.meta.discovery.via).toBe("bookmark");
    expect(row.meta.discovery.query).toBe("bookmarks_v2");
  });

  test("already-existing tweet_id is deduped out before scoring/persist", async () => {
    const inserts: unknown[] = [];
    const { anthropic, state } = scoringAnthropic();
    const stats = await runBookmarkCollect({
      anthropic: anthropic as never,
      sb: makeSbWithExisting(new Set(["b2"]), inserts) as never,
      twitterApiKey: "k",
      loginCookie: "cookie",
      proxy: "http://proxy.example",
      fetchImpl: bookmarkFetch([tweet("b1"), tweet("b2"), tweet("b1")]),
      now: Date.now(),
    });

    expect(state.scoredIds).toEqual(["b1"]);
    expect(stats.fetched).toBe(3);
    expect(stats.deduped).toBe(1);
    expect(stats.scored).toBe(1);
    expect(stats.inserted).toBe(1);
    expect((inserts as Array<{ meta: { tweet_id: string } }>).map((r) => r.meta.tweet_id)).toEqual(["b1"]);
  });
});
