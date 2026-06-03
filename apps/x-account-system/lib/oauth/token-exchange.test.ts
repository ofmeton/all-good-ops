/**
 * token-exchange.ts unit tests
 * — mocks fetch; asserts exchangeCode + refreshToken parse token response into OAuthTokenState
 */
import { exchangeCode, refreshToken } from "./token-exchange.ts";
import type { TokenEnv } from "./token-exchange.ts";

const MOCK_ENV: TokenEnv = {
  X_CLIENT_ID: "test-client-id",
  X_CLIENT_SECRET: "test-client-secret",
  X_REDIRECT_URI: "https://example.com/oauth/x/callback",
};

const NOW_MS = 1_700_000_000_000; // fixed for assertions
const EXPIRES_IN = 7200; // 2 hours

/** Create a mock fetch returning the given JSON body and status */
function mockFetch(status: number, body: object): typeof fetch {
  return async (_url: RequestInfo | URL, _init?: RequestInit) => {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as Response;
  };
}

describe("exchangeCode", () => {
  const GOOD_RESPONSE = {
    token_type: "bearer",
    expires_in: EXPIRES_IN,
    access_token: "access-token-abc",
    scope: "tweet.read tweet.write offline.access",
    refresh_token: "refresh-token-xyz",
  };

  it("parses a successful token response into OAuthTokenState", async () => {
    // Freeze Date.now via jest fake timer approach
    const realNow = Date.now;
    Date.now = () => NOW_MS;
    try {
      const result = await exchangeCode(
        "auth-code-123",
        "code-verifier-abc",
        MOCK_ENV,
        mockFetch(200, GOOD_RESPONSE),
      );

      expect(result.accessToken).toBe("access-token-abc");
      expect(result.refreshToken).toBe("refresh-token-xyz");
      expect(result.scope).toBe("tweet.read tweet.write offline.access");
      expect(result.expiresAt).toBe(NOW_MS + EXPIRES_IN * 1000);
    } finally {
      Date.now = realNow;
    }
  });

  it("throws on error response", async () => {
    const errBody = { error: "invalid_grant", error_description: "code expired" };
    await expect(
      exchangeCode("bad-code", "verifier", MOCK_ENV, mockFetch(400, errBody)),
    ).rejects.toThrow(/X token endpoint error 400.*code expired/);
  });

  it("omits expiresAt when expires_in is absent", async () => {
    const noExpiry = { ...GOOD_RESPONSE, expires_in: 0 };
    const result = await exchangeCode(
      "code",
      "verifier",
      MOCK_ENV,
      mockFetch(200, noExpiry),
    );
    expect(result.expiresAt).toBeUndefined();
  });

  it("omits refreshToken when not present in response", async () => {
    const noRefresh = { ...GOOD_RESPONSE };
    delete (noRefresh as Partial<typeof GOOD_RESPONSE>).refresh_token;
    const result = await exchangeCode(
      "code",
      "verifier",
      MOCK_ENV,
      mockFetch(200, noRefresh),
    );
    expect(result.refreshToken).toBeUndefined();
  });

  it("sends correct Basic auth header", async () => {
    let capturedHeaders: Record<string, string> = {};
    const capturingFetch: typeof fetch = async (_url, init) => {
      capturedHeaders = Object.fromEntries(
        Object.entries((init?.headers as Record<string, string>) ?? {}),
      );
      return {
        ok: true,
        status: 200,
        json: async () => GOOD_RESPONSE,
        text: async () => JSON.stringify(GOOD_RESPONSE),
      } as Response;
    };
    await exchangeCode("code", "verifier", MOCK_ENV, capturingFetch);
    const expected = btoa(`${MOCK_ENV.X_CLIENT_ID}:${MOCK_ENV.X_CLIENT_SECRET}`);
    expect(capturedHeaders["Authorization"]).toBe(`Basic ${expected}`);
  });

  it("sends correct grant_type and code_verifier in body", async () => {
    let capturedBody = "";
    const capturingFetch: typeof fetch = async (_url, init) => {
      capturedBody = init?.body?.toString() ?? "";
      return {
        ok: true,
        status: 200,
        json: async () => GOOD_RESPONSE,
        text: async () => JSON.stringify(GOOD_RESPONSE),
      } as Response;
    };
    await exchangeCode("my-code", "my-verifier", MOCK_ENV, capturingFetch);
    const params = new URLSearchParams(capturedBody);
    expect(params.get("grant_type")).toBe("authorization_code");
    expect(params.get("code")).toBe("my-code");
    expect(params.get("code_verifier")).toBe("my-verifier");
    expect(params.get("redirect_uri")).toBe(MOCK_ENV.X_REDIRECT_URI);
  });
});

describe("refreshToken", () => {
  const REFRESH_RESPONSE = {
    token_type: "bearer",
    expires_in: EXPIRES_IN,
    access_token: "new-access-token",
    scope: "tweet.read tweet.write offline.access",
    refresh_token: "new-refresh-token",
  };

  it("parses a successful refresh response into OAuthTokenState", async () => {
    const realNow = Date.now;
    Date.now = () => NOW_MS;
    try {
      const result = await refreshToken(
        "old-refresh-token",
        MOCK_ENV,
        mockFetch(200, REFRESH_RESPONSE),
      );
      expect(result.accessToken).toBe("new-access-token");
      expect(result.refreshToken).toBe("new-refresh-token");
      expect(result.expiresAt).toBe(NOW_MS + EXPIRES_IN * 1000);
    } finally {
      Date.now = realNow;
    }
  });

  it("throws on error response", async () => {
    const errBody = { error: "invalid_request", error_description: "refresh token expired" };
    await expect(
      refreshToken("bad-refresh", MOCK_ENV, mockFetch(401, errBody)),
    ).rejects.toThrow(/X token endpoint error 401.*refresh token expired/);
  });

  it("sends grant_type=refresh_token in body", async () => {
    let capturedBody = "";
    const capturingFetch: typeof fetch = async (_url, init) => {
      capturedBody = init?.body?.toString() ?? "";
      return {
        ok: true,
        status: 200,
        json: async () => REFRESH_RESPONSE,
        text: async () => JSON.stringify(REFRESH_RESPONSE),
      } as Response;
    };
    await refreshToken("rt-123", MOCK_ENV, capturingFetch);
    const params = new URLSearchParams(capturedBody);
    expect(params.get("grant_type")).toBe("refresh_token");
    expect(params.get("refresh_token")).toBe("rt-123");
    expect(params.get("client_id")).toBe(MOCK_ENV.X_CLIENT_ID);
  });
});
