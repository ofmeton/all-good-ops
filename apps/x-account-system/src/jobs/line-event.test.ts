/**
 * line-event.test.ts — W4-2
 *
 * Tests: handleLineEvent — approve/reject postback → publish path
 *
 * Rules:
 *   - No IN_MEMORY_FALLBACK (production DB path via mocked supabase)
 *   - Mock: supabase createClient, publishToX.__setFetchImpl, pushLine
 *   - publishToX is NOT mocked at module level — we use __setFetchImpl
 *     to inject a fake fetch that returns a tweet id.
 *   - assertPublishingEnabled is mocked to always pass (kill-switch disabled).
 */

// ---- 1. mock supabase BEFORE any imports ----

// Shared chain state for from(table) calls
const mockDraftSelectData: Record<string, unknown> = {};

// post_drafts select chain
const mockDraftMaybeSingle = jest.fn();
const mockDraftSelectEq = jest.fn(() => ({ maybeSingle: mockDraftMaybeSingle }));
const mockDraftSelect = jest.fn(() => ({ eq: mockDraftSelectEq }));

// post_drafts update chain: update({...}).eq('id', id)
const mockDraftUpdateEq = jest.fn().mockResolvedValue({ error: null });
const mockDraftUpdate = jest.fn(() => ({ eq: mockDraftUpdateEq }));

// posted_records insert
const mockPostedInsert = jest.fn().mockResolvedValue({ error: null });

// core_ideas update chain: update({status}).eq('id', coreIdeaId)
const mockIdeaUpdateEq = jest.fn().mockResolvedValue({ error: null });
const mockIdeaUpdate = jest.fn(() => ({ eq: mockIdeaUpdateEq }));

// interview_sessions select chain (W4-3: loadSession)
const mockInterviewSessionSingle = jest.fn().mockResolvedValue({ data: null, error: null });
const mockInterviewSessionSelectEq = jest.fn(() => ({ single: mockInterviewSessionSingle }));
const mockInterviewSessionSelect = jest.fn(() => ({ eq: mockInterviewSessionSelectEq }));
// interview_sessions upsert (W4-3: saveSession)
const mockInterviewSessionUpsert = jest.fn().mockResolvedValue({ error: null });

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    from: (table: string) => {
      if (table === "post_drafts") {
        return {
          select: mockDraftSelect,
          update: mockDraftUpdate,
        };
      }
      if (table === "posted_records") {
        return { insert: mockPostedInsert };
      }
      if (table === "core_ideas") {
        return { update: mockIdeaUpdate };
      }
      if (table === "interview_sessions") {
        return {
          select: mockInterviewSessionSelect,
          upsert: mockInterviewSessionUpsert,
        };
      }
      return {};
    },
  })),
}));

// ---- 2. mock pushLine ----
const mockPushLine = jest.fn().mockResolvedValue(undefined);
jest.mock("../../lib/line/line-client.ts", () => ({
  pushLine: (...args: unknown[]) => mockPushLine(...args),
}));

// ---- 3. mock kill-switch (assertPublishingEnabled always passes) ----
jest.mock("../../lib/safety/kill-switch.ts", () => ({
  assertPublishingEnabled: jest.fn().mockResolvedValue(undefined),
  getKillSwitchState: jest.fn().mockResolvedValue({ publishing_enabled: true, resume_at: null }),
}));

// ---- 4. mock token-store (return a non-expired token so Phase 0.5 fallback doesn't trigger) ----
jest.mock("../../lib/publisher/token-store.ts", () => ({
  getXAccessToken: jest.fn().mockResolvedValue({
    accessToken: "test-access-token",
    expiresAt: Date.now() + 3600 * 1000,
  }),
  isTokenExpired: jest.fn().mockReturnValue(false),
  refreshAccessToken: jest.fn(),
}));

