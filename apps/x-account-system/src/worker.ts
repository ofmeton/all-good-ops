/**
 * Cloudflare Workers entry — x-account-system Phase 1
 *
 * 役割:
 *   1. scheduled(): cron triggers (wrangler.toml) を job にディスパッチ。
 *      Phase 1 は「人間承認つき 1 投稿/日」なので、投稿系 cron は
 *      draft 生成 + LINE 承認依頼まで。live 投稿はしない (env.AUTONOMOUS_PUBLISH=false)。
 *   2. fetch(): LINE Webhook 受信 (設計 L1098)。承認タップ → publish、
 *      Interviewer 5 ステップ応答を処理する入口。
 *
 * 実装状況: Phase 1 deploy 準備の scaffold。各 job は lib/ の既存ロジックへ
 *   段階的に配線する (TODO 参照)。lib/ は現状 Node (fs/Python 依存) を含むため、
 *   Workers 互換化は job ごとに次フェーズ PR で実施。
 */

export interface Env {
  // vars (wrangler.toml [vars])
  NODE_ENV: string;
  LOG_LEVEL: string;
  PHASE: string;
  AUTONOMOUS_PUBLISH: string;
  BUDGET_MONTHLY_LIMIT_JPY: string;
  BUDGET_BROWNOUT_THRESHOLD_JPY: string;
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

/** cron 式 → job 名 (wrangler.toml の crons と 1:1 対応、JST はコメント) */
const CRON_JOBS: Record<string, string> = {
  "0 21 * * *": "buzz-ingest", // 海外X buzz 日次 (06:00 JST)
  "0 22 * * *": "post-morning", // 朝 7:00 失敗談先行型
  "0 3 * * *": "post-noon", // 昼 12:00 ROI Before-After
  "0 8 * * *": "post-evening-note", // 夕 17:00 note 送客
  "30 8 * * *": "post-evening-quote", // 夕 17:30 引用RT 補足
  "0 12 * * *": "post-night-quote", // 夜 21:00 引用RT 別角度
  "0 13 * * *": "daily-digest", // 22:00 Digest
  "0 14 * * *": "optimizer-update", // 23:00 posterior 更新
  "0 0 * * 1": "inspirations-ingest", // 月曜 09:00 週次
  "0 15 1 * *": "rotation-notice", // 月初 token rotation
};

const POST_JOBS = new Set([
  "post-morning",
  "post-noon",
  "post-evening-note",
  "post-evening-quote",
  "post-night-quote",
]);

export default {
  async scheduled(
    event: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    const job = CRON_JOBS[event.cron] ?? "unknown";
    log(env, "info", `cron fired: ${event.cron} → job=${job}`);

    if (job === "unknown") {
      log(env, "error", `no job mapped for cron "${event.cron}"`);
      return;
    }

    ctx.waitUntil(dispatch(job, env));
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // LINE Webhook (設計 L1098): 承認タップ / Interviewer 応答
    if (url.pathname === "/line/webhook" && request.method === "POST") {
      // TODO(next-phase): 署名検証 (LINE_CHANNEL_SECRET) → イベント分岐
      //   - postback "approve:<draftId>" → publish (人間承認済 → live OK)
      //   - postback "reject:<draftId>"  → draft 破棄 + 理由記録
      //   - text message → lib/interviewer/line-flow.ts 5 ステップへ
      log(env, "info", "LINE webhook received (stub)");
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
};

/** job ディスパッチ。Phase 1 は投稿系を draft+承認依頼に限定。 */
async function dispatch(job: string, env: Env): Promise<void> {
  const autonomous = env.AUTONOMOUS_PUBLISH === "true";

  if (POST_JOBS.has(job)) {
    // Phase 1: 自律投稿は恒久ブロック。draft 生成 → LINE 承認依頼まで。
    if (autonomous) {
      log(env, "error", `AUTONOMOUS_PUBLISH=true は Phase 1 で不許可。job=${job} 中断`);
      return;
    }
    // TODO(next-phase): Writer (lib/writer) で draft 生成
    //   → Editor 6+5 (lib/editor/pipeline.ts) で審査
    //   → approved なら LINE 承認依頼 push、rejected なら理由を Digest に記録
    log(env, "info", `[${job}] draft 生成 + LINE 承認依頼 (Phase 1 human-approval, stub)`);
    return;
  }

  switch (job) {
    case "buzz-ingest":
      // TODO: twitterapi.io 海外/国内 → raw/publishing/inspirations/ ingest
      log(env, "info", "[buzz-ingest] twitterapi.io 日次取得 (stub)");
      break;
    case "inspirations-ingest":
      // TODO: 週次 inspirations ingest (海外≥1 / 国内≥1 / note≥1)
      log(env, "info", "[inspirations-ingest] 週次 ingest (stub)");
      break;
    case "daily-digest":
      // TODO: lib/dashboard/digest.ts → LINE 配信
      log(env, "info", "[daily-digest] Digest 生成 + LINE 配信 (stub)");
      break;
    case "optimizer-update":
      // TODO: lib/optimizer/update-loop.ts → posterior 更新
      log(env, "info", "[optimizer-update] Thompson posterior 更新 (stub)");
      break;
    case "rotation-notice":
      // TODO: X/Meta token refresh 期日を LINE 通知 (§10.6)
      log(env, "info", "[rotation-notice] token rotation 通知 (stub)");
      break;
    default:
      log(env, "error", `dispatch: unhandled job=${job}`);
  }
}

function log(env: Env, level: "info" | "error", msg: string): void {
  if (level === "error" || env.LOG_LEVEL !== "error") {
    console.log(JSON.stringify({ level, msg, ts: new Date().toISOString() }));
  }
}
