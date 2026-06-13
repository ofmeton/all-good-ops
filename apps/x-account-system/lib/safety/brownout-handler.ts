/**
 * brownout-handler (W5-7)
 *
 * SSoT: main-design-all-versions.md §8.1.5 — 4-stage budget brownout
 *
 * 4 段階コスト管理:
 *   ok          < ¥10,000  : 全 job 通常稼働
 *   reduce      ¥10,000~   : 全 job 許可 (Writer retry 拒否 + Optimizer ダウングレードは呼び出し側で制御)
 *   stop_posting ¥11,500~  : collect/compose/check/optimizer 等の生成系停止。ops/通知(rollback-monitor/rotation-notice/daily-digest/line-event)のみ継続
 *   cron_halt   ¥12,500~   : daily-digest + line-event のみ
 *   escalate    ¥13,800~   : daily-digest (緊急アラート) + line-event のみ
 *
 * line-event は全 stage で常に許可 — オペレーターが !stop/!resume/承認 操作できる必要があるため。
 * kill-switch との関係: stop_posting 以上で triggerKillSwitch を発火し
 *   Publisher 系が send 直前に assertPublishingEnabled() で abort する二重ガード。
 *
 * 後方互換: BrownoutDecision の既存フィールド (should_stop_posting / publishing_blocked) を維持。
 */
import { triggerKillSwitch, resumeKillSwitch, getKillSwitchState } from "./kill-switch.ts";

// ---------------------------------------------------------------------------
// Thresholds (env override 可)
// ---------------------------------------------------------------------------
const T_REDUCE     = Number(process.env.BUDGET_MONTHLY_LIMIT_JPY       ?? 10000);
const T_STOP       = Number(process.env.BUDGET_BROWNOUT_THRESHOLD_JPY  ?? 11500);
const T_CRON_HALT  = Number(process.env.BUDGET_CRON_HALT_JPY           ?? 12500);
const T_ESCALATE   = Number(process.env.BUDGET_ESCALATE_JPY            ?? 13800);

// ---------------------------------------------------------------------------
// Status union
// ---------------------------------------------------------------------------
export type BrownoutStatus = "ok" | "reduce" | "stop_posting" | "cron_halt" | "escalate";

// ---------------------------------------------------------------------------
// allowedJobs per status
// ---------------------------------------------------------------------------
/** ALL job names known to the queue consumer (legacy pipeline retire 後の生存ジョブ) */
const ALL_JOBS: string[] = [
  "collect",
  "bookmark-collect",
  "compose",
  "check",
  "daily-digest",
  "metrics-ingest",
  "optimizer-update",
  "optimizer-analyst",
  "optimizer-apply",
  "rollback-monitor",
  "rotation-notice",
  "line-event",
];

/**
 * stop_posting: 生成/公開/最適化系を停止。
 * 継続するのは ops/通知のみ (rollback-monitor, rotation-notice, daily-digest, line-event)。
 * collect は LLM コストがかかるため stop_posting 以上では止める (compose/check も生成系として停止)。
 * metrics-ingest は read-only データ収集なので投稿停止中でも継続。
 * line-event は常に許可 (オペレーター操作用)。
 */
const STOP_POSTING_ALLOWED: string[] = [
  "rollback-monitor",
  "rotation-notice",
  "daily-digest",
  "metrics-ingest",
  "optimizer-apply",
  "line-event",
];

/**
 * cron_halt: daily-digest + line-event のみ。
 * すべての cron job を停止し、状況把握と手動操作のみ許可。
 */
const CRON_HALT_ALLOWED: string[] = [
  "daily-digest",
  "line-event",
];

/**
 * escalate: 緊急アラート状態。daily-digest + line-event のみ (cron_halt と同じ列)。
 * escalate 時は加えて即時 LINE アラートを送信する (evaluateBrownout 内で実施)。
 */
const ESCALATE_ALLOWED: string[] = [
  "daily-digest",
  "line-event",
];

export const ALLOWED_JOBS_BY_STATUS: Record<BrownoutStatus, string[]> = {
  ok:           ALL_JOBS,
  reduce:       ALL_JOBS,
  stop_posting: STOP_POSTING_ALLOWED,
  cron_halt:    CRON_HALT_ALLOWED,
  escalate:     ESCALATE_ALLOWED,
};

