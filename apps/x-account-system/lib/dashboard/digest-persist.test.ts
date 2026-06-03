/**
 * digest-persist.test.ts
 *
 * Tests for:
 *  1. runDailyDigest → daily_digest_log insert (production path, no IN_MEMORY_FALLBACK)
 *  2. getMonthlyCostJpy → cost_ledger SUM(cost_jpy) for current month
 *
 * NOTE: IN_MEMORY_FALLBACK must NOT be set here (we test the production path).
 * supabase client is mocked via jest.mock.
 */

// ---- 1. mock supabase before any import ----
const mockInsert = jest.fn().mockResolvedValue({ error: null });

// cost_ledger mock chain: .select().gte().lt()
const mockLt = jest.fn().mockResolvedValue({ data: [], error: null });
const mockGte = jest.fn(() => ({ lt: mockLt }));
const mockSelect = jest.fn(() => ({ gte: mockGte }));

// performance_metrics mock chain: .select().gte().lt()
const mockPerfLt = jest.fn().mockResolvedValue({ data: [], error: null });
const mockPerfGte = jest.fn(() => ({ lt: mockPerfLt }));
const mockPerfSelect = jest.fn(() => ({ gte: mockPerfGte }));

// safety_state mock chain: .select().eq().maybeSingle()
const mockMaybeSingle = jest.fn().mockResolvedValue({ data: { publishing_enabled: true }, error: null });
const mockEq = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSafetySelect = jest.fn(() => ({ eq: mockEq }));

// cost_ledger (cost-report) mock chain: .select().eq('month') → resolves rows
const mockLedgerEq = jest.fn().mockResolvedValue({ data: [], error: null });
const mockLedgerSelect = jest.fn(() => ({ eq: mockLedgerEq }));

// posted_records (cost-report) mock chain: .select(...,{count,head}).eq().gte().lt()
const mockPostedLt = jest.fn().mockResolvedValue({ count: 0, error: null });
const mockPostedGte = jest.fn(() => ({ lt: mockPostedLt }));
const mockPostedEq = jest.fn(() => ({ gte: mockPostedGte }));
const mockPostedSelect = jest.fn(() => ({ eq: mockPostedEq }));

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    from: (table: string) => {
      if (table === "daily_digest_log") return { insert: mockInsert };
      // cost_ledger is used by both getMonthlyCostJpy (.select().gte().lt())
      // and cost-report (.select().eq('month')). Return a chain that supports both.
      if (table === "cost_ledger") {
        return {
          select: (cols: string) =>
            cols.includes("category") ? mockLedgerSelect(cols) : mockSelect(cols),
        };
      }
      if (table === "performance_metrics") return { select: mockPerfSelect };
      if (table === "posted_records") return { select: mockPostedSelect };
      // safety_state (getKillSwitchState in makeProductionDeps)
      return { select: mockSafetySelect };
    },
  })),
}));

// ---- 1b. mock global fetch for cost-report (LINE quota / Anthropic) ----
const mockFetch = jest.fn();
beforeAll(() => {
  (globalThis as unknown as { fetch: jest.Mock }).fetch = mockFetch;
});

// ---- 2. mock line-client so we don't need LINE tokens ----
jest.mock("../line/line-client.ts", () => ({
  pushLine: jest.fn().mockResolvedValue(undefined),
}));

// ---- 3. set env so supabase client is created ----
beforeAll(() => {
  // Ensure IN_MEMORY_FALLBACK is NOT set
  delete process.env.IN_MEMORY_FALLBACK;
  process.env.SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  // Use real LINE token so sendToLine doesn't fall back to dry_run
  process.env.LINE_CHANNEL_ACCESS_TOKEN = "test-line-token";
  process.env.ANTHROPIC_ADMIN_KEY = "test-admin-key";
  delete process.env.LINE_DRY_RUN;
  process.env.BUDGET_BROWNOUT_THRESHOLD_JPY = "11500";
  process.env.BUDGET_MONTHLY_LIMIT_JPY = "10000";
});

afterAll(() => {
  // Restore so other test suites aren't affected
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
  delete process.env.ANTHROPIC_ADMIN_KEY;
});

// ---- 4. imports AFTER mocks ----
import { runDailyDigest } from "./digest.ts";
import { makeProductionDeps } from "./kpi-collector.ts";

