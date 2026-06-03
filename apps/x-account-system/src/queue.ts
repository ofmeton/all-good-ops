/**
 * src/queue.ts — Cloudflare Queue consumer dispatch (scaffold)
 *
 * handleJob() は queue() handler から呼ばれる。
 * Phase 1 は全 job stub (console.log のみ)。
 * 実装は後続タスクで順次配線:
 *   - W3-2: 投稿 job (post-morning / post-noon / post-evening) の実装
 *   - W4:   その他 job (buzz-ingest / optimizer-update など) の実装
 */

import type { Env, JobMessage } from "./worker.js";
import { runPostJob } from "./jobs/post-job.js";
import { handleLineEvent } from "./jobs/line-event.js";
import { runBuzzIngest } from "../lib/ingest/buzz-ingest.js";
import { runInspirationsIngest } from "../lib/ingest/inspirations-ingest.js";
import { runIdeation } from "../lib/ideation/ideate.js";
import { runRollbackMonitor } from "./jobs/rollback-job.js";

export async function handleJob(msg: JobMessage, env: Env): Promise<void> {
  switch (msg.job) {
    // ----------------------------------------------------------------
    // ideation: materials_store → core_ideas LLM 自動生成 (W5-2)
    // ----------------------------------------------------------------
    case "ideation": {
      const count = await runIdeation(env);
      console.log(
        JSON.stringify({
          level: "info",
          msg: "[ideation] materials→core_ideas 生成 完了",
          date: msg.date,
          inserted: count,
        }),
      );
      break;
    }

    // ----------------------------------------------------------------
    // 投稿系 (X API 100/月上限 → Phase 1 は人間承認必須)
    // ----------------------------------------------------------------
    case "post-morning":
    case "post-noon":
    case "post-evening": {
      // W3-2: idea→draft→editor→LINE承認依頼
      await runPostJob(msg.slot, env);
      break;
    }

    // ----------------------------------------------------------------
    // buzz-ingest: 海外 X buzz 日次取得 → materials_store
    // ----------------------------------------------------------------
    case "buzz-ingest": {
      // W5-1: twitterapi.io seed accounts → xad.materials_store (x_inspirations)
      const count = await runBuzzIngest(env);
      console.log(
        JSON.stringify({
          level: "info",
          msg: "[buzz-ingest] twitterapi.io 日次取得 完了",
          date: msg.date,
          inserted: count,
        }),
      );
      break;
    }

    // ----------------------------------------------------------------
    // inspirations-ingest: 週次 inspirations 取得 (W5-3)
    // ----------------------------------------------------------------
    case "inspirations-ingest": {
      // X seeds (overseas ≥6 / domestic ≥18) + note seeds (≥3) → materials_store
      const count = await runInspirationsIngest(env);
      console.log(
        JSON.stringify({
          level: "info",
          msg: "[inspirations-ingest] 週次 ingest 完了",
          date: msg.date,
          inserted: count,
        }),
      );
      break;
    }

    // ----------------------------------------------------------------
    // daily-digest: Daily Digest 生成 + LINE 配信 (W5-5)
    // ----------------------------------------------------------------
    case "daily-digest": {
      const { runDailyDigest } = await import("../lib/dashboard/digest.js");
      const result = await runDailyDigest({});
      console.log(
        JSON.stringify({
          level: "info",
          msg: "[daily-digest] Digest 生成 + LINE 配信 完了",
          date: msg.date,
          sendStatus: result.sendResult.status,
          alertCount: result.payload.meta.alert_count,
        }),
      );
      break;
    }

    // ----------------------------------------------------------------
    // optimizer-update: Thompson sampling posterior 更新 (W5-5)
    // ----------------------------------------------------------------
    case "optimizer-update": {
      const { runOptimizerUpdate } = await import("../lib/optimizer/update-loop.js");
      const result = await runOptimizerUpdate();
      console.log(
        JSON.stringify({
          level: "info",
          msg: "[optimizer-update] Thompson posterior 更新 完了",
          date: msg.date,
          rolledBack: result.rolledBack,
          signalsObserved: result.signalsObserved,
          changesCount: result.changes.length,
          durationMs: result.durationMs,
        }),
      );
      break;
    }

    // ----------------------------------------------------------------
    // rollback-monitor: 異常検知・自動ロールバック監視 (W5-6)
    // ----------------------------------------------------------------
    case "rollback-monitor": {
      await runRollbackMonitor(env);
      console.log(
        JSON.stringify({
          level: "info",
          msg: "[rollback-monitor] 異常検知チェック 完了",
          date: msg.date,
        }),
      );
      break;
    }

    // ----------------------------------------------------------------
    // rotation-notice: X/Meta token rotation 通知
    // ----------------------------------------------------------------
    case "rotation-notice": {
      // W4: X/Meta token refresh 期日を LINE 通知 (§10.6)
      console.log(
        JSON.stringify({
          level: "info",
          msg: "[rotation-notice] token rotation 通知 (stub)",
          date: msg.date,
        }),
      );
      break;
    }

    // ----------------------------------------------------------------
    // line-event: LINE Webhook 経由イベント
    // ----------------------------------------------------------------
    case "line-event": {
      // W4-2: approve/reject postback → publish
      // W4-3 will extend for interviewer text flow
      await handleLineEvent(msg.payload, env);
      break;
    }

    default: {
      // 型安全: JobMessage["job"] の全 case を網羅しているので到達しないが防衛的に記録
      const _exhaustive: never = msg;
      console.error(
        JSON.stringify({
          level: "error",
          msg: `[queue] unknown job`,
          body: _exhaustive,
        }),
      );
    }
  }
}
