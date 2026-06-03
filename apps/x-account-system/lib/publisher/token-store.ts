/**
 * OAuth token store (Phase 1: Supabase oauth_tokens + env fallback)
 *
 * SSoT: outputs/improvements/x-account-design-consolidated/main-design-all-versions.md §6.5
 *
 * Priority:
 *   1. _override (test-only)
 *   2. Supabase `xad.oauth_tokens` (provider='x')
 *   3. env fallback (X_ACCESS_TOKEN / X_REFRESH_TOKEN / X_TOKEN_EXPIRES_AT)
 *
 * OAuthTokenState.expiresAt is epoch ms.
 * DB stores expires_at as timestamptz ISO; conversion: new Date(expiresAt).toISOString() ↔ Date.parse(row.expires_at)
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { OAuthTokenState } from "./types.ts";
import { refreshToken as exchangeRefresh } from "../oauth/token-exchange.ts";
import { triggerKillSwitch } from "../safety/kill-switch.ts";

// ---------------------------------------------------------------------------
// Supabase singleton (mirrors kill-switch.ts pattern)
// ---------------------------------------------------------------------------
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (process.env.IN_MEMORY_FALLBACK === "true") return null;
  if (
    !_supabase &&
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    _supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { db: { schema: (process.env.SUPABASE_SCHEMA || "public") as "public" } },
    );
  }
  return _supabase;
}

/** test 用にクライアントシングルトンをリセット */
export function __resetSupabaseClient(): void {
  _supabase = null;
}

// ---------------------------------------------------------------------------
// Test override
// ---------------------------------------------------------------------------
let _override: OAuthTokenState | null = null;

/**
 * test 用 helper: token を強制上書き。
 * production code からは呼ばない。
 */
export function __setTokenOverride(state: OAuthTokenState | null) {
  _override = state;
}

// ---------------------------------------------------------------------------
// getXAccessToken
// ---------------------------------------------------------------------------

type OAuthTokenRow = {
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null; // timestamptz ISO
  scope: string | null;
};

/**
 * Get current OAuth token for X API call.
 *
 * Read priority:
 *   1. _override (test-only)
 *   2. Supabase `xad.oauth_tokens` WHERE provider='x'
 *   3. env fallback (X_ACCESS_TOKEN / X_REFRESH_TOKEN / X_TOKEN_EXPIRES_AT)
 *
 * Returns null if no token is available (→ dryRun forced by caller).
 */
export async function getXAccessToken(): Promise<OAuthTokenState | null> {
  if (_override) return _override;

  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("oauth_tokens")
      .select("access_token, refresh_token, expires_at, scope")
      .eq("provider", "x")
      .maybeSingle();

    if (!error && data) {
      const row = data as OAuthTokenRow;
      const expiresAt = row.expires_at ? Date.parse(row.expires_at) : undefined;
      return {
        accessToken: row.access_token,
        refreshToken: row.refresh_token ?? undefined,
        expiresAt: Number.isFinite(expiresAt) ? expiresAt : undefined,
        scope: row.scope ?? undefined,
      };
    }
    // DB error or no row → fall through to env
  }

  // env fallback
  const accessToken = process.env.X_ACCESS_TOKEN;
  if (!accessToken || accessToken.trim() === "") return null;
  const expiresRaw = process.env.X_TOKEN_EXPIRES_AT;
  const expiresAt = expiresRaw ? Number(expiresRaw) : undefined;
  return {
    accessToken,
    refreshToken: process.env.X_REFRESH_TOKEN || undefined,
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : undefined,
    scope: process.env.X_OAUTH_SCOPES,
  };
}

// ---------------------------------------------------------------------------
// isTokenExpired
// ---------------------------------------------------------------------------

/**
 * token 有効期限切れチェック (60 秒の clock skew tolerance)
 */
export function isTokenExpired(state: OAuthTokenState, now = Date.now()): boolean {
  if (!state.expiresAt) return false; // 期限不明 → assume valid
  return state.expiresAt - now < 60_000;
}

