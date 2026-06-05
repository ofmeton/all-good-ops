/**
 * rollback-job.ts — W5-6
 *
 * 2h cron "rollback-monitor" の実処理。
 *
 * Flow:
 *   1. aggregatePerformanceWindow(7, 7) → current vs baseline PCR / impression
 *   2. evaluateRollback() → 純粋判定
 *   3. triggered:
 *      a. lastSnapshotId あり → rollbackToSnapshot + LINE 警告 + optimizer_proposal insert
 *      b. lastSnapshotId なし (初回 / snapshot 未生成) → LINE 警告のみ (rollback 不可)
 *   4. triggered でない → no-op
 *
 * 責務分離:
 *   - update-loop の pre-update rollback: 「更新直前 snapshot」への戻し
 *   - このジョブ: 「直近確認済み snapshot (lastSnapshotId)」への戻し — 独立した 2h 安全弁
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { aggregatePerformanceWindow } from "../../lib/optimizer/reward-extractor.js";
import { evaluateRollback } from "../../lib/safety/rollback-monitor.js";
import {
  loadOptimizerState,
  rollbackToSnapshot,
} from "../../lib/optimizer/state-store.js";
import { pushLine } from "../../lib/line/line-client.js";
import type { Env } from "../worker.js";

// ---------------------------------------------------------------------------
// Supabase client helper (mirrors existing pattern)
// ---------------------------------------------------------------------------

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (
    !_supabase &&
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    _supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { db: { schema: (process.env.SUPABASE_SCHEMA || "public") as "public" } },
    );
  }
  return _supabase;
}

/** test 用にクライアントをリセット */
export function __resetSupabaseClient(): void {
  _supabase = null;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

const WINDOW_DAYS = 7;

export async function runRollbackMonitor(env: Env): Promise<void> {
  const now = new Date();

  // 1. aggregate current vs previous 7-day window
  const perf = await aggregatePerformanceWindow(WINDOW_DAYS, WINDOW_DAYS, now);

  // 2. pure decision
  const decision = evaluateRollback({
    pcr_current: perf.currentAvgPcr,
    pcr_baseline: perf.prevAvgPcr,
    impressions_current: perf.currentAvgImpression,
    impressions_baseline: perf.prevAvgImpression,
  });

  if (!decision.triggered) {
    // No anomaly detected — no-op
    return;
  }

  // 3a. load current optimizer state
  const state = await loadOptimizerState(now);

  if (!state.lastSnapshotId) {
    // 3b. No confirmed snapshot yet (first run) — warn only, cannot rollback
    await pushLine(
      env.LINE_USER_ID_OFMETON,
      `[rollback-monitor] ⚠️ 異常検知: ${decision.reasons.join(" / ")}\nスナップショット未生成のためロールバック不可。手動確認が必要です。`,
      env.LINE_CHANNEL_ACCESS_TOKEN,
    );
    return;
  }

  // 3a. rollback to last confirmed snapshot
  await rollbackToSnapshot(state.lastSnapshotId);

  // LINE warning push
  const lineMsg = [
    `[rollback-monitor] ⚠️ 自動ロールバック実行`,
    `理由: ${decision.reasons.join(" / ")}`,
    `スナップショット: ${state.lastSnapshotId}`,
    `PCR drop: ${decision.pcr_drop_pct !== undefined ? decision.pcr_drop_pct + "%" : "N/A"}`,
    `Imp drop: ${decision.impressions_drop_pct !== undefined ? decision.impressions_drop_pct + "%" : "N/A"}`,
  ].join("\n");

  await pushLine(
    env.LINE_USER_ID_OFMETON,
    lineMsg,
    env.LINE_CHANNEL_ACCESS_TOKEN,
  );

  // optimizer_proposal insert (anomaly_alert)
  const sb = getSupabase();
  if (sb) {
    await sb.from("optimizer_proposal").insert({
      proposal_type: "anomaly_alert",
      scope: "optimizer_state",
      hypothesis: `PCR / impression 異常低下を検知し、snapshot ${state.lastSnapshotId} にロールバック`,
      evidence: {
        reasons: decision.reasons,
        pcr_current: perf.currentAvgPcr,
        pcr_baseline: perf.prevAvgPcr,
        pcr_drop_pct: decision.pcr_drop_pct,
        impressions_current: perf.currentAvgImpression,
        impressions_baseline: perf.prevAvgImpression,
        impressions_drop_pct: decision.impressions_drop_pct,
        snapshot_id: state.lastSnapshotId,
        detected_at: now.toISOString(),
      },
      rank: "A",
    });
  }
}
