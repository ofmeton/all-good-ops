/**
 * kill-switch.test.ts (PR-D)
 *
 * Phase 0.5 fallback で完走。
 * FIX 4 追加: real client + DB read error → fail CLOSED (publishing disabled).
 */
import {
  __resetKillSwitchInMemory,
  assertPublishingEnabled,
  getKillSwitchState,
  handleLineCommand,
  resumeKillSwitch,
  triggerKillSwitch,
} from "./kill-switch.ts";

beforeAll(() => {
  process.env.IN_MEMORY_FALLBACK = "true";
});

beforeEach(() => {
  __resetKillSwitchInMemory();
});

describe("kill-switch", () => {
  test("default state is enabled", async () => {
    const state = await getKillSwitchState();
    expect(state.publishing_enabled).toBe(true);
    expect(state.resume_at).toBeNull();
  });

  test("triggerKillSwitch sets enabled=false + resume_at +48h", async () => {
    const before = Date.now();
    await triggerKillSwitch("test_user", 48);
    const state = await getKillSwitchState();
    expect(state.publishing_enabled).toBe(false);
    expect(state.triggered_by).toBe("test_user");
    expect(state.resume_at).not.toBeNull();
    const resume = new Date(state.resume_at!).getTime();
    expect(resume).toBeGreaterThan(before + 47 * 3600_000);
    expect(resume).toBeLessThan(before + 49 * 3600_000);
  });

  test("resumeKillSwitch re-enables", async () => {
    await triggerKillSwitch("test_user", 48);
    expect((await getKillSwitchState()).publishing_enabled).toBe(false);
    await resumeKillSwitch("manual");
    expect((await getKillSwitchState()).publishing_enabled).toBe(true);
  });

  test("handleLineCommand '!stop' triggers", async () => {
    const r = await handleLineCommand("!stop", "U_ofmeton");
    expect(r.command).toBe("stop");
    expect(r.state.publishing_enabled).toBe(false);
  });

  test("handleLineCommand '!resume' resumes", async () => {
    await triggerKillSwitch("prev", 48);
    const r = await handleLineCommand("!resume", "U_ofmeton");
    expect(r.command).toBe("resume");
    expect(r.state.publishing_enabled).toBe(true);
  });

  test("handleLineCommand unrelated text → noop", async () => {
    const r = await handleLineCommand("hello", "U_ofmeton");
    expect(r.command).toBe("noop");
    expect(r.state.publishing_enabled).toBe(true);
  });

  test("assertPublishingEnabled throws when disabled", async () => {
    await triggerKillSwitch("blocker", 48);
    await expect(assertPublishingEnabled()).rejects.toThrow(/publishing disabled/);
  });

  test("auto-resume when resume_at passed (in-memory)", async () => {
    // 過去の時刻を仕込んで auto-resume を発火
    await triggerKillSwitch("expired", 1);
    // 強制的に resume_at を過去にズラす (in-memory state を経由)
    const state = await getKillSwitchState();
    // setHours で過去にする trick: 直接 in-memory state を override は不可。1h 設定では即 resume されない。
    // 別 trick: 0h で trigger
    await triggerKillSwitch("expired_now", 0);
    // resume_at が now+0h(同時刻) なので、次の getKillSwitchState で auto-resume されるはず
    // ただし resume_at <= Date.now() の比較は等号成立で auto-resume.
    const after = await getKillSwitchState();
    expect(after.publishing_enabled).toBe(true);
  });
});

// ============================================================
// FIX 4: real Supabase client present, but safety_state read errors → fail CLOSED
// ============================================================
describe("kill-switch — FIX4: fail CLOSED when real client + DB read error", () => {
  // Mock supabase createClient to inject a client that returns an error on .from("safety_state")
  const mockMaybeSingle = jest.fn();
  const mockEq = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
  const mockSelect = jest.fn(() => ({ eq: mockEq }));

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test("FIX4: real client, safety_state read returns error → getKillSwitchState returns publishing_enabled=false (fail closed)", async () => {
    // Temporarily disable IN_MEMORY_FALLBACK to exercise the real-client path
    const origFallback = process.env.IN_MEMORY_FALLBACK;
    const origUrl = process.env.SUPABASE_URL;
    const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    process.env.IN_MEMORY_FALLBACK = "false";
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

    // Simulate a DB read error
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "connection refused" } });

    // We need to import the module fresh with the mock
    jest.mock("@supabase/supabase-js", () => ({
      createClient: jest.fn(() => ({
        from: (_table: string) => ({ select: mockSelect }),
      })),
    }));

    // Re-import to pick up the new mock (module-level singleton _supabase is cached, so use jest.resetModules)
    jest.resetModules();
    const { getKillSwitchState: getStateFresh } = await import("./kill-switch.ts");

    const state = await getStateFresh();

    // Must be fail CLOSED
    expect(state.publishing_enabled).toBe(false);

    // Restore
    process.env.IN_MEMORY_FALLBACK = origFallback ?? "true";
    if (origUrl) process.env.SUPABASE_URL = origUrl; else delete process.env.SUPABASE_URL;
    if (origKey) process.env.SUPABASE_SERVICE_ROLE_KEY = origKey; else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  test("FIX4: assertPublishingEnabled throws when real client returns DB error (fail closed)", async () => {
    const origFallback = process.env.IN_MEMORY_FALLBACK;
    const origUrl = process.env.SUPABASE_URL;
    const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    process.env.IN_MEMORY_FALLBACK = "false";
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "network error" } });

    jest.mock("@supabase/supabase-js", () => ({
      createClient: jest.fn(() => ({
        from: (_table: string) => ({ select: mockSelect }),
      })),
    }));

    jest.resetModules();
    const { assertPublishingEnabled: assertFresh } = await import("./kill-switch.ts");

    // fail CLOSED means assertPublishingEnabled throws (publishing disabled)
    await expect(assertFresh()).rejects.toThrow(/publishing disabled/);

    process.env.IN_MEMORY_FALLBACK = origFallback ?? "true";
    if (origUrl) process.env.SUPABASE_URL = origUrl; else delete process.env.SUPABASE_URL;
    if (origKey) process.env.SUPABASE_SERVICE_ROLE_KEY = origKey; else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });
});
