import { runCollect, type RunCollectDeps } from "./collector.ts";

/**
 * P3: explore は永続 MA session（runSession 注入）で駆動。scoring/translation の batch は
 * anthropic.messages.create のまま。runSession fake が customToolHandler を呼んで候補を蓄積する。
 */

/** scoring 専用の anthropic fake（explore は MA session へ移行したため create は scoring のみ）。 */
function scoringAnthropic(scores: Array<Record<string, unknown>>) {
  return {
    messages: {
      create: async (args: { tools?: { name: string }[] }) => {
        const isScoring = (args.tools ?? []).some((t) => t.name === "score_materials");
        if (isScoring) {
          return { content: [{ type: "tool_use", input: { scores } }], usage: { input_tokens: 10, output_tokens: 5 } };
        }
        // explore は MA session 経由なので create には来ない（来たら test 不整合）。
        throw new Error("unexpected non-scoring messages.create in collector test");
      },
    },
  };
}

/** explore session fake: 指定の tool 呼び出しを customToolHandler で順に発火し候補を蓄積。 */
function exploreSession(
  toolCalls: Array<{ name: string; input: Record<string, unknown> }>,
  sessionId = "col_x",
): NonNullable<RunCollectDeps["runSession"]> {
  return (async (deps: any) => {
    for (const tc of toolCalls) await deps.customToolHandler(tc.name, tc.input);
    return {
      ok: true, terminal: "idle", stopReason: "end_turn", transitions: [], agentText: "done",
      toolCalls: [], unhandledTools: [], wallClockMs: 1,
      ids: { env: "env_col", agent: "agent_col", session: sessionId },
      sessionUsage: { input_tokens: 25, output_tokens: 12 },
    };
  }) as any;
}

const okRef: NonNullable<RunCollectDeps["getAgentRef"]> = async () => ({ agentId: "agent_col", version: "1", environmentId: "env_col" });

/** dedup select(.in) + insert(row 記録) の最小 sb mock。 */
function makeSb(inserts: unknown[]) {
  return {
    from: () => ({
      select: () => ({ eq: () => ({ in: async () => ({ data: [], error: null }) }) }),
      insert: async (row: unknown) => { inserts.push(row); return { error: null }; },
    }),
  };
}

describe("runCollect", () => {
  test("explore(MA session) → score → persist", async () => {
    const inserts: unknown[] = [];
    const inserted = await runCollect({
      anthropic: scoringAnthropic([{ id: "1", freshness: 50, velocity: 50, target_fit: 60, overall: 55, reason: "ok" }]) as never,
      sb: makeSb(inserts) as never,
      twitterApiKey: "k",
      fetchImpl: undefined as never,
      apiKey: "sk-test",
      runSession: exploreSession([{ name: "search_tweets", input: { query: "Claude", queryType: "Latest", via: "keyword" } }]),
      getAgentRef: okRef,
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

  test("collector_session_id を materials_store.meta に刻む（1B 用の相関キー）", async () => {
    const inserts: unknown[] = [];
    await runCollect({
      anthropic: scoringAnthropic([{ id: "1", freshness: 50, velocity: 50, target_fit: 60, overall: 55, reason: "ok" }]) as never,
      sb: makeSb(inserts) as never,
      twitterApiKey: "k", fetchImpl: undefined as never, apiKey: "sk-test",
      runSession: exploreSession([{ name: "search_tweets", input: { query: "Claude", queryType: "Latest", via: "keyword" } }], "col_session_abc"),
      getAgentRef: okRef,
      api: {
        searchTweets: async () => [{ id: "1", text: "x", author: { userName: "a" }, createdAt: new Date().toISOString(), likeCount: 1, viewCount: 1 }],
        getTrends: async () => [], searchUsers: async () => [], getUserFollowings: async () => [], getThread: async () => [],
      },
      now: Date.now(),
    });
    expect((inserts[0] as { meta: { collector_session_id?: string } }).meta.collector_session_id).toBe("col_session_abc");
  });

  test("永続: runSession に agentRef/environmentId を渡し agent は送らない", async () => {
    let seen: any = {};
    const capture = (async (deps: any) => {
      seen = deps;
      await deps.customToolHandler("search_tweets", { query: "AI", queryType: "Latest", via: "keyword" });
      return { ok: true, terminal: "idle", stopReason: "end_turn", transitions: [], agentText: "x", toolCalls: [], unhandledTools: [], wallClockMs: 1, ids: { session: "col_x" }, sessionUsage: { input_tokens: 1, output_tokens: 1 } };
    }) as any;
    await runCollect({
      anthropic: scoringAnthropic([{ id: "1", freshness: 1, velocity: 1, target_fit: 1, overall: 1, reason: "x" }]) as never,
      sb: makeSb([]) as never, twitterApiKey: "k", fetchImpl: undefined as never, apiKey: "sk-test",
      runSession: capture, getAgentRef: okRef,
      api: { searchTweets: async () => [{ id: "1", text: "x", author: { userName: "a" }, createdAt: new Date().toISOString(), likeCount: 1, viewCount: 1 }], getTrends: async () => [], searchUsers: async () => [], getUserFollowings: async () => [], getThread: async () => [] },
      now: Date.now(),
    });
    expect(seen.agentRef).toEqual({ id: "agent_col", version: "1" });
    expect(seen.environmentId).toBe("env_col");
    expect(seen.agent).toBeUndefined();
  });

  test("registry miss: getAgentRef throw なら収集中止で 0 件（誤収集防止）", async () => {
    const inserts: unknown[] = [];
    const missRef: NonNullable<RunCollectDeps["getAgentRef"]> = async () => { throw new Error("[ma-registry] agent not bootstrapped: x-collector"); };
    const inserted = await runCollect({
      anthropic: scoringAnthropic([]) as never, sb: makeSb(inserts) as never,
      twitterApiKey: "k", fetchImpl: undefined as never, apiKey: "sk-test",
      runSession: exploreSession([{ name: "search_tweets", input: {} }]), getAgentRef: missRef,
      api: { searchTweets: async () => [{ id: "1", text: "x", author: { userName: "a" }, createdAt: new Date().toISOString(), likeCount: 1, viewCount: 1 }], getTrends: async () => [], searchUsers: async () => [], getUserFollowings: async () => [], getThread: async () => [] },
      now: Date.now(),
    });
    expect(inserted).toBe(0);
    expect(inserts).toHaveLength(0);
  });

  test("fail-open: dispatchTool が throw しても探索は死なない（他 tool の候補は残る）", async () => {
    const inserts: unknown[] = [];
    const inserted = await runCollect({
      anthropic: scoringAnthropic([{ id: "tweet-good", freshness: 60, velocity: 60, target_fit: 70, overall: 63, reason: "ok" }]) as never,
      sb: makeSb(inserts) as never, twitterApiKey: "k", fetchImpl: undefined as never, apiKey: "sk-test",
      runSession: exploreSession([
        { name: "get_trends", input: { woeid: 1 } },     // throws → fail-open
        { name: "search_tweets", input: { query: "AI", queryType: "Latest", via: "keyword" } },
      ]),
      getAgentRef: okRef,
      api: {
        searchTweets: async () => [{ id: "tweet-good", text: "AI is great", author: { userName: "b" }, createdAt: new Date().toISOString(), likeCount: 200, viewCount: 2000 }],
        getTrends: async () => { throw new Error("twitterapi rate limit"); },
        searchUsers: async () => [], getUserFollowings: async () => [], getThread: async () => [],
      },
      now: Date.now(),
    });
    expect(inserted).toBe(1);
  });
});
