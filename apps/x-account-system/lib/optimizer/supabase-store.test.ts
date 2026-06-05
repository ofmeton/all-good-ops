/**
 * Optimizer Supabase backend tests
 *
 * Mocks @supabase/supabase-js createClient — does NOT set IN_MEMORY_FALLBACK.
 * Each test explicitly clears IN_MEMORY_FALLBACK during execution so that
 * isInMemoryFallback() returns false even when the outer command sets it.
 *
 * Uses jest.isolateModules() so each test gets a fresh module instance
 * with its own Supabase client singleton.
 */

// ── helpers ────────────────────────────────────────────────────────────────────

/**
 * Chainable Supabase query builder stub.
 * The chain is a thenable (awaitable) so `await sb.from(...).select(...).gte(...)` resolves.
 */
function makeChain(terminalResult: { data: unknown; error: null | object }) {
  const chain: Record<string, jest.Mock> & { then?: Function; catch?: Function } = {};

  chain["then"] = jest.fn((resolve: (v: typeof terminalResult) => unknown) =>
    Promise.resolve(terminalResult).then(resolve)
  );
  chain["catch"] = jest.fn((reject: (e: unknown) => unknown) =>
    Promise.resolve(terminalResult).catch(reject)
  );

  const returnsChain = (name: string) => {
    chain[name] = jest.fn().mockReturnValue(chain);
    return chain;
  };
  ["from", "select", "eq", "order", "limit", "gte", "lt"].forEach(returnsChain);

  ["upsert", "insert", "maybeSingle", "single"].forEach((name) => {
    chain[name] = jest.fn().mockResolvedValue(terminalResult);
  });

  return chain;
}

/**
 * Load fresh module instances with mocked Supabase.
 * IN_MEMORY_FALLBACK must be UNSET when calling this function and during the test.
 * Caller is responsible for env management (see beforeEach/afterEach below).
 */
function loadModules(terminalResult: { data: unknown; error: null | object }) {
  let chain = makeChain(terminalResult);
  const mockFrom = jest.fn().mockReturnValue(chain);

  let stateStore: typeof import("./state-store.ts");
  let rewardExtractor: typeof import("./reward-extractor.ts");

  jest.isolateModules(() => {
    jest.doMock("@supabase/supabase-js", () => ({
      __esModule: true,
      createClient: jest.fn(() => ({ from: mockFrom })),
    }));
    stateStore = require("./state-store.ts");
    rewardExtractor = require("./reward-extractor.ts");
  });

  return {
    stateStore: stateStore!,
    rewardExtractor: rewardExtractor!,
    chain,
    mockFrom,
    resetChain(newResult: { data: unknown; error: null | object }) {
      chain = makeChain(newResult);
      mockFrom.mockReturnValue(chain);
      return chain;
    },
  };
}

// ── global env setup ──────────────────────────────────────────────────────────

let _savedFallback: string | undefined;

beforeEach(() => {
  // Save and clear IN_MEMORY_FALLBACK so all tests run on the Supabase path
  _savedFallback = process.env.IN_MEMORY_FALLBACK;
  delete process.env.IN_MEMORY_FALLBACK;
  process.env.SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  process.env.SUPABASE_SCHEMA = "xad";
  jest.resetModules();
});

afterEach(() => {
  // Restore original env
  if (_savedFallback !== undefined) {
    process.env.IN_MEMORY_FALLBACK = _savedFallback;
  } else {
    delete process.env.IN_MEMORY_FALLBACK;
  }
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SCHEMA;
});

// ── loadOptimizerState ────────────────────────────────────────────────────────

