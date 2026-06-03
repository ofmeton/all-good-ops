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

// post_drafts select chain (approve path): .select(...).eq('id', id).maybeSingle()
// post_drafts select chain (revise path): .select(...).eq(status).is(published_at).order().limit().maybeSingle()
// Both terminate in maybeSingle → share mockDraftMaybeSingle; intermediate links are chainable.
const mockDraftMaybeSingle = jest.fn();
const mockDraftReviseChain: Record<string, jest.Mock> = {};
mockDraftReviseChain.eq = jest.fn(() => mockDraftReviseChain);
mockDraftReviseChain.is = jest.fn(() => mockDraftReviseChain);
mockDraftReviseChain.order = jest.fn(() => mockDraftReviseChain);
mockDraftReviseChain.limit = jest.fn(() => mockDraftReviseChain);
mockDraftReviseChain.maybeSingle = mockDraftMaybeSingle;
const mockDraftSelect = jest.fn(() => mockDraftReviseChain);

// post_drafts upsert (revise persistDraft)
const mockDraftUpsert = jest.fn().mockResolvedValue({ error: null });

// core_ideas select chain (revise loadCoreIdeaForRevise): .select().eq().maybeSingle()
const mockIdeaSelectMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
const mockIdeaSelectEq = jest.fn(() => ({ maybeSingle: mockIdeaSelectMaybeSingle }));
const mockIdeaSelect = jest.fn(() => ({ eq: mockIdeaSelectEq }));