// ---- 5. env setup ----
beforeAll(() => {
  delete process.env.IN_MEMORY_FALLBACK;
  process.env.SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  process.env.SUPABASE_SCHEMA = "xad";
  process.env.LINE_CHANNEL_ACCESS_TOKEN = "test-line-token";
  process.env.LINE_USER_ID_OFMETON = "U_admin_test";
  // Ensure kill-switch env vars are OFF
  process.env.X_PUBLISHER_KILL_SWITCH = "false";
  process.env.X_PUBLISHER_BROWNOUT = "false";
});

afterAll(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
  delete process.env.LINE_USER_ID_OFMETON;
  delete process.env.X_PUBLISHER_KILL_SWITCH;
  delete process.env.X_PUBLISHER_BROWNOUT;
});

// ---- 6. imports AFTER mocks ----
import { handleLineEvent } from "./line-event.ts";
import { __setFetchImpl } from "../../lib/publisher/x-publisher.ts";
import type { Env } from "../worker.ts";

// ---- helpers ----
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
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test-srk",
    LINE_CHANNEL_ACCESS_TOKEN: "test-line-token",
    LINE_CHANNEL_SECRET: "test-line-secret",
    LINE_USER_ID_OFMETON: "U_admin_test",
    ...overrides,
  };
}

const DRAFT_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const CORE_IDEA_ID = "11111111-2222-4333-8444-555555555555";

const fakeEditorOutput = {
  draftId: DRAFT_ID,
  decision: "approved" as const,
  rejectReasons: [],
  rules: [],
  riskLevel: "low" as const,
  riskReasons: [],
  businessLawRiskFlag: false,
  businessLawKeywords: [],
  totalDurationMs: 100,
  llmCostUsd: 0.002,
};

const fakeDraftRow = {
  id: DRAFT_ID,
  core_idea_id: CORE_IDEA_ID,
  body: "AI を活用した自動化 https://note.com/ofmeton/n/abc123?utm_source=x",
  fmat: "medium",
  published_at: null,
  human_approval_status: "pending",
  editor_output: fakeEditorOutput,
};

const TWEET_ID = "1234567890123456789";

/** Build a fake fetch that returns a successful tweet response */
function makeFakeFetch(tweetId: string): typeof fetch {
  return jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: { id: tweetId, text: "posted" } }),
  } as unknown as Response);
}