// ---------------------------------------------------------------------------
// refreshAccessToken
// ---------------------------------------------------------------------------

/** Subset of Env needed for token refresh (injectable for tests) */
export interface RefreshEnv {
  X_CLIENT_ID: string;
  X_CLIENT_SECRET: string;
  X_REDIRECT_URI: string;
}

/** Dependency-injection point for tests */
let _refreshImpl: typeof exchangeRefresh = exchangeRefresh;
export function __setRefreshImpl(fn: typeof exchangeRefresh | null): void {
  _refreshImpl = fn ?? exchangeRefresh;
}

/** Dependency-injection point for tests (supabase upsert) */
let _supabaseUpsertImpl:
  | ((token: OAuthTokenState) => Promise<void>)
  | null = null;

export function __setSupabaseUpsertImpl(
  fn: ((token: OAuthTokenState) => Promise<void>) | null,
): void {
  _supabaseUpsertImpl = fn;
}

/** Dependency-injection point for tests (auth_blocked upsert) */
let _supabaseAuthBlockedImpl:
  | ((reason: string) => Promise<void>)
  | null = null;

export function __setSupabaseAuthBlockedImpl(
  fn: ((reason: string) => Promise<void>) | null,
): void {
  _supabaseAuthBlockedImpl = fn;
}

/** Upsert token into xad.oauth_tokens (provider='x') */
async function upsertOAuthToken(token: OAuthTokenState): Promise<void> {
  if (_supabaseUpsertImpl) {
    return _supabaseUpsertImpl(token);
  }
  const sb = getSupabase();
  if (!sb) return; // in-memory fallback: no persistence needed
  await sb.from("oauth_tokens").upsert(
    {
      provider: "x",
      access_token: token.accessToken,
      refresh_token: token.refreshToken ?? null,
      // epoch ms → timestamptz ISO
      expires_at: token.expiresAt ? new Date(token.expiresAt).toISOString() : null,
      scope: token.scope ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider" },
  );
}

/** Record auth-blocked in xad.auth_blocked (provider='x') */
async function recordAuthBlocked(reason: string): Promise<void> {
  if (_supabaseAuthBlockedImpl) {
    return _supabaseAuthBlockedImpl(reason);
  }
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("auth_blocked").upsert(
    {
      provider: "x",
      blocked: true,
      reason,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider" },
  );
}

/**
 * Refresh token cycle (Phase 1).
 *
 * 1. Call X token endpoint with refresh_token rotation.
 * 2. Upsert new token into xad.oauth_tokens.
 * 3. On failure: triggerKillSwitch("oauth_blocked") + record xad.auth_blocked.
 *
 * @param state - current OAuthTokenState with refreshToken
 * @param env - X OAuth env bindings (optional; falls back to process.env)
 * @param fetchImpl - injectable for tests
 */
export async function refreshAccessToken(
  state: OAuthTokenState,
  env?: RefreshEnv,
  fetchImpl?: typeof fetch,
): Promise<OAuthTokenState> {
  if (!state.refreshToken) {
    throw new Error(
      "Cannot refresh: no refresh_token in current state. Re-authorize via /oauth/x/start.",
    );
  }

  const tokenEnv: RefreshEnv = env ?? {
    X_CLIENT_ID: process.env.X_CLIENT_ID ?? "",
    X_CLIENT_SECRET: process.env.X_CLIENT_SECRET ?? "",
    X_REDIRECT_URI: process.env.X_REDIRECT_URI ?? "",
  };

  let newToken: OAuthTokenState;
  try {
    newToken = await _refreshImpl(state.refreshToken, tokenEnv, fetchImpl);
  } catch (err) {
    // Refresh FAILED: activate kill switch + record auth_blocked
    const reason = err instanceof Error ? err.message : String(err);
    await Promise.allSettled([
      triggerKillSwitch("oauth_blocked"),
      recordAuthBlocked(reason),
    ]);
    throw new Error(`[token-store] refresh failed — publishing blocked: ${reason}`);
  }

  // Success: persist new token
  await upsertOAuthToken(newToken);
  return newToken;
}
