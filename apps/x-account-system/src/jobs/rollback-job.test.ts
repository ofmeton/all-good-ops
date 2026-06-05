/**
 * rollback-job.test.ts — W5-6
 *
 * Tests: runRollbackMonitor
 *
 * Rules:
 *   - NO IN_MEMORY_FALLBACK (test production DB path via mocked supabase)
 *   - Mock: aggregatePerformanceWindow, loadOptimizerState, rollbackToSnapshot,
 *           pushLine, supabase createClient
 */

// ---- 1. mock supabase BEFORE any imports ----
const mockInsert = jest.fn().mockResolvedValue({ error: null });

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    from: (_table: string) => ({
      insert: mockInsert,
    }),
  })),
}));

// ---- 2. mock reward-extractor ----
const mockAggregatePerformanceWindow = jest.fn();
jest.mock("../../lib/optimizer/reward-extractor.js", () => ({
  aggregatePerformanceWindow: mockAggregatePerformanceWindow,
}));

// ---- 3. mock state-store ----
const mockLoadOptimizerState = jest.fn();
const mockRollbackToSnapshot = jest.fn();
jest.mock("../../lib/optimizer/state-store.js", () => ({
  loadOptimizerState: mockLoadOptimizerState,
  rollbackToSnapshot: mockRollbackToSnapshot,
}));

// ---- 4. mock line-client ----
const mockPushLine = jest.fn();
jest.mock("../../lib/line/line-client.js", () => ({
  pushLine: mockPushLine,
}));

import { runRollbackMonitor } from "./rollback-job.js";
import type { Env } from "../worker.js";

// ---- minimal Env stub ----
const ENV_STUB: Env = {
  NODE_ENV: "test",
  LOG_LEVEL: "info",
  PHASE: "1",
  AUTONOMOUS_PUBLISH: "false",
  BUDGET_MONTHLY_LIMIT_JPY: "10000",
  BUDGET_BROWNOUT_THRESHOLD_JPY: "8000",
  JOBS: {} as Queue<never>,
  ANTHROPIC_API_KEY: "test-anthropic",
  OPENAI_API_KEY: "test-openai",
  X_CLIENT_ID: "x-client-id",
  X_CLIENT_SECRET: "x-client-secret",
  X_ACCESS_TOKEN: "x-access-token",
  X_REFRESH_TOKEN: "x-refresh-token",
  TWITTERAPI_IO_KEY: "twio-key",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  LINE_CHANNEL_ACCESS_TOKEN: "line-token",
  LINE_CHANNEL_SECRET: "line-secret",
  LINE_USER_ID_OFMETON: "U123456",
};

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.IN_MEMORY_FALLBACK;
  // ensure SUPABASE env vars are set so getSupabase() inside rollback-job works
  process.env.SUPABASE_URL = ENV_STUB.SUPABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = ENV_STUB.SUPABASE_SERVICE_ROLE_KEY;
});

afterEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

describe("runRollbackMonitor", () => {
  test("PCR ≥30% drop + lastSnapshotId set → rollbackToSnapshot called + LINE push + optimizer_proposal insert", async () => {
    // current PCR is 40% below baseline → triggers
    mockAggregatePerformanceWindow.mockResolvedValue({
      currentAvgPcr: 0.006,
      prevAvgPcr: 0.010,
      currentAvgImpression: 4000,
      prevAvgImpression: 4000,
    });

    const mockState = {
      generation: 5,
      updatedAt: new Date().toISOString(),
      lastSnapshotId: "snap_20260601_abc123",
      styleGuideVersion: "v1.3",
      postingTime: {},
      hookDistribution: {},
      publishingLag: {},
      contentAxis: {},
      citationExplicitRate: {},
      xFormatRatio: {},
      visualizerMode: {},
      visualizerImageAiGen: {},
      industrySopRate: {},
    };
    mockLoadOptimizerState.mockResolvedValue(mockState);
    mockRollbackToSnapshot.mockResolvedValue({ ...mockState, generation: 4 });
    mockPushLine.mockResolvedValue(undefined);

    await runRollbackMonitor(ENV_STUB);

    // aggregatePerformanceWindow called with (7, 7, ...)
    expect(mockAggregatePerformanceWindow).toHaveBeenCalledWith(7, 7, expect.any(Date));

    // loadOptimizerState called
    expect(mockLoadOptimizerState).toHaveBeenCalled();

    // rollbackToSnapshot called with the lastSnapshotId
    expect(mockRollbackToSnapshot).toHaveBeenCalledWith("snap_20260601_abc123");

    // LINE warning push called
    expect(mockPushLine).toHaveBeenCalledWith(
      ENV_STUB.LINE_USER_ID_OFMETON,
      expect.stringContaining("rollback"),
      ENV_STUB.LINE_CHANNEL_ACCESS_TOKEN,
    );

    // optimizer_proposal insert called with anomaly_alert
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        proposal_type: "anomaly_alert",
        scope: expect.any(String),
        hypothesis: expect.any(String),
        evidence: expect.any(Object),
      }),
    );
  });

  test("triggered BUT lastSnapshotId undefined → warn-only LINE push, NO rollbackToSnapshot call", async () => {
    // PCR drop triggers
    mockAggregatePerformanceWindow.mockResolvedValue({
      currentAvgPcr: 0.005,
      prevAvgPcr: 0.010,
      currentAvgImpression: 4000,
      prevAvgImpression: 4000,
    });

    const mockStateNoSnapshot = {
      generation: 0,
      updatedAt: new Date().toISOString(),
      // lastSnapshotId is intentionally absent (first run, no snapshot yet)
      styleGuideVersion: "v1.3",
      postingTime: {},
      hookDistribution: {},
      publishingLag: {},
      contentAxis: {},
      citationExplicitRate: {},
      xFormatRatio: {},
      visualizerMode: {},
      visualizerImageAiGen: {},
      industrySopRate: {},
    };
    mockLoadOptimizerState.mockResolvedValue(mockStateNoSnapshot);
    mockPushLine.mockResolvedValue(undefined);

    await runRollbackMonitor(ENV_STUB);

    // rollbackToSnapshot must NOT be called
    expect(mockRollbackToSnapshot).not.toHaveBeenCalled();

    // LINE push IS called (warn-only)
    expect(mockPushLine).toHaveBeenCalledWith(
      ENV_STUB.LINE_USER_ID_OFMETON,
      expect.stringContaining("スナップショット"),
      ENV_STUB.LINE_CHANNEL_ACCESS_TOKEN,
    );
  });

  test("no drop → no-op: rollbackToSnapshot not called, LINE not called", async () => {
    mockAggregatePerformanceWindow.mockResolvedValue({
      currentAvgPcr: 0.011,
      prevAvgPcr: 0.010,
      currentAvgImpression: 5000,
      prevAvgImpression: 4800,
    });

    await runRollbackMonitor(ENV_STUB);

    expect(mockLoadOptimizerState).not.toHaveBeenCalled();
    expect(mockRollbackToSnapshot).not.toHaveBeenCalled();
    expect(mockPushLine).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
