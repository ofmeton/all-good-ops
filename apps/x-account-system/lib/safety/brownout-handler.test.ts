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

  test("over monthly limit but under brownout → over_limit warn, no stop", async () => {
    const r = await evaluateBrownout(10500);
    expect(r.status).toBe("over_limit");
    expect(r.should_stop_posting).toBe(false);
  });

  test("at brownout threshold → brownout + stop publishing", async () => {
    const r = await evaluateBrownout(11500);
    expect(r.status).toBe("brownout");
    expect(r.should_stop_posting).toBe(true);
    expect(r.publishing_blocked).toBe(true);
    const state = await getKillSwitchState();
    expect(state.publishing_enabled).toBe(false);
    expect(state.triggered_by).toBe("brownout");
  });

  test("over brownout threshold → brownout", async () => {
    const r = await evaluateBrownout(12000);
    expect(r.status).toBe("brownout");
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
