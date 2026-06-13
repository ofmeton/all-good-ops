/**
 * queue-brownout.test.ts — W5 FIX 2
 *
 * The brownout guard fetches monthly cost before dispatch. If that cost source
 * (Supabase / network) THROWS, the consumer must fail OPEN: cost defaults to 0
 * and the job still dispatches (instead of propagating out of handleJob → the
 * consumer m.retry()ing every job forever, including daily-digest / line-event).
 *
 * Strategy:
 *   - jest.mock kpi-collector so getMonthlyCostJpy() throws
 *   - jest.mock a dispatched job impl (daily-digest) to assert it still runs
 *   - Call handleJob and assert it resolves (does NOT throw) and dispatches
 */

// ---- 1. cost source THROWS ----
const mockGetMonthlyCostJpy = jest
  .fn()
  .mockRejectedValue(new Error("cost source down: createClient/network failed"));

jest.mock("../lib/dashboard/kpi-collector.ts", () => ({
  makeProductionDeps: () => ({ getMonthlyCostJpy: mockGetMonthlyCostJpy }),
}));

// ---- 2. mock daily-digest impl so we can assert dispatch happened ----
const mockRunDailyDigest = jest.fn().mockResolvedValue({
  payload: {
    date: "2026-06-03",
    text: "stub",
    to: "U_test",
    meta: { brownout: false, kill_switch_on: false, alert_count: 0 },
  },
  sendResult: { status: "dry_run" as const },
});

jest.mock("../lib/dashboard/digest.ts", () => ({
  runDailyDigest: (...args: unknown[]) => mockRunDailyDigest(...args),
}));

// ---- 3. mock compose impl (another non-always-allowed job) ----
const mockRunCompose = jest
  .fn()
  .mockResolvedValue({ processed: 0, draftCount: 0, errorCount: 0 });
jest.mock("../lib/curation/run-compose.ts", () => ({
  runCompose: (...args: unknown[]) => mockRunCompose(...args),
}));

// ---- 4. imports AFTER mocks ----
import { handleJob } from "./queue.ts";
import type { Env, JobMessage } from "./worker.ts";

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
    TWITTERAPI_IO_LOGIN_COOKIE: "login-cookie",
    TWITTERAPI_IO_PROXY: "http://proxy.example",
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test-srk",
    LINE_CHANNEL_ACCESS_TOKEN: "test-line-token",
    LINE_CHANNEL_SECRET: "test-line-secret",
    LINE_USER_ID_OFMETON: "U_admin_test",
    ...overrides,
  } as Env;
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.IN_MEMORY_FALLBACK = "true";
});

afterAll(() => {
  delete process.env.IN_MEMORY_FALLBACK;
});

describe("optimizer-apply brownout", () => {
  it("ALL_JOBS と STOP_POSTING_ALLOWED に含まれ cron_halt/escalate には含まれない", async () => {
    const { ALLOWED_JOBS_BY_STATUS } = await import("../lib/safety/brownout-handler.ts");
    expect(ALLOWED_JOBS_BY_STATUS.ok).toContain("optimizer-apply");
    expect(ALLOWED_JOBS_BY_STATUS.stop_posting).toContain("optimizer-apply");
    expect(ALLOWED_JOBS_BY_STATUS.cron_halt).not.toContain("optimizer-apply");
    expect(ALLOWED_JOBS_BY_STATUS.escalate).not.toContain("optimizer-apply");
  });
});

describe("handleJob: brownout cost-fetch fails OPEN", () => {
  it("does NOT throw when getMonthlyCostJpy() rejects (would otherwise retry forever)", async () => {
    const msg: JobMessage = { job: "daily-digest", date: "2026-06-03" };
    // 常時許可 job のため brownout skip されず正常完了 → { skipped: false }（throw しない）
    await expect(handleJob(msg, makeEnv())).resolves.toEqual({ skipped: false });
    expect(mockGetMonthlyCostJpy).toHaveBeenCalledTimes(1);
  });

  it("still dispatches daily-digest (always-allowed) when cost fetch throws", async () => {
    const msg: JobMessage = { job: "daily-digest", date: "2026-06-03" };
    await handleJob(msg, makeEnv());
    expect(mockRunDailyDigest).toHaveBeenCalledTimes(1);
  });

  it("still dispatches a non-always-allowed job (compose) when cost fetch throws (cost defaults to 0 = healthy)", async () => {
    const msg: JobMessage = { job: "compose", date: "2026-06-03" };
    await handleJob(msg, makeEnv());
    // cost defaulted to 0 → brownout status healthy → compose allowed → dispatched
    expect(mockRunCompose).toHaveBeenCalledTimes(1);
  });
});