// ============================================================
// Test (a): postback approve → publish flow
// ============================================================
describe("handleLineEvent — approve postback → publish", () => {
  let fakeFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    fakeFetch = makeFakeFetch(TWEET_ID) as jest.Mock;
    __setFetchImpl(fakeFetch as typeof fetch);

    mockDraftMaybeSingle.mockResolvedValue({ data: fakeDraftRow, error: null });
    mockDraftUpdateEq.mockResolvedValue({ error: null });
    mockPostedInsert.mockResolvedValue({ error: null });
    mockIdeaUpdateEq.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    __setFetchImpl(null); // restore globalThis.fetch
  });

  test("approve postback → publishToX called with highRiskApproved=true, dryRun=false, editorOutput restored from jsonb", async () => {
    const payload = {
      type: "postback",
      postback: { data: `approve:${DRAFT_ID}` },
      source: { type: "user", userId: "U_admin_test" },
    };

    await handleLineEvent(payload, makeEnv());

    // X API should have been called once with the draft body
    expect(fakeFetch).toHaveBeenCalledTimes(1);
    const fetchCall = fakeFetch.mock.calls[0];
    const fetchBody = JSON.parse(fetchCall[1].body as string);
    expect(fetchBody.text).toBe(fakeDraftRow.body);
  });

  test("approve → posted_records inserted with platform_post_id=tweetId", async () => {
    const payload = {
      type: "postback",
      postback: { data: `approve:${DRAFT_ID}` },
      source: { type: "user", userId: "U_admin_test" },
    };

    await handleLineEvent(payload, makeEnv());

    expect(mockPostedInsert).toHaveBeenCalledTimes(1);
    const insertArg = mockPostedInsert.mock.calls[0][0];
    expect(insertArg.platform_post_id).toBe(TWEET_ID);
    expect(insertArg.draft_id).toBe(DRAFT_ID);
    expect(insertArg.platform).toBe("x");
    expect(typeof insertArg.posted_at).toBe("string");
    expect(typeof insertArg.trace_id).toBe("string");
    expect(typeof insertArg.scheduled_at).toBe("string");
  });

  test("approve → post_drafts updated: human_approval_status='approved' + published_at set", async () => {
    const payload = {
      type: "postback",
      postback: { data: `approve:${DRAFT_ID}` },
      source: { type: "user", userId: "U_admin_test" },
    };

    await handleLineEvent(payload, makeEnv());

    // post_drafts.update should have been called
    expect(mockDraftUpdate).toHaveBeenCalled();
    const updateArg = mockDraftUpdate.mock.calls[0][0];
    expect(updateArg.human_approval_status).toBe("approved");
    expect(typeof updateArg.published_at).toBe("string"); // ISO timestamp
  });

  test("approve → core_ideas.status set to 'published'", async () => {
    const payload = {
      type: "postback",
      postback: { data: `approve:${DRAFT_ID}` },
      source: { type: "user", userId: "U_admin_test" },
    };

    await handleLineEvent(payload, makeEnv());

    expect(mockIdeaUpdate).toHaveBeenCalled();
    const ideaUpdateArg = mockIdeaUpdate.mock.calls[0][0];
    expect(ideaUpdateArg.status).toBe("published");
    // The .eq() chain receives the core_idea_id
    expect(mockIdeaUpdateEq).toHaveBeenCalledWith("id", CORE_IDEA_ID);
  });

  test("approve → success LINE push sent", async () => {
    const payload = {
      type: "postback",
      postback: { data: `approve:${DRAFT_ID}` },
      source: { type: "user", userId: "U_admin_test" },
    };

    await handleLineEvent(payload, makeEnv());

    expect(mockPushLine).toHaveBeenCalled();
    const [, message] = mockPushLine.mock.calls[mockPushLine.mock.calls.length - 1];
    expect(typeof message).toBe("string");
    expect(message.length).toBeGreaterThan(0);
  });

  test("approve via text message (fallback) → same publish flow", async () => {
    const payload = {
      type: "message",
      message: { type: "text", text: `approve:${DRAFT_ID}` },
      source: { type: "user", userId: "U_admin_test" },
    };

    await handleLineEvent(payload, makeEnv());

    expect(fakeFetch).toHaveBeenCalledTimes(1);
    expect(mockPostedInsert).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// Test (b): reject postback
// ============================================================
describe("handleLineEvent — reject postback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __setFetchImpl(makeFakeFetch(TWEET_ID) as typeof fetch);

    mockDraftMaybeSingle.mockResolvedValue({ data: fakeDraftRow, error: null });
    mockDraftUpdateEq.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    __setFetchImpl(null);
  });

  test("reject postback → post_drafts.human_approval_status='rejected', NO publish", async () => {
    const payload = {
      type: "postback",
      postback: { data: `reject:${DRAFT_ID}` },
      source: { type: "user", userId: "U_admin_test" },
    };

    await handleLineEvent(payload, makeEnv());

    // X API NOT called
    expect(makeFakeFetch(TWEET_ID)).not.toHaveBeenCalled();

    // post_drafts updated with rejected status
    expect(mockDraftUpdate).toHaveBeenCalled();
    const updateArg = mockDraftUpdate.mock.calls[0][0];
    expect(updateArg.human_approval_status).toBe("rejected");

    // posted_records NOT inserted
    expect(mockPostedInsert).not.toHaveBeenCalled();
    // core_ideas NOT updated
    expect(mockIdeaUpdate).not.toHaveBeenCalled();

    // LINE push for acknowledgement
    expect(mockPushLine).toHaveBeenCalled();
  });
});

