/**
 * src/queue.ts — Cloudflare Queue consumer dispatch (scaffold)
 *
 * handleJob() は queue() handler から呼ばれる。
 * Phase 1 は全 job stub (console.log のみ)。
 * 実装は後続タスクで順次配線:
 *   - W3-2: 投稿 job (post-morning / post-noon / post-evening) の実装
 *   - W4:   その他 job (buzz-ingest / optimizer-update など) の実装
 *
 * W5-7: brownout 4-stage guard
 *   handleJob() 冒頭で当月コストを取得し evaluateBrownout() を呼ぶ。
 *   allowedJobs に含まれない job は ACK してスキップ (無限リトライ防止)。
 *   daily-digest と line-event は全ステージで常に allowedJobs に含まれるため
 *   オペレーターへの通知・!resume 操作は遮断されない。
 */

import type { Env, JobMessage } from "./worker.js";
import { runPostJob } from "./jobs/post-job.js";
import { handleLineEvent } from "./jobs/line-event.js";
import { runBuzzIngest } from "../lib/ingest/buzz-ingest.js";
import { runInspirationsIngest } from "../lib/ingest/inspirations-ingest.js";
import { runIdeation } from "../lib/ideation/ideate.js";
import { runRollbackMonitor } from "./jobs/rollback-job.js";
import { runRotationNotice } from "./jobs/rotation-job.js";
import { evaluateBrownout } from "../lib/safety/brownout-handler.js";
import { makeProductionDeps } from "../lib/dashboard/kpi-collector.js";
import { recordSkip, withTrace } from "../lib/trace/with-trace.js";

export const MAX_ATTEMPTS = 4; // = 1 + wrangler.toml max_retries(3)。変更時は wrangler.toml と両方

export interface HandleJobResult {
  skipped: boolean;
}

export function decideRunStatus(
  a: { ok: boolean; attempt: number; maxAttempts: number },
): "ok" | "running" | "error" {
  if (a.ok) return "ok";
  return a.attempt >= a.maxAttempts ? "error" : "running";
}

