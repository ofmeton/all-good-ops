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
// waitUntil に渡された promise を保持し、テスト側で flush できるようにする。
// run lifecycle 配線後は enqueue が insertRun→send の deferred IIFE になるため、
// 同期アサーション前に flushWaitUntil() で待つ。
function makeCtx(): ExecutionContext & { flushWaitUntil: () => Promise<void> } {
  const pending: Promise<unknown>[] = [];
  return {
    waitUntil: (p: Promise<unknown>) => { pending.push(Promise.resolve(p)); },
    passThroughOnException: () => {},
    flushWaitUntil: () => Promise.all(pending).then(() => undefined),
  } as ExecutionContext & { flushWaitUntil: () => Promise<void> };
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
  let ctx: ReturnType<typeof makeCtx>;

  beforeEach(() => {
    env = makeEnv();
    ctx = makeCtx();
  });

  // ---- 200 path ----

  test("valid signature + 1 event → 200 + JOBS.send called once", async () => {
    const sig = makeLineSignature(bodyOneEvent, SECRET);
    const req = makeRequest(bodyOneEvent, sig);

    const res = await worker.fetch(req, env, ctx);
    await ctx.flushWaitUntil();

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
    await ctx.flushWaitUntil();

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
    const res = await worker.fetch(req({ job: "collect" }), env, makeCtx());
    expect(res.status).toBe(401);
    expect(env.JOBS.send).not.toHaveBeenCalled();
  });

  test("wrong key → 401", async () => {
    const env = adminEnv();
    const res = await worker.fetch(req({ job: "collect", key: "nope" }), env, makeCtx());
    expect(res.status).toBe(401);
    expect(env.JOBS.send).not.toHaveBeenCalled();
  });

  test("unknown job → 400", async () => {
    const env = adminEnv();
    const res = await worker.fetch(req({ job: "rm-rf", key: ADMIN_SECRET }), env, makeCtx());
    expect(res.status).toBe(400);
    expect(env.JOBS.send).not.toHaveBeenCalled();
  });

  test("bookmark-collect is not allowed via generic enqueue", async () => {
    const env = adminEnv();
    const res = await worker.fetch(req({ job: "bookmark-collect", key: ADMIN_SECRET }), env, makeCtx());
    expect(res.status).toBe(400);
    expect(env.JOBS.send).not.toHaveBeenCalled();
  });

  test("valid job → enqueues {job,date}", async () => {
    const env = adminEnv();
    const res = await worker.fetch(req({ job: "collect", key: ADMIN_SECRET }), env, makeCtx());
    expect(res.status).toBe(200);
    expect(env.JOBS.send).toHaveBeenCalledTimes(1);
    const msg = env.JOBS.send.mock.calls[0][0];
    expect(msg.job).toBe("collect");
    expect(typeof msg.date).toBe("string");
    expect(msg.slot).toBeUndefined();
  });
});

// ============================================================
// /admin/ingest-bookmarks URL-paste trigger
// ============================================================