describe("loadOptimizerState (Supabase path)", () => {
  test("returns parsed state from optimizer_state where scope=global", async () => {
    const { stateStore, chain, mockFrom } = loadModules({
      data: { state: { generation: 3, styleGuideVersion: "v1.3" }, generation: 3 },
      error: null,
    });

    const result = await stateStore.loadOptimizerState();

    expect(mockFrom).toHaveBeenCalledWith("optimizer_state");
    expect(chain.select).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("scope", "global");
    expect(result).toHaveProperty("generation", 3);
    expect(result).toHaveProperty("styleGuideVersion", "v1.3");
  });

  test("returns initial state when no row exists (null data)", async () => {
    const { stateStore } = loadModules({ data: null, error: null });

    const result = await stateStore.loadOptimizerState();

    expect(result).toHaveProperty("generation");
    expect(result).toHaveProperty("hookDistribution");
  });

  test("returns initial state when error from Supabase", async () => {
    const { stateStore } = loadModules({ data: null, error: { message: "row not found" } });

    const result = await stateStore.loadOptimizerState();

    expect(result).toHaveProperty("postingTime");
  });
});

// ── saveOptimizerState ────────────────────────────────────────────────────────

describe("saveOptimizerState (Supabase path)", () => {
  test("upserts to optimizer_state with scope=global and incremented generation", async () => {
    const { stateStore, chain, mockFrom } = loadModules({ data: null, error: null });

    const state = stateStore.buildInitialState(new Date("2026-06-01"));
    await stateStore.saveOptimizerState(state);

    expect(mockFrom).toHaveBeenCalledWith("optimizer_state");
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "global",
        state: expect.anything(),
        generation: (state.generation ?? 0) + 1,
      }),
      expect.objectContaining({ onConflict: "scope" }),
    );
  });
});

// ── snapshotState ─────────────────────────────────────────────────────────────

describe("snapshotState (Supabase path)", () => {
  test("inserts a row into optimizer_snapshot with snapshot_id and state", async () => {
    const initial = { generation: 0, styleGuideVersion: "v1.3" };
    const { stateStore, chain, mockFrom } = loadModules({
      data: { state: initial, generation: 0 },
      error: null,
    });

    const { snapshotId } = await stateStore.snapshotState(new Date("2026-06-01T12:00:00Z"));

    expect(snapshotId).toMatch(/^snap_/);
    expect(mockFrom).toHaveBeenCalledWith("optimizer_snapshot");
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshot_id: snapshotId,
        state: expect.anything(),
      }),
    );
  });
});

// ── rollbackToSnapshot ────────────────────────────────────────────────────────

describe("rollbackToSnapshot (Supabase path)", () => {
  test("selects from optimizer_snapshot where snapshot_id matches and saves back", async () => {
    const snapState = { generation: 2, styleGuideVersion: "v1.3", hookDistribution: {} };
    const { stateStore, chain, mockFrom } = loadModules({
      data: { state: snapState },
      error: null,
    });

    const result = await stateStore.rollbackToSnapshot("snap_20260601_abc123");

    expect(mockFrom).toHaveBeenCalledWith("optimizer_snapshot");
    expect(chain.eq).toHaveBeenCalledWith("snapshot_id", "snap_20260601_abc123");
    expect(result).toHaveProperty("generation", 2);
  });

  test("throws if snapshot not found (null data)", async () => {
    const { stateStore } = loadModules({ data: null, error: null });

    await expect(stateStore.rollbackToSnapshot("snap_nonexistent")).rejects.toThrow(
      /not found|snapshot/i,
    );
  });
});

// ── extractSuccessSignals ─────────────────────────────────────────────────────