export async function handleJob(
  msg: JobMessage,
  env: Env,
  ctx?: ExecutionContext,
): Promise<HandleJobResult> {
  const runId = (msg as { runId?: string }).runId;
  // ----------------------------------------------------------------
  // W5-7: brownout 4-stage guard
  //   当月コストを cost_ledger から取得し、4-stage 判定を行う。
  //   allowedJobs に含まれない job は即 ACK してスキップ (リトライしない)。
  //   - cost source: makeProductionDeps().getMonthlyCostJpy()
  //     → Supabase cost_ledger の当月合計 (IN_MEMORY_FALLBACK=true 時は 0)
  //   - daily-digest / line-event は全 stage で allowedJobs に含まれるため
  //     オペレーター通知・!resume 操作は遮断されない
  // ----------------------------------------------------------------
  {
    // Fail OPEN for dispatch: if the cost source (Supabase / network) throws,
    // default to 0 so jobs still run. daily-digest / line-event MUST always run,
    // and the kill-switch + DB publisher gate independently protect actual publishing.
    let costJpy = 0;
    try {
      costJpy = await makeProductionDeps().getMonthlyCostJpy!();
    } catch (e) {
      console.warn("[queue] cost fetch failed, defaulting to 0 (ok)", e);
    }
    const decision = await evaluateBrownout(costJpy);
    if (!decision.allowedJobs.includes(msg.job)) {
      console.log(
        JSON.stringify({
          level: "warn",
          msg: "[queue] job skipped by brownout guard",
          job: msg.job,
          brownout_status: decision.status,
          cost_jpy: decision.cost_jpy,
          allowed: decision.allowedJobs,
        }),
      );
      if (runId) await recordSkip(ctx, { runId, stageId: "safety", outcome: `brownout:${decision.status}` });
      // ACK: リトライしない (予算回復まで次の cron 発火を待つ)
      return { skipped: true };
    }
  }

  switch (msg.job) {
    // ----------------------------------------------------------------
    // ideation: materials_store → core_ideas LLM 自動生成 (W5-2)
    // ----------------------------------------------------------------
    case "ideation": {
      const rid = runId ?? "";
      if (rid) {
        await withTrace(ctx, { runId: rid, stageId: "ideation" }, async () => {
          let traceMeta: import("../lib/trace/types.js").TraceMeta | undefined;
          const count = await runIdeation(env, 5, (m) => {
            traceMeta = m;
          });
          console.log(
            JSON.stringify({
              level: "info",
              msg: "[ideation] materials→core_ideas 生成 完了",
              date: msg.date,
              inserted: count,
            }),
          );
          return { result: count, output: { inserted: count }, meta: traceMeta };
        });
      } else {
        const count = await runIdeation(env);
        console.log(
          JSON.stringify({
            level: "info",
            msg: "[ideation] materials→core_ideas 生成 完了",
            date: msg.date,
            inserted: count,
          }),
        );
      }
      break;
    }

    // ----------------------------------------------------------------
    // 投稿系 (X API 100/月上限 → Phase 1 は人間承認必須)
    // ----------------------------------------------------------------
    case "post-morning":
    case "post-noon":
    case "post-evening": {
      // W3-2: idea→draft→editor→LINE承認依頼
      // 手動起動(manual)は標準スロットを占有しないよう manual-xxx slot で投稿する。
      // → 「各スロット投稿済み」管理は自動(cron)起動のみに反映される。
      const slot = msg.manual
        ? `manual-${msg.slot}-${crypto.randomUUID().slice(0, 8)}`
        : msg.slot;
      await runPostJob(slot, env, ctx, runId);
      break;
    }

    // ----------------------------------------------------------------
    // buzz-ingest: 海外 X buzz 日次取得 → materials_store
    // ----------------------------------------------------------------
    case "buzz-ingest": {
      // W5-1: twitterapi.io seed accounts → xad.materials_store (x_inspirations)
      const rid = runId ?? "";
      if (rid) {
        await withTrace(ctx, { runId: rid, stageId: "buzz-ingest" }, async () => {
          const count = await runBuzzIngest(env);
          console.log(
            JSON.stringify({
              level: "info",
              msg: "[buzz-ingest] twitterapi.io 日次取得 完了",
              date: msg.date,
              inserted: count,
            }),
          );
          return { result: count, output: { inserted: count } };
        });
      } else {
        const count = await runBuzzIngest(env);
        console.log(
          JSON.stringify({
            level: "info",
            msg: "[buzz-ingest] twitterapi.io 日次取得 完了",
            date: msg.date,
            inserted: count,
          }),
        );
      }
      break;
    }

    // ----------------------------------------------------------------
    // inspirations-ingest: 週次 inspirations 取得 (W5-3)
    // ----------------------------------------------------------------
    case "inspirations-ingest": {
      // X seeds (overseas ≥6 / domestic ≥18) + note seeds (≥3) → materials_store
      const rid = runId ?? "";
      if (rid) {
        await withTrace(ctx, { runId: rid, stageId: "inspirations-ingest" }, async () => {
          const count = await runInspirationsIngest(env);
          console.log(
            JSON.stringify({
              level: "info",
              msg: "[inspirations-ingest] 週次 ingest 完了",
              date: msg.date,
              inserted: count,
            }),
          );
          return { result: count, output: { inserted: count } };
        });
      } else {
        const count = await runInspirationsIngest(env);
        console.log(
          JSON.stringify({
            level: "info",
            msg: "[inspirations-ingest] 週次 ingest 完了",
            date: msg.date,
            inserted: count,
          }),
        );
      }
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
    // rotation-notice: X token 期限チェック + 自動 refresh + LINE 通知 (W5-9)
    // ----------------------------------------------------------------
    case "rotation-notice": {
      await runRotationNotice(env);
      console.log(
        JSON.stringify({
          level: "info",
          msg: "[rotation-notice] token rotation チェック完了",
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
      // A10: handleLineEvent は ctx を受け取り、承認/却下/修正の trace を
      //      元の post run(run_id) に追記する。
      await handleLineEvent(msg.payload, env, ctx);
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

  return { skipped: false };
}