// ============================================================
// Test 1: digest persistence
// ============================================================
describe("runDailyDigest → daily_digest_log insert", () => {
  beforeEach(() => {
    mockInsert.mockClear();
    mockInsert.mockResolvedValue({ error: null });
    // default cost-report fetch behaviour: LINE quota + Anthropic cost_report
    mockFetch.mockReset();
    mockFetch.mockImplementation(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith("/quota/consumption")) {
        return { ok: true, json: async () => ({ totalUsage: 12 }) };
      }
      if (url.endsWith("/message/quota")) {
        return { ok: true, json: async () => ({ type: "limited", value: 200 }) };
      }
      if (url.includes("cost_report")) {
        return {
          ok: true,
          json: async () => ({
            data: [{ results: [{ amount: "123.45", currency: "USD" }] }],
            has_more: false,
          }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });
    mockLedgerEq.mockResolvedValue({
      data: [{ category: "twitterapi", cost_jpy: 80, cost_usd: 0.5 }],
      error: null,
    });
    mockPostedLt.mockResolvedValue({ count: 7, error: null });
  });

  test("inserts a row into daily_digest_log after LINE send succeeds", async () => {
    const { pushLine } = require("../line/line-client.ts");
    (pushLine as jest.Mock).mockResolvedValue(undefined);

    const { sendResult } = await runDailyDigest({
      now: new Date("2026-06-03T12:00:00Z"),
      to: "U_testuser",
    });

    expect(sendResult.status).toBe("sent");
    expect(mockInsert).toHaveBeenCalledTimes(1);

    const insertArg = mockInsert.mock.calls[0][0];
    // Check real daily_digest_log columns
    expect(insertArg).toMatchObject({
      digest_type: "daily",
      recipient: "U_testuser",
    });
    expect(insertArg).toHaveProperty("sent_at");
    expect(insertArg).toHaveProperty("body");
    expect(typeof insertArg.body).toBe("string");
    expect(insertArg.body.length).toBeGreaterThan(0);
    expect(insertArg).toHaveProperty("alerts");
    expect(Array.isArray(insertArg.alerts)).toBe(true);

    // cost-report section appended to digest body (REAL numbers)
    expect(insertArg.body).toContain("◆ コスト実数 (今月)");
    expect(insertArg.body).toContain("Claude 実コスト: $1.23"); // 123.45 cents → $1.23
    expect(insertArg.body).toContain("LINE 送信: 12 通 / 無料枠 200 通");
    expect(insertArg.body).toContain("X 投稿: 7 件");
    expect(insertArg.body).toContain("twitterapi.io: ¥80");
    expect(insertArg.body).toContain("残クレジット/残高は各社 API 非提供");
  });

  test("does NOT insert when LINE send returns dry_run (IN_MEMORY_FALLBACK path)", async () => {
    // Temporarily enable dry-run
    process.env.LINE_DRY_RUN = "true";
    mockInsert.mockClear();

    await runDailyDigest({
      now: new Date("2026-06-03T12:00:00Z"),
      to: "U_testuser",
    });

    expect(mockInsert).not.toHaveBeenCalled();
    delete process.env.LINE_DRY_RUN;
  });
});

// ============================================================
// Test 2: getMonthlyCostJpy → cost_ledger SUM
// ============================================================
describe("getMonthlyCostJpy → cost_ledger sum", () => {
  beforeEach(() => {
    mockSelect.mockClear();
    mockGte.mockClear();
    mockLt.mockClear();
  });

  test("sums cost_jpy from cost_ledger rows for current month", async () => {
    // cost_ledger rows for the month
    const rows = [
      { cost_jpy: 300 },
      { cost_jpy: 450.5 },
      { cost_jpy: 200 },
    ];
    mockLt.mockResolvedValue({ data: rows, error: null });

    const deps = makeProductionDeps();
    const result = await deps.getMonthlyCostJpy!();

    expect(result).toBeCloseTo(950.5, 4);
    expect(mockSelect).toHaveBeenCalledTimes(1);
    expect(mockGte).toHaveBeenCalledTimes(1);
    expect(mockLt).toHaveBeenCalledTimes(1);
  });

  test("returns 0 when cost_ledger query errors", async () => {
    mockLt.mockResolvedValue({ data: null, error: new Error("db error") });

    const deps = makeProductionDeps();
    const result = await deps.getMonthlyCostJpy!();

    expect(result).toBe(0);
  });

  test("returns 0 when cost_ledger has no rows", async () => {
    mockLt.mockResolvedValue({ data: [], error: null });

    const deps = makeProductionDeps();
    const result = await deps.getMonthlyCostJpy!();

    expect(result).toBe(0);
  });
});
