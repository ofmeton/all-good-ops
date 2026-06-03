/**
 * post-job.test.ts — W3-2
 *
 * Tests: runPostJob (idea→draft→editor→LINE承認)
 *
 * Rules:
 *   - No IN_MEMORY_FALLBACK (we test production DB path via mocked supabase)
 *   - Mock: draftForX, runEditor, pushLine, getKillSwitchState, supabase createClient
 */

// ---- 1. mock supabase BEFORE any imports ----

// Upsert mock for post_drafts
const mockUpsert = jest.fn().mockResolvedValue({ error: null });

// Update mock for core_ideas (dequeue) — FIX 3: must verify claimed row via .select("id")
// Chain: .update({status:'approved'}).eq("id", row.id).eq("status","draft").select("id")
// Returns { data: [{id: 'idea-uuid-001'}], error: null } by default (claim succeeds).
const mockDequeueClaimSelect = jest.fn().mockResolvedValue({ data: [{ id: "idea-uuid-001" }], error: null });
const mockUpdateEq2 = jest.fn(() => ({ select: mockDequeueClaimSelect }));
const mockUpdateEq = jest.fn(() => ({ eq: mockUpdateEq2 }));
const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));

// Select mock for core_ideas
const mockSingleRow = jest.fn();
const mockSelectLimit = jest.fn(() => ({ maybeSingle: mockSingleRow }));
const mockSelectEq = jest.fn(() => ({ limit: mockSelectLimit }));
const mockSelectSelectChain = jest.fn(() => ({ eq: mockSelectEq }));

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    from: (table: string) => {
      if (table === "post_drafts") return { upsert: mockUpsert };
      if (table === "core_ideas") return {
        select: jest.fn(() => ({ eq: mockSelectEq })),
        update: mockUpdate,
      };
      return {};
    },
  })),
}));

// ---- 2. mock draftForX ----
const mockDraftForX = jest.fn();
jest.mock("../../lib/writer/writer-x.ts", () => ({
  draftForX: (...args: unknown[]) => mockDraftForX(...args),
}));

// ---- 3. mock runEditor ----
const mockRunEditor = jest.fn();
jest.mock("../../lib/editor/pipeline.ts", () => ({
  runEditor: (...args: unknown[]) => mockRunEditor(...args),
}));

// ---- 4. mock pushLine + pushLineFlex ----
const mockPushLine = jest.fn().mockResolvedValue(undefined);
const mockPushLineFlex = jest.fn().mockResolvedValue(undefined);
jest.mock("../../lib/line/line-client.ts", () => ({
  pushLine: (...args: unknown[]) => mockPushLine(...args),
  pushLineFlex: (...args: unknown[]) => mockPushLineFlex(...args),
}));

// ---- 4b. mock style-feedback (no DB) ----
jest.mock("../../lib/feedback/style-feedback.ts", () => ({
  getRecentStyleFeedback: jest.fn().mockResolvedValue([]),
  addStyleFeedback: jest.fn().mockResolvedValue(undefined),
}));

// ---- 5. mock kill-switch ----
const mockGetKillSwitchState = jest.fn();
jest.mock("../../lib/safety/kill-switch.ts", () => ({
  getKillSwitchState: (...args: unknown[]) => mockGetKillSwitchState(...args),
}));

// ---- 6. env setup ----
beforeAll(() => {
  delete process.env.IN_MEMORY_FALLBACK;
  process.env.SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  process.env.SUPABASE_SCHEMA = "xad";
  process.env.LINE_CHANNEL_ACCESS_TOKEN = "test-line-token";
  process.env.LINE_USER_ID_OFMETON = "U_admin_test";
});

afterAll(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
  delete process.env.LINE_USER_ID_OFMETON;
});

// ---- 7. imports AFTER mocks ----
import { runPostJob } from "./post-job.ts";
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

const fakeCoreIdeaRow = {
  id: "idea-uuid-001",
  topic: "AI 自動化でコスト削減",
  primary_hook: "tips_enum",
  fmat: "medium",
  category: "first_hand",
  audience: "中小企業の経営者",
  source_material_ids: ["mat-001"],
  meta: {},
};

const fakeDraftOutput = {
  draftId: `draft-idea-uuid-001-${Date.now()}`,  // non-UUID writer id
  body: "AI を活用して業務自動化した結果、月30万円の節約に成功。",
  primaryHook: "tips_enum" as const,
  estimatedScore: 0.7,
  llmCostUsd: 0.001,
  generator: "stub" as const,
};

