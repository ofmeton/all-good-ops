/**
 * lib/ingest/inspirations-ingest.test.ts
 *
 * Tests runInspirationsIngest: mocks fetch (twitterapi.io) + Supabase.
 * Does NOT set IN_MEMORY_FALLBACK. Tests the real DB path with mocked @supabase/supabase-js.
 *
 * Pattern: jest.isolateModules + jest.doMock (same pattern as buzz-ingest.test.ts).
 *
 * Seed set:
 *   - X seeds (overseas ≥1, domestic ≥1): uses twitterapi.io, source_type='x_inspirations'
 *   - Note seeds (≥1): reference-only (no fabricated content), source_type='note_inspirations'
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

describe("runInspirationsIngest", () => {
  test("treats unique-violation (23505) on insert as a benign skip (not fatal)", async () => {
    // Existence check passes (no row) but the INSERT loses the dedup race and
    // returns a unique-violation. The whole weekly run must NOT throw.
    const insertMock = jest
      .fn()
      .mockResolvedValue({ error: { code: "23505", message: "duplicate key value violates unique constraint" } });
    const limitMock = jest.fn().mockResolvedValue({ data: [], error: null });
    const filterMock = jest.fn().mockReturnValue({ limit: limitMock });
    const eqMock = jest.fn().mockReturnValue({ filter: filterMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    const fromMock = jest.fn().mockImplementation(() => ({ select: selectMock, insert: insertMock }));
    const client = { from: fromMock };

    const tweet1 = makeTweet("race-tweet", "jason_coder0");
    let xCallCount = 0;
    const mockFetch = jest.fn().mockImplementation(() => {
      xCallCount++;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ tweets: xCallCount === 1 ? [tweet1] : [] }),
      });
    });

    let ingest: typeof import("./inspirations-ingest.ts");
    jest.isolateModules(() => {
      jest.doMock("@supabase/supabase-js", () => ({
        __esModule: true,
        createClient: jest.fn(() => client),
      }));
      ingest = require("./inspirations-ingest.ts");
    });

    const env = makeEnv();
    // note seeds also hit the same 23505 insert mock → all benign skip
    const inserted = await ingest!.runInspirationsIngest(env, mockFetch as unknown as typeof fetch);
    expect(inserted).toBe(0);
    expect(insertMock).toHaveBeenCalled();
  });

  test("inserts x_inspirations tweets from X seed handles", async () => {
    const { client, fromMock, insertMock } = makeSupabaseMock();

    const tweet1 = makeTweet("tweet-overseas-001", "jason_coder0");
    const tweet2 = makeTweet("tweet-domestic-001", "Shimayus");

    // Mock fetch: return 1 tweet for first 2 handles, empty for rest (including no-call for note seeds)
    let xCallCount = 0;
    const mockFetch = jest.fn().mockImplementation(() => {
      xCallCount++;
      const tweet = xCallCount === 1 ? tweet1 : xCallCount === 2 ? tweet2 : null;
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            tweets: tweet ? [tweet] : [],
          }),
      });
    });

    let ingest: typeof import("./inspirations-ingest.ts");
    jest.isolateModules(() => {
      jest.doMock("@supabase/supabase-js", () => ({
        __esModule: true,
        createClient: jest.fn(() => client),
      }));
      ingest = require("./inspirations-ingest.ts");
    });

    const env = makeEnv();
    const inserted = await ingest!.runInspirationsIngest(env, mockFetch as unknown as typeof fetch);

    // Should have inserted X tweets + note seed rows
    // Note seeds are stored without fetch, so inserted = xTweets + noteSeeds
    expect(inserted).toBeGreaterThanOrEqual(2); // at least 2 from X handles

    // Verify x_inspirations insert shape
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source_type: "x_inspirations",
        permitted_storage: "title_only",
        publication_consent: "pending",
        meta: expect.objectContaining({ tweet_id: expect.any(String) }),
      }),
    );
  });

  test("inserts note_inspirations rows for note seeds without fabricating content", async () => {
    const { client, fromMock, insertMock } = makeSupabaseMock();

    // Fetch returns empty for all X handles → only note seeds should be inserted
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tweets: [] }),
    });

    let ingest: typeof import("./inspirations-ingest.ts");
    jest.isolateModules(() => {
      jest.doMock("@supabase/supabase-js", () => ({
        __esModule: true,
        createClient: jest.fn(() => client),
      }));
      ingest = require("./inspirations-ingest.ts");
    });

    const env = makeEnv();
    const inserted = await ingest!.runInspirationsIngest(env, mockFetch as unknown as typeof fetch);

    // Should insert at least the note seeds
    const noteInserts = insertMock.mock.calls.filter(
      ([row]: [any]) => row.source_type === "note_inspirations",
    );
    expect(noteInserts.length).toBeGreaterThanOrEqual(1);

    // Each note insert must NOT have fabricated tweet content
    for (const [row] of noteInserts) {
      expect(row.source_type).toBe("note_inspirations");
      expect(row.permitted_storage).toBe("title_only");
      expect(row.publication_consent).toBe("pending");
      // raw_text must be empty or just the URL/reference — no fabricated tweet text
      expect(row.raw_text).toBeFalsy();
      // meta must have a stable dedup key (url or handle+week)
      expect(row.meta).toHaveProperty("dedup_key");
      expect(row.meta).toHaveProperty("note_type", "reference_only");
    }

    // Total inserted must be >= note seed count
    expect(inserted).toBeGreaterThanOrEqual(noteInserts.length);
  });

  test("deduplicates X tweets by tweet_id", async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    // Dedup: all queries return existing row → already stored
    const limitMock = jest.fn().mockResolvedValue({ data: [{ id: "existing-uuid" }], error: null });
    const filterMock = jest.fn().mockReturnValue({ limit: limitMock });
    const eqMock = jest.fn().mockReturnValue({ filter: filterMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    const fromMock = jest.fn().mockImplementation(() => ({
      select: selectMock,
      insert: insertMock,
    }));
    const client = { from: fromMock };

    const tweet = makeTweet("dup-tweet-id", "Shimayus");
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tweets: [tweet] }),
    });

    let ingest: typeof import("./inspirations-ingest.ts");
    jest.isolateModules(() => {
      jest.doMock("@supabase/supabase-js", () => ({
        __esModule: true,
        createClient: jest.fn(() => client),
      }));
      ingest = require("./inspirations-ingest.ts");
    });

    const env = makeEnv();
    await ingest!.runInspirationsIngest(env, mockFetch as unknown as typeof fetch);

    // X tweet inserts should NOT happen (all dup)
    const xInserts = insertMock.mock.calls.filter(
      ([row]: [any]) => row.source_type === "x_inspirations",
    );
    expect(xInserts).toHaveLength(0);
  });

  test("deduplicates note seeds by dedup_key", async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    // Dedup: all returns existing row
    const limitMock = jest.fn().mockResolvedValue({ data: [{ id: "existing-note-uuid" }], error: null });
    const filterMock = jest.fn().mockReturnValue({ limit: limitMock });
    const eqMock = jest.fn().mockReturnValue({ filter: filterMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    const fromMock = jest.fn().mockImplementation(() => ({
      select: selectMock,
      insert: insertMock,
    }));
    const client = { from: fromMock };

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tweets: [] }),
    });

    let ingest: typeof import("./inspirations-ingest.ts");
    jest.isolateModules(() => {
      jest.doMock("@supabase/supabase-js", () => ({
        __esModule: true,
        createClient: jest.fn(() => client),
      }));
      ingest = require("./inspirations-ingest.ts");
    });

    const env = makeEnv();
    const inserted = await ingest!.runInspirationsIngest(env, mockFetch as unknown as typeof fetch);

    // Note seeds should be skipped (already exist)
    const noteInserts = insertMock.mock.calls.filter(
      ([row]: [any]) => row.source_type === "note_inspirations",
    );
    expect(noteInserts).toHaveLength(0);
    expect(inserted).toBe(0);
  });

  test("continues past per-source failures", async () => {
    const { client, insertMock } = makeSupabaseMock();

    const tweetOk = makeTweet("tweet-ok-001", "SuguruKun_ai");
    let callCount = 0;
    const mockFetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error("network error"));
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            tweets: callCount === 2 ? [tweetOk] : [],
          }),
      });
    });

    let ingest: typeof import("./inspirations-ingest.ts");
    jest.isolateModules(() => {
      jest.doMock("@supabase/supabase-js", () => ({
        __esModule: true,
        createClient: jest.fn(() => client),
      }));
      ingest = require("./inspirations-ingest.ts");
    });

    const env = makeEnv();
    // Should not throw even with first handle failing
    const inserted = await ingest!.runInspirationsIngest(env, mockFetch as unknown as typeof fetch);
    // At minimum, note seeds + the successful X tweet should be inserted
    expect(inserted).toBeGreaterThanOrEqual(1);
  });

  test("seed set has correct overseas/domestic/note counts", async () => {
    let ingest: typeof import("./inspirations-ingest.ts");
    jest.isolateModules(() => {
      jest.doMock("@supabase/supabase-js", () => ({
        __esModule: true,
        createClient: jest.fn(() => ({ from: jest.fn() })),
      }));
      ingest = require("./inspirations-ingest.ts");
    });

    // Total X seeds = all 24 from reference-accounts
    expect(ingest!.X_SEED_HANDLES).toHaveLength(24);

    // Overseas X seeds ≥ 1
    expect(ingest!.OVERSEAS_HANDLES.length).toBeGreaterThanOrEqual(1);

    // Domestic X seeds ≥ 1
    expect(ingest!.DOMESTIC_HANDLES.length).toBeGreaterThanOrEqual(1);

    // Note seeds ≥ 1
    expect(ingest!.NOTE_SEEDS.length).toBeGreaterThanOrEqual(1);

    // All X seeds are covered (overseas + domestic = total X)
    expect(
      ingest!.OVERSEAS_HANDLES.length + ingest!.DOMESTIC_HANDLES.length,
    ).toBe(ingest!.X_SEED_HANDLES.length);

    // Overseas includes known overseas accounts
    expect(ingest!.OVERSEAS_HANDLES).toContain("jason_coder0");
    expect(ingest!.OVERSEAS_HANDLES).toContain("heynavtoor");
    expect(ingest!.OVERSEAS_HANDLES).toContain("ethancoder0");

    // Domestic includes known domestic accounts
    expect(ingest!.DOMESTIC_HANDLES).toContain("Shimayus");
    expect(ingest!.DOMESTIC_HANDLES).toContain("SuguruKun_ai");
    expect(ingest!.DOMESTIC_HANDLES).toContain("masahirochaen");
  });
});