describe("extractSuccessSignals (Supabase path)", () => {
  const mockRows = [
    {
      id: "pr-1",
      draft_id: "d-1",
      posted_at: "2026-05-20T10:00:00Z",
      post_drafts: {
        primary_hook: "tips_enum",
        devices: ["number"],
        fmat: "short",
        slot: "morning",
      },
      performance_metrics: [
        { impressions: 1000, pcr: 0.08, url_link_clicks: 10 },
      ],
    },
    {
      id: "pr-2",
      draft_id: "d-2",
      posted_at: "2026-05-21T14:00:00Z",
      post_drafts: {
        primary_hook: "critique",
        devices: [],
        fmat: "medium",
        slot: "afternoon",
      },
      performance_metrics: [
        { impressions: 500, pcr: 0.02, url_link_clicks: 1 },
      ],
    },
  ];

  test("queries posted_records and performance_metrics and returns SuccessSignal[]", async () => {
    const { rewardExtractor, mockFrom } = loadModules({ data: mockRows, error: null });

    const signals = await rewardExtractor.extractSuccessSignals(30);

    expect(signals).toHaveLength(2);
    expect(signals[0]).toHaveProperty("draftId");
    expect(signals[0]).toHaveProperty("success");
    expect(signals[0]).toHaveProperty("attribution");
    expect(signals[0].attribution).toHaveProperty("hook");
    expect(signals[0].attribution).toHaveProperty("timeBand");
    expect(mockFrom).toHaveBeenCalledWith("posted_records");
    const winner = signals.find((s: { pcr: number }) => s.pcr === 0.08);
    expect(winner?.success).toBe(true);
  });

  test("returns empty array when no data", async () => {
    const { rewardExtractor } = loadModules({ data: [], error: null });

    const signals = await rewardExtractor.extractSuccessSignals(30);
    expect(signals).toHaveLength(0);
  });

  test("returns empty array on Supabase error", async () => {
    const { rewardExtractor } = loadModules({ data: null, error: { message: "query error" } });

    const signals = await rewardExtractor.extractSuccessSignals(30);
    expect(signals).toHaveLength(0);
  });
});

// ── aggregatePerformanceWindow ────────────────────────────────────────────────

describe("aggregatePerformanceWindow (Supabase path)", () => {
  test("returns avg pcr and impression for current and prev windows", async () => {
    const mockCurrentRows = [
      { performance_metrics: [{ impressions: 2000, pcr: 0.06, url_link_clicks: 5 }] },
    ];
    const mockPrevRows = [
      { performance_metrics: [{ impressions: 1000, pcr: 0.03, url_link_clicks: 2 }] },
    ];

    const chain1 = makeChain({ data: mockCurrentRows, error: null });
    const chain2 = makeChain({ data: mockPrevRows, error: null });
    const mockFromSeq = jest.fn().mockReturnValueOnce(chain1).mockReturnValueOnce(chain2);

    let rewardExtractor: typeof import("./reward-extractor.ts");
    jest.isolateModules(() => {
      jest.doMock("@supabase/supabase-js", () => ({
        __esModule: true,
        createClient: jest.fn(() => ({ from: mockFromSeq })),
      }));
      rewardExtractor = require("./reward-extractor.ts");
    });

    const result = await rewardExtractor!.aggregatePerformanceWindow(7, 7, new Date("2026-06-01"));

    expect(result).toHaveProperty("currentAvgPcr");
    expect(result).toHaveProperty("prevAvgPcr");
    expect(result).toHaveProperty("currentAvgImpression");
    expect(result).toHaveProperty("prevAvgImpression");
    expect(result.currentAvgPcr).toBeGreaterThan(0);
  });
});

// ── toHookKey mapping ─────────────────────────────────────────────────────────

describe("toHookKey mapping logic", () => {
  const cases: Array<{
    primary_hook: string | null;
    devices: string[];
    expected: string;
  }> = [
    { primary_hook: "tips_enum", devices: ["number"], expected: "number_lead" },
    { primary_hook: "tips_enum", devices: [], expected: "other" },
    { primary_hook: "critique", devices: [], expected: "negation_lead" },
    { primary_hook: "business_repro", devices: [], expected: "promise_lead" },
    { primary_hook: "failure_story", devices: [], expected: "failure_story_verified_cap_per_month" },
    { primary_hook: null, devices: [], expected: "other" },
  ];

  for (const { primary_hook, devices, expected } of cases) {
    test(`primary_hook=${primary_hook ?? "null"} devices=[${devices}] → ${expected}`, async () => {
      const mockRowsForHook = [
        {
          id: "pr-test",
          draft_id: "d-test",
          posted_at: "2026-05-20T10:00:00Z",
          post_drafts: { primary_hook, devices, fmat: "short", slot: "morning" },
          performance_metrics: [{ impressions: 100, pcr: 0.05, url_link_clicks: 2 }],
        },
      ];
      const { rewardExtractor } = loadModules({ data: mockRowsForHook, error: null });

      const signals = await rewardExtractor.extractSuccessSignals(30);
      expect(signals[0]?.attribution.hook).toBe(expected);
    });
  }
});
