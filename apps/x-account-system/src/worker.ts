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
import { verifyLineSignature, pkceChallenge, randomVerifier } from "../lib/crypto/webcrypto.js";
import { exchangeCode } from "../lib/oauth/token-exchange.js";
import { createClient } from "@supabase/supabase-js";

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
  // KV binding (wrangler.toml [[kv_namespaces]])
  OAUTH_STATE: KVNamespace;
  // secrets (wrangler secret put)
  ANTHROPIC_API_KEY: string;
  // Anthropic Admin API key for cost_report (optional; unset → Claude 実コスト null)
  ANTHROPIC_ADMIN_KEY: string;
  OPENAI_API_KEY: string;
  X_CLIENT_ID: string;
  X_CLIENT_SECRET: string;
  X_REDIRECT_URI: string;
  X_OAUTH_SCOPES: string;
  X_ACCESS_TOKEN: string;
  X_REFRESH_TOKEN: string;
  X_TOKEN_EXPIRES_AT: string;
  // Admin secret gating /oauth/x/start (fail closed: unset → reject)
  OAUTH_ADMIN_SECRET: string;
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
      // 手動起動 (/admin/enqueue) は true。標準スロットを占有せず manual-xxx slot で投稿し、
      // 「各スロット投稿済み」管理は自動(cron)起動のみに反映させる。
      manual?: boolean;
    }
  | {
      job:
        | "ideation"
        | "buzz-ingest"
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
  "0 21 * * *": "buzz-ingest",       // 06:00 JST (素材収集を最初に)
  "30 21 * * *": "ideation",         // 06:30 JST (buzz の後で素材→ネタ変換)
  "0 22 * * *": "post-morning",      // 07:00 JST
  "0 3 * * *": "post-noon",          // 12:00 JST
  "0 10 * * *": "post-evening",      // 19:00 JST (note 送客)
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

/** /admin/enqueue で手動起動を許可する job 名（line-event は webhook 専用なので除外） */
const CRON_JOBS_BY_NAME: Record<string, true> = {
  ideation: true,
  "buzz-ingest": true,
  "post-morning": true,
  "post-noon": true,
  "post-evening": true,
  "daily-digest": true,
  "optimizer-update": true,
  "rollback-monitor": true,
  "inspirations-ingest": true,
  "rotation-notice": true,
};

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

    // 管理用: cron job を手動で enqueue（OAUTH_ADMIN_SECRET ゲート）。
    // GET /admin/enqueue?job=<name>&key=<secret>  → 該当 job を即 enqueue（consumer が処理）
    if (url.pathname === "/admin/enqueue") {
      const key = url.searchParams.get("key");
      if (!env.OAUTH_ADMIN_SECRET || key !== env.OAUTH_ADMIN_SECRET) {
        return new Response("unauthorized", { status: 401 });
      }
      const job = url.searchParams.get("job") as JobMessage["job"] | null;
      if (!job || !(job in CRON_JOBS_BY_NAME)) {
        return new Response(
          `bad job. allowed: ${Object.keys(CRON_JOBS_BY_NAME).join(", ")}`,
          { status: 400 },
        );
      }
      const date = jstDate(new Date());
      const slot = POST_SLOTS[job as keyof typeof POST_SLOTS];
      // 手動起動は manual:true。標準スロットを占有しない (handleJob 側で manual-xxx slot に振る)。
      const msg: JobMessage = slot
        ? ({ job, date, slot, manual: true } as JobMessage)
        : ({ job, date } as JobMessage);
      await env.JOBS.send(msg);
      log(env, "info", `admin: enqueued job=${job} (manual)`);
      return Response.json({ ok: true, enqueued: msg });
    }

    // X OAuth PKCE Step 1: generate verifier/state → store in KV → redirect to X
    if (url.pathname === "/oauth/x/start") {
      // Admin gate (fail CLOSED): unauthenticated callers could poison the token
      // store / DoS the X OAuth flow. The admin invokes /oauth/x/start?key=<secret>.
      const key = url.searchParams.get("key");
      if (!env.OAUTH_ADMIN_SECRET || key !== env.OAUTH_ADMIN_SECRET) {
        log(env, "error", "/oauth/x/start: unauthorized (missing/invalid key)");
        return new Response("unauthorized", { status: 401 });
      }
      try {
        const verifier = randomVerifier();
        const state = randomVerifier();
        const challenge = await pkceChallenge(verifier);

        // Store verifier keyed by state. TTL 300s (5 min) for the authorization code window.
        await env.OAUTH_STATE.put(state, verifier, { expirationTtl: 300 });

        const authorizeUrl = new URL("https://x.com/i/oauth2/authorize");
        authorizeUrl.searchParams.set("response_type", "code");
        authorizeUrl.searchParams.set("client_id", env.X_CLIENT_ID);
        authorizeUrl.searchParams.set("redirect_uri", env.X_REDIRECT_URI);
        authorizeUrl.searchParams.set("scope", env.X_OAUTH_SCOPES);
        authorizeUrl.searchParams.set("state", state);
        authorizeUrl.searchParams.set("code_challenge", challenge);
        authorizeUrl.searchParams.set("code_challenge_method", "S256");

        return Response.redirect(authorizeUrl.toString(), 302);
      } catch (e) {
        log(env, "error", `/oauth/x/start error: ${String(e)}`);
        return new Response(`OAuth start error: ${String(e)}`, { status: 500 });
      }
    }

    // X OAuth PKCE Step 2: exchange code for tokens → upsert oauth_tokens
    if (url.pathname === "/oauth/x/callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      if (!code || !state) {
        return new Response("Missing code or state parameter", { status: 400 });
      }

      // One-time state: read AND delete before exchange (replay protection)
      const verifier = await env.OAUTH_STATE.get(state);
      if (!verifier) {
        return new Response("Invalid or expired state (possible replay attack)", { status: 400 });
      }
      await env.OAUTH_STATE.delete(state);

      try {
        const token = await exchangeCode(code, verifier, {
          X_CLIENT_ID: env.X_CLIENT_ID,
          X_CLIENT_SECRET: env.X_CLIENT_SECRET,
          X_REDIRECT_URI: env.X_REDIRECT_URI,
        });

        // Upsert into xad.oauth_tokens
        const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
          db: { schema: "xad" },
        });
        await sb.from("oauth_tokens").upsert(
          {
            provider: "x",
            access_token: token.accessToken,
            refresh_token: token.refreshToken ?? null,
            // epoch ms → timestamptz ISO
            expires_at: token.expiresAt ? new Date(token.expiresAt).toISOString() : null,
            scope: token.scope ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "provider" },
        );

        log(env, "info", "OAuth callback: token exchanged and persisted to oauth_tokens");
        return new Response(
          `<!DOCTYPE html><html><head><title>OAuth Success</title></head><body>` +
          `<h1>X OAuth Authorization Successful</h1>` +
          `<p>Access token has been stored. You may close this window.</p>` +
          `</body></html>`,
          { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        log(env, "error", `/oauth/x/callback error: ${msg}`);
        return new Response(`OAuth callback error: ${msg}`, { status: 500 });
      }
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
