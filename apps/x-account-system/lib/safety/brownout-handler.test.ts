/**
 * brownout-handler.test.ts (PR-D)
 */
import { evaluateBrownout, monthStartReset, manualBrownoutResume } from "./brownout-handler.ts";
import { __resetKillSwitchInMemory, getKillSwitchState } from "./kill-switch.ts";

beforeAll(() => {
  process.env.IN_MEMORY_FALLBACK = "true";
  process.env.BUDGET_MONTHLY_LIMIT_JPY = "10000";
  process.env.BUDGET_BROWNOUT_THRESHOLD_JPY = "11500";
});

beforeEach(() => {
  __resetKillSwitchInMemory();
});

describe("brownout-handler", () => {
  test("under monthly limit → ok, no stop", async () => {
    const r = await evaluateBrownout(5000);
    expect(r.status).toBe("ok");
    expect(r.should_stop_posting).toBe(false);
    expect(r.publishing_blocked).toBe(false);
  });

  test("over monthly limit but under brownout → reduce warn, no stop", async () => {
    const r = await evaluateBrownout(10500);
    expect(r.status).toBe("reduce");
    expect(r.should_stop_posting).toBe(false);
  });

  test("at brownout threshold → stop_posting + stop publishing", async () => {
    const r = await evaluateBrownout(11500);
    expect(r.status).toBe("stop_posting");
    expect(r.should_stop_posting).toBe(true);
    expect(r.publishing_blocked).toBe(true);
    const state = await getKillSwitchState();
    expect(state.publishing_enabled).toBe(false);
    expect(state.triggered_by).toBe("brownout_stop_posting");
  });

  test("over brownout threshold (12000 < cron_halt) → stop_posting", async () => {
    const r = await evaluateBrownout(12000);
    expect(r.status).toBe("stop_posting");
    expect(r.should_stop_posting).toBe(true);
  });

  test("monthStartReset resumes brownout-triggered stop", async () => {
    await evaluateBrownout(12000);
    const before = await getKillSwitchState();
    expect(before.publishing_enabled).toBe(false);

    const r = await monthStartReset();
    expect(r.resumed).toBe(true);
    const after = await getKillSwitchState();
    expect(after.publishing_enabled).toBe(true);
  });

  test("monthStartReset does NOT resume kill-switch from !stop (different cause)", async () => {
    // simulate kill-switch by user
    const { triggerKillSwitch } = await import("./kill-switch.ts");
    await triggerKillSwitch("U_ofmeton", 48);
    const r = await monthStartReset();
    expect(r.resumed).toBe(false);
    const state = await getKillSwitchState();
    expect(state.publishing_enabled).toBe(false);
  });

  test("manualBrownoutResume re-enables publishing", async () => {
    await evaluateBrownout(12000);
    await manualBrownoutResume("U_ofmeton");
    const state = await getKillSwitchState();
    expect(state.publishing_enabled).toBe(true);
    expect(state.triggered_by).toContain("manual_brownout");
  });
});

// ---------------------------------------------------------------------------
// 4-stage brownout
// ---------------------------------------------------------------------------
describe("brownout 4-stage thresholds", () => {
  beforeEach(() => {
    __resetKillSwitchInMemory();
  });

  test.each([
    [9000, "ok", false],
    [10000, "reduce", false],
    [11500, "stop_posting", true],
    [12500, "cron_halt", true],
    [13800, "escalate", true],
  ] as const)(
    "cost=%i → %s (blocked=%s)",
    async (cost, expectedStatus, expectedBlocked) => {
      const d = await evaluateBrownout(cost);
      expect(d.status).toBe(expectedStatus);
      expect(d.publishing_blocked).toBe(expectedBlocked);
    },
  );

  test("ok status → allowedJobs includes all cron jobs", async () => {
    const d = await evaluateBrownout(5000);
    expect(d.allowedJobs).toContain("daily-digest");
    expect(d.allowedJobs).toContain("collect");
    expect(d.allowedJobs).toContain("compose");
    expect(d.allowedJobs).toContain("check");
    expect(d.allowedJobs).toContain("line-event");
  });

  test("reduce status → allowedJobs includes all jobs", async () => {
    const d = await evaluateBrownout(10000);
    expect(d.allowedJobs).toContain("daily-digest");
    expect(d.allowedJobs).toContain("collect");
    expect(d.allowedJobs).toContain("line-event");
  });

  test("stop_posting → allowedJobs excludes 生成系(collect/compose/check) but includes daily-digest and line-event", async () => {
    const d = await evaluateBrownout(11500);
    expect(d.allowedJobs).toContain("daily-digest");
    expect(d.allowedJobs).toContain("line-event");
    expect(d.allowedJobs).not.toContain("collect");
    expect(d.allowedJobs).not.toContain("compose");
    expect(d.allowedJobs).not.toContain("check");
    expect(d.allowedJobs).not.toContain("optimizer-update");
  });

  test("cron_halt → allowedJobs is only daily-digest and line-event", async () => {
    const d = await evaluateBrownout(12500);
    expect(d.allowedJobs).toContain("daily-digest");
    expect(d.allowedJobs).toContain("line-event");
    expect(d.allowedJobs).not.toContain("collect");
    expect(d.allowedJobs).not.toContain("rollback-monitor");
    expect(d.allowedJobs).not.toContain("optimizer-update");
  });

  test("escalate → allowedJobs is only daily-digest and line-event", async () => {
    const d = await evaluateBrownout(13800);
    expect(d.allowedJobs).toContain("daily-digest");
    expect(d.allowedJobs).toContain("line-event");
    expect(d.allowedJobs).not.toContain("post-morning");
    expect(d.allowedJobs).not.toContain("buzz-ingest");
  });

  test("stop_posting and above → should_stop_posting=true (backward compat)", async () => {
    for (const cost of [11500, 12500, 13800]) {
      __resetKillSwitchInMemory();
      const d = await evaluateBrownout(cost);
      expect(d.should_stop_posting).toBe(true);
    }
  });
});
