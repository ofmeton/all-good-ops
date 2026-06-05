/**
 * rotation-job.test.ts — W5-9
 *
 * Tests: runRotationNotice
 *
 * Rules:
 *   - NO IN_MEMORY_FALLBACK
 *   - Mock: token-store (getXAccessToken, isTokenExpired, refreshAccessToken,
 *           __setTokenOverride, __setRefreshImpl),
 *           line-client (pushLine),
 *           kill-switch (triggerKillSwitch) — kill-switch is called inside
 *           refreshAccessToken on failure; we verify the escalation behavior
 *           surfaces via the job (error thrown / LINE escalation).
 */

// ---- 1. mock token-store BEFORE any imports ----
const mockGetXAccessToken = jest.fn();
const mockIsTokenExpired = jest.fn();
const mockRefreshAccessToken = jest.fn();

jest.mock("../../lib/publisher/token-store.js", () => ({
  getXAccessToken: mockGetXAccessToken,
  isTokenExpired: mockIsTokenExpired,
  refreshAccessToken: mockRefreshAccessToken,
}));

// ---- 2. mock line-client ----
const mockPushLine = jest.fn();
jest.mock("../../lib/line/line-client.js", () => ({
  pushLine: mockPushLine,
}));

// ---- 3. mock kill-switch (called inside refreshAccessToken in production;
//          in these tests refreshAccessToken is itself mocked, so this is
//          a safety guard in case rotation-job calls it directly) ----
const mockTriggerKillSwitch = jest.fn();
jest.mock("../../lib/safety/kill-switch.js", () => ({
  triggerKillSwitch: mockTriggerKillSwitch,
  getKillSwitchState: jest.fn().mockResolvedValue({ publishing_enabled: true }),
}));

import { runRotationNotice } from "./rotation-job.js";
import type { Env } from "../worker.js";
import type { OAuthTokenState } from "../../lib/publisher/types.js";

// ---- minimal Env stub ----
const ENV_STUB: Env = {
  NODE_ENV: "test",
  LOG_LEVEL: "info",
  PHASE: "1",
  AUTONOMOUS_PUBLISH: "false",
  BUDGET_MONTHLY_LIMIT_JPY: "10000",
  BUDGET_BROWNOUT_THRESHOLD_JPY: "8000",
  JOBS: {} as Queue<never>,
  OAUTH_STATE: {} as KVNamespace,
  ANTHROPIC_API_KEY: "test-anthropic",
  OPENAI_API_KEY: "test-openai",
  X_CLIENT_ID: "x-client-id",
  X_CLIENT_SECRET: "x-client-secret",
  X_REDIRECT_URI: "https://example.com/oauth/callback",
  X_OAUTH_SCOPES: "tweet.read tweet.write users.read",
  X_ACCESS_TOKEN: "x-access-token",
  X_REFRESH_TOKEN: "x-refresh-token",
  X_TOKEN_EXPIRES_AT: String(Date.now() + 86400_000),
  TWITTERAPI_IO_KEY: "twio-key",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  LINE_CHANNEL_ACCESS_TOKEN: "line-token",
  LINE_CHANNEL_SECRET: "line-secret",
  LINE_USER_ID_OFMETON: "U123456",
};

/** helper: make a token state near expiry (within 5 days) */
function nearExpiryToken(): OAuthTokenState {
  const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
  return {
    accessToken: "old-access",
    refreshToken: "old-refresh",
    expiresAt: Date.now() + fiveDaysMs - 1000, // just under 5 days
  };
}

/** helper: make a token state with plenty of time left (30 days) */
function freshToken(): OAuthTokenState {
  return {
    accessToken: "fresh-access",
    refreshToken: "fresh-refresh",
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  };
}

/** helper: make a refreshed token state */
function refreshedToken(): OAuthTokenState {
  return {
    accessToken: "new-access",
    refreshToken: "new-refresh",
    expiresAt: Date.now() + 90 * 24 * 60 * 60 * 1000,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.IN_MEMORY_FALLBACK;
});