describe("/admin/ingest-bookmarks", () => {
  const ADMIN_SECRET = "super-secret-admin-key";

  function adminEnv(overrides: Partial<Env> = {}): Env & { JOBS: { send: jest.Mock } } {
    return {
      ...makeEnv(),
      OAUTH_ADMIN_SECRET: ADMIN_SECRET,
      ...overrides,
    } as Env & { JOBS: { send: jest.Mock } };
  }

  function ingestReq(opts: { key?: string; bearer?: string; body?: BodyInit; contentType?: string } = {}): Request {
    const u = new URL("https://worker.example.com/admin/ingest-bookmarks");
    if (opts.key !== undefined) u.searchParams.set("key", opts.key);
    const headers: Record<string, string> = {};
    if (opts.bearer !== undefined) headers.authorization = `Bearer ${opts.bearer}`;
    if (opts.contentType !== undefined) headers["content-type"] = opts.contentType;
    return new Request(u.toString(), { method: "POST", headers, body: opts.body });
  }

  test("missing key → 401, no enqueue", async () => {
    const env = adminEnv();
    const res = await worker.fetch(
      ingestReq({ body: JSON.stringify({ urls: ["https://x.com/a/status/123456"] }), contentType: "application/json" }),
      env,
      makeCtx(),
    );
    expect(res.status).toBe(401);
    expect(env.JOBS.send).not.toHaveBeenCalled();
  });

  test("unset OAUTH_ADMIN_SECRET → fail CLOSED", async () => {
    const env = adminEnv({ OAUTH_ADMIN_SECRET: "" });
    const res = await worker.fetch(
      ingestReq({ key: ADMIN_SECRET, body: "https://x.com/a/status/123456", contentType: "text/plain" }),
      env,
      makeCtx(),
    );
    expect(res.status).toBe(401);
    expect(env.JOBS.send).not.toHaveBeenCalled();
  });

  test("JSON urls → enqueues bookmark-collect with parsed ids and runId", async () => {
    const env = adminEnv();
    const res = await worker.fetch(
      ingestReq({
        key: ADMIN_SECRET,
        body: JSON.stringify({ urls: ["https://x.com/a/status/123456?s=20", "junk", "123456", "https://twitter.com/b/status/234567"] }),
        contentType: "application/json",
      }),
      env,
      makeCtx(),
    );
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean; enqueued: { count: number }; runId: string };
    expect(json).toMatchObject({ ok: true, enqueued: { count: 2 } });
    expect(typeof json.runId).toBe("string");
    expect(env.JOBS.send).toHaveBeenCalledTimes(1);
    const msg = env.JOBS.send.mock.calls[0][0];
    expect(msg.job).toBe("bookmark-collect");
    expect(msg.tweetIds).toEqual(["123456", "234567"]);
    expect(msg.runId).toBe(json.runId);
  });

  test("text/plain body with Bearer auth → enqueues parsed ids", async () => {
    const env = adminEnv();
    const res = await worker.fetch(
      ingestReq({
        bearer: ADMIN_SECRET,
        body: "https://mobile.twitter.com/a/status/345678?s=1\n456789",
        contentType: "text/plain",
      }),
      env,
      makeCtx(),
    );
    expect(res.status).toBe(200);
    expect(env.JOBS.send.mock.calls[0][0].tweetIds).toEqual(["345678", "456789"]);
  });

  test("0 valid ids → 400, no enqueue", async () => {
    const env = adminEnv();
    const res = await worker.fetch(
      ingestReq({ key: ADMIN_SECRET, body: "junk\nhttps://example.com/a/status/1", contentType: "text/plain" }),
      env,
      makeCtx(),
    );
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("no valid tweet URLs");
    expect(env.JOBS.send).not.toHaveBeenCalled();
  });
});

// ============================================================
// /admin/templates registry endpoint gate (T1)
// ============================================================

describe("/admin/templates registry endpoint", () => {
  const ADMIN_SECRET = "super-secret-admin-key";

  function adminEnv(overrides: Partial<Env> = {}): Env {
    return {
      ...makeEnv(),
      OAUTH_ADMIN_SECRET: ADMIN_SECRET,
      ...overrides,
    } as Env;
  }

  function templatesReq(opts: { key?: string; bearer?: string } = {}): Request {
    const u = new URL("https://worker.example.com/admin/templates");
    if (opts.key !== undefined) u.searchParams.set("key", opts.key);
    const headers: Record<string, string> = {};
    if (opts.bearer !== undefined) headers["authorization"] = `Bearer ${opts.bearer}`;
    return new Request(u.toString(), { method: "GET", headers });
  }

  test("missing key → 401", async () => {
    const res = await worker.fetch(templatesReq(), adminEnv(), makeCtx());
    expect(res.status).toBe(401);
  });

  test("wrong key → 401", async () => {
    const res = await worker.fetch(templatesReq({ key: "nope" }), adminEnv(), makeCtx());
    expect(res.status).toBe(401);
  });

  test("unset OAUTH_ADMIN_SECRET → fail CLOSED (401 even with a key)", async () => {
    const env = adminEnv({ OAUTH_ADMIN_SECRET: "" });
    const res = await worker.fetch(templatesReq({ key: ADMIN_SECRET }), env, makeCtx());
    expect(res.status).toBe(401);
  });

  test("valid key (query) → 200 + templates shape", async () => {
    const res = await worker.fetch(templatesReq({ key: ADMIN_SECRET }), adminEnv(), makeCtx());
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      templates: Array<{ id: string; name: string; description: string; preferredFmats?: string[] }>;
    };
    expect(Array.isArray(json.templates)).toBe(true);
    expect(json.templates.length).toBeGreaterThanOrEqual(2);
    const gold = json.templates.find((t) => t.id === "template_chaen_gold");
    expect(gold).toBeDefined();
    expect(typeof gold!.name).toBe("string");
    expect(typeof gold!.description).toBe("string");
    // summary だけ（systemPromptPatch 等の本文は漏らさない）
    expect((gold as Record<string, unknown>).systemPromptPatch).toBeUndefined();
  });

  test("valid key (Bearer header) → 200", async () => {
    const res = await worker.fetch(templatesReq({ bearer: ADMIN_SECRET }), adminEnv(), makeCtx());
    expect(res.status).toBe(200);
  });
});
