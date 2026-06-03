/**
 * webhook.test.ts — W4-1
 *
 * Tests: LINE webhook 署名検証 + enqueue
 *
 * Rules:
 *   - Valid signature + valid body → 200 + env.JOBS.send called once per event
 *   - Wrong signature → 401 + NO enqueue
 *   - Missing signature header → 401 + NO enqueue
 */

import crypto from "node:crypto";
import type { Env } from "./worker.ts";

// ---- helper: compute valid LINE signature (standard base64 HMAC-SHA256) ----
function makeLineSignature(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("base64");
}

// ---- helper: build a minimal Env with mocked JOBS.send ----
function makeEnv(overrides: Partial<Env> = {}): Env & { JOBS: { send: jest.Mock } } {
  const mockSend = jest.fn().mockResolvedValue(undefined);
  return {
    NODE_ENV: "test",
    LOG_LEVEL: "error",
    PHASE: "1",
    AUTONOMOUS_PUBLISH: "false",
    BUDGET_MONTHLY_LIMIT_JPY: "10000",
    BUDGET_BROWNOUT_THRESHOLD_JPY: "8000",
    JOBS: { send: mockSend } as unknown as Queue<never>,
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
    LINE_CHANNEL_SECRET: "test-secret-key",
    LINE_USER_ID_OFMETON: "U_admin_test",
    ...overrides,
  } as Env & { JOBS: { send: jest.Mock } };
}

// ---- helper: build a minimal ExecutionContext mock ----
function makeCtx(): ExecutionContext {
  return {
    waitUntil: (p: Promise<unknown>) => { void p; },
    passThroughOnException: () => {},
  } as ExecutionContext;
}

// ---- imports AFTER mocks (none needed here) ----
import worker from "./worker.ts";

const SECRET = "test-secret-key";

// ---- test body constants ----
const bodyOneEvent = JSON.stringify({
  destination: "Udeadbeef",
  events: [
    {
      type: "message",
      message: { type: "text", id: "msg-001", text: "Hello" },
      source: { type: "user", userId: "Udeadbeef" },
      timestamp: 1700000000000,
      mode: "active",
    },
  ],
});

const bodyTwoEvents = JSON.stringify({
  destination: "Udeadbeef",
  events: [
    { type: "message", message: { type: "text", id: "msg-001", text: "Hello" }, timestamp: 1700000000000, mode: "active" },
    { type: "postback", postback: { data: "approve:draft-abc" }, timestamp: 1700000000001, mode: "active" },
  ],
});

const bodyNoEvents = JSON.stringify({ destination: "Udeadbeef", events: [] });

// ---- test helpers ----
function makeRequest(body: string, sig: string | null): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (sig !== null) {
    headers["x-line-signature"] = sig;
  }
  return new Request("https://worker.example.com/line/webhook", {
    method: "POST",
    headers,
    body,
  });
}

// ============================================================
// Test suite
// ============================================================