const fakeEditorOutputApproved = {
  draftId: "will-be-replaced",
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

const fakeEditorOutputRejected = {
  ...fakeEditorOutputApproved,
  decision: "rejected" as const,
  rejectReasons: ["R1_workflow_theme" as const],
};

// UUID v4 regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ============================================================
// Test (a): happy path — approved → LINE push called
// ============================================================
describe("runPostJob — happy path (approved)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetKillSwitchState.mockResolvedValue({ publishing_enabled: true, resume_at: null, triggered_by: null, updated_at: new Date().toISOString() });
    mockSingleRow.mockResolvedValue({ data: fakeCoreIdeaRow, error: null });
    mockDraftForX.mockResolvedValue(fakeDraftOutput);
    mockRunEditor.mockResolvedValue(fakeEditorOutputApproved);
    mockUpsert.mockResolvedValue({ error: null });
    // FIX 3: claim returns 1 row (success)
    mockDequeueClaimSelect.mockResolvedValue({ data: [{ id: fakeCoreIdeaRow.id }], error: null });
  });

  test("upserts post_drafts with UUID id + human_approval_status=pending + editor_output + writer_draft_id", async () => {
    await runPostJob("morning", makeEnv());

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const upsertArg = mockUpsert.mock.calls[0][0];

    // DB UUID (not writer's draftId)
    expect(UUID_REGEX.test(upsertArg.id)).toBe(true);
    expect(upsertArg.id).not.toBe(fakeDraftOutput.draftId);

    // writer's non-UUID id stored separately
    expect(upsertArg.writer_draft_id).toBe(fakeDraftOutput.draftId);

    // approval state
    expect(upsertArg.human_approval_status).toBe("pending");

    // editor output persisted
    expect(upsertArg.editor_output).toMatchObject({ decision: "approved" });

    // slot + scheduled_date set
    expect(upsertArg.slot).toBe("morning");
    expect(upsertArg.scheduled_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("pushLineFlex called with approval card containing approve/reject postback data + DB UUID", async () => {
    await runPostJob("morning", makeEnv());

    expect(mockPushLineFlex).toHaveBeenCalledTimes(1);
    const [_to, altText, contents, _token] = mockPushLineFlex.mock.calls[0];

    const dbUuid = mockUpsert.mock.calls[0][0].id;
    // altText is a string (first ~100 chars of body)
    expect(typeof altText).toBe("string");

    // The Flex JSON, serialized, must contain the postback data + db UUID.
    const json = JSON.stringify(contents);
    expect(json).toContain(`approve:${dbUuid}`);
    expect(json).toContain(`reject:${dbUuid}`);
    expect(json).toContain(`draft_id: ${dbUuid}`);
    // bubble type
    expect((contents as { type?: string }).type).toBe("bubble");
  });
});

// ============================================================
// Test (b): editor rejected → NO approval push
// ============================================================
describe("runPostJob — editor rejected", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetKillSwitchState.mockResolvedValue({ publishing_enabled: true, resume_at: null, triggered_by: null, updated_at: new Date().toISOString() });
    mockSingleRow.mockResolvedValue({ data: fakeCoreIdeaRow, error: null });
    mockDraftForX.mockResolvedValue(fakeDraftOutput);
    mockRunEditor.mockResolvedValue(fakeEditorOutputRejected);
    mockUpsert.mockResolvedValue({ error: null });
    mockDequeueClaimSelect.mockResolvedValue({ data: [{ id: fakeCoreIdeaRow.id }], error: null });
  });

  test("does NOT send approval card when editor rejects", async () => {
    await runPostJob("noon", makeEnv());

    // draft should still be persisted
    expect(mockUpsert).toHaveBeenCalledTimes(1);

    // no approval Flex card
    expect(mockPushLineFlex).not.toHaveBeenCalled();
  });
});

// ============================================================
// Test (c): empty core_ideas → notify, no drafting
// ============================================================
describe("runPostJob — empty core_ideas", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetKillSwitchState.mockResolvedValue({ publishing_enabled: true, resume_at: null, triggered_by: null, updated_at: new Date().toISOString() });
    mockSingleRow.mockResolvedValue({ data: null, error: null });
  });

  test("notifies admin and returns without calling draftForX", async () => {
    await runPostJob("evening", makeEnv());

    expect(mockDraftForX).not.toHaveBeenCalled();
    expect(mockRunEditor).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();

    // should push a notification line message
    expect(mockPushLine).toHaveBeenCalledTimes(1);
    const [, message] = mockPushLine.mock.calls[0];
    expect(message).toContain("core_ideas");
  });
});

// ============================================================
// Test (d): FIX 3 — dequeueIdeaRow claim returns 0 rows → null, no draft produced
// ============================================================
describe("runPostJob — FIX3: dequeue claim returns 0 rows (race condition)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetKillSwitchState.mockResolvedValue({ publishing_enabled: true, resume_at: null, triggered_by: null, updated_at: new Date().toISOString() });
    mockSingleRow.mockResolvedValue({ data: fakeCoreIdeaRow, error: null });
    // FIX 3: claim returns 0 rows → another consumer already claimed this idea
    mockDequeueClaimSelect.mockResolvedValue({ data: [], error: null });
  });

  test("0-rows-claimed → returns null (skips run), no draft or LINE approval push", async () => {
    await runPostJob("morning", makeEnv());

    // No drafting, no editor, no upsert
    expect(mockDraftForX).not.toHaveBeenCalled();
    expect(mockRunEditor).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();

    // Admin notified that core_ideas is "empty" (treated as null by caller)
    expect(mockPushLine).toHaveBeenCalledTimes(1);
    const [, message] = mockPushLine.mock.calls[0];
    expect(message).toContain("core_ideas");
  });
});
