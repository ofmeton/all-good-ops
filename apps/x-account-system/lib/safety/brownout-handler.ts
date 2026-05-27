/**
 * brownout-handler (PR-D)
 *
 * SSoT: main-design-all-versions.md §2.12 / budget-calculator.ts の閾値定義
 *
 * 月予算 ¥10,000 を超え、brownout 閾値 ¥11,500 に達したら:
 *   1. 投稿停止 (publishing_enabled = false)
 *   2. 計測継続 (KPI 集計 / digest はそのまま走る)
 *   3. 通知継続 (Daily Digest payload に brownout=true flag 同梱)
 *   4. 復帰: 月初 (1 日 00:00 JST) リセット or ofmeton 同意で手動復帰
 *
 * kill-switch と独立だが publishing_enabled flag を共有する。
 */
import { triggerKillSwitch, resumeKillSwitch, getKillSwitchState } from "./kill-switch.ts";

const BROWNOUT_THRESHOLD_JPY = Number(
  process.env.BUDGET_BROWNOUT_THRESHOLD_JPY ?? 11500,
);
const MONTHLY_LIMIT_JPY = Number(process.env.BUDGET_MONTHLY_LIMIT_JPY ?? 10000);

export interface BrownoutDecision {
  status: "ok" | "over_limit" | "brownout";
  cost_jpy: number;
  threshold_jpy: number;
  /** 投稿停止すべきか. */
  should_stop_posting: boolean;
  /** 既に publishing_enabled=false に遷移済か (このターンで遷移 or 既存). */
  publishing_blocked: boolean;
  reason?: string;
}

/**
 * 当月コストを受け取り、brownout 判定 + 必要なら kill-switch を発火させる。
 * brownout の停止は「無期限」相当 (`resume_at = 月末 + 1d`) で発火する。
 */
export async function evaluateBrownout(
  currentCostJpy: number,
  now: Date = new Date(),
): Promise<BrownoutDecision> {
  const overBrownout = currentCostJpy >= BROWNOUT_THRESHOLD_JPY;
  const overLimit = currentCostJpy >= MONTHLY_LIMIT_JPY;

  if (!overLimit) {
    return {
      status: "ok",
      cost_jpy: currentCostJpy,
      threshold_jpy: MONTHLY_LIMIT_JPY,
      should_stop_posting: false,
      publishing_blocked: !(await getKillSwitchState()).publishing_enabled,
    };
  }

  if (overBrownout) {
    // 月末 + 1d までの hours を計算 (auto resume を仕込む)
    const hours = hoursUntilNextMonthStart(now);
    await triggerKillSwitch("brownout", hours);
    return {
      status: "brownout",
      cost_jpy: currentCostJpy,
      threshold_jpy: BROWNOUT_THRESHOLD_JPY,
      should_stop_posting: true,
      publishing_blocked: true,
      reason: `cost ¥${currentCostJpy.toLocaleString()} ≥ brownout ¥${BROWNOUT_THRESHOLD_JPY.toLocaleString()}`,
    };
  }

  // over_limit だが brownout 未到達 (warn のみ、投稿は継続)
  return {
    status: "over_limit",
    cost_jpy: currentCostJpy,
    threshold_jpy: MONTHLY_LIMIT_JPY,
    should_stop_posting: false,
    publishing_blocked: !(await getKillSwitchState()).publishing_enabled,
    reason: `cost ¥${currentCostJpy.toLocaleString()} ≥ monthly ¥${MONTHLY_LIMIT_JPY.toLocaleString()}`,
  };
}

/**
 * 月初 cron が呼ぶ自動リセット。brownout で停止した状態を解除。
 */
export async function monthStartReset(): Promise<{ resumed: boolean }> {
  const state = await getKillSwitchState();
  if (state.publishing_enabled) return { resumed: false };
  if (state.triggered_by === "brownout") {
    await resumeKillSwitch("month_start_reset");
    return { resumed: true };
  }
  return { resumed: false };
}

/**
 * ofmeton 手動同意で復帰 (LINE で「予算追加 OK」等を受けた時)。
 */
export async function manualBrownoutResume(by: string): Promise<void> {
  await resumeKillSwitch(`manual_brownout:${by}`);
}

// ---------------------------------------------------------------------------
// internal
// ---------------------------------------------------------------------------
function hoursUntilNextMonthStart(now: Date): number {
  // JST 1 日 00:00 までの hours
  const jstMs = now.getTime() + 9 * 60 * 60 * 1000;
  const jstNow = new Date(jstMs);
  const nextMonth = new Date(Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth() + 1, 1));
  // JST 1 日 00:00 を UTC で表現
  const nextMonthUtcMs = nextMonth.getTime() - 9 * 60 * 60 * 1000;
  const diffMs = nextMonthUtcMs - now.getTime();
  return Math.max(1, Math.ceil(diffMs / (60 * 60 * 1000)));
}
