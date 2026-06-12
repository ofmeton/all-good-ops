/**
 * nightly.test.ts — runNightlyApply ユニットテスト（fake deps・実 LLM/DB なし）
 *
 * evaluateBrownout は IN_MEMORY_FALLBACK=true で kill-switch をメモリ内で動かす。
 * コスト閾値は env で確定値に固定し決定的に動作させる。
 */

import { runNightlyApply } from "./nightly.ts";
import type { NightlyApplyDeps, ProposalPlan } from "./nightly.ts";
import { __resetKillSwitchInMemory } from "../safety/kill-switch.ts";
import type { ProposalRow } from "./types.ts";

// ---- 環境設定（kill-switch が in-memory で動作・コスト閾値固定）----
beforeAll(() => {
  process.env.IN_MEMORY_FALLBACK = "true";
  process.env.BUDGET_MONTHLY_LIMIT_JPY = "10000";
  process.env.BUDGET_BROWNOUT_THRESHOLD_JPY = "11500";
  process.env.BUDGET_CRON_HALT_JPY = "12500";
  process.env.BUDGET_ESCALATE_JPY = "13800";
});

beforeEach(() => {
  __resetKillSwitchInMemory();
});

// ---- helpers ----

function row(over: Partial<ProposalRow>): ProposalRow {
  return {
    id: "p",
    proposal_type: "config_change",
    scope: "lever_bandit",
    hypothesis: "h",
    evidence: {},
    rank: "A",
    accepted: true,
    implemented: false,
    reviewer_reason: null,
    meta: {},
    ...over,
  };
}

function makeDeps(overrides: Partial<NightlyApplyDeps> = {}): NightlyApplyDeps {
  return {
    loadAcceptedProposals: async () => [],
    markImplemented: async () => {},
    markSkipped: async () => {},
    loadOptimizerState: async () => ({} as never),
    saveOptimizerState: async () => {},
    snapshotState: async () => ({ snapshotId: "snap_nightly_test" }),
    rollbackToSnapshot: async () => {},
    applyTierP: async (paramId, value) => ({ paramId, before: null, after: value }),
    rollbackTierP: async () => {},
    notify: async () => {},
    getMonthlyCostJpy: async () => 0,
    countCodeTierRemaining: async () => 0,
    ...overrides,
  };
}

// ---- ゲート分岐 ----

describe("brownout gate", () => {
  it("escalate コスト → deferred 通知して早期リターン（markImplemented 不呼出）", async () => {
    const notifyLog: string[] = [];
    const markImplLog: string[] = [];
    const deps = makeDeps({
      getMonthlyCostJpy: async () => 14000, // > T_ESCALATE=13800
      countCodeTierRemaining: async () => 2,
      notify: async (msg) => { notifyLog.push(msg); },
      markImplemented: async (id) => { markImplLog.push(id); },
    });

    const result = await runNightlyApply(deps, { dryRun: false, force: false });

    expect(result.deferred).toBe(true);
    expect(result.brownoutStatus).toBe("escalate");
    expect(result.codeRemaining).toBe(2);
    expect(result.notified).toBe(true);
    expect(result.applied).toBe(0);
    expect(notifyLog).toHaveLength(1);
    expect(notifyLog[0]).toMatch(/延期/);
    expect(notifyLog[0]).toMatch(/escalate/);
    expect(notifyLog[0]).toMatch(/code-tier残=2/);
    expect(markImplLog).toHaveLength(0); // 書込なし
  });

  it("cron_halt コスト → deferred（optimizer-apply は CRON_HALT_ALLOWED に含まれない）", async () => {
    const notifyLog: string[] = [];
    const deps = makeDeps({
      getMonthlyCostJpy: async () => 13000, // T_CRON_HALT=12500 以上 T_ESCALATE 未満
      notify: async (msg) => { notifyLog.push(msg); },
    });

    const result = await runNightlyApply(deps, { force: false });

    expect(result.deferred).toBe(true);
    expect(result.brownoutStatus).toBe("cron_halt");
    expect(result.notified).toBe(true);
  });

  it("force=true → brownout バイパスして engine を実行（deferred は true のまま記録）", async () => {
    const markImplLog: string[] = [];
    const deps = makeDeps({
      getMonthlyCostJpy: async () => 14000,
      loadAcceptedProposals: async () => [],
      countCodeTierRemaining: async () => 0,
      markImplemented: async (id) => { markImplLog.push(id); },
    });

    const result = await runNightlyApply(deps, { force: true });

    // deferred=true を記録しつつも適用フローは走る
    expect(result.deferred).toBe(true);
    expect(result.brownoutStatus).toBe("escalate");
    // 0件なので notified=false
    expect(result.notified).toBe(false);
  });

  it("ok ステータス（コスト 0）→ deferred=false で通常実行", async () => {
    const deps = makeDeps({
      getMonthlyCostJpy: async () => 0,
      loadAcceptedProposals: async () => [],
      countCodeTierRemaining: async () => 0,
    });

    const result = await runNightlyApply(deps);

    expect(result.deferred).toBe(false);
    expect(result.brownoutStatus).toBeUndefined();
  });

  it("getMonthlyCostJpy 失敗 → fail-open（throw せず通常フロー継続）", async () => {
    const deps = makeDeps({
      getMonthlyCostJpy: async () => { throw new Error("DB connection error"); },
      loadAcceptedProposals: async () => [],
      countCodeTierRemaining: async () => 0,
    });

    const result = await runNightlyApply(deps);

    expect(result.deferred).toBe(false);
    expect(result.applied).toBe(0);
    // throw しない
  });
});