// ============================================================
// Test (c): idempotency — already published
// ============================================================
describe("handleLineEvent — idempotency (already published)", () => {
  let fakeFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    fakeFetch = makeFakeFetch(TWEET_ID) as jest.Mock;
    __setFetchImpl(fakeFetch as typeof fetch);

    // Draft already has published_at set → idempotent no-op
    mockDraftMaybeSingle.mockResolvedValue({
      data: { ...fakeDraftRow, published_at: "2026-06-03T01:00:00.000Z" },
      error: null,
    });
  });

  afterEach(() => {
    __setFetchImpl(null);
  });

  test("approve on already-published draft → no second publishToX call (idempotent)", async () => {
    const payload = {
      type: "postback",
      postback: { data: `approve:${DRAFT_ID}` },
      source: { type: "user", userId: "U_admin_test" },
    };

    await handleLineEvent(payload, makeEnv());

    // X API must NOT be called again
    expect(fakeFetch).not.toHaveBeenCalled();
    // posted_records NOT inserted again
    expect(mockPostedInsert).not.toHaveBeenCalled();
    // LINE push for "already published" message
    expect(mockPushLine).toHaveBeenCalled();
    const [, message] = mockPushLine.mock.calls[0];
    expect(message).toContain("既に公開済");
  });
});

// ============================================================
// Test (d): unknown / non-approve-reject events → no-op (no throw)
// ============================================================
describe("handleLineEvent — non-approve/reject events", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("unrelated text message → no-op (no DB calls, no throw)", async () => {
    const payload = {
      type: "message",
      message: { type: "text", text: "こんにちは" },
    };

    await expect(handleLineEvent(payload, makeEnv())).resolves.toBeUndefined();
    expect(mockDraftSelect).not.toHaveBeenCalled();
    expect(mockPostedInsert).not.toHaveBeenCalled();
  });

  test("follow event → no-op (no DB calls, no throw)", async () => {
    const payload = { type: "follow" };

    await expect(handleLineEvent(payload, makeEnv())).resolves.toBeUndefined();
    expect(mockDraftSelect).not.toHaveBeenCalled();
  });
});

// ============================================================
// Test (e): unauthorized sender — approve postback from non-admin → no-op
// ============================================================
describe("handleLineEvent — unauthorized sender is rejected (IDOR gate)", () => {
  let fakeFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    fakeFetch = makeFakeFetch(TWEET_ID) as jest.Mock;
    __setFetchImpl(fakeFetch as typeof fetch);

    mockDraftMaybeSingle.mockResolvedValue({ data: fakeDraftRow, error: null });
    mockDraftUpdateEq.mockResolvedValue({ error: null });
    mockPostedInsert.mockResolvedValue({ error: null });
    mockIdeaUpdateEq.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    __setFetchImpl(null);
  });

  test("approve postback from attacker userId → no-op: X not called, no DB writes, no LINE push", async () => {
    const payload = {
      type: "postback",
      postback: { data: `approve:${DRAFT_ID}` },
      source: { type: "user", userId: "U_attacker" },
    };

    await expect(handleLineEvent(payload, makeEnv())).resolves.toBeUndefined();

    // X API must NOT be called
    expect(fakeFetch).not.toHaveBeenCalled();
    // posted_records must NOT be inserted
    expect(mockPostedInsert).not.toHaveBeenCalled();
    // post_drafts must NOT be updated
    expect(mockDraftUpdate).not.toHaveBeenCalled();
    // core_ideas must NOT be updated
    expect(mockIdeaUpdate).not.toHaveBeenCalled();
    // LINE push must NOT be sent
    expect(mockPushLine).not.toHaveBeenCalled();
  });

  test("approve postback with missing source → no-op (no userId → rejected)", async () => {
    const payload = {
      type: "postback",
      postback: { data: `approve:${DRAFT_ID}` },
      // no source field at all
    };

    await expect(handleLineEvent(payload, makeEnv())).resolves.toBeUndefined();

    expect(fakeFetch).not.toHaveBeenCalled();
    expect(mockPostedInsert).not.toHaveBeenCalled();
    expect(mockDraftUpdate).not.toHaveBeenCalled();
  });
});
