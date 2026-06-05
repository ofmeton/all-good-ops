/**
 * lib/ingest/buzz-ingest.test.ts
 *
 * Tests runBuzzIngest: mocks fetch (twitterapi.io) + Supabase.
 * Does NOT set IN_MEMORY_FALLBACK. Tests the real DB path with mocked @supabase/supabase-js.
 *
 * Pattern: jest.isolateModules + jest.doMock (same pattern as supabase-store.test.ts).
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal chainable Supabase query stub */
function makeSupabaseMock() {
  const insertMock = jest.fn().mockResolvedValue({ error: null });
  // dedup query: select().eq().filter().limit() → returns [] (no existing rows)
  const limitMock = jest.fn().mockResolvedValue({ data: [], error: null });
  const filterMock = jest.fn().mockReturnValue({ limit: limitMock });
  const eqMock = jest.fn().mockReturnValue({ filter: filterMock });
  const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
  const fromMock = jest.fn().mockImplementation(() => ({
    select: selectMock,
    insert: insertMock,
  }));

  const client = { from: fromMock };

  return { client, fromMock, selectMock, eqMock, filterMock, limitMock, insertMock };
}

/** Build a minimal tweet fixture */
function makeTweet(id: string, userName: string, text = `Tweet text for ${userName} #${id}`) {
  return {
    id,
    text,
    author: { userName },
    createdAt: "Mon Jun 03 10:00:00 +0000 2026",
    likeCount: 42,
    retweetCount: 5,
    replyCount: 3,
    viewCount: 1000,
  };
}

/** Build a minimal Cloudflare Env-like object for testing */
function makeEnv() {
  return {
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
    TWITTERAPI_IO_KEY: "test-twitterapi-key",
    NODE_ENV: "test",
    LOG_LEVEL: "info",
    PHASE: "1",
    AUTONOMOUS_PUBLISH: "false",
    BUDGET_MONTHLY_LIMIT_JPY: "5000",
    BUDGET_BROWNOUT_THRESHOLD_JPY: "4000",
    JOBS: {} as any,
    ANTHROPIC_API_KEY: "test",
    OPENAI_API_KEY: "test",
    X_CLIENT_ID: "test",
    X_CLIENT_SECRET: "test",
    X_ACCESS_TOKEN: "test",
    X_REFRESH_TOKEN: "test",
    LINE_CHANNEL_ACCESS_TOKEN: "test",
    LINE_CHANNEL_SECRET: "test",
    LINE_USER_ID_OFMETON: "test",
  };
}

// ---------------------------------------------------------------------------
// Env setup
// ---------------------------------------------------------------------------

let _savedFallback: string | undefined;

beforeEach(() => {
  _savedFallback = process.env.IN_MEMORY_FALLBACK;
  delete process.env.IN_MEMORY_FALLBACK;
  process.env.SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  process.env.SUPABASE_SCHEMA = "xad";
  jest.resetModules();
});

