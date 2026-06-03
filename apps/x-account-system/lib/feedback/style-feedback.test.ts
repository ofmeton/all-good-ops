/**
 * style-feedback.test.ts
 *
 * Tests: addStyleFeedback / getRecentStyleFeedback
 *   - insert called with correct fields (kind, body, draft_id)
 *   - select returns bodies (newest first, filtered)
 *   - no supabase (IN_MEMORY_FALLBACK) → addStyleFeedback no-op, getRecent returns []
 */

// ---- mock supabase BEFORE imports ----
const mockInsert = jest.fn().mockResolvedValue({ error: null });
const mockSelectLimit = jest.fn();
const mockSelectOrder = jest.fn(() => ({ limit: mockSelectLimit }));
const mockSelect = jest.fn(() => ({ order: mockSelectOrder }));

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    from: (table: string) => {
      if (table === "style_feedback") {
        return { insert: mockInsert, select: mockSelect };
      }
      return {};
    },
  })),
}));

import { addStyleFeedback, getRecentStyleFeedback } from "./style-feedback.ts";

const ENV = {
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-srk",
};

describe("style-feedback — supabase configured", () => {
  beforeAll(() => {
    delete process.env.IN_MEMORY_FALLBACK;
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-srk";
    process.env.SUPABASE_SCHEMA = "xad";
  });
  afterAll(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SCHEMA;
  });
  beforeEach(() => jest.clearAllMocks());

  test("addStyleFeedback inserts kind/body/draft_id", async () => {
    await addStyleFeedback(ENV, "revise", "もっと短く", "draft-123");
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert.mock.calls[0][0]).toEqual({
      kind: "revise",
      body: "もっと短く",
      draft_id: "draft-123",
    });
  });

  test("addStyleFeedback without draftId → draft_id null", async () => {
    await addStyleFeedback(ENV, "remember", "絵文字控えめ");
    expect(mockInsert.mock.calls[0][0]).toEqual({
      kind: "remember",
      body: "絵文字控えめ",
      draft_id: null,
    });
  });

  test("getRecentStyleFeedback returns bodies newest-first (filtered)", async () => {
    mockSelectLimit.mockResolvedValue({
      data: [{ body: "最新" }, { body: "古い" }, { body: "" }, { body: null }],
      error: null,
    });
    const out = await getRecentStyleFeedback(ENV, 5);
    expect(out).toEqual(["最新", "古い"]);
    expect(mockSelectOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(mockSelectLimit).toHaveBeenCalledWith(5);
  });

  test("getRecentStyleFeedback select error → []", async () => {
    mockSelectLimit.mockResolvedValue({ data: null, error: { message: "boom" } });
    const out = await getRecentStyleFeedback(ENV);
    expect(out).toEqual([]);
  });
});

describe("style-feedback — fallback (IN_MEMORY_FALLBACK)", () => {
  beforeAll(() => {
    process.env.IN_MEMORY_FALLBACK = "true";
  });
  afterAll(() => {
    delete process.env.IN_MEMORY_FALLBACK;
  });
  beforeEach(() => jest.clearAllMocks());

  test("addStyleFeedback is no-op (no insert)", async () => {
    await addStyleFeedback(ENV, "remember", "x");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  test("getRecentStyleFeedback returns []", async () => {
    const out = await getRecentStyleFeedback(ENV);
    expect(out).toEqual([]);
    expect(mockSelect).not.toHaveBeenCalled();
  });
});
