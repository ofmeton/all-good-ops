/**
 * token-store.ts unit tests (Phase 1)
 *
 * Tests:
 *   1. getXAccessToken: env fallback when no supabase client
 *   2. refreshAccessToken: success → upsert path
 *   3. refreshAccessToken: failure → killswitch + auth_blocked path
 */
import type { OAuthTokenState } from "./types.ts";

process.env.IN_MEMORY_FALLBACK = "true";

import {
  getXAccessToken,
  isTokenExpired,
  refreshAccessToken,
  __setTokenOverride,
  __setRefreshImpl,
  __setSupabaseUpsertImpl,
  __setSupabaseAuthBlockedImpl,
} from "./token-store.ts";
import { __resetKillSwitchInMemory, getKillSwitchState } from "../safety/kill-switch.ts";

beforeEach(() => {
  __setTokenOverride(null);
  __setRefreshImpl(null);
  __setSupabaseUpsertImpl(null);
  __setSupabaseAuthBlockedImpl(null);
  __resetKillSwitchInMemory();
  // Clear env tokens
  delete process.env.X_ACCESS_TOKEN;
  delete process.env.X_REFRESH_TOKEN;
  delete process.env.X_TOKEN_EXPIRES_AT;
});

// ---------------------------------------------------------------------------
// getXAccessToken — env fallback
// ---------------------------------------------------------------------------
describe("getXAccessToken", () => {
  it("returns null when X_ACCESS_TOKEN not set", async () => {
    const result = await getXAccessToken();
    expect(result).toBeNull();
  });

  it("reads from env fallback when supabase not available (IN_MEMORY_FALLBACK=true)", async () => {
    process.env.X_ACCESS_TOKEN = "env-access-token";
    process.env.X_REFRESH_TOKEN = "env-refresh-token";
    process.env.X_TOKEN_EXPIRES_AT = "9999999999999";
    const result = await getXAccessToken();
    expect(result).not.toBeNull();
    expect(result!.accessToken).toBe("env-access-token");
    expect(result!.refreshToken).toBe("env-refresh-token");
    expect(result!.expiresAt).toBe(9999999999999);
  });

  it("returns _override when set", async () => {
    const override: OAuthTokenState = { accessToken: "override-token" };
    __setTokenOverride(override);
    const result = await getXAccessToken();
    expect(result).toBe(override);
  });

  it("proactively refreshes an expired env token with a refresh_token + persists rotated token", async () => {
    // expired access token + valid refresh token in env
    process.env.X_ACCESS_TOKEN = "stale-access";
    process.env.X_REFRESH_TOKEN = "valid-refresh";
    process.env.X_TOKEN_EXPIRES_AT = "100"; // long expired

    const newToken: OAuthTokenState = {
      accessToken: "fresh-access",
      refreshToken: "rotated-refresh", // X rotates the refresh_token
      expiresAt: Date.now() + 7200_000,
    };
    const mockRefresh = jest.fn().mockResolvedValue(newToken);
    __setRefreshImpl(mockRefresh as typeof import("../oauth/token-exchange.ts").refreshToken);

    const upserted: OAuthTokenState[] = [];
    __setSupabaseUpsertImpl(async (token) => { upserted.push(token); });

    const result = await getXAccessToken();

    // refresh used the CURRENT refresh token
    expect(mockRefresh).toHaveBeenCalledWith(
      "valid-refresh",
      expect.objectContaining({ X_CLIENT_ID: expect.any(String) }),
      undefined,
    );
    // fresh token returned
    expect(result).not.toBeNull();
    expect(result!.accessToken).toBe("fresh-access");
    // rotated refresh_token persisted to oauth_tokens (never reuse old one)
    expect(upserted).toHaveLength(1);
    expect(upserted[0].accessToken).toBe("fresh-access");
    expect(upserted[0].refreshToken).toBe("rotated-refresh");
  });

  it("does NOT refresh an expired token when no refresh_token is available", async () => {
    process.env.X_ACCESS_TOKEN = "stale-access";
    process.env.X_TOKEN_EXPIRES_AT = "100"; // expired, no refresh token

    const mockRefresh = jest.fn();
    __setRefreshImpl(mockRefresh as typeof import("../oauth/token-exchange.ts").refreshToken);

    const result = await getXAccessToken();

    expect(mockRefresh).not.toHaveBeenCalled();
    expect(result!.accessToken).toBe("stale-access");
  });

  it("does NOT refresh a still-valid token", async () => {
    process.env.X_ACCESS_TOKEN = "good-access";
    process.env.X_REFRESH_TOKEN = "valid-refresh";
    process.env.X_TOKEN_EXPIRES_AT = String(Date.now() + 7200_000);

    const mockRefresh = jest.fn();
    __setRefreshImpl(mockRefresh as typeof import("../oauth/token-exchange.ts").refreshToken);

    const result = await getXAccessToken();

    expect(mockRefresh).not.toHaveBeenCalled();
    expect(result!.accessToken).toBe("good-access");
  });
});