// ---- dry-run ----

describe("dry-run", () => {
  it("markImplemented / markSkipped を一切呼ばない", async () => {
    const markImplLog: string[] = [];
    const markSkipLog: string[] = [];

    const tierTRow = row({
      id: "t1",
      meta: { apply: { paramId: "posting_time_evening", value: 0.3 } },
    });
    const configRow = row({ id: "c1", scope: "collector_query", hypothesis: "watchlist 追加" });

    const deps = makeDeps({
      getMonthlyCostJpy: async () => 0,
      loadAcceptedProposals: async () => [tierTRow, configRow],
      countCodeTierRemaining: async () => 1,
      markImplemented: async (id) => { markImplLog.push(id); },
      markSkipped: async (id) => { markSkipLog.push(id); },
    });

    const result = await runNightlyApply(deps, { dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(markImplLog).toHaveLength(0);
    expect(markSkipLog).toHaveLength(0);
  });

  it("proposals を正しく tier 分類した plan を返す", async () => {
    const tierTRow = row({
      id: "t1",
      meta: { apply: { paramId: "posting_time_evening", value: 0.3 } },
    });
    const configRow = row({ id: "c1", scope: "collector_query", hypothesis: "watchlist 追加" });
    const blockedRow = row({ id: "b1", hypothesis: "first_hand を下げる" });
    const noopRow = row({ id: "n1", scope: "measurement", proposal_type: "measurement_request" });

    const deps = makeDeps({
      getMonthlyCostJpy: async () => 0,
      loadAcceptedProposals: async () => [tierTRow, configRow, blockedRow, noopRow],
      countCodeTierRemaining: async () => 1,
    });

    const result = await runNightlyApply(deps, { dryRun: true });

    expect(result.plan).toHaveLength(4);
    const byId = Object.fromEntries(result.plan!.map((p: ProposalPlan) => [p.id, p]));
    expect(byId["t1"]).toMatchObject({ tier: "T", action: "apply", paramId: "posting_time_evening" });
    expect(byId["c1"]).toMatchObject({ tier: "config", action: "skip_manual" });
    expect(byId["b1"]).toMatchObject({ tier: "blocked", action: "blocked" });
    expect(byId["n1"]).toMatchObject({ action: "noop" });
  });

  it("notify を呼ばない（dry-run は通知しない）", async () => {
    const notifyLog: string[] = [];
    const deps = makeDeps({
      getMonthlyCostJpy: async () => 0,
      loadAcceptedProposals: async () => [row({ id: "x1" })],
      countCodeTierRemaining: async () => 0,
      notify: async (msg) => { notifyLog.push(msg); },
    });

    await runNightlyApply(deps, { dryRun: true });

    expect(notifyLog).toHaveLength(0);
  });
});

// ---- 通知合成 ----

describe("通知合成", () => {
  it("tier-T 適用後の LINE 通知に apply 明細と code-tier 残数を含む", async () => {
    const notifyLog: string[] = [];
    const tierTRow = row({
      id: "t1",
      meta: { apply: { paramId: "posting_time_evening", value: 0.3 } },
    });
    const state: never = {
      postingTime: {
        evening: { paramId: "posting_time_evening", distType: "beta", params: { alpha: 2, beta: 8 } },
      },
      hookDistribution: {},
      xFormatRatio: {},
    } as never;

    const deps = makeDeps({
      getMonthlyCostJpy: async () => 0,
      loadAcceptedProposals: async () => [tierTRow],
      loadOptimizerState: async () => state,
      countCodeTierRemaining: async () => 3,
      notify: async (msg) => { notifyLog.push(msg); },
    });

    const result = await runNightlyApply(deps, { dryRun: false });

    expect(result.applied).toBe(1);
    expect(result.codeRemaining).toBe(3);
    expect(result.notified).toBe(true);
    expect(notifyLog).toHaveLength(1);
    expect(notifyLog[0]).toMatch(/✅/);
    expect(notifyLog[0]).toMatch(/code-tier残=3/);
    // engine の notify（"🛠 optimizer-apply: ..."形式）は抑制されて合成版のみ
    expect(notifyLog[0]).not.toMatch(/🛠 optimizer-apply/);
  });

  it("errors が出た時は ❌ と error 詳細を通知に含む", async () => {
    const notifyLog: string[] = [];
    // markImplemented でエラーを発生させる tierT proposal
    const tierTRow = row({
      id: "err1",
      meta: { apply: { paramId: "posting_time_morning", value: 0.2 } },
    });
    const state: never = {
      postingTime: {
        morning: { paramId: "posting_time_morning", distType: "beta", params: { alpha: 2, beta: 8 } },
      },
      hookDistribution: {},
      xFormatRatio: {},
    } as never;

    const deps = makeDeps({
      getMonthlyCostJpy: async () => 0,
      loadAcceptedProposals: async () => [tierTRow],
      loadOptimizerState: async () => state,
      // markImplemented を throw させてエラー扱いにする
      markImplemented: async () => { throw new Error("DB write failed"); },
      countCodeTierRemaining: async () => 0,
      notify: async (msg) => { notifyLog.push(msg); },
    });

    const result = await runNightlyApply(deps, { dryRun: false });

    expect(result.errors).toBe(1);
    expect(result.notified).toBe(true);
    expect(notifyLog[0]).toMatch(/❌/);
  });

  it("force 実行時の通知に brownout 警告を含む", async () => {
    const notifyLog: string[] = [];
    const tierTRow = row({
      id: "t1",
      meta: { apply: { paramId: "posting_time_evening", value: 0.3 } },
    });
    const state: never = {
      postingTime: {
        evening: { paramId: "posting_time_evening", distType: "beta", params: { alpha: 2, beta: 8 } },
      },
      hookDistribution: {},
      xFormatRatio: {},
    } as never;

    const deps = makeDeps({
      getMonthlyCostJpy: async () => 14000, // escalate
      loadAcceptedProposals: async () => [tierTRow],
      loadOptimizerState: async () => state,
      countCodeTierRemaining: async () => 0,
      notify: async (msg) => { notifyLog.push(msg); },
    });

    const result = await runNightlyApply(deps, { force: true });

    expect(result.applied).toBe(1);
    expect(result.deferred).toBe(true);
    expect(notifyLog[0]).toMatch(/force実行中/);
    expect(notifyLog[0]).toMatch(/escalate/);
  });
});

// ---- code-tier 計数 ----

describe("code-tier 計数", () => {
  it("countCodeTierRemaining の戻り値が result.codeRemaining に反映される", async () => {
    const deps = makeDeps({
      getMonthlyCostJpy: async () => 0,
      loadAcceptedProposals: async () => [],
      countCodeTierRemaining: async () => 7,
    });

    const result = await runNightlyApply(deps, { dryRun: false });

    expect(result.codeRemaining).toBe(7);
    expect(result.notified).toBe(true); // code-tier 残あり → 通知
  });

  it("countCodeTierRemaining 失敗 → fail-open で codeRemaining=0", async () => {
    const deps = makeDeps({
      getMonthlyCostJpy: async () => 0,
      loadAcceptedProposals: async () => [],
      countCodeTierRemaining: async () => { throw new Error("DB error"); },
    });

    const result = await runNightlyApply(deps, { dryRun: false });

    expect(result.codeRemaining).toBe(0);
    // throw しない
  });
});

// ---- 0件 LINE 抑止 ----

describe("0件 LINE 抑止", () => {
  it("proposals=0 かつ codeRemaining=0 → LINE 送信しない", async () => {
    const notifyLog: string[] = [];
    const deps = makeDeps({
      getMonthlyCostJpy: async () => 0,
      loadAcceptedProposals: async () => [],
      countCodeTierRemaining: async () => 0,
      notify: async (msg) => { notifyLog.push(msg); },
    });

    const result = await runNightlyApply(deps, { dryRun: false });

    expect(result.notified).toBe(false);
    expect(notifyLog).toHaveLength(0);
  });

  it("proposals=0 でも codeRemaining>0 なら LINE 送信する", async () => {
    const notifyLog: string[] = [];
    const deps = makeDeps({
      getMonthlyCostJpy: async () => 0,
      loadAcceptedProposals: async () => [],
      countCodeTierRemaining: async () => 2,
      notify: async (msg) => { notifyLog.push(msg); },
    });

    const result = await runNightlyApply(deps, { dryRun: false });

    expect(result.notified).toBe(true);
    expect(notifyLog[0]).toMatch(/code-tier残=2/);
  });
});
