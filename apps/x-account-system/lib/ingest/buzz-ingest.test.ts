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
        meta: { tweet_id: "tweet-001" },
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
        meta: { tweet_id: "tweet-002" },
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
        meta: { tweet_id: "tweet-from-second" },
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

  test("SEED_HANDLES contains all 24 expected handles", async () => {
    let buzzIngest: typeof import("./buzz-ingest.ts");
    jest.isolateModules(() => {
      jest.doMock("@supabase/supabase-js", () => ({
        __esModule: true,
        createClient: jest.fn(() => ({ from: jest.fn() })),
      }));
      buzzIngest = require("./buzz-ingest.ts");
    });

    expect(buzzIngest!.SEED_HANDLES).toHaveLength(24);
    expect(buzzIngest!.SEED_HANDLES).toContain("Shimayus");
    expect(buzzIngest!.SEED_HANDLES).toContain("SuguruKun_ai");
    expect(buzzIngest!.SEED_HANDLES).toContain("masahirochaen");
    expect(buzzIngest!.SEED_HANDLES).toContain("ClaudeCode_love");
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
