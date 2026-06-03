/**
 * line-flow-db.test.ts — W4-3
 *
 * Tests: loadSession / saveSession (DB-backed, no IN_MEMORY_FALLBACK)
 *
 * Uses a mocked Supabase client. Verifies:
 *   1. saveSession upserts to interview_sessions with snake_case columns.
 *   2. loadSession selects and reconstructs InterviewSession (all snake_case fields).
 *   3. Multi-turn flow: load → recordAnswer → save → persisted answers grew.
 */

// ---- 1. Mock supabase BEFORE imports ----

const mockUpsert = jest.fn().mockResolvedValue({ error: null });
const mockSelectSingle = jest.fn();
const mockSelectEq = jest.fn(() => ({ single: mockSelectSingle }));
const mockSelect = jest.fn(() => ({ eq: mockSelectEq }));

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    from: (_table: string) => ({
      upsert: mockUpsert,
      select: mockSelect,
    }),
  })),
}));

// ---- 2. env: NO IN_MEMORY_FALLBACK, set Supabase vars ----
beforeAll(() => {
  delete process.env.IN_MEMORY_FALLBACK;
  process.env.SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  process.env.SUPABASE_SCHEMA = "xad";
});

afterAll(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SCHEMA;
});

afterEach(() => {
  jest.clearAllMocks();
});

// ---- 3. Imports AFTER mocks ----
import {
  createSession,
  loadSession,
  recordAnswer,
  saveSession,
} from "./line-flow.ts";
import type { InterviewSession } from "./types.ts";

// ============================================================
// Helpers
// ============================================================

function makeSession(): InterviewSession {
  return createSession({
    id: "sess_db_test_1",
    line_user_id: "U_db_test",
    industry: "rice_cream",
    topic: "レジ締め自動化",
  });
}

/** Build a DB row that matches what Supabase would return */
function makeDbRow(session: InterviewSession): Record<string, unknown> {
  return {
    id: session.id,
    line_user_id: session.line_user_id,
    current_step: session.current_step,
    industry: session.industry,
    topic: session.topic,
    answers: session.answers,
    material_id: session.material_id ?? null,
    publication_consent: session.publication_consent,
    finalized: session.finalized,
    created_at: session.created_at,
    updated_at: session.updated_at,
  };
}

// ============================================================
// Test 1: saveSession upserts with correct snake_case columns
// ============================================================
describe("saveSession", () => {
  test("upserts to interview_sessions with all snake_case columns", async () => {
    const session = makeSession();
    await saveSession(session);

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const upsertArg = mockUpsert.mock.calls[0][0];

    // All required snake_case columns present
    expect(upsertArg.id).toBe(session.id);
    expect(upsertArg.line_user_id).toBe(session.line_user_id);
    expect(upsertArg.current_step).toBe(session.current_step);
    expect(upsertArg.industry).toBe(session.industry);
    expect(upsertArg.topic).toBe(session.topic);
    expect(Array.isArray(upsertArg.answers)).toBe(true);
    expect(upsertArg.publication_consent).toBe(session.publication_consent);
    expect(upsertArg.finalized).toBe(session.finalized);
    // updated_at should be present (DB will use it)
    expect(typeof upsertArg.updated_at).toBe("string");
  });

  test("upserts with material_id when present", async () => {
    const session = makeSession();
    session.material_id = "mat_abc123";
    await saveSession(session);

    const upsertArg = mockUpsert.mock.calls[0][0];
    expect(upsertArg.material_id).toBe("mat_abc123");
  });
});

// ============================================================
// Test 2: loadSession selects and reconstructs InterviewSession
// ============================================================
describe("loadSession", () => {
  test("returns null when DB row not found", async () => {
    mockSelectSingle.mockResolvedValue({ data: null, error: null });
    const result = await loadSession("nonexistent-id");
    expect(result).toBeNull();
  });

  test("reconstructs InterviewSession from DB row", async () => {
    const original = makeSession();
    const row = makeDbRow(original);
    mockSelectSingle.mockResolvedValue({ data: row, error: null });

    const loaded = await loadSession(original.id);

    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe(original.id);
    expect(loaded!.line_user_id).toBe(original.line_user_id);
    expect(loaded!.current_step).toBe(original.current_step);
    expect(loaded!.industry).toBe(original.industry);
    expect(loaded!.topic).toBe(original.topic);
    expect(Array.isArray(loaded!.answers)).toBe(true);
    expect(loaded!.publication_consent).toBe(original.publication_consent);
    expect(loaded!.finalized).toBe(original.finalized);
  });

  test("reconstructs answers array from jsonb correctly", async () => {
    const original = makeSession();
    // Simulate DB row with answers already as array (jsonb parsed by Supabase client)
    const answers = [
      {
        step: "kickoff",
        pattern_id: "quick_recap",
        question_text: "どんな業務をAIで改善しましたか？",
        answer_text: "レジ締めを自動化しました",
        received_at: new Date().toISOString(),
      },
    ];
    const row = { ...makeDbRow(original), answers };
    mockSelectSingle.mockResolvedValue({ data: row, error: null });

    const loaded = await loadSession(original.id);

    expect(loaded!.answers).toHaveLength(1);
    expect(loaded!.answers[0].step).toBe("kickoff");
    expect(loaded!.answers[0].answer_text).toBe("レジ締めを自動化しました");
  });

  test("selects from interview_sessions with the given id", async () => {
    mockSelectSingle.mockResolvedValue({ data: null, error: null });
    await loadSession("sess_xyz_999");

    expect(mockSelect).toHaveBeenCalledTimes(1);
    expect(mockSelectEq).toHaveBeenCalledWith("id", "sess_xyz_999");
  });
});

// ============================================================
// Test 3: Multi-turn flow — load → recordAnswer → save → answers grew
// ============================================================
describe("multi-turn flow: load → recordAnswer → save", () => {
  test("answers array grows after recordAnswer and save persists the new state", async () => {
    // Start with a session that has 0 answers
    const session = makeSession();
    expect(session.answers).toHaveLength(0);

    // Simulate loading from DB (empty answers)
    const row = makeDbRow(session);
    mockSelectSingle.mockResolvedValue({ data: row, error: null });

    const loaded = await loadSession(session.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.answers).toHaveLength(0);

    // Record an answer (sync mutation)
    await recordAnswer(loaded!, {
      step: "kickoff",
      pattern_id: "quick_recap",
      question_text: "どんな業務をAIで改善しましたか？",
      answer_text: "レジ締めを自動化しました",
      received_at: new Date().toISOString(),
    });
    expect(loaded!.answers).toHaveLength(1);
    expect(loaded!.current_step).toBe("dig_attempt"); // advanced to next step

    // Save the session
    await saveSession(loaded!);

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const upsertArg = mockUpsert.mock.calls[0][0];
    expect(Array.isArray(upsertArg.answers)).toBe(true);
    expect(upsertArg.answers).toHaveLength(1);
    expect(upsertArg.answers[0].answer_text).toBe("レジ締めを自動化しました");
    expect(upsertArg.current_step).toBe("dig_attempt");
  });
});
