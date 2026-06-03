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

export async function handleJob(msg: JobMessage, env: Env): Promise<void> {
  switch (msg.job) {
    // ----------------------------------------------------------------
    // 投稿系 (X API 100/月上限 → Phase 1 は人間承認必須)
    // ----------------------------------------------------------------
    case "post-morning":
    case "post-noon":
    case "post-evening": {
      // W3-2: Writer (lib/writer) で draft 生成
      //        → Editor 6+5 (lib/editor/pipeline.ts) 審査
      //        → approved なら LINE 承認依頼 push
      //        → rejected なら理由を Digest に記録
      //        Phase 1: AUTONOMOUS_PUBLISH=false を強制確認してから publish
      console.log(
        JSON.stringify({
          level: "info",
          msg: `[${msg.job}] draft 生成 + LINE 承認依頼 (Phase 1 human-approval stub)`,
          slot: msg.slot,
          date: msg.date,
        }),
      );
      break;
    }

    // ----------------------------------------------------------------
    // buzz-ingest: 海外 X buzz 日次取得
    // ----------------------------------------------------------------
    case "buzz-ingest": {
      // W4: twitterapi.io 海外/国内 → raw/publishing/inspirations/ ingest
      console.log(
        JSON.stringify({
          level: "info",
          msg: "[buzz-ingest] twitterapi.io 日次取得 (stub)",
          date: msg.date,
        }),
      );
      break;
    }

    // ----------------------------------------------------------------
    // github-trending: GitHub トレンド取得
    // ----------------------------------------------------------------
    case "github-trending": {
      // W4: GitHub Trending → inspirations ネタ補充
      console.log(
        JSON.stringify({
          level: "info",
          msg: "[github-trending] GitHub Trending 取得 (stub)",
          date: msg.date,
        }),
      );
      break;
    }

    // ----------------------------------------------------------------
    // inspirations-ingest: 週次 inspirations 取得
    // ----------------------------------------------------------------
    case "inspirations-ingest": {
      // W4: 週次 inspirations ingest (海外≥1 / 国内≥1 / note≥1)
      console.log(
        JSON.stringify({
          level: "info",
          msg: "[inspirations-ingest] 週次 ingest (stub)",
          date: msg.date,
        }),
      );
      break;
    }

    // ----------------------------------------------------------------
    // daily-digest: Daily Digest 生成 + LINE 配信
    // ----------------------------------------------------------------
    case "daily-digest": {
      // W4: lib/dashboard/digest.ts → LINE 配信
      console.log(
        JSON.stringify({
          level: "info",
          msg: "[daily-digest] Digest 生成 + LINE 配信 (stub)",
          date: msg.date,
        }),
      );
      break;
    }

    // ----------------------------------------------------------------
    // optimizer-update: Thompson sampling posterior 更新
    // ----------------------------------------------------------------
    case "optimizer-update": {
      // W4: lib/optimizer/update-loop.ts → posterior 更新
      console.log(
        JSON.stringify({
          level: "info",
          msg: "[optimizer-update] Thompson posterior 更新 (stub)",
          date: msg.date,
        }),
      );
      break;
    }

    // ----------------------------------------------------------------
    // rollback-monitor: 異常検知・自動ロールバック監視
    // ----------------------------------------------------------------
    case "rollback-monitor": {
      // W4: エラー率・KPI 閾値チェック → fallback trigger
      console.log(
        JSON.stringify({
          level: "info",
          msg: "[rollback-monitor] 異常検知チェック (stub)",
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
      // W3-2: 署名検証済みイベントを分岐
      //   postback "approve:<draftId>" → publish
      //   postback "reject:<draftId>"  → draft 破棄
      //   text → lib/interviewer/line-flow.ts 5 ステップへ
      console.log(
        JSON.stringify({
          level: "info",
          msg: "[line-event] LINE イベント処理 (stub)",
          date: msg.date,
        }),
      );
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
