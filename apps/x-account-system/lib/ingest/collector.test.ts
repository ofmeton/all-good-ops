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

/**
 * materials_store に既存の tweet_id を持つ sb mock（前日までの既出を模す）。
 * select(...).in(col, ids) は existing ∩ ids を返す（early-dedup / persist 双方の照会に対応）。
 */
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
      insert: async (row: unknown) => { inserts.push(row); return { error: null }; },
    }),
  };
}

/** 非ルート reply でない（id 不変）通常ツイート。lang 未指定で翻訳経路は通らない（既存 test に同じ）。 */
function tweet(id: string) {
  return { id, text: `t${id}`, author: { userName: "a" }, createdAt: new Date().toISOString(), likeCount: 10, viewCount: 100, isReply: false, conversationId: id };
}

describe("runCollect", () => {
  test("explore(MA session) → score → persist", async () => {
    const inserts: unknown[] = [];
    const stats = await runCollect({
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

    expect(stats.inserted).toBe(1);
    expect(inserts).toHaveLength(1);
    expect((inserts[0] as { meta: { scores: { overall: number } } }).meta.scores.overall).toBe(55);
  });

  test("CollectStats: breakdown 3 成分 + funnel 件数を返す（inserted の意味は保持）", async () => {
    const inserts: unknown[] = [];
    const onTraceCosts: number[] = [];
    const stats = await runCollect({
      anthropic: scoringAnthropic([{ id: "1", freshness: 50, velocity: 50, target_fit: 60, overall: 55, reason: "ok" }]) as never,
      sb: makeSb(inserts) as never,
      twitterApiKey: "k",
      fetchImpl: undefined as never,
      apiKey: "sk-test",
      runSession: exploreSession([{ name: "search_tweets", input: { query: "Claude", queryType: "Latest", via: "keyword" } }]),
      getAgentRef: okRef,
      onTrace: (m) => onTraceCosts.push(m.costJpy ?? 0),
      api: {
        searchTweets: async () => [
          { id: "1", text: "Claude new feature", author: { userName: "a" }, createdAt: new Date().toISOString(), likeCount: 100, viewCount: 1000 },
        ],
        getTrends: async () => [], searchUsers: async () => [], getUserFollowings: async () => [], getThread: async () => [],
      },
      now: Date.now(),
    });

    // inserted の意味は保持（= 旧 number 戻り値）。
    expect(stats.inserted).toBe(1);
    // funnel 件数: 候補1件 → dedup後1 → 採点1。
    expect(stats.fetched).toBe(1);
    expect(stats.deduped).toBe(1);
    expect(stats.scored).toBe(1);
    // breakdown 3 成分が揃って返り、totalJpy = 合計。
    expect(stats.cost).toEqual(
      expect.objectContaining({
        exploreJpy: expect.any(Number),
        scoringJpy: expect.any(Number),
        translateJpy: expect.any(Number),
        totalJpy: expect.any(Number),
      }),
    );
    expect(stats.cost.totalJpy).toBeCloseTo(
      stats.cost.exploreJpy + stats.cost.scoringJpy + stats.cost.translateJpy,
      10,
    );
    // 挙動不変: onTrace に渡す cost 合計 === breakdown.totalJpy（合算 1 本のまま）。
    expect(onTraceCosts).toHaveLength(1);
    expect(onTraceCosts[0]).toBeCloseTo(stats.cost.totalJpy, 10);
  });

  test("候補0件: explore 分のみ cost、件数は全0（早期 return も CollectStats）", async () => {
    const inserts: unknown[] = [];
    const onTraceCosts: number[] = [];
    const stats = await runCollect({
      anthropic: scoringAnthropic([]) as never,
      sb: makeSb(inserts) as never,
      twitterApiKey: "k", fetchImpl: undefined as never, apiKey: "sk-test",
      runSession: exploreSession([{ name: "search_tweets", input: { query: "x", queryType: "Latest", via: "keyword" } }]),
      getAgentRef: okRef,
      onTrace: (m) => onTraceCosts.push(m.costJpy ?? 0),
      api: { searchTweets: async () => [], getTrends: async () => [], searchUsers: async () => [], getUserFollowings: async () => [], getThread: async () => [] },
      now: Date.now(),
    });
    expect(stats.inserted).toBe(0);
    expect(stats.fetched).toBe(0);
    expect(stats.deduped).toBe(0);
    expect(stats.scored).toBe(0);
    expect(stats.cost.scoringJpy).toBe(0);
    expect(stats.cost.translateJpy).toBe(0);
    expect(stats.cost.totalJpy).toBe(stats.cost.exploreJpy);
    // onTrace は早期 return でも explore 分を 1 本発火（挙動不変）。
    expect(onTraceCosts).toHaveLength(1);
    expect(onTraceCosts[0]).toBeCloseTo(stats.cost.exploreJpy, 10);
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
    const stats = await runCollect({
      anthropic: scoringAnthropic([]) as never, sb: makeSb(inserts) as never,
      twitterApiKey: "k", fetchImpl: undefined as never, apiKey: "sk-test",
      runSession: exploreSession([{ name: "search_tweets", input: {} }]), getAgentRef: missRef,
      api: { searchTweets: async () => [{ id: "1", text: "x", author: { userName: "a" }, createdAt: new Date().toISOString(), likeCount: 1, viewCount: 1 }], getTrends: async () => [], searchUsers: async () => [], getUserFollowings: async () => [], getThread: async () => [] },
      now: Date.now(),
    });
    expect(stats.inserted).toBe(0);
    expect(inserts).toHaveLength(0);
  });

  test("fail-open: dispatchTool が throw しても探索は死なない（他 tool の候補は残る）", async () => {
    const inserts: unknown[] = [];
    const stats = await runCollect({
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
    expect(stats.inserted).toBe(1);
  });

  // ---- P1 early-dedup（inserted 不変・重複の採点/翻訳削減） ----

  test("P1 early-dedup: バッチ内重複＋既存 store 重複を採点前に落とす（inserted 不変）", async () => {
    const inserts: unknown[] = [];
    // 既存 store に t2 がある。探索は [t1, t1(バッチ内重複), t2(既出), t3(新規)] を1回で返す。
    const stats = await runCollect({
      anthropic: scoringAnthropic([
        { id: "t1", freshness: 50, velocity: 50, target_fit: 60, overall: 55, reason: "ok" },
        { id: "t3", freshness: 50, velocity: 50, target_fit: 60, overall: 55, reason: "ok" },
      ]) as never,
      sb: makeSbWithExisting(new Set(["t2"]), inserts) as never,
      twitterApiKey: "k", fetchImpl: undefined as never, apiKey: "sk-test",
      runSession: exploreSession([{ name: "search_tweets", input: { query: "AI", queryType: "Latest", via: "keyword" } }]),
      getAgentRef: okRef,
      api: {
        searchTweets: async () => [tweet("t1"), tweet("t1"), tweet("t2"), tweet("t3")],
        getTrends: async () => [], searchUsers: async () => [], getUserFollowings: async () => [], getThread: async () => [],
      },
      now: Date.now(),
    });

    // inserted 集合 = 新規の {t1, t3}（従来の persist dedup と同一結果）。t2(既出)・t1重複は落ちる。
    const insertedIds = (inserts as Array<{ meta: { tweet_id: string } }>).map((r) => r.meta.tweet_id).sort();
    expect(insertedIds).toEqual(["t1", "t3"]);
    expect(stats.inserted).toBe(2);
    // funnel: fetched=4 → early-dedup後=2（t1重複・t2既出を除去）→ scored=2（=deduped）。
    expect(stats.fetched).toBe(4);
    expect(stats.deduped).toBe(2);
    expect(stats.scored).toBe(2);
    // 採点に回ったのは deduped 件数のみ＝重複の sonnet 採点が消えている（コスト削減の実証）。
  });

  test("P1 fail-open: early-dedup の DB 照会が失敗しても persist backstop が inserted を担保", async () => {
    const inserts: unknown[] = [];
    // select().in() が throw する sb（early-dedup は skip され従来経路へ）。persist 側は in が
    // {data:[],error:null} を返す mock に切替できないため、ここでは early は throw・persist は
    // 同じ throw を踏むが fail-open（dedupByTweetId は catch せず上位 saveScoredMaterials も throw 伝播
    // しない設計ではないため）→ early のみ throw する mock を用意する。
    let call = 0;
    const sb = {
      from: () => ({
        select: () => ({
          eq: () => ({
            in: async () => {
              call += 1;
              if (call === 1) throw new Error("transient DB error"); // early-dedup の照会のみ失敗
              return { data: [], error: null };                       // persist backstop は成功
            },
          }),
        }),
        insert: async (row: unknown) => { inserts.push(row); return { error: null }; },
      }),
    };
    const stats = await runCollect({
      anthropic: scoringAnthropic([{ id: "t9", freshness: 50, velocity: 50, target_fit: 60, overall: 55, reason: "ok" }]) as never,
      sb: sb as never,
      twitterApiKey: "k", fetchImpl: undefined as never, apiKey: "sk-test",
      runSession: exploreSession([{ name: "search_tweets", input: { query: "AI", queryType: "Latest", via: "keyword" } }]),
      getAgentRef: okRef,
      api: {
        searchTweets: async () => [tweet("t9")],
        getTrends: async () => [], searchUsers: async () => [], getUserFollowings: async () => [], getThread: async () => [],
      },
      now: Date.now(),
    });
    // early-dedup 失敗時は候補をそのまま採点へ（収集は死なない）。inserted は従来どおり。
    expect(stats.inserted).toBe(1);
    expect((inserts as Array<{ meta: { tweet_id: string } }>)[0].meta.tweet_id).toBe("t9");
    // deduped は fail-open で fetched と同値（早期 dedup skip）。
    expect(stats.fetched).toBe(1);
    expect(stats.deduped).toBe(1);
  });
});
