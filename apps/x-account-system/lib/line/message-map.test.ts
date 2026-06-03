/**
 * message-map.test.ts
 *
 * Tests: recordLineMessage / lookupDraftByMessage
 *   - upsert called with message_id/draft_id
 *   - lookup returns draft_id (or null)
 *   - IN_MEMORY_FALLBACK → no-op / null
 */

// ---- mock supabase BEFORE imports ----
const mockUpsert = jest.fn().mockResolvedValue({ error: null });
const mockMaybeSingle = jest.fn();
const mockEq = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    from: (table: string) => {
      if (table === "line_message_map") {
        return { upsert: mockUpsert, select: mockSelect };
      }
      return {};
    },
  })),
}));

import { recordLineMessage, lookupDraftByMessage } from "./message-map.ts";

const ENV = {
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-srk",
};

describe("message-map — supabase configured", () => {
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

  test("recordLineMessage upserts message_id/draft_id", async () => {
    await recordLineMessage(ENV, "msg-1", "draft-1");
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockUpsert.mock.calls[0][0]).toEqual({ message_id: "msg-1", draft_id: "draft-1" });
    expect(mockUpsert.mock.calls[0][1]).toEqual({ onConflict: "message_id" });
  });

  test("recordLineMessage no-op when ids missing", async () => {
    await recordLineMessage(ENV, "", "draft-1");
    await recordLineMessage(ENV, "msg-1", "");
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  test("lookupDraftByMessage returns draft_id", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { draft_id: "draft-99" }, error: null });
    const out = await lookupDraftByMessage(ENV, "msg-9");
    expect(out).toBe("draft-99");
    expect(mockEq).toHaveBeenCalledWith("message_id", "msg-9");
  });

  test("lookupDraftByMessage returns null when not found", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const out = await lookupDraftByMessage(ENV, "missing");
    expect(out).toBeNull();
  });

  test("lookupDraftByMessage returns null on error", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "boom" } });
    const out = await lookupDraftByMessage(ENV, "x");
    expect(out).toBeNull();
  });

  test("lookupDraftByMessage returns null for empty quotedMessageId", async () => {
    const out = await lookupDraftByMessage(ENV, "");
    expect(out).toBeNull();
    expect(mockSelect).not.toHaveBeenCalled();
  });
});

describe("message-map — fallback (IN_MEMORY_FALLBACK)", () => {
  beforeAll(() => {
    process.env.IN_MEMORY_FALLBACK = "true";
  });
  afterAll(() => {
    delete process.env.IN_MEMORY_FALLBACK;
  });
  beforeEach(() => jest.clearAllMocks());

  test("recordLineMessage no-op", async () => {
    await recordLineMessage(ENV, "msg-1", "draft-1");
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  test("lookupDraftByMessage returns null", async () => {
    const out = await lookupDraftByMessage(ENV, "msg-1");
    expect(out).toBeNull();
    expect(mockSelect).not.toHaveBeenCalled();
  });
});