// ---------------------------------------------------------------------------
// isTokenExpired
// ---------------------------------------------------------------------------
describe("isTokenExpired", () => {
  it("returns false when no expiresAt", () => {
    expect(isTokenExpired({ accessToken: "tok" })).toBe(false);
  });

  it("returns true when token expires within 60s", () => {
    const now = Date.now();
    expect(isTokenExpired({ accessToken: "tok", expiresAt: now + 30_000 }, now)).toBe(true);
  });

  it("returns false when token expires > 60s from now", () => {
    const now = Date.now();
    expect(isTokenExpired({ accessToken: "tok", expiresAt: now + 120_000 }, now)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// refreshAccessToken — success path
// ---------------------------------------------------------------------------
describe("refreshAccessToken — success", () => {
  it("calls refreshImpl with current refresh_token, upserts result, returns new token", async () => {
    const current: OAuthTokenState = {
      accessToken: "old-access",
      refreshToken: "old-refresh",
    };
    const newToken: OAuthTokenState = {
      accessToken: "new-access",
      refreshToken: "new-refresh",
      expiresAt: Date.now() + 7200_000,
    };

    const mockRefresh = jest.fn().mockResolvedValue(newToken);
    __setRefreshImpl(mockRefresh as typeof import("../oauth/token-exchange.ts").refreshToken);

    const upserted: OAuthTokenState[] = [];
    __setSupabaseUpsertImpl(async (token) => { upserted.push(token); });

    const result = await refreshAccessToken(current);

    expect(mockRefresh).toHaveBeenCalledWith(
      "old-refresh",
      expect.objectContaining({ X_CLIENT_ID: expect.any(String) }),
      undefined,
    );
    expect(result).toBe(newToken);
    expect(upserted).toHaveLength(1);
    expect(upserted[0].accessToken).toBe("new-access");
    expect(upserted[0].refreshToken).toBe("new-refresh");
  });
});

// ---------------------------------------------------------------------------
// refreshAccessToken — failure path → kill switch + auth_blocked
// ---------------------------------------------------------------------------
describe("refreshAccessToken — failure", () => {
  it("triggers kill switch and records auth_blocked on refresh failure", async () => {
    const current: OAuthTokenState = {
      accessToken: "old-access",
      refreshToken: "expired-refresh",
    };

    const mockRefresh = jest.fn().mockRejectedValue(new Error("X token endpoint error 401: refresh token expired"));
    __setRefreshImpl(mockRefresh as typeof import("../oauth/token-exchange.ts").refreshToken);

    const authBlockedCalls: string[] = [];
    __setSupabaseAuthBlockedImpl(async (reason) => { authBlockedCalls.push(reason); });

    await expect(refreshAccessToken(current)).rejects.toThrow(
      /\[token-store\] refresh failed — publishing blocked/,
    );

    // kill switch should be triggered (in-memory)
    const ksState = await getKillSwitchState();
    expect(ksState.publishing_enabled).toBe(false);
    expect(ksState.triggered_by).toBe("oauth_blocked");

    // auth_blocked should be recorded
    expect(authBlockedCalls).toHaveLength(1);
    expect(authBlockedCalls[0]).toContain("refresh token expired");
  });

  it("throws when no refresh_token available", async () => {
    const current: OAuthTokenState = { accessToken: "access-no-refresh" };
    await expect(refreshAccessToken(current)).rejects.toThrow(
      /Cannot refresh: no refresh_token/,
    );
  });
});
