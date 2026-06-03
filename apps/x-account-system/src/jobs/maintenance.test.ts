/**
 * maintenance.test.ts — W5-5
 *
 * Tests: handleJob dispatches daily-digest / optimizer-update to real implementations.
 *
 * Strategy:
 *   - jest.mock the digest / update-loop modules (resolved via moduleNameMapper .ts → no-ext)
 *   - Call handleJob with daily-digest / optimizer-update messages
 *   - Assert the mocked functions were called
 */

// ---- 1. mock digest module BEFORE any imports ----
const mockRunDailyDigest = jest.fn().mockResolvedValue({
  payload: { date: "2026-06-03", text: "stub", to: "U_test", meta: { brownout: false, kill_switch_on: false, alert_count: 0 } },
  sendResult: { status: "dry_run" as const },
});

jest.mock("../../lib/dashboard/digest.ts", () => ({
  runDailyDigest: (...args: unknown[]) => mockRunDailyDigest(...args),
}));

// ---- 2. mock optimizer update-loop BEFORE any imports ----
const mockRunOptimizerUpdate = jest.fn().mockResolvedValue({
  before: {},
  after: {},
  changes: [],
  rolledBack: false,
  anomalyReasons: [],
  signalsObserved: 0,
  durationMs: 1,
});

jest.mock("../../lib/optimizer/update-loop.ts", () => ({
  runOptimizerUpdate: (...args: unknown[]) => mockRunOptimizerUpdate(...args),
}));

// ---- 3. imports AFTER mocks ----
import { handleJob } from "../queue.ts";
import type { Env, JobMessage } from "../worker.ts";

// ---- helpers ----
function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    NODE_ENV: "test",
    LOG_LEVEL: "error",
    PHASE: "1",
    AUTONOMOUS_PUBLISH: "false",
    BUDGET_MONTHLY_LIMIT_JPY: "10000",
    BUDGET_BROWNOUT_THRESHOLD_JPY: "8000",
    JOBS: {} as unknown as Queue<never>,
    ANTHROPIC_API_KEY: "sk-test",
    OPENAI_API_KEY: "sk-openai-test",
    X_CLIENT_ID: "x-client",
    X_CLIENT_SECRET: "x-secret",
    X_ACCESS_TOKEN: "x-token",
    X_REFRESH_TOKEN: "x-refresh",
    TWITTERAPI_IO_KEY: "tw-key",
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test-srk",
    LINE_CHANNEL_ACCESS_TOKEN: "test-line-token",
    LINE_CHANNEL_SECRET: "test-line-secret",
    LINE_USER_ID_OFMETON: "U_admin_test",
    ...overrides,
  };
}

// ---- env setup ----
beforeEach(() => {
  jest.clearAllMocks();
  process.env.IN_MEMORY_FALLBACK = "true";
});

afterAll(() => {
  delete process.env.IN_MEMORY_FALLBACK;
});

// ---- tests ----

describe("handleJob: daily-digest", () => {
  it("calls runDailyDigest({}) when job=daily-digest", async () => {
    const msg: JobMessage = { job: "daily-digest", date: "2026-06-03" };
    await handleJob(msg, makeEnv());

    expect(mockRunDailyDigest).toHaveBeenCalledTimes(1);
    // called with an object arg (may be {})
    expect(mockRunDailyDigest).toHaveBeenCalledWith(expect.any(Object));
  });
});

describe("handleJob: optimizer-update", () => {
  it("calls runOptimizerUpdate() when job=optimizer-update", async () => {
    const msg: JobMessage = { job: "optimizer-update", date: "2026-06-03" };
    await handleJob(msg, makeEnv());

    expect(mockRunOptimizerUpdate).toHaveBeenCalledTimes(1);
  });
});