describe("LINE /line/webhook", () => {
  let env: ReturnType<typeof makeEnv>;
  let ctx: ExecutionContext;

  beforeEach(() => {
    env = makeEnv();
    ctx = makeCtx();
  });

  // ---- 200 path ----

  test("valid signature + 1 event → 200 + JOBS.send called once", async () => {
    const sig = makeLineSignature(bodyOneEvent, SECRET);
    const req = makeRequest(bodyOneEvent, sig);

    const res = await worker.fetch(req, env, ctx);

    expect(res.status).toBe(200);
    const mockSend = (env.JOBS as unknown as { send: jest.Mock }).send;
    expect(mockSend).toHaveBeenCalledTimes(1);
    const msg = mockSend.mock.calls[0][0];
    expect(msg.job).toBe("line-event");
    expect(typeof msg.date).toBe("string");
    expect(msg.payload).toMatchObject({ type: "message" });
  });

  test("valid signature + 2 events → 200 + JOBS.send called twice", async () => {
    const sig = makeLineSignature(bodyTwoEvents, SECRET);
    const req = makeRequest(bodyTwoEvents, sig);

    const res = await worker.fetch(req, env, ctx);

    expect(res.status).toBe(200);
    const mockSend = (env.JOBS as unknown as { send: jest.Mock }).send;
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  test("valid signature + empty events array → 200 + JOBS.send NOT called", async () => {
    const sig = makeLineSignature(bodyNoEvents, SECRET);
    const req = makeRequest(bodyNoEvents, sig);

    const res = await worker.fetch(req, env, ctx);

    expect(res.status).toBe(200);
    const mockSend = (env.JOBS as unknown as { send: jest.Mock }).send;
    expect(mockSend).not.toHaveBeenCalled();
  });

  // ---- 401 path ----

  test("wrong signature → 401 + NO enqueue", async () => {
    const req = makeRequest(bodyOneEvent, "wrongsignature==");

    const res = await worker.fetch(req, env, ctx);

    expect(res.status).toBe(401);
    const mockSend = (env.JOBS as unknown as { send: jest.Mock }).send;
    expect(mockSend).not.toHaveBeenCalled();
  });

  test("missing x-line-signature header → 401 + NO enqueue", async () => {
    const req = makeRequest(bodyOneEvent, null);

    const res = await worker.fetch(req, env, ctx);

    expect(res.status).toBe(401);
    const mockSend = (env.JOBS as unknown as { send: jest.Mock }).send;
    expect(mockSend).not.toHaveBeenCalled();
  });

  // ---- other routes unaffected ----

  test("/health still returns 200 with phase info", async () => {
    const req = new Request("https://worker.example.com/health", { method: "GET" });
    const res = await worker.fetch(req, env, ctx);
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean };
    expect(json.ok).toBe(true);
  });
});

// ============================================================
// /oauth/x/start admin gate (FIX 3)
// ============================================================

describe("/oauth/x/start admin gate", () => {
  const ADMIN_SECRET = "super-secret-admin-key";

  /** Env with admin secret + a mock KV namespace for OAUTH_STATE */
  function makeOauthEnv(overrides: Partial<Env> = {}): Env {
    const kvPut = jest.fn().mockResolvedValue(undefined);
    return {
      ...makeEnv(),
      OAUTH_ADMIN_SECRET: ADMIN_SECRET,
      X_CLIENT_ID: "x-client-id",
      X_REDIRECT_URI: "https://worker.example.com/oauth/x/callback",
      X_OAUTH_SCOPES: "tweet.read tweet.write offline.access",
      OAUTH_STATE: { put: kvPut } as unknown as KVNamespace,
      ...overrides,
    } as Env;
  }

  function startReq(key?: string): Request {
    const u = new URL("https://worker.example.com/oauth/x/start");
    if (key !== undefined) u.searchParams.set("key", key);
    return new Request(u.toString(), { method: "GET" });
  }

  test("missing key → 401 (no KV write, no redirect)", async () => {
    const env = makeOauthEnv();
    const res = await worker.fetch(startReq(), env, makeCtx());
    expect(res.status).toBe(401);
    expect((env.OAUTH_STATE as unknown as { put: jest.Mock }).put).not.toHaveBeenCalled();
  });

  test("wrong key → 401", async () => {
    const env = makeOauthEnv();
    const res = await worker.fetch(startReq("nope"), env, makeCtx());
    expect(res.status).toBe(401);
    expect((env.OAUTH_STATE as unknown as { put: jest.Mock }).put).not.toHaveBeenCalled();
  });

  test("unset OAUTH_ADMIN_SECRET → fail CLOSED (401 even with a key)", async () => {
    const env = makeOauthEnv({ OAUTH_ADMIN_SECRET: "" });
    const res = await worker.fetch(startReq(ADMIN_SECRET), env, makeCtx());
    expect(res.status).toBe(401);
  });

  test("correct key → 302 redirect to x.com authorize + KV state stored", async () => {
    const env = makeOauthEnv();
    const res = await worker.fetch(startReq(ADMIN_SECRET), env, makeCtx());
    expect(res.status).toBe(302);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("x.com/i/oauth2/authorize");
    expect((env.OAUTH_STATE as unknown as { put: jest.Mock }).put).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// /admin/enqueue manual trigger gate
// ============================================================

describe("/admin/enqueue manual trigger", () => {
  const ADMIN_SECRET = "super-secret-admin-key";

  function adminEnv(overrides: Partial<Env> = {}): Env & { JOBS: { send: jest.Mock } } {
    return {
      ...makeEnv(),
      OAUTH_ADMIN_SECRET: ADMIN_SECRET,
      ...overrides,
    } as Env & { JOBS: { send: jest.Mock } };
  }

  function req(params: Record<string, string>): Request {
    const u = new URL("https://worker.example.com/admin/enqueue");
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    return new Request(u.toString(), { method: "GET" });
  }

  test("missing key → 401, no enqueue", async () => {
    const env = adminEnv();
    const res = await worker.fetch(req({ job: "buzz-ingest" }), env, makeCtx());
    expect(res.status).toBe(401);
    expect(env.JOBS.send).not.toHaveBeenCalled();
  });

  test("wrong key → 401", async () => {
    const env = adminEnv();
    const res = await worker.fetch(req({ job: "buzz-ingest", key: "nope" }), env, makeCtx());
    expect(res.status).toBe(401);
    expect(env.JOBS.send).not.toHaveBeenCalled();
  });

  test("unknown job → 400", async () => {
    const env = adminEnv();
    const res = await worker.fetch(req({ job: "rm-rf", key: ADMIN_SECRET }), env, makeCtx());
    expect(res.status).toBe(400);
    expect(env.JOBS.send).not.toHaveBeenCalled();
  });

  test("valid non-post job → enqueues {job,date}", async () => {
    const env = adminEnv();
    const res = await worker.fetch(req({ job: "buzz-ingest", key: ADMIN_SECRET }), env, makeCtx());
    expect(res.status).toBe(200);
    expect(env.JOBS.send).toHaveBeenCalledTimes(1);
    const msg = env.JOBS.send.mock.calls[0][0];
    expect(msg.job).toBe("buzz-ingest");
    expect(typeof msg.date).toBe("string");
    expect(msg.slot).toBeUndefined();
  });

  test("valid post job → enqueues with slot", async () => {
    const env = adminEnv();
    const res = await worker.fetch(req({ job: "post-morning", key: ADMIN_SECRET }), env, makeCtx());
    expect(res.status).toBe(200);
    const msg = env.JOBS.send.mock.calls[0][0];
    expect(msg.job).toBe("post-morning");
    expect(msg.slot).toBe("morning");
  });
});