describe("runRotationNotice", () => {
  test("token near expiry → refreshAccessToken called → success → LINE notification sent", async () => {
    const current = nearExpiryToken();
    mockGetXAccessToken.mockResolvedValue(current);
    // isTokenExpired returns false (not expired, but near expiry is checked separately)
    mockIsTokenExpired.mockReturnValue(false);
    const refreshed = refreshedToken();
    mockRefreshAccessToken.mockResolvedValue(refreshed);
    mockPushLine.mockResolvedValue(undefined);

    await runRotationNotice(ENV_STUB);

    // refreshAccessToken MUST be called because token is near expiry
    expect(mockRefreshAccessToken).toHaveBeenCalledWith(
      current,
      expect.objectContaining({
        X_CLIENT_ID: ENV_STUB.X_CLIENT_ID,
        X_CLIENT_SECRET: ENV_STUB.X_CLIENT_SECRET,
        X_REDIRECT_URI: ENV_STUB.X_REDIRECT_URI,
      }),
    );

    // LINE notification sent with success message
    expect(mockPushLine).toHaveBeenCalledWith(
      ENV_STUB.LINE_USER_ID_OFMETON,
      expect.stringContaining("rotation"),
      ENV_STUB.LINE_CHANNEL_ACCESS_TOKEN,
    );
  });

  test("token isTokenExpired=true → refreshAccessToken called → success → LINE notification", async () => {
    const current: OAuthTokenState = {
      accessToken: "old-access",
      refreshToken: "old-refresh",
      expiresAt: Date.now() - 1000, // already expired
    };
    mockGetXAccessToken.mockResolvedValue(current);
    mockIsTokenExpired.mockReturnValue(true);
    const refreshed = refreshedToken();
    mockRefreshAccessToken.mockResolvedValue(refreshed);
    mockPushLine.mockResolvedValue(undefined);

    await runRotationNotice(ENV_STUB);

    expect(mockRefreshAccessToken).toHaveBeenCalled();
    expect(mockPushLine).toHaveBeenCalledWith(
      ENV_STUB.LINE_USER_ID_OFMETON,
      expect.stringContaining("rotation"),
      ENV_STUB.LINE_CHANNEL_ACCESS_TOKEN,
    );
  });

  test("refresh failure → LINE escalation sent, job does NOT crash (error is caught)", async () => {
    const current = nearExpiryToken();
    mockGetXAccessToken.mockResolvedValue(current);
    mockIsTokenExpired.mockReturnValue(false);
    // refreshAccessToken throws (as it does after triggerKillSwitch internally)
    mockRefreshAccessToken.mockRejectedValue(
      new Error("[token-store] refresh failed — publishing blocked: invalid_grant"),
    );
    mockPushLine.mockResolvedValue(undefined);

    // The job should NOT throw — it should catch the error and send escalation LINE
    await expect(runRotationNotice(ENV_STUB)).resolves.toBeUndefined();

    // LINE escalation MUST be called
    expect(mockPushLine).toHaveBeenCalledWith(
      ENV_STUB.LINE_USER_ID_OFMETON,
      expect.stringContaining("エスカレーション"),
      ENV_STUB.LINE_CHANNEL_ACCESS_TOKEN,
    );
  });

  test("token NOT near expiry → no refresh, no required LINE push (no crash)", async () => {
    const current = freshToken();
    mockGetXAccessToken.mockResolvedValue(current);
    mockIsTokenExpired.mockReturnValue(false);
    mockPushLine.mockResolvedValue(undefined);

    await runRotationNotice(ENV_STUB);

    // refreshAccessToken must NOT be called
    expect(mockRefreshAccessToken).not.toHaveBeenCalled();
  });

  test("no token available (getXAccessToken returns null) → LINE warning, no crash", async () => {
    mockGetXAccessToken.mockResolvedValue(null);
    mockPushLine.mockResolvedValue(undefined);

    await expect(runRotationNotice(ENV_STUB)).resolves.toBeUndefined();

    // Should warn via LINE that no token is found
    expect(mockPushLine).toHaveBeenCalledWith(
      ENV_STUB.LINE_USER_ID_OFMETON,
      expect.stringContaining("token"),
      ENV_STUB.LINE_CHANNEL_ACCESS_TOKEN,
    );
    // No refresh attempted
    expect(mockRefreshAccessToken).not.toHaveBeenCalled();
  });
});