afterEach(() => {
  if (_savedFallback !== undefined) {
    process.env.IN_MEMORY_FALLBACK = _savedFallback;
  } else {
    delete process.env.IN_MEMORY_FALLBACK;
  }
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SCHEMA;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("runBuzzIngest", () => {
  test("inserts new tweets from 2 seed handles into materials_store", async () => {
    const { client, fromMock, insertMock } = makeSupabaseMock();

    const tweet1 = makeTweet("tweet-001", "Shimayus");
    const tweet2 = makeTweet("tweet-002", "SuguruKun_ai");

    // Mock fetch: return 1 tweet for each of the first 2 handles, empty for the rest
    let callCount = 0;
    const mockFetch = jest.fn().mockImplementation(() => {
      callCount++;
      const tweet = callCount === 1 ? tweet1 : callCount === 2 ? tweet2 : null;
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            tweets: tweet ? [tweet] : [],
          }),
      });
    });

    let buzzIngest: typeof import("./buzz-ingest.ts");
    jest.isolateModules(() => {
      jest.doMock("@supabase/supabase-js", () => ({
        __esModule: true,
        createClient: jest.fn(() => client),
      }));
      buzzIngest = require("./buzz-ingest.ts");
    });

    const env = makeEnv();
    const inserted = await buzzIngest!.runBuzzIngest(env, mockFetch as unknown as typeof fetch);

    // Should have inserted 2 rows (one per seed handle that returned a tweet)
    expect(inserted).toBe(2);

    // Verify insert was called with correct shape for the first tweet (Shimayus)
    expect(fromMock).toHaveBeenCalledWith("materials_store");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source_type: "x_inspirations",
        source_ref: "Shimayus",
        raw_text: tweet1.text,
        redacted_text: expect.any(String),
        pii: expect.any(Boolean),
        permitted_storage: "title_only",
        publication_consent: "pending",
        meta: expect.objectContaining({ tweet_id: "tweet-001", source_category: "jp_publisher" }),
      }),
    );

    // Verify insert for second handle too
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source_type: "x_inspirations",
        source_ref: "SuguruKun_ai",
        raw_text: tweet2.text,
        permitted_storage: "title_only",
        publication_consent: "pending",
        meta: expect.objectContaining({ tweet_id: "tweet-002", source_category: "jp_publisher" }),
      }),
    );
  });

  test("skips duplicate tweets (tweet_id already in materials_store)", async () => {
    // Dedup: limit mock returns 1 existing row → tweet already exists
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    const limitMock = jest.fn().mockResolvedValue({ data: [{ id: "existing-uuid" }], error: null });
    const filterMock = jest.fn().mockReturnValue({ limit: limitMock });
    const eqMock = jest.fn().mockReturnValue({ filter: filterMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    const fromMock = jest.fn().mockImplementation(() => ({
      select: selectMock,
      insert: insertMock,
    }));
    const client = { from: fromMock };

    const tweet1 = makeTweet("duplicate-tweet-id", "Shimayus");
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tweets: [tweet1] }),
    });

    let buzzIngest: typeof import("./buzz-ingest.ts");
    jest.isolateModules(() => {
      jest.doMock("@supabase/supabase-js", () => ({
        __esModule: true,
        createClient: jest.fn(() => client),
      }));
      buzzIngest = require("./buzz-ingest.ts");
    });

    const env = makeEnv();
    const inserted = await buzzIngest!.runBuzzIngest(env, mockFetch as unknown as typeof fetch);

    // Insert should NOT be called — tweet already exists
    expect(insertMock).not.toHaveBeenCalled();
    // inserted count should reflect 0 new rows (all 24 handles return the same dup tweet)
    expect(inserted).toBe(0);
  });

  test("treats unique-violation (23505) on insert as a benign skip (not fatal)", async () => {
    // Existence check passes (no row), but the INSERT loses the dedup race and
    // returns a unique-violation. The run must continue and NOT throw.
    const insertMock = jest
      .fn()
      .mockResolvedValue({ error: { code: "23505", message: "duplicate key value violates unique constraint" } });
    const limitMock = jest.fn().mockResolvedValue({ data: [], error: null }); // existence: no row
    const filterMock = jest.fn().mockReturnValue({ limit: limitMock });
    const eqMock = jest.fn().mockReturnValue({ filter: filterMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    const fromMock = jest.fn().mockImplementation(() => ({ select: selectMock, insert: insertMock }));
    const client = { from: fromMock };

    const tweet1 = makeTweet("race-tweet", "Shimayus");
    const mockFetch = jest.fn().mockImplementation(() => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ tweets: [tweet1] }) });
    });

    let buzzIngest: typeof import("./buzz-ingest.ts");
    jest.isolateModules(() => {
      jest.doMock("@supabase/supabase-js", () => ({
        __esModule: true,
        createClient: jest.fn(() => client),
      }));
      buzzIngest = require("./buzz-ingest.ts");
    });

    const env = makeEnv();
    // Must resolve (not throw) and count 0 newly-inserted rows
    const inserted = await buzzIngest!.runBuzzIngest(env, mockFetch as unknown as typeof fetch);
    expect(inserted).toBe(0);
    expect(insertMock).toHaveBeenCalled(); // insert was attempted
  });

  test("continues to next handle when fetch fails", async () => {
    const { client, insertMock } = makeSupabaseMock();

    const tweet2 = makeTweet("tweet-from-second", "SuguruKun_ai");
    let callCount = 0;
    const mockFetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First handle (Shimayus) → fetch error
        return Promise.reject(new Error("network error"));
      }
      // Second handle (SuguruKun_ai) → success
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ tweets: callCount === 2 ? [tweet2] : [] }),
      });
    });

    let buzzIngest: typeof import("./buzz-ingest.ts");
    jest.isolateModules(() => {
      jest.doMock("@supabase/supabase-js", () => ({
        __esModule: true,
        createClient: jest.fn(() => client),
      }));
      buzzIngest = require("./buzz-ingest.ts");
    });

    const env = makeEnv();
    const inserted = await buzzIngest!.runBuzzIngest(env, mockFetch as unknown as typeof fetch);

    // Should still insert 1 row (from SuguruKun_ai), skipping the failed Shimayus
    expect(inserted).toBe(1);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source_type: "x_inspirations",
        source_ref: "SuguruKun_ai",
        meta: expect.objectContaining({ tweet_id: "tweet-from-second" }),
      }),
    );
  });

  test("returns 0 when all handles return empty tweets", async () => {
    const { client, insertMock } = makeSupabaseMock();

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tweets: [] }),
    });

    let buzzIngest: typeof import("./buzz-ingest.ts");
    jest.isolateModules(() => {
      jest.doMock("@supabase/supabase-js", () => ({
        __esModule: true,
        createClient: jest.fn(() => client),
      }));
      buzzIngest = require("./buzz-ingest.ts");
    });

    const env = makeEnv();
    const inserted = await buzzIngest!.runBuzzIngest(env, mockFetch as unknown as typeof fetch);

    expect(inserted).toBe(0);
    expect(insertMock).not.toHaveBeenCalled();
  });

  test("SEED_SOURCES: 固定ネタ元 (AI公式+英語解説者+JP publishers)", async () => {
    let buzzIngest: typeof import("./buzz-ingest.ts");
    jest.isolateModules(() => {
      jest.doMock("@supabase/supabase-js", () => ({
        __esModule: true,
        createClient: jest.fn(() => ({ from: jest.fn() })),
      }));
      buzzIngest = require("./buzz-ingest.ts");
    });

    // 24 既存 + 4 追加 (AnthropicAI/OpenAI/GoogleDeepMind/gerardsans)
    expect(buzzIngest!.SEED_HANDLES).toHaveLength(28);
    // 既存 JP publishers 維持
    expect(buzzIngest!.SEED_HANDLES).toContain("Shimayus");
    expect(buzzIngest!.SEED_HANDLES).toContain("masahirochaen");
    // チャエンのネタ元 (AI 公式) 追加
    expect(buzzIngest!.SEED_HANDLES).toContain("AnthropicAI");
    expect(buzzIngest!.SEED_HANDLES).toContain("OpenAI");
    expect(buzzIngest!.SEED_HANDLES).toContain("GoogleDeepMind");
    // カテゴリ付与
    const official = buzzIngest!.SEED_SOURCES.filter((s) => s.category === "ai_official");
    expect(official.map((s) => s.handle)).toEqual(["AnthropicAI", "OpenAI", "GoogleDeepMind"]);
    expect(buzzIngest!.SEED_SOURCES.some((s) => s.category === "en_curator")).toBe(true);
  });

  describe("scoreBuzz v2 (バズ速度主軸 + 緩め足切り)", () => {
    function load(): typeof import("./buzz-ingest.ts") {
      let m: typeof import("./buzz-ingest.ts");
      jest.isolateModules(() => {
        jest.doMock("@supabase/supabase-js", () => ({
          __esModule: true,
          createClient: jest.fn(() => ({ from: jest.fn() })),
        }));
        m = require("./buzz-ingest.ts");
      });
      return m!;
    }

    const NOW = Date.parse("2026-06-05T12:00:00Z");
    const iso = (hoursAgo: number) => new Date(NOW - hoursAgo * 3_600_000).toISOString();

    test("velocity 主軸: 同エンゲージでも新しい方が高スコア (伸び始めを拾う)", () => {
      const b = load();
      const fresh = { id: "f", text: "x", createdAt: iso(2), likeCount: 100, retweetCount: 0 } as never;
      const old = { id: "o", text: "x", createdAt: iso(40), likeCount: 100, retweetCount: 0 } as never;
      const src = { handle: "Shimayus", category: "jp_publisher" as const };
      const sFresh = b.scoreBuzz(fresh, src, NOW);
      const sOld = b.scoreBuzz(old, src, NOW);
      expect(sFresh.score).toBeGreaterThan(sOld.score);
      expect(sFresh.reasons.some((r) => r.startsWith("velocity:"))).toBe(true);
    });

    test("ai_official 加点 + 非ja で novel_overseas 加点", () => {
      const b = load();
      const tw = { id: "t", text: "x", createdAt: iso(3), likeCount: 50, retweetCount: 10, lang: "en" } as never;
      const official = b.scoreBuzz(tw, { handle: "OpenAI", category: "ai_official" }, NOW);
      const jp = b.scoreBuzz({ ...tw, lang: "ja" }, { handle: "Shimayus", category: "jp_publisher" }, NOW);
      expect(official.score).toBeGreaterThan(jp.score);
      expect(official.reasons).toContain("ai_official");
      expect(official.reasons).toContain("novel_overseas");
    });

    test("1週間以上前×無反応は score≈-3 で足切り対象 (CURATION_MIN_SCORE=-2)", () => {
      const b = load();
      const stale = { id: "s", text: "x", createdAt: iso(200), likeCount: 0, retweetCount: 0 } as never;
      const s = b.scoreBuzz(stale, { handle: "Shimayus", category: "jp_publisher" }, NOW);
      expect(s.reasons).toContain("stale_1wk");
      expect(s.score).toBeLessThan(b.CURATION_MIN_SCORE);
      expect(b.CURATION_MIN_SCORE).toBe(-2);
    });

    test("新しく無反応でも足切りされない (取りこぼさない)", () => {
      const b = load();
      const quiet = { id: "q", text: "x", createdAt: iso(3), likeCount: 0, retweetCount: 0 } as never;
      const s = b.scoreBuzz(quiet, { handle: "Shimayus", category: "jp_publisher" }, NOW);
      expect(s.score).toBeGreaterThanOrEqual(b.CURATION_MIN_SCORE);
    });

    test("createdAt 不正は絶対エンゲージにフォールバック (古い扱いにしない)", () => {
      const b = load();
      const tw = { id: "n", text: "x", createdAt: "", likeCount: 99, retweetCount: 0 } as never;
      const s = b.scoreBuzz(tw, { handle: "Shimayus", category: "jp_publisher" }, NOW);
      expect(s.reasons).toContain("engagement:99");
      expect(s.score).toBeCloseTo(2, 5);
    });
  });
});

