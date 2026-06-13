/**
 * src/queue.ts — Cloudflare Queue consumer dispatch (scaffold)
 *
 * handleJob() は queue() handler から呼ばれる。
 *
 * W5-7: brownout 4-stage guard
 *   handleJob() 冒頭で当月コストを取得し evaluateBrownout() を呼ぶ。
 *   allowedJobs に含まれない job は ACK してスキップ (無限リトライ防止)。
 *   daily-digest と line-event は全ステージで常に allowedJobs に含まれるため
 *   オペレーターへの通知・!resume 操作は遮断されない。
 */

import type { Env, JobMessage } from "./worker.js";
import { handleLineEvent } from "./jobs/line-event.js";
import { runRollbackMonitor } from "./jobs/rollback-job.js";
import { runRotationNotice } from "./jobs/rotation-job.js";
import { evaluateBrownout } from "../lib/safety/brownout-handler.js";
import { makeProductionDeps } from "../lib/dashboard/kpi-collector.js";
import { recordSkip, withTrace } from "../lib/trace/with-trace.js";
import { recordCostLedger } from "../lib/cost/cost-ledger.js";

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
    // collect: Collector Agent — 探索的ネタ収集 + 3軸スコア → materials_store
    // ----------------------------------------------------------------
    case "collect": {
      const rid = runId ?? "";
      const { createClient } = await import("@supabase/supabase-js");
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        db: { schema: process.env.SUPABASE_SCHEMA || "xad" },
      });
      const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
      const { runCollect } = await import("../lib/ingest/collector.js");
      if (rid) {
        let traceMeta: import("../lib/trace/types.js").TraceMeta | undefined;
        let collectStats: import("../lib/ingest/collector.js").CollectStats | undefined;
        await withTrace(ctx, { runId: rid, stageId: "collect" }, async () => {
          const stats = await runCollect({
            anthropic: anthropic as never,
            sb: sb as never,
            twitterApiKey: env.TWITTERAPI_IO_KEY,
            fetchImpl: fetch,
            apiKey: env.ANTHROPIC_API_KEY,
            runId: rid,
            onTrace: (m) => {
              traceMeta = m;
            },
          });
          console.log(JSON.stringify({ level: "info", msg: "[collect] 完了", date: msg.date, inserted: stats.inserted }));
          // trace output に内訳を載せる（観測ダッシュボード用）。cost 合計（meta.costJpy）は不変。
          const breakdown = { exploreJpy: stats.cost.exploreJpy, scoringJpy: stats.cost.scoringJpy, translateJpy: stats.cost.translateJpy };
          collectStats = stats;
          return {
            result: stats.inserted,
            output: {
              inserted: stats.inserted,
              fetched: stats.fetched,
              deduped: stats.deduped,
              scored: stats.scored,
              breakdown,
              // P2 観測: 選抜モード・shadow 指標（retention 等）・剪定サマリ。
              selectionMode: stats.selectionMode,
              shadow: stats.shadow,
              pruned: stats.pruned,
            },
            meta: traceMeta,
          };
        });
        // cost_ledger 計上（fail-open）。ctx 不在経路（手動/非 Queue）でも握り潰さず await。
        // cost_jpy の総額は現状と同じ（traceMeta.costJpy）。breakdown はあくまで meta の内訳。
        {
          const p = recordCostLedger(sb as never, {
            category: "collector",
            costJpy: traceMeta?.costJpy ?? 0,
            unitCount: (traceMeta?.tokensIn ?? 0) + (traceMeta?.tokensOut ?? 0),
            meta: {
              model: traceMeta?.model,
              breakdown: collectStats
                ? { exploreJpy: collectStats.cost.exploreJpy, scoringJpy: collectStats.cost.scoringJpy, translateJpy: collectStats.cost.translateJpy }
                : undefined,
              fetched: collectStats?.fetched,
              deduped: collectStats?.deduped,
              scored: collectStats?.scored,
              inserted: collectStats?.inserted,
              // P2: 本番 run で retention/剪定を観測（enforce 切替判断の材料）。
              selectionMode: collectStats?.selectionMode,
              shadow: collectStats?.shadow,
              pruned: collectStats?.pruned
                ? { count: collectStats.pruned.count, byReason: collectStats.pruned.byReason }
                : undefined,
            },
          });
          if (ctx) ctx.waitUntil(p);
          else await p;
        }
      } else {
        const stats = await runCollect({
          anthropic: anthropic as never,
          sb: sb as never,
          twitterApiKey: env.TWITTERAPI_IO_KEY,
          fetchImpl: fetch,
          apiKey: env.ANTHROPIC_API_KEY,
        });
        console.log(JSON.stringify({ level: "info", msg: "[collect] 完了(untraced)", date: msg.date, inserted: stats.inserted }));
      }
      // auto-archive（要件2・PR-5）: collected のまま7日経過した素材を archived へ自動退避。
      // 新 cron は立てず collect 末尾に相乗り。削除でなく退避＝reset で復帰可・system イベント追記。
      // fail-open（収集本体は成功扱い・sweep 失敗は warn のみ）。
      try {
        const { data: archived, error } = await sb.rpc("archive_stale_materials", { p_days: 7 });
        if (error) {
          console.warn(JSON.stringify({ level: "warn", msg: "[collect] auto-archive sweep failed", error: error.message }));
        } else {
          console.log(JSON.stringify({ level: "info", msg: "[collect] auto-archive", archived: archived ?? 0 }));
        }
      } catch (e) {
        console.warn(JSON.stringify({ level: "warn", msg: "[collect] auto-archive sweep threw", error: String(e) }));
      }
      break;
    }

    // ----------------------------------------------------------------
    // bookmark-collect: 手動 X ブックマーク取込 → 既存 scoring/translate/persist
    // ----------------------------------------------------------------
    case "bookmark-collect": {
      const rid = runId ?? "";
      const { createClient } = await import("@supabase/supabase-js");
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        db: { schema: process.env.SUPABASE_SCHEMA || "xad" },
      });
      const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
      const { runBookmarkCollect } = await import("../lib/ingest/bookmark-collect.js");
      if (rid) {
        let traceMeta: import("../lib/trace/types.js").TraceMeta | undefined;
        let collectStats: import("../lib/ingest/collector.js").CollectStats | undefined;
        await withTrace(ctx, { runId: rid, stageId: "bookmark-collect" }, async () => {
          const stats = await runBookmarkCollect({
            anthropic: anthropic as never,
            sb: sb as never,
            twitterApiKey: env.TWITTERAPI_IO_KEY,
            loginCookie: env.TWITTERAPI_IO_LOGIN_COOKIE,
            proxy: env.TWITTERAPI_IO_PROXY,
            fetchImpl: fetch,
            runId: rid,
            onTrace: (m) => {
              traceMeta = m;
            },
          });
          console.log(JSON.stringify({ level: "info", msg: "[bookmark-collect] 完了", date: msg.date, inserted: stats.inserted }));
          const breakdown = { exploreJpy: stats.cost.exploreJpy, scoringJpy: stats.cost.scoringJpy, translateJpy: stats.cost.translateJpy };
          collectStats = stats;
          return {
            result: stats.inserted,
            output: {
              inserted: stats.inserted,
              fetched: stats.fetched,
              deduped: stats.deduped,
              scored: stats.scored,
              breakdown,
            },
            meta: traceMeta,
          };
        });
        {
          const p = recordCostLedger(sb as never, {
            category: "bookmark-collect",
            costJpy: traceMeta?.costJpy ?? 0,
            unitCount: (traceMeta?.tokensIn ?? 0) + (traceMeta?.tokensOut ?? 0),
            meta: {
              model: traceMeta?.model,
              breakdown: collectStats
                ? { exploreJpy: collectStats.cost.exploreJpy, scoringJpy: collectStats.cost.scoringJpy, translateJpy: collectStats.cost.translateJpy }
                : undefined,
              fetched: collectStats?.fetched,
              deduped: collectStats?.deduped,
              scored: collectStats?.scored,
              inserted: collectStats?.inserted,
            },
          });
          if (ctx) ctx.waitUntil(p);
          else await p;
        }
      } else {
        const stats = await runBookmarkCollect({
          anthropic: anthropic as never,
          sb: sb as never,
          twitterApiKey: env.TWITTERAPI_IO_KEY,
          loginCookie: env.TWITTERAPI_IO_LOGIN_COOKIE,
          proxy: env.TWITTERAPI_IO_PROXY,
          fetchImpl: fetch,
        });
        console.log(JSON.stringify({ level: "info", msg: "[bookmark-collect] 完了(untraced)", date: msg.date, inserted: stats.inserted }));
      }
      break;
    }

    // ----------------------------------------------------------------
    // compose: 執筆配管 stub — queued 素材の件数/ID を trace 記録
    // ----------------------------------------------------------------
    case "compose": {
      const rid = runId ?? "";
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        db: { schema: process.env.SUPABASE_SCHEMA || "xad" },
      });
      const { runCompose } = await import("../lib/curation/run-compose.js");
      let draftCount = 0;
      if (rid) {
        // onTrace は素材ごとに発火するためトークン/コストを合算（last-writer-wins を避ける）。
        let tokensIn = 0, tokensOut = 0, costJpy = 0, traceModel: string | undefined;
        await withTrace(ctx, { runId: rid, stageId: "compose" }, async () => {
          const out = await runCompose({
            sb: sb as never,
            apiKey: env.ANTHROPIC_API_KEY,
            runId: rid,
            onTrace: (m) => { tokensIn += m.tokensIn ?? 0; tokensOut += m.tokensOut ?? 0; costJpy += m.costJpy ?? 0; traceModel = m.model ?? traceModel; },
          });
          draftCount = out.draftCount;
          // 全件失敗（生成 0 件）は zero-yield として error レベルで可視化（黙って ok にしない）。
          const lvl = out.processed > 0 && out.draftCount === 0 ? "error" : "info";
          console.log(JSON.stringify({ level: lvl, msg: "[compose]", date: msg.date, processed: out.processed, drafts: out.draftCount, errors: out.errorCount }));
          return { result: out.draftCount, output: out, meta: { model: traceModel, tokensIn, tokensOut, costJpy } };
        });
        // cost_ledger 計上（fail-open）。ctx 不在経路（手動/非 Queue）でも握り潰さず await。
        {
          const p = recordCostLedger(sb as never, {
            category: "writer",
            costJpy,
            unitCount: tokensIn + tokensOut,
            meta: { model: traceModel },
          });
          if (ctx) ctx.waitUntil(p);
          else await p;
        }
      } else {
        const out = await runCompose({ sb: sb as never, apiKey: env.ANTHROPIC_API_KEY });
        draftCount = out.draftCount;
        const lvl = out.processed > 0 && out.draftCount === 0 ? "error" : "info";
        console.log(JSON.stringify({ level: lvl, msg: "[compose](untraced)", processed: out.processed, drafts: out.draftCount, errors: out.errorCount }));
      }
      // compose→check 自動連鎖: draft が出来たら新 runId で check を enqueue。
      // FK (run_trace.run_id → run.id) のため insertRun→send を直列化（scheduled handler 流儀）。
      if (draftCount > 0) {
        // 連鎖 enqueue の失敗で compose 本体を throw させない（throw→queue retry→ドラフト二重生成
        // を誘発するため）。drafts は生成済。enqueue 失敗は error ログで可視化（手動/次回 check で回収）。
        try {
          const { insertRun } = await import("../lib/trace/trace-store.js");
          const checkRunId = crypto.randomUUID();
          const trigger = runId ? "webhook" : "cron";
          await insertRun({ id: checkRunId, job: "check", trigger, date: msg.date, status: "running", attempt: 1 });
          await env.JOBS.send({ job: "check", date: msg.date, runId: checkRunId });
          console.log(JSON.stringify({ level: "info", msg: "[compose] → check enqueued", date: msg.date, drafts: draftCount, checkRunId }));
        } catch (e) {
          console.log(JSON.stringify({ level: "error", msg: "[compose] check enqueue failed (drafts created, check未起動)", date: msg.date, drafts: draftCount, error: String(e) }));
        }
      }
      break;
    }

    // ----------------------------------------------------------------
    // check: チェックAg(MA checker) — pending draft を重複＋ファクトで点検 → LINE 承認
    // ----------------------------------------------------------------
    case "check": {
      const rid = runId ?? "";
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        db: { schema: process.env.SUPABASE_SCHEMA || "xad" },
      });
      const { runCheck } = await import("../lib/check/run-check.js");
      let sentBack = 0;
      if (rid) {
        // onTrace はドラフトごとに発火するためトークン/コストを合算（last-writer-wins を避ける）。
        let tokensIn = 0, tokensOut = 0, costJpy = 0, traceModel: string | undefined;
        await withTrace(ctx, { runId: rid, stageId: "check" }, async () => {
          const out = await runCheck({
            env,
            sb: sb as never,
            apiKey: env.ANTHROPIC_API_KEY,
            runId: rid,
            onTrace: (m) => { tokensIn += m.tokensIn ?? 0; tokensOut += m.tokensOut ?? 0; costJpy += m.costJpy ?? 0; traceModel = m.model ?? traceModel; },
          });
          sentBack = out.sentBack;
          console.log(JSON.stringify({ level: out.recentFetchFailed ? "warn" : "info", msg: "[check]", date: msg.date, checked: out.checked, approved: out.approved, sentBack: out.sentBack, flagged: out.flagged, errors: out.errorCount, recentFetchFailed: out.recentFetchFailed ?? false }));
          return { result: out.checked, output: out, meta: { model: traceModel, tokensIn, tokensOut, costJpy } };
        });
        // cost_ledger 計上（fail-open）。ctx 不在経路（手動/非 Queue）でも握り潰さず await。
        {
          const p = recordCostLedger(sb as never, {
            category: "checker",
            costJpy,
            unitCount: tokensIn + tokensOut,
            meta: { model: traceModel },
          });
          if (ctx) ctx.waitUntil(p);
          else await p;
        }
      } else {
        const out = await runCheck({ env, sb: sb as never, apiKey: env.ANTHROPIC_API_KEY });
        sentBack = out.sentBack;
        console.log(JSON.stringify({ level: "info", msg: "[check](untraced)", checked: out.checked, approved: out.approved, sentBack: out.sentBack, flagged: out.flagged, errors: out.errorCount }));
      }
      // check→compose 自動連鎖: 差し戻し（sent_back）が出たら素材は再 queue 済なので compose を再起動。
      // 連鎖 enqueue 失敗で check 本体を throw させない（throw→queue retry→二重点検を誘発するため）。
      // ループは素材 meta.compose_attempts の上限（cfg.maxRedoAttempts）で必ず停止する。
      if (sentBack > 0) {
        try {
          const { insertRun } = await import("../lib/trace/trace-store.js");
          const composeRunId = crypto.randomUUID();
          const trigger = runId ? "webhook" : "cron";
          await insertRun({ id: composeRunId, job: "compose", trigger, date: msg.date, status: "running", attempt: 1 });
          await env.JOBS.send({ job: "compose", date: msg.date, runId: composeRunId });
          console.log(JSON.stringify({ level: "info", msg: "[check] → compose enqueued (sent back for redo)", date: msg.date, sentBack, composeRunId }));
        } catch (e) {
          console.log(JSON.stringify({ level: "error", msg: "[check] compose enqueue failed (素材は再queue済、compose未起動)", date: msg.date, sentBack, error: String(e) }));
        }
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
    // optimizer-analyst: 毎週月曜01:00 JST 提案生成 MA job (週次)
    // ----------------------------------------------------------------
    case "optimizer-analyst": {
      const { runOptimizerAnalyst } = await import("../lib/optimizer-analyst/run-analyst.js");
      // runId を渡し session_event を run→session でブリッジ（メタ観測）。
      const result = await runOptimizerAnalyst(undefined, runId);
      console.log(JSON.stringify({ level: "info", msg: "[optimizer-analyst] 提案生成 完了", date: msg.date, ok: result.ok, proposals: result.proposals }));
      break;
    }

    // ----------------------------------------------------------------
    // optimizer-apply (accept 後随時・enqueue のみ・cron 無)
    // ----------------------------------------------------------------
    case "optimizer-apply": {
      const { runApplyEngine, defaultApplyDeps } = await import("../lib/optimizer-apply/apply-engine.js");
      const result = await runApplyEngine(defaultApplyDeps());
      console.log(JSON.stringify({
        level: "info", msg: "[optimizer-apply] 提案適用 完了", date: msg.date,
        applied: result.applied, noop: result.noop, skipped: result.skipped,
        blocked: result.blocked, errors: result.errors,
      }));
      break;
    }

    // ----------------------------------------------------------------
    // metrics-ingest: X API v2 で engagement を取込み performance_metrics へ
    // ----------------------------------------------------------------
    case "metrics-ingest": {
      const { runMetricsIngest } = await import("../lib/metrics/ingest.js");
      const result = await runMetricsIngest();
      console.log(
        JSON.stringify({
          level: "info",
          msg: "[metrics-ingest] engagement 取込み 完了",
          date: msg.date,
          tweetsFetched: result.tweetsFetched,
          matched: result.matched,
          skipped: result.skipped,
          upserted: result.upserted,
          errors: result.errors,
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