// ---------------------------------------------------------------------------
// BrownoutDecision interface — backward-compatible
// ---------------------------------------------------------------------------
export interface BrownoutDecision {
  /** 4-stage status (新規フィールド) */
  status: BrownoutStatus;
  cost_jpy: number;
  threshold_jpy: number;
  /**
   * 投稿停止すべきか (後方互換: stop_posting 以上で true)。
   * @deprecated status を直接参照することを推奨
   */
  should_stop_posting: boolean;
  /**
   * publishing_enabled=false 遷移済か。stop_posting 以上で true (後方互換)。
   */
  publishing_blocked: boolean;
  /** このステータスで実行を許可する job 名一覧 (新規フィールド) */
  allowedJobs: string[];
  reason?: string;
}

// ---------------------------------------------------------------------------
// evaluateBrownout
// ---------------------------------------------------------------------------
/**
 * 当月コストを受け取り、4-stage brownout 判定を行い、必要なら kill-switch を発火させる。
 *
 * @param currentCostJpy  当月累計コスト (円)
 * @param now             基準日時 (デフォルト: new Date()。テスト用に注入可)
 */
export async function evaluateBrownout(
  currentCostJpy: number,
  now: Date = new Date(),
): Promise<BrownoutDecision> {
  // ---- Stage 判定 ----
  let status: BrownoutStatus;
  if (currentCostJpy >= T_ESCALATE) {
    status = "escalate";
  } else if (currentCostJpy >= T_CRON_HALT) {
    status = "cron_halt";
  } else if (currentCostJpy >= T_STOP) {
    status = "stop_posting";
  } else if (currentCostJpy >= T_REDUCE) {
    status = "reduce";
  } else {
    status = "ok";
  }

  const allowedJobs = ALLOWED_JOBS_BY_STATUS[status];
  const publishing_blocked = status === "stop_posting" || status === "cron_halt" || status === "escalate";
  const should_stop_posting = publishing_blocked; // backward compat

  // ---- ok / reduce: kill-switch state を素通し ----
  if (status === "ok" || status === "reduce") {
    const ksState = await getKillSwitchState();
    const thresholdJpy = status === "ok" ? T_REDUCE : T_STOP;
    return {
      status,
      cost_jpy: currentCostJpy,
      threshold_jpy: thresholdJpy,
      should_stop_posting: false,
      publishing_blocked: !ksState.publishing_enabled,
      allowedJobs,
      reason: status === "reduce"
        ? `cost ¥${currentCostJpy.toLocaleString()} ≥ monthly ¥${T_REDUCE.toLocaleString()} (warn only)`
        : undefined,
    };
  }

  // ---- stop_posting / cron_halt / escalate: kill-switch 発火 ----
  const hours = hoursUntilNextMonthStart(now);
  await triggerKillSwitch(`brownout_${status}`, hours);

  // escalate: 即時 LINE アラート送信を試みる (非ブロッキング、失敗は warn のみ)
  if (status === "escalate") {
    sendEscalateAlert(currentCostJpy).catch((e) =>
      console.warn("[brownout] escalate alert failed:", e),
    );
  }

  const thresholdJpy =
    status === "stop_posting" ? T_STOP
    : status === "cron_halt" ? T_CRON_HALT
    : T_ESCALATE;

  return {
    status,
    cost_jpy: currentCostJpy,
    threshold_jpy: thresholdJpy,
    should_stop_posting,
    publishing_blocked,
    allowedJobs,
    reason: `cost ¥${currentCostJpy.toLocaleString()} — brownout stage: ${status}`,
  };
}

// ---------------------------------------------------------------------------
// monthStartReset / manualBrownoutResume (unchanged)
// ---------------------------------------------------------------------------

/**
 * 月初 cron が呼ぶ自動リセット。brownout で停止した状態を解除。
 */
export async function monthStartReset(): Promise<{ resumed: boolean }> {
  const state = await getKillSwitchState();
  if (state.publishing_enabled) return { resumed: false };
  // triggered_by が "brownout_*" プレフィックスであればリセット対象
  if (state.triggered_by?.startsWith("brownout")) {
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
// internal helpers
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

/**
 * escalate ステージで即時 LINE アラートを送信。
 * LINE_CHANNEL_ACCESS_TOKEN / LINE_USER_ID_OFMETON は process.env 経由 (env-bridge 済み想定)。
 */
async function sendEscalateAlert(costJpy: number): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const userId = process.env.LINE_USER_ID_OFMETON;
  if (!token || !userId) {
    console.warn("[brownout] escalate alert skipped: LINE env vars missing");
    return;
  }
  const text =
    `🚨 [BROWNOUT ESCALATE] 月次コストが緊急閾値を超えました\n` +
    `現在: ¥${costJpy.toLocaleString()} / 閾値: ¥${T_ESCALATE.toLocaleString()}\n` +
    `全 cron job を停止中。daily-digest + line-event のみ稼働。\n` +
    `復帰: !resume または月初リセット`;
  await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: "text", text }],
    }),
  });
}
