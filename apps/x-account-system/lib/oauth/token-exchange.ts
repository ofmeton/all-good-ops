/**
 * X OAuth 2.0 token exchange + refresh (Workers-native: WebCrypto + fetch only)
 *
 * Real X token endpoint: https://api.x.com/2/oauth2/token
 * Auth: HTTP Basic (client_id:client_secret, base64)
 * grant_type=authorization_code: code + code_verifier + redirect_uri + client_id
 * grant_type=refresh_token: refresh_token + client_id
 *
 * OAuthTokenState.expiresAt = epoch ms (Date.now() + expires_in * 1000)
 */
import type { OAuthTokenState } from "../publisher/types.ts";

const TOKEN_URL = "https://api.x.com/2/oauth2/token";

/** Subset of Env needed for token exchange (injectable for tests) */
export interface TokenEnv {
  X_CLIENT_ID: string;
  X_CLIENT_SECRET: string;
  X_REDIRECT_URI: string;
}

type XTokenResponse = {
  token_type: string;
  expires_in: number;
  access_token: string;
  scope: string;
  refresh_token?: string;
};

type XTokenError = {
  error: string;
  error_description?: string;
};

function basicAuth(clientId: string, clientSecret: string): string {
  // Workers-native: btoa is globally available
  return btoa(`${clientId}:${clientSecret}`);
}

async function parseTokenResponse(
  res: Response,
  nowMs: number,
): Promise<OAuthTokenState> {
  if (!res.ok) {
    let errBody: string;
    try {
      const errJson = (await res.json()) as XTokenError;
      errBody = errJson.error_description ?? errJson.error ?? "unknown error";
    } catch {
      errBody = await res.text();
    }
    throw new Error(`X token endpoint error ${res.status}: ${errBody}`);
  }
  const data = (await res.json()) as XTokenResponse;
  const expiresAt = data.expires_in ? nowMs + data.expires_in * 1000 : undefined;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
    scope: data.scope,
  };
}

/**
 * Exchange authorization_code for tokens (PKCE Step 2).
 * @param code  - authorization code from X callback
 * @param verifier - PKCE code_verifier (stored in KV by /oauth/x/start)
 * @param env   - X OAuth env bindings
 * @param fetchImpl - injectable for tests (defaults to global fetch)
 */
export async function exchangeCode(
  code: string,
  verifier: string,
  env: TokenEnv,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<OAuthTokenState> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    code_verifier: verifier,
    redirect_uri: env.X_REDIRECT_URI,
    client_id: env.X_CLIENT_ID,
  });

  const res = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth(env.X_CLIENT_ID, env.X_CLIENT_SECRET)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  return parseTokenResponse(res, Date.now());
}

/**
 * Refresh access token using refresh_token rotation.
 * @param currentRefreshToken - current refresh_token to exchange
 * @param env - X OAuth env bindings
 * @param fetchImpl - injectable for tests
 */
export async function refreshToken(
  currentRefreshToken: string,
  env: TokenEnv,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<OAuthTokenState> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: currentRefreshToken,
    client_id: env.X_CLIENT_ID,
  });

  const res = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth(env.X_CLIENT_ID, env.X_CLIENT_SECRET)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  return parseTokenResponse(res, Date.now());
}
