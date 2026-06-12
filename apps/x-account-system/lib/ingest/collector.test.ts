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

/**
 * 採点回数を数える scoring fake。user prompt から id を抽出し id 毎に overall を返す。
 * overallById で fine overall を制御（retention テスト用）。非 scoring(=翻訳) は throw（fail-open で握られる）。
 */
function countingScorer(overallById: Record<string, number> = {}) {
  const state = { scoredIds: [] as string[], calls: 0 };
  const anthropic = {
    messages: {
      create: async (args: { tools?: { name: string }[]; messages?: Array<{ content: string }> }) => {
        const isScoring = (args.tools ?? []).some((t) => t.name === "score_materials");
        if (!isScoring) throw new Error("unexpected non-scoring messages.create in collector test");
        state.calls += 1;
        const content = args.messages?.[0]?.content ?? "";
        const ids = content.split("\n").slice(1).filter(Boolean).map((l) => JSON.parse(l).id as string);
        state.scoredIds.push(...ids);
        const scores = ids.map((id) => ({ id, freshness: 50, velocity: 50, target_fit: 50, overall: overallById[id] ?? 50, reason: "ok" }));
        return { content: [{ type: "tool_use", input: { scores } }], usage: { input_tokens: 10, output_tokens: 5 } };
      },
    },
  };
  return { anthropic, state };
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

/**
 * runtime_params テーブルを返す sb mock（P2-enforce-flip）。
 * from("runtime_params").select() は rows を thenable で返す。それ以外は dedup/insert の最小 mock。
 */
function makeSbWithRuntimeParams(runtimeRows: Record<string, number>, inserts: unknown[]) {
  return {
    from: (table: string) => {
      if (table === "runtime_params") {
        const data = Object.entries(runtimeRows).map(([param_id, value]) => ({ param_id, value }));
        return { select: () => Promise.resolve({ data, error: null }) };
      }
      return {
        select: () => ({ eq: () => ({ in: async () => ({ data: [], error: null }) }) }),
        insert: async (row: unknown) => { inserts.push(row); return { error: null }; },
      };
    },
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

  // ---- P2 二段採点 prerank（shadow 既定＝挙動不変 / enforce＝選抜のみ採点） ----

  /** 3件の新鮮候補 + 1件の stale（floor 対象）を返す探索。lang 未指定で翻訳経路は通らない。 */
  function prerankCandidates() {
    const fresh = (id: string, like: number) => ({ id, text: `t${id}`, author: { userName: "rando" }, createdAt: new Date().toISOString(), likeCount: like, viewCount: 1000, isReply: false, conversationId: id });
    const stale = { id: "old", text: "old", author: { userName: "rando" }, createdAt: new Date(Date.now() - 200 * 3600_000).toISOString(), likeCount: 0, retweetCount: 0, bookmarkCount: 0, viewCount: 5, isReply: false, conversationId: "old" };
    return [fresh("a", 900), fresh("b", 500), fresh("c", 100), stale];
  }

  const prerankApi = (tweets: unknown[]) => ({
    searchTweets: async () => tweets as never,
    getTrends: async () => [], searchUsers: async () => [], getUserFollowings: async () => [], getThread: async () => [],
  });

  test("P2 shadow（既定）: 全件 fine-score＝挙動不変・inserted/採点回数が従来と同じ・meta に selection_pool 無し", async () => {
    const inserts: unknown[] = [];
    const onTraceCosts: number[] = [];
    const { anthropic, state } = countingScorer();
    const stats = await runCollect({
      anthropic: anthropic as never,
      sb: makeSb(inserts) as never,
      twitterApiKey: "k", fetchImpl: undefined as never, apiKey: "sk-test",
      runSession: exploreSession([{ name: "search_tweets", input: { query: "AI", queryType: "Latest", via: "keyword" } }]),
      getAgentRef: okRef,
      onTrace: (m) => onTraceCosts.push(m.costJpy ?? 0),
      // prerankMode 未指定 → COLLECTOR_CONFIG 既定 "shadow"。
      api: prerankApi(prerankCandidates()),
      now: Date.now(),
    });

    // 挙動不変: stale 含む全 4 件を採点・保存（prerank は計算のみ）。
    expect(state.scoredIds.sort()).toEqual(["a", "b", "c", "old"]);
    expect(stats.scored).toBe(4);
    expect(stats.inserted).toBe(4);
    expect(inserts).toHaveLength(4);
    // meta に selection_pool/prior_score を刻まない（shadow=meta 不変）。
    for (const row of inserts as Array<{ meta: Record<string, unknown> }>) {
      expect(row.meta.selection_pool).toBeUndefined();
      expect(row.meta.prior_score).toBeUndefined();
    }
    // shadow 指標が算出される。
    expect(stats.selectionMode).toBe("shadow");
    expect(stats.shadow).toBeDefined();
    expect(stats.shadow!.topN_retention).toBeGreaterThanOrEqual(0);
    expect(stats.shadow!.topN_retention).toBeLessThanOrEqual(1);
    expect(stats.shadow!.selected_count + stats.shadow!.pruned_count).toBe(4);
    // 剪定サマリ: stale が floor される（沈黙カット禁止＝記録される）。
    expect(stats.pruned!.byReason.stale_low_velocity).toBe(1);
    // onTrace は 1 本・cost 合計は scoring(4件)+explore+translate。
    expect(onTraceCosts).toHaveLength(1);
    expect(onTraceCosts[0]).toBeCloseTo(stats.cost.totalJpy, 10);
  });

  test("P2 shadow: retention/pruned_fine_max が上澄み非劣化を測れる（高 fine は全て selected・剪定群の fine は低い）", async () => {
    const inserts: unknown[] = [];
    // fine overall を a>b>c>old に設定。a,b,c は prior selected、old は floor 剪定。
    const { anthropic } = countingScorer({ a: 90, b: 80, c: 70, old: 10 });
    const stats = await runCollect({
      anthropic: anthropic as never,
      sb: makeSb(inserts) as never,
      twitterApiKey: "k", fetchImpl: undefined as never, apiKey: "sk-test",
      runSession: exploreSession([{ name: "search_tweets", input: { query: "AI", queryType: "Latest", via: "keyword" } }]),
      getAgentRef: okRef,
      prerankMode: "shadow",
      rng: () => 0.5,
      api: prerankApi(prerankCandidates()),
      now: Date.now(),
    });
    // 候補4件なので topN=4（old も母数に入る）。old(低fine,floor)のみ未 selected → retention=3/4。
    expect(stats.shadow!.topN_size).toBe(4);
    expect(stats.shadow!.topN_retention).toBeCloseTo(0.75, 6);
    // 上澄み非劣化の核: 剪定群の fine 最大が低い（=高 fine を捨てていない）。old の fine=10 のみ。
    expect(stats.shadow!.pruned_fine_max).toBe(10);
    // prior と fine は正の単調（a>b>c>old が両軸で一致）→ ρ>0。
    expect(stats.shadow!.spearman_rho).not.toBeNull();
    expect(stats.shadow!.spearman_rho!).toBeGreaterThan(0);
  });

  test("P2 enforce: selected のみ fine-score（stale は採点せず）・pruned 記録・meta に selection_pool", async () => {
    const inserts: unknown[] = [];
    const { anthropic, state } = countingScorer();
    const stats = await runCollect({
      anthropic: anthropic as never,
      sb: makeSb(inserts) as never,
      twitterApiKey: "k", fetchImpl: undefined as never, apiKey: "sk-test",
      runSession: exploreSession([{ name: "search_tweets", input: { query: "AI", queryType: "Latest", via: "keyword" } }]),
      getAgentRef: okRef,
      prerankMode: "enforce",
      rng: () => 0.5,
      api: prerankApi(prerankCandidates()),
      now: Date.now(),
    });

    // enforce: stale("old") は floor され採点・保存されない。a,b,c のみ。
    expect(state.scoredIds.sort()).toEqual(["a", "b", "c"]);
    expect(stats.scored).toBe(3);
    expect(stats.inserted).toBe(3);
    const ids = (inserts as Array<{ meta: { tweet_id: string } }>).map((r) => r.meta.tweet_id).sort();
    expect(ids).toEqual(["a", "b", "c"]);
    // pruned 記録（沈黙カット禁止）。
    expect(stats.pruned!.byReason.stale_low_velocity).toBe(1);
    // enforce は selection_pool/prior_score を meta に刻む。
    for (const row of inserts as Array<{ meta: Record<string, unknown> }>) {
      expect(row.meta.selection_pool).toBeDefined();
      expect(typeof row.meta.prior_score).toBe("number");
    }
    // enforce は ground truth 不在のため shadow 指標は出さない。
    expect(stats.selectionMode).toBe("enforce");
    expect(stats.shadow).toBeUndefined();
  });

  // ---- P2-enforce-flip: prerankMode を runtime_param collector_prerank_enforce で切替 ----

  test("enforce-flip: runtime_param collector_prerank_enforce=1 → enforce（selected のみ採点）", async () => {
    const inserts: unknown[] = [];
    const { anthropic, state } = countingScorer();
    const stats = await runCollect({
      anthropic: anthropic as never,
      sb: makeSbWithRuntimeParams({ collector_prerank_enforce: 1 }, inserts) as never,
      twitterApiKey: "k", fetchImpl: undefined as never, apiKey: "sk-test",
      runSession: exploreSession([{ name: "search_tweets", input: { query: "AI", queryType: "Latest", via: "keyword" } }]),
      getAgentRef: okRef,
      rng: () => 0.5,
      // prerankMode 未指定 → runtime_param が決定。
      api: prerankApi(prerankCandidates()),
      now: Date.now(),
    });
    expect(stats.selectionMode).toBe("enforce");
    expect(state.scoredIds.sort()).toEqual(["a", "b", "c"]); // stale("old") は floor され不採点
    expect(stats.scored).toBe(3);
    expect(stats.shadow).toBeUndefined();
  });

  test("enforce-flip: collector_prerank_enforce=0 → shadow（全件採点・挙動不変）", async () => {
    const inserts: unknown[] = [];
    const { anthropic, state } = countingScorer();
    const stats = await runCollect({
      anthropic: anthropic as never,
      sb: makeSbWithRuntimeParams({ collector_prerank_enforce: 0 }, inserts) as never,
      twitterApiKey: "k", fetchImpl: undefined as never, apiKey: "sk-test",
      runSession: exploreSession([{ name: "search_tweets", input: { query: "AI", queryType: "Latest", via: "keyword" } }]),
      getAgentRef: okRef,
      api: prerankApi(prerankCandidates()),
      now: Date.now(),
    });
    expect(stats.selectionMode).toBe("shadow");
    expect(state.scoredIds.sort()).toEqual(["a", "b", "c", "old"]); // 全件採点
    expect(stats.scored).toBe(4);
    expect(stats.shadow).toBeDefined();
  });

  test("enforce-flip: runtime_param 行なし → shadow（default・挙動不変）", async () => {
    const inserts: unknown[] = [];
    const { anthropic, state } = countingScorer();
    const stats = await runCollect({
      anthropic: anthropic as never,
      sb: makeSbWithRuntimeParams({}, inserts) as never, // collector_prerank_enforce 行なし
      twitterApiKey: "k", fetchImpl: undefined as never, apiKey: "sk-test",
      runSession: exploreSession([{ name: "search_tweets", input: { query: "AI", queryType: "Latest", via: "keyword" } }]),
      getAgentRef: okRef,
      api: prerankApi(prerankCandidates()),
      now: Date.now(),
    });
    expect(stats.selectionMode).toBe("shadow");
    expect(state.scoredIds.sort()).toEqual(["a", "b", "c", "old"]);
    expect(stats.scored).toBe(4);
  });

  // ---- P3 閉ループ: K/quota/age の runtime_params が buildPrerankParams に overlay される ----

  /** 60h 前・velocity<1・非 ai_official の中年齢候補（age 閾値 48 では floor、72 では非 floor）。 */
  function midAgeCandidate() {
    return {
      id: "mid", text: "mid age", author: { userName: "rando" },
      createdAt: new Date(Date.now() - 60 * 3600_000).toISOString(),
      likeCount: 0, retweetCount: 0, bookmarkCount: 0, viewCount: 10, isReply: false, conversationId: "mid",
    };
  }
  /** 新鮮候補（floor されない・topK へ）。 */
  function freshCandidate(id: string) {
    return { id, text: `t${id}`, author: { userName: "rando" }, createdAt: new Date().toISOString(), likeCount: 500, viewCount: 1000, isReply: false, conversationId: id };
  }

  test("overlay: collector_prerank_max_age_hours=48 → 60h 候補が stale_low_velocity で floor される", async () => {
    const inserts: unknown[] = [];
    const { anthropic } = countingScorer();
    const stats = await runCollect({
      anthropic: anthropic as never,
      sb: makeSbWithRuntimeParams({ collector_prerank_max_age_hours: 48 }, inserts) as never,
      twitterApiKey: "k", fetchImpl: undefined as never, apiKey: "sk-test",
      runSession: exploreSession([{ name: "search_tweets", input: { query: "AI", queryType: "Latest", via: "keyword" } }]),
      getAgentRef: okRef,
      api: prerankApi([freshCandidate("a"), freshCandidate("b"), midAgeCandidate()]),
      now: Date.now(),
    });
    // age 閾値が runtime で 48h に下がった → 60h の mid が provably-zero floor（wiring の証拠）。
    expect(stats.pruned!.byReason.stale_low_velocity).toBe(1);
    expect(stats.pruned!.samples.some((s) => s.tweetId === "mid")).toBe(true);
  });

  test("overlay: runtime_params 未投入 → age=config default(72) で 60h 候補は floor されない（挙動不変）", async () => {
    const inserts: unknown[] = [];
    const { anthropic } = countingScorer();
    const stats = await runCollect({
      anthropic: anthropic as never,
      sb: makeSbWithRuntimeParams({}, inserts) as never, // 行なし → fail-open default(72)
      twitterApiKey: "k", fetchImpl: undefined as never, apiKey: "sk-test",
      runSession: exploreSession([{ name: "search_tweets", input: { query: "AI", queryType: "Latest", via: "keyword" } }]),
      getAgentRef: okRef,
      api: prerankApi([freshCandidate("a"), freshCandidate("b"), midAgeCandidate()]),
      now: Date.now(),
    });
    // default 72h では 60h<72h で floor されない（stale_low_velocity 0 件）。
    expect(stats.pruned!.byReason.stale_low_velocity ?? 0).toBe(0);
  });

  test("overlay: collector_prerank_max_age_hours=10（bounds外）→ clip で 48 になり 60h 候補が floor", async () => {
    const inserts: unknown[] = [];
    const { anthropic } = countingScorer();
    const stats = await runCollect({
      anthropic: anthropic as never,
      sb: makeSbWithRuntimeParams({ collector_prerank_max_age_hours: 10 }, inserts) as never, // <48 → clip 48
      twitterApiKey: "k", fetchImpl: undefined as never, apiKey: "sk-test",
      runSession: exploreSession([{ name: "search_tweets", input: { query: "AI", queryType: "Latest", via: "keyword" } }]),
      getAgentRef: okRef,
      api: prerankApi([freshCandidate("a"), freshCandidate("b"), midAgeCandidate()]),
      now: Date.now(),
    });
    // 10 は bounds[48,168] で 48 に clip → 60h>48h で floor（clip がレバーを保護している証拠）。
    expect(stats.pruned!.byReason.stale_low_velocity).toBe(1);
  });
});
