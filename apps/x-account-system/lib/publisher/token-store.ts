/**
 * OAuth token store (Phase 0.5: in-memory + env fallback)
 *
 * SSoT: outputs/improvements/x-account-design-consolidated/main-design-all-versions.md §6.5
 *
 * Phase 0.5 は env (X_ACCESS_TOKEN / X_REFRESH_TOKEN / X_TOKEN_EXPIRES_AT) から読む。
 * Phase 1 で Supabase `oauth_tokens` table 連携に差し替える。
 */
import type { OAuthTokenState } from "./types.ts";

let _override: OAuthTokenState | null = null;

/**
 * test 用 helper: token を強制上書き。
 * production code からは呼ばない。
 */
export function __setTokenOverride(state: OAuthTokenState | null) {
  _override = state;
}

/**
 * Get current OAuth token for X API call.
 * Phase 0.5: env から構成。X_ACCESS_TOKEN 未設定なら null を返す (= dryRun 強制)。
 */
export async function getXAccessToken(): Promise<OAuthTokenState | null> {
  if (_override) {
    return _override;
  }
  const accessToken = process.env.X_ACCESS_TOKEN;
  if (!accessToken || accessToken.trim() === "") {
    return null;
  }
  const expiresRaw = process.env.X_TOKEN_EXPIRES_AT;
  const expiresAt = expiresRaw ? Number(expiresRaw) : undefined;
  return {
    accessToken,
    refreshToken: process.env.X_REFRESH_TOKEN || undefined,
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : undefined,
    scope: process.env.X_OAUTH_SCOPES,
  };
}

/**
 * token 有効期限切れチェック (60 秒の clock skew tolerance)
 */
export function isTokenExpired(state: OAuthTokenState, now = Date.now()): boolean {
  if (!state.expiresAt) return false; // 期限不明 → assume valid
  return state.expiresAt - now < 60_000;
}

/**
 * Refresh token cycle (Phase 1 で実装)
 */
export async function refreshAccessToken(
  _state: OAuthTokenState,
): Promise<OAuthTokenState> {
  throw new Error(
    "OAuth refresh not implemented yet. Set IN_MEMORY_FALLBACK=true for Phase 0.5.",
  );
}
