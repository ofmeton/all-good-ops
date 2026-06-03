/**
 * Cloudflare Workers entry — x-account-system Phase 1
 *
 * 役割:
 *   1. scheduled(): cron triggers (wrangler.toml) を Queue に enqueue するだけ。
 *      重い処理は queue() consumer 側 (src/queue.ts) に移譲。
 *      Phase 1 は「人間承認つき 1 投稿/日」。X API 100/月上限 → 投稿 cron は 3 本。
 *   2. fetch(): LINE Webhook 受信 (設計 L1098)。承認タップ → queue にも enqueue。
 *   3. queue(): MessageBatch<JobMessage> を受け取り handleJob へ dispatch。
 *
 * 実装状況: Phase 1 deploy 準備の scaffold。各 job は lib/ の既存ロジックへ
 *   段階的に配線する (TODO 参照)。lib/ は現状 Node (fs/Python 依存) を含むため、
 *   Workers 互換化は job ごとに次フェーズ PR で実施。
 */

import { bridgeEnv } from "./env-bridge.js";
import { handleJob } from "./queue.js";
import { verifyLineSignature } from "../lib/crypto/webcrypto.js";

export interface Env {
  // vars (wrangler.toml [vars])
  NODE_ENV: string;
  LOG_LEVEL: string;
  PHASE: string;
  AUTONOMOUS_PUBLISH: string;
  BUDGET_MONTHLY_LIMIT_JPY: string;
  BUDGET_BROWNOUT_THRESHOLD_JPY: string;
  // Queue binding (wrangler.toml [[queues.producers]])
  JOBS: Queue<JobMessage>;
  // secrets (wrangler secret put)
  ANTHROPIC_API_KEY: string;
  OPENAI_API_KEY: string;
  X_CLIENT_ID: string;
  X_CLIENT_SECRET: string;
  X_ACCESS_TOKEN: string;
  X_REFRESH_TOKEN: string;
  TWITTERAPI_IO_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  LINE_CHANNEL_ACCESS_TOKEN: string;
  LINE_CHANNEL_SECRET: string;
  LINE_USER_ID_OFMETON: string;
}

/**
 * Queue に流れるメッセージ型。
 * - 投稿系: slot (morning/noon/evening) を付与。
 * - その他 job: date のみ。
 * - LINE webhook 経由: payload を添付。
 */
export type JobMessage =
  | {
      job: "post-morning" | "post-noon" | "post-evening";
      date: string;
      slot: "morning" | "noon" | "evening";
    }
  | {
      job:
        | "ideation"
        | "buzz-ingest"
        | "github-trending"
        | "daily-digest"
        | "optimizer-update"
        | "rollback-monitor"
        | "inspirations-ingest"
        | "rotation-notice";
      date: string;
    }
  | { job: "line-event"; date: string; payload: unknown };

/** Asia/Tokyo YYYY-MM-DD 文字列を返す（datetime-local は固定TZで解釈する設計原則に従う） */
function jstDate(d: Date): string {
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" }); // "sv-SE" → YYYY-MM-DD
}

// cron 式 → job 名。wrangler.toml の crons と 1:1 対応（文字列が MAP KEY = 必ず一意）。
// 注: "0 * /2 * * *" (スペースなし: 0 */2 * * *) は複数時刻に発火するが式文字列として一意なのでキーとして安全。
const CRON_JOBS: Record<string, JobMessage["job"]> = {
  "0 20 * * *": "ideation",          // 05:00 JST (buzz-ingest より 1h 前)
  "0 22 * * *": "post-morning",      // 07:00 JST
  "0 3 * * *": "post-noon",          // 12:00 JST
  "0 10 * * *": "post-evening",      // 19:00 JST (note 送客)
  "0 21 * * *": "buzz-ingest",       // 06:00 JST
  "30 22 * * *": "github-trending",  // 07:30 JST (post-morning と分オフセット差)
  "0 12 * * *": "daily-digest",      // 21:00 JST
  "0 14 * * *": "optimizer-update",  // 23:00 JST
  "0 */2 * * *": "rollback-monitor", // 毎2h
  "0 0 * * 1": "inspirations-ingest", // 月曜 09:00 JST
  "0 15 1 * *": "rotation-notice",   // 月初 rotation 通知
};

/** 投稿 job → slot 名のマップ */
const POST_SLOTS = {
  "post-morning": "morning",
  "post-noon": "noon",
  "post-evening": "evening",
} as const;

export default {
  async scheduled(
    event: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    bridgeEnv(env as unknown as Record<string, unknown>);

    const job = CRON_JOBS[event.cron];
    if (!job) {
      log(env, "error", `no job mapped for cron "${event.cron}"`);
      return;
    }

    log(env, "info", `cron fired: ${event.cron} → job=${job} (enqueueing)`);

    const date = jstDate(new Date());
    const slot = POST_SLOTS[job as keyof typeof POST_SLOTS];
    const msg: JobMessage = slot
      ? ({ job, date, slot } as JobMessage)
      : ({ job, date } as JobMessage);

    ctx.waitUntil(env.JOBS.send(msg));
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    bridgeEnv(env as unknown as Record<string, unknown>);

    const url = new URL(request.url);

    // LINE Webhook (設計 L1098): 署名検証 → per-event enqueue
    if (url.pathname === "/line/webhook" && request.method === "POST") {
      // RAW body を一度だけ読む（HMAC はバイト列に対して計算するため、JSON.parse 前に text() で取得）
      const body = await request.text();
      const sig = request.headers.get("x-line-signature");
      if (!(await verifyLineSignature(body, sig, env.LINE_CHANNEL_SECRET))) {
        log(env, "error", "LINE webhook: invalid signature");
        return new Response("invalid signature", { status: 401 });
      }
      const parsed = JSON.parse(body) as { events?: unknown[] };
      const date = jstDate(new Date());
      for (const ev of parsed.events ?? []) {
        ctx.waitUntil(env.JOBS.send({ job: "line-event", date, payload: ev }));
      }
      log(env, "info", `LINE webhook: enqueued ${(parsed.events ?? []).length} event(s)`);
      return new Response("OK", { status: 200 });
    }

    // X OAuth callback (PKCE Step 2、ローカル test では localhost:3000)
    if (url.pathname === "/oauth/x/callback") {
      // TODO(next-phase): lib/oauth の PKCE token 交換へ
      return new Response("OAuth callback (stub)", { status: 200 });
    }

    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        phase: env.PHASE,
        autonomousPublish: env.AUTONOMOUS_PUBLISH === "true",
      });
    }

    return new Response("Not Found", { status: 404 });
  },

  async queue(
    batch: MessageBatch<JobMessage>,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    bridgeEnv(env as unknown as Record<string, unknown>);

    for (const m of batch.messages) {
      try {
        await handleJob(m.body, env);
        m.ack();
      } catch (e) {
        console.error("job failed", m.body, e);
        m.retry();
      }
    }
  },
};

function log(env: Env, level: "info" | "error", msg: string): void {
  if (level === "error" || env.LOG_LEVEL !== "error") {
    console.log(JSON.stringify({ level, msg, ts: new Date().toISOString() }));
  }
}