// ---------------------------------------------------------------------------
// fetchUserTweets (unit)
// ---------------------------------------------------------------------------

describe("fetchUserTweets", () => {
  test("calls correct endpoint with x-api-key header and returns tweets", async () => {
    const mockTweet = makeTweet("t-001", "testuser");
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tweets: [mockTweet] }),
    });

    let twitterClient: typeof import("./twitterapi-client.ts");
    jest.isolateModules(() => {
      twitterClient = require("./twitterapi-client.ts");
    });

    const tweets = await twitterClient!.fetchUserTweets(
      "testuser",
      "test-api-key",
      10,
      mockFetch as unknown as typeof fetch,
    );

    expect(tweets).toHaveLength(1);
    expect(tweets[0].id).toBe("t-001");
    expect(tweets[0].text).toContain("testuser");

    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("twitterapi.io");
    expect(url).toContain("advanced_search");
    expect(url).toContain("from%3Atestuser"); // encoded "from:testuser"
    expect((opts.headers as Record<string, string>)["x-api-key"]).toBe("test-api-key");
  });

  test("falls back to json.data if json.tweets is absent", async () => {
    const mockTweet = makeTweet("t-legacy", "legacyuser");
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [mockTweet] }), // legacy shape
    });

    let twitterClient: typeof import("./twitterapi-client.ts");
    jest.isolateModules(() => {
      twitterClient = require("./twitterapi-client.ts");
    });

    const tweets = await twitterClient!.fetchUserTweets(
      "legacyuser",
      "test-api-key",
      10,
      mockFetch as unknown as typeof fetch,
    );

    expect(tweets).toHaveLength(1);
    expect(tweets[0].id).toBe("t-legacy");
  });

  test("throws on non-ok HTTP response", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    });

    let twitterClient: typeof import("./twitterapi-client.ts");
    jest.isolateModules(() => {
      twitterClient = require("./twitterapi-client.ts");
    });

    await expect(
      twitterClient!.fetchUserTweets("anyuser", "key", 10, mockFetch as unknown as typeof fetch),
    ).rejects.toThrow(/429/);
  });

  test("respects maxResults limit", async () => {
    const tweets = Array.from({ length: 30 }, (_, i) => makeTweet(`t-${i}`, "biguser"));
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tweets }),
    });

    let twitterClient: typeof import("./twitterapi-client.ts");
    jest.isolateModules(() => {
      twitterClient = require("./twitterapi-client.ts");
    });

    const result = await twitterClient!.fetchUserTweets(
      "biguser",
      "key",
      5,
      mockFetch as unknown as typeof fetch,
    );

    expect(result).toHaveLength(5);
  });
});