// post_drafts claim update chain (FIX 1):
//   .update({published_at, human_approval_status}).eq('id', id).is('published_at', null).select('id')
// Returns { data: [{id}], error: null } by default (claim succeeds, 1 row returned).
const mockDraftClaimSelect = jest.fn().mockResolvedValue({ data: [{ id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee" }], error: null });
const mockDraftClaimIs = jest.fn(() => ({ select: mockDraftClaimSelect }));
const mockDraftClaimEq = jest.fn(() => ({ is: mockDraftClaimIs, select: mockDraftClaimSelect, eq: mockDraftClaimEq }));

// post_drafts rollback update chain (FIX 1 rollback):
//   .update({published_at: null, human_approval_status: priorStatus}).eq('id', id)
// Separate mock so we can check rollback was (not) called.
const mockDraftRollbackEq = jest.fn().mockResolvedValue({ error: null });
const mockDraftRollback = jest.fn(() => ({ eq: mockDraftRollbackEq }));

// post_drafts reject update chain (FIX 2):
//   .update({human_approval_status: 'rejected'}).eq('id', id).select('id, core_idea_id')
const mockDraftRejectSelect = jest.fn().mockResolvedValue({
  data: [{ id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", core_idea_id: "11111111-2222-4333-8444-555555555555" }],
  error: null,
});
const mockDraftRejectEq = jest.fn(() => ({ select: mockDraftRejectSelect }));
const mockDraftReject = jest.fn(() => ({ eq: mockDraftRejectEq }));

// Track which update is being called (claim vs rollback vs reject)
// We use a call counter: first update = claim (approve path) OR reject (reject path).
// To simplify: use a single mockDraftUpdate that dispatches based on call args.
let _updateCallCount = 0;
const mockDraftUpdate = jest.fn((updateArg: Record<string, unknown>) => {
  _updateCallCount++;
  // If the update arg has human_approval_status='rejected' → reject path
  if (updateArg.human_approval_status === "rejected") {
    return mockDraftReject(updateArg);
  }
  // If the update arg has published_at=null → rollback path
  if (updateArg.published_at === null) {
    return mockDraftRollback(updateArg);
  }
  // Otherwise → claim path (published_at is set to nowIso)
  return { eq: mockDraftClaimEq };
});

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
          upsert: mockDraftUpsert,
        };
      }
      if (table === "posted_records") {
        return { insert: mockPostedInsert };
      }
      if (table === "core_ideas") {
        return { update: mockIdeaUpdate, select: mockIdeaSelect };
      }
      if (table === "style_feedback") {
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
          select: jest.fn(() => ({
            order: jest.fn(() => ({ limit: jest.fn().mockResolvedValue({ data: [], error: null }) })),
          })),
        };
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

// ---- 2. mock pushLine + pushLineFlex ----
const mockPushLine = jest.fn().mockResolvedValue(undefined);
const mockPushLineFlex = jest.fn().mockResolvedValue(undefined);
jest.mock("../../lib/line/line-client.ts", () => ({
  pushLine: (...args: unknown[]) => mockPushLine(...args),
  pushLineFlex: (...args: unknown[]) => mockPushLineFlex(...args),
}));

// ---- 2b. mock style-feedback ----
const mockAddStyleFeedback = jest.fn().mockResolvedValue(undefined);
const mockGetRecentStyleFeedback = jest.fn().mockResolvedValue([]);
jest.mock("../../lib/feedback/style-feedback.ts", () => ({
  addStyleFeedback: (...args: unknown[]) => mockAddStyleFeedback(...args),
  getRecentStyleFeedback: (...args: unknown[]) => mockGetRecentStyleFeedback(...args),
}));

// ---- 2c. mock writer reviseDraftForX ----
const mockReviseDraftForX = jest.fn();
jest.mock("../../lib/writer/writer-x.ts", () => ({
  reviseDraftForX: (...args: unknown[]) => mockReviseDraftForX(...args),
}));

// ---- 2d. mock runEditor ----
const mockRunEditor = jest.fn();
jest.mock("../../lib/editor/pipeline.ts", () => ({
  runEditor: (...args: unknown[]) => mockRunEditor(...args),
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
    _updateCallCount = 0;
    fakeFetch = makeFakeFetch(TWEET_ID) as jest.Mock;
    __setFetchImpl(fakeFetch as typeof fetch);

    mockDraftMaybeSingle.mockResolvedValue({ data: fakeDraftRow, error: null });
    // Claim succeeds: 1 row returned
    mockDraftClaimSelect.mockResolvedValue({ data: [{ id: DRAFT_ID }], error: null });
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

  test("approve → claim update sets human_approval_status='approved' + published_at (ISO)", async () => {
    const payload = {
      type: "postback",
      postback: { data: `approve:${DRAFT_ID}` },
      source: { type: "user", userId: "U_admin_test" },
    };

    await handleLineEvent(payload, makeEnv());

    // The claim update (first update call) must set both fields atomically
    expect(mockDraftUpdate).toHaveBeenCalled();
    const claimUpdateArg = mockDraftUpdate.mock.calls[0][0];
    expect(claimUpdateArg.human_approval_status).toBe("approved");
    expect(typeof claimUpdateArg.published_at).toBe("string"); // ISO timestamp
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

  // FIX 1: claim returns 0 rows → another invocation already claimed → publishToX NOT called
  test("FIX1: claim returns 0 rows (concurrent retry) → publishToX NOT called, 'already processed' notice sent", async () => {
    // Simulate claim returning 0 rows (another invocation claimed it first)
    mockDraftClaimSelect.mockResolvedValueOnce({ data: [], error: null });

    const payload = {
      type: "postback",
      postback: { data: `approve:${DRAFT_ID}` },
      source: { type: "user", userId: "U_admin_test" },
    };

    await handleLineEvent(payload, makeEnv());

    // X API must NOT be called
    expect(fakeFetch).not.toHaveBeenCalled();
    // posted_records must NOT be inserted
    expect(mockPostedInsert).not.toHaveBeenCalled();
    // core_ideas must NOT be updated to published
    expect(mockIdeaUpdate).not.toHaveBeenCalled();
    // A "already processed" LINE message must have been sent
    expect(mockPushLine).toHaveBeenCalledTimes(1);
    const [, message] = mockPushLine.mock.calls[0];
    expect(message).toMatch(/既に処理済み|既に公開済/);
  });
});

// ============================================================
// Test (b): reject postback
// ============================================================
describe("handleLineEvent — reject postback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _updateCallCount = 0;
    __setFetchImpl(makeFakeFetch(TWEET_ID) as typeof fetch);

    mockDraftMaybeSingle.mockResolvedValue({ data: fakeDraftRow, error: null });
    // Reject update returns the draft row with core_idea_id
    mockDraftRejectSelect.mockResolvedValue({
      data: [{ id: DRAFT_ID, core_idea_id: CORE_IDEA_ID }],
      error: null,
    });
    mockIdeaUpdateEq.mockResolvedValue({ error: null });
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

    // LINE push for acknowledgement
    expect(mockPushLine).toHaveBeenCalled();
  });

  // FIX 2: reject → core_ideas.status reverts to 'draft'
  test("FIX2: reject → core_ideas.status reverted to 'draft' so idea re-enters queue", async () => {
    const payload = {
      type: "postback",
      postback: { data: `reject:${DRAFT_ID}` },
      source: { type: "user", userId: "U_admin_test" },
    };

    await handleLineEvent(payload, makeEnv());

    // core_ideas.status must be set back to 'draft'
    expect(mockIdeaUpdate).toHaveBeenCalledTimes(1);
    const ideaUpdateArg = mockIdeaUpdate.mock.calls[0][0];
    expect(ideaUpdateArg.status).toBe("draft");
    expect(mockIdeaUpdateEq).toHaveBeenCalledWith("id", CORE_IDEA_ID);
  });
});

// ============================================================
// Test (c): idempotency — already published
// ============================================================
describe("handleLineEvent — idempotency (already published)", () => {
  let fakeFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    _updateCallCount = 0;
    fakeFetch = makeFakeFetch(TWEET_ID) as jest.Mock;
    __setFetchImpl(fakeFetch as typeof fetch);

    // Draft already has published_at set → idempotent fast-path no-op
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
    _updateCallCount = 0;
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
    _updateCallCount = 0;
    fakeFetch = makeFakeFetch(TWEET_ID) as jest.Mock;
    __setFetchImpl(fakeFetch as typeof fetch);

    mockDraftMaybeSingle.mockResolvedValue({ data: fakeDraftRow, error: null });
    mockDraftClaimSelect.mockResolvedValue({ data: [{ id: DRAFT_ID }], error: null });
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

// ============================================================
// Test (f): 覚えて: <text> → addStyleFeedback(remember), reply, no draft
// ============================================================
describe("handleLineEvent — 覚えて (remember feedback)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _updateCallCount = 0;
  });

  test("覚えて: コマンド → addStyleFeedback(remember) + ack push, no draft lookup", async () => {
    const payload = {
      type: "message",
      message: { type: "text", text: "覚えて: 絵文字は控えめにして" },
      source: { type: "user", userId: "U_admin_test" },
    };

    await handleLineEvent(payload, makeEnv());

    expect(mockAddStyleFeedback).toHaveBeenCalledTimes(1);
    const [, kind, body] = mockAddStyleFeedback.mock.calls[0];
    expect(kind).toBe("remember");
    expect(body).toBe("絵文字は控えめにして");

    // ack push
    expect(mockPushLine).toHaveBeenCalledTimes(1);
    expect(mockPushLine.mock.calls[0][1]).toContain("覚えました");

    // no revise → no draft select / no flex card
    expect(mockReviseDraftForX).not.toHaveBeenCalled();
    expect(mockPushLineFlex).not.toHaveBeenCalled();
  });

  test("全角コロン「覚えて：」も受け付ける", async () => {
    const payload = {
      type: "message",
      message: { type: "text", text: "覚えて：もっと具体例を入れて" },
      source: { type: "user", userId: "U_admin_test" },
    };

    await handleLineEvent(payload, makeEnv());

    expect(mockAddStyleFeedback).toHaveBeenCalledTimes(1);
    expect(mockAddStyleFeedback.mock.calls[0][2]).toBe("もっと具体例を入れて");
  });
});

// ============================================================
// Test (g): 修正: <text> → revise latest pending draft, re-edit, re-send
// ============================================================
describe("handleLineEvent — 修正 (revise feedback)", () => {
  const REVISE_DRAFT_ROW = {
    id: DRAFT_ID,
    core_idea_id: CORE_IDEA_ID,
    body: "元の本文です。",
    fmat: "medium",
    scheduled_date: "2026-06-03",
    slot: "morning",
  };

  const revisedDraft = {
    draftId: "draft-revised-1",
    body: "修正後の本文です。",
    primaryHook: "tips_enum",
    estimatedScore: 0.7,
    llmCostUsd: 0.001,
    generator: "anthropic-sonnet-4.6",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    _updateCallCount = 0;
    mockReviseDraftForX.mockResolvedValue(revisedDraft);
    mockDraftUpsert.mockResolvedValue({ error: null });
    // core_ideas lookup returns a row
    mockIdeaSelectMaybeSingle.mockResolvedValue({
      data: {
        id: CORE_IDEA_ID,
        topic: "AI 自動化",
        fmat: "medium",
        category: "first_hand",
        audience: "経営者",
        source_material_ids: [],
        meta: {},
      },
      error: null,
    });
  });

  test("修正: → latest pending draft revised, editor re-run, approved → Flex re-sent + feedback stored", async () => {
    mockDraftMaybeSingle.mockResolvedValue({ data: REVISE_DRAFT_ROW, error: null });
    mockRunEditor.mockResolvedValue(fakeEditorOutput);

    const payload = {
      type: "message",
      message: { type: "text", text: "修正: もっと短く" },
      source: { type: "user", userId: "U_admin_test" },
    };

    await handleLineEvent(payload, makeEnv());

    // revised with the instruction
    expect(mockReviseDraftForX).toHaveBeenCalledTimes(1);
    const [origBody, instruction] = mockReviseDraftForX.mock.calls[0];
    expect(origBody).toBe(REVISE_DRAFT_ROW.body);
    expect(instruction).toBe("もっと短く");

    // editor re-run on revised body
    expect(mockRunEditor).toHaveBeenCalledTimes(1);
    expect(mockRunEditor.mock.calls[0][0].body).toBe(revisedDraft.body);

    // same row upserted (same id)
    expect(mockDraftUpsert).toHaveBeenCalledTimes(1);
    expect(mockDraftUpsert.mock.calls[0][0].id).toBe(DRAFT_ID);

    // revise instruction stored as feedback
    expect(mockAddStyleFeedback).toHaveBeenCalledTimes(1);
    expect(mockAddStyleFeedback.mock.calls[0][1]).toBe("revise");
    expect(mockAddStyleFeedback.mock.calls[0][2]).toBe("もっと短く");
    expect(mockAddStyleFeedback.mock.calls[0][3]).toBe(DRAFT_ID);

    // approved → Flex re-sent
    expect(mockPushLineFlex).toHaveBeenCalledTimes(1);
    const flexJson = JSON.stringify(mockPushLineFlex.mock.calls[0][2]);
    expect(flexJson).toContain(`approve:${DRAFT_ID}`);
  });

  test("修正: → no pending draft found → '見つかりません'", async () => {
    mockDraftMaybeSingle.mockResolvedValue({ data: null, error: null });

    const payload = {
      type: "message",
      message: { type: "text", text: "修正: もっと短く" },
      source: { type: "user", userId: "U_admin_test" },
    };

    await handleLineEvent(payload, makeEnv());

    expect(mockReviseDraftForX).not.toHaveBeenCalled();
    expect(mockPushLine).toHaveBeenCalledTimes(1);
    expect(mockPushLine.mock.calls[0][1]).toContain("見つかりません");
  });

  test("修正: → editor rejects revised → reject reason replied, no Flex card", async () => {
    mockDraftMaybeSingle.mockResolvedValue({ data: REVISE_DRAFT_ROW, error: null });
    mockRunEditor.mockResolvedValue({
      ...fakeEditorOutput,
      decision: "rejected",
      rejectReasons: ["R1_workflow_theme"],
    });

    const payload = {
      type: "message",
      message: { type: "text", text: "修正：攻撃的に" },
      source: { type: "user", userId: "U_admin_test" },
    };

    await handleLineEvent(payload, makeEnv());

    expect(mockReviseDraftForX).toHaveBeenCalledTimes(1);
    expect(mockPushLineFlex).not.toHaveBeenCalled();
    expect(mockPushLine).toHaveBeenCalledTimes(1);
    expect(mockPushLine.mock.calls[0][1]).toContain("却下");
    // feedback still stored
    expect(mockAddStyleFeedback).toHaveBeenCalledTimes(1);
  });

  test("修正/覚えて from attacker → no-op (auth gate)", async () => {
    mockDraftMaybeSingle.mockResolvedValue({ data: REVISE_DRAFT_ROW, error: null });

    const payload = {
      type: "message",
      message: { type: "text", text: "修正: もっと短く" },
      source: { type: "user", userId: "U_attacker" },
    };

    await handleLineEvent(payload, makeEnv());

    expect(mockReviseDraftForX).not.toHaveBeenCalled();
    expect(mockAddStyleFeedback).not.toHaveBeenCalled();
  });
});
