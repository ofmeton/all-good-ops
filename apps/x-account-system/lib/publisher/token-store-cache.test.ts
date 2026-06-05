/**
 * token-store-cache.test.ts — W5 FIX 4
 *
 * getSupabase() must only CACHE a successfully-created client. A first call that
 * races ahead of bridgeEnv (SUPABASE_* not yet set) previously pinned null forever
 * → silent fallback to the stale env token. This verifies createClient is retried
 * once the env vars become available.
 *
 * Pattern: jest.isolateModules + jest.doMock (mock @supabase/supabase-js).
 */

let _savedFallback: string | undefined;

beforeEach(() => {
  _savedFallback = process.env.IN_MEMORY_FALLBACK;
  delete process.env.IN_MEMORY_FALLBACK;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.X_ACCESS_TOKEN;
  jest.resetModules();
});

afterEach(() => {
  if (_savedFallback !== undefined) process.env.IN_MEMORY_FALLBACK = _savedFallback;
  else delete process.env.IN_MEMORY_FALLBACK;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.X_ACCESS_TOKEN;
});

test("does NOT cache null: createClient is retried after SUPABASE env becomes available", async () => {
  // maybeSingle resolves a stored token row so we can observe the DB path was used
  const maybeSingleMock = jest.fn().mockResolvedValue({
    data: {
      access_token: "db-token",
      refresh_token: "db-refresh",
      expires_at: null,
      scope: null,
    },
    error: null,
  });
  const eqMock = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
  const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
  const fromMock = jest.fn().mockReturnValue({ select: selectMock });
  const client = { from: fromMock };
  const createClientMock = jest.fn(() => client);

  let store: typeof import("./token-store.ts");
  jest.isolateModules(() => {
    jest.doMock("@supabase/supabase-js", () => ({
      __esModule: true,
      createClient: createClientMock,
    }));
    store = require("./token-store.ts");
  });

  // --- 1st call: SUPABASE env NOT set yet (race with bridgeEnv) → null path → env fallback ---
  process.env.X_ACCESS_TOKEN = "stale-env-token";
  const first = await store!.getXAccessToken();
  expect(createClientMock).not.toHaveBeenCalled();
  expect(first?.accessToken).toBe("stale-env-token");

  // --- 2nd call: env now populated → must build the client (null was NOT cached) ---
  process.env.SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-srk";
  const second = await store!.getXAccessToken();
  expect(createClientMock).toHaveBeenCalledTimes(1);
  expect(second?.accessToken).toBe("db-token");

  // --- 3rd call: reuse the cached (successful) client — no re-create ---
  await store!.getXAccessToken();
  expect(createClientMock).toHaveBeenCalledTimes(1);
});
