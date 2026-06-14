/**
 * Cloudflare Workers entry — x-account-system Phase 1
 *
 * 役割:
 *   1. scheduled(): cron triggers (wrangler.toml) を Queue に enqueue するだけ。
 *      重い処理は queue() consumer 側 (src/queue.ts) に移譲。
 *      実投稿は人の承認 → chrome-devtools 予約。X API 直投は廃止済。
 *   2. fetch(): LINE Webhook 受信 (設計 L1098)。承認タップ → queue にも enqueue。
 *   3. queue(): MessageBatch<JobMessage> を受け取り handleJob へ dispatch。
 *
 * 実装状況: Phase 1 deploy 準備の scaffold。各 job は lib/ の既存ロジックへ
 *   段階的に配線する (TODO 参照)。lib/ は現状 Node (fs/Python 依存) を含むため、
 *   Workers 互換化は job ごとに次フェーズ PR で実施。
 */

import { bridgeEnv } from "./env-bridge.js";
import { handleJob, MAX_ATTEMPTS, decideRunStatus, type HandleJobResult } from "./queue.js";
import { insertRun, updateRun } from "../lib/trace/trace-store.js";
import { verifyLineSignature, pkceChallenge, randomVerifier } from "../lib/crypto/webcrypto.js";
import { exchangeCode } from "../lib/oauth/token-exchange.js";
import { createClient } from "@supabase/supabase-js";
import { listTemplateSummaries } from "../lib/curation/compose-templates.js";
import { planSlots, clipPlanByDailyCap, type StockDraft } from "../lib/publishing/slot-planner.js";
import { SCHEDULE_CONFIG, type ScheduleConfig } from "../lib/publishing/schedule-config.js";
import { markScheduledReservations } from "../lib/publishing/mark-scheduled.js";
import {
  recordScheduledPublish,
  type ScheduledReservation,
} from "../lib/trace/scheduled-publish-trace.js";
import { parseTweetIds } from "../lib/ingest/tweet-url.js";

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
  // 承認UI（xad-dashboard /approval）の URL。LINE 承認待ち通知に載せる。
  APPROVAL_UI_URL: string;
}

/**
 * Queue に流れるメッセージ型。
 * - cron / 手動 job: date のみ。
 * - LINE webhook 経由: payload を添付。
 */
export type JobMessage =
  | {
      job:
        | "collect"
        | "bookmark-collect"
        | "daily-digest"
        | "optimizer-update"
        | "optimizer-analyst"
        | "optimizer-apply"
        | "rollback-monitor"
        | "rotation-notice"
        | "metrics-ingest"
        | "compose"
        | "check";
      date: string;
      // 観測ダッシュボード用 run id (xad.run.id)。enqueue 時に発番。
      runId?: string;
      // URL 貼付ブックマーク取込用。/admin/enqueue からは起動しない。
      tweetIds?: string[];
    }
  | { job: "line-event"; date: string; payload: unknown; runId?: string };

/** Asia/Tokyo YYYY-MM-DD 文字列を返す（datetime-local は固定TZで解釈する設計原則に従う） */
function jstDate(d: Date): string {
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" }); // "sv-SE" → YYYY-MM-DD
}

// cron 式 → job 名。wrangler.toml の crons と 1:1 対応（文字列が MAP KEY = 必ず一意）。
// 注: "0 * /2 * * *" (スペースなし: 0 */2 * * *) は複数時刻に発火するが式文字列として一意なのでキーとして安全。
const CRON_JOBS: Record<string, JobMessage["job"]> = {
  "30 20 * * *": "collect",          // 05:30 JST
  "0 11 * * *": "metrics-ingest",    // 20:00 JST（digest/optimizer の前）
  "0 12 * * *": "daily-digest",      // 21:00 JST
  "0 14 * * *": "optimizer-update",  // 23:00 JST
  "0 */2 * * *": "rollback-monitor", // 毎2h
  "0 15 1 * *": "rotation-notice",   // 月初 rotation 通知
  "0 16 * * SUN": "optimizer-analyst", // 日曜16:00 UTC = 毎週月曜01:00 JST（CF Quartz: 日=SUN, 0 不可）
};

/** /admin/enqueue で手動起動を許可する job 名（line-event は webhook 専用なので除外） */
const CRON_JOBS_BY_NAME: Record<string, true> = {
  collect: true,
  "daily-digest": true,
  "optimizer-update": true,
  "optimizer-analyst": true,
  "optimizer-apply": true,
  "rollback-monitor": true,
  "rotation-notice": true,
  "metrics-ingest": true,
  compose: true,
  check: true,
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
    const msg: JobMessage = { job, date } as JobMessage;

    // run lifecycle: runId 発番 → insert(running) → send。
    // FK (run_trace.run_id → run.id) のため insert→send を 1 つの waitUntil で直列化。
    const runId = crypto.randomUUID();
    const withId = { ...msg, runId } as JobMessage;
    ctx.waitUntil(
      (async () => {
        await insertRun({ id: runId, job, trigger: "cron", date, status: "running", attempt: 1 });
        await env.JOBS.send(withId);
      })(),
    );
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
        // run lifecycle: event ごとに webhook run を発番 → insert(running) → send。
        const webhookRunId = crypto.randomUUID();
        ctx.waitUntil(
          (async () => {
            await insertRun({
              id: webhookRunId,
              job: "line-event",
              trigger: "webhook",
              date,
              status: "running",
              attempt: 1,
            });
            await env.JOBS.send({ job: "line-event", date, payload: ev, runId: webhookRunId } as JobMessage);
          })(),
        );
      }
      log(env, "info", `LINE webhook: enqueued ${(parsed.events ?? []).length} event(s)`);
      return new Response("OK", { status: 200 });
    }

    // 管理用: X アプリで保存したブックマーク URL を貼り付けて取り込む。
    // POST /admin/ingest-bookmarks?key=<secret>
    // body: JSON { urls: string[] } or text/plain newline/space/comma separated URLs
    if (url.pathname === "/admin/ingest-bookmarks") {
      if (request.method !== "POST") {
        return new Response("method not allowed", { status: 405 });
      }
      const authHeader = request.headers.get("authorization");
      const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      const key = bearer ?? url.searchParams.get("key");
      if (!env.OAUTH_ADMIN_SECRET || key !== env.OAUTH_ADMIN_SECRET) {
        return new Response("unauthorized", { status: 401 });
      }

      let input: string | string[];
      const contentType = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
      if (contentType === "application/json") {
        try {
          const payload = (await request.json()) as { urls?: unknown };
          input = Array.isArray(payload.urls) ? payload.urls.filter((v): v is string => typeof v === "string") : [];
        } catch {
          return new Response("bad json", { status: 400 });
        }
      } else {
        input = await request.text();
      }

      const tweetIds = parseTweetIds(input);
      if (tweetIds.length === 0) {
        return new Response("no valid tweet URLs or tweet IDs found", { status: 400 });
      }

      const date = jstDate(new Date());
      const runId = crypto.randomUUID();
      await insertRun({ id: runId, job: "bookmark-collect", trigger: "manual", date, status: "running", attempt: 1 });
      await env.JOBS.send({ job: "bookmark-collect", date, tweetIds, runId });
      log(env, "info", `admin: enqueued bookmark-collect count=${tweetIds.length} (manual)`);
      return Response.json({ ok: true, enqueued: { count: tweetIds.length }, runId });
    }

    // 管理用: cron job を手動で enqueue（OAUTH_ADMIN_SECRET ゲート）。
    // GET /admin/enqueue?job=<name>&key=<secret>  → 該当 job を即 enqueue（consumer が処理）
    if (url.pathname === "/admin/enqueue") {
      const authHeader = request.headers.get("authorization");
      const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      const key = bearer ?? url.searchParams.get("key");
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
      // run lifecycle: runId 発番 → insert(running, trigger=manual) → send を直列化。
      const runId = crypto.randomUUID();
      const msg: JobMessage = { job, date, runId } as JobMessage;
      await insertRun({ id: runId, job, trigger: "manual", date, status: "running", attempt: 1 });
      await env.JOBS.send(msg);
      log(env, "info", `admin: enqueued job=${job} (manual)`);
      return Response.json({ ok: true, enqueued: msg });
    }

    // 管理用: 投稿テンプレ registry の要約一覧を返す（dashboard のドリフト解消用）。
    // GET /admin/templates  (Bearer <secret> or ?key=<secret>・/admin/enqueue と同じ fail-closed 認可)
    if (url.pathname === "/admin/templates") {
      const authHeader = request.headers.get("authorization");
      const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      const key = bearer ?? url.searchParams.get("key");
      if (!env.OAUTH_ADMIN_SECRET || key !== env.OAUTH_ADMIN_SECRET) {
        return new Response("unauthorized", { status: 401 });
      }
      return Response.json({ templates: listTemplateSummaries() });
    }

    // 管理用: キュレ素材に最適なテンプレ/fmat を LLM（Haiku）が推薦する（on-demand）。
    // POST /admin/recommend  (Bearer <secret>・/admin/templates と同じ fail-closed 認可)
    // body: { materials: [{ id, text, lang?, hasMedia?, engagement? }] }
    // 返り: { recommendations: [{ materialId, templateId, fmat, reason, confidence }] }
    // 失敗時は fail-open（recommendations: [] + warning）。Anthropic は従量課金のため
    // ユーザー操作起点に限定し、件数上限で volume を抑える。
    if (url.pathname === "/admin/recommend") {
      if (request.method !== "POST") {
        return new Response("method not allowed", { status: 405 });
      }
      const authHeader = request.headers.get("authorization");
      const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      const key = bearer ?? url.searchParams.get("key");
      if (!env.OAUTH_ADMIN_SECRET || key !== env.OAUTH_ADMIN_SECRET) {
        return new Response("unauthorized", { status: 401 });
      }
      let payload: { materials?: unknown };
      try {
        payload = (await request.json()) as { materials?: unknown };
      } catch {
        return new Response("bad json", { status: 400 });
      }
      const rawMaterials = Array.isArray(payload?.materials) ? payload.materials : [];
      if (rawMaterials.length === 0) {
        return Response.json({ recommendations: [] });
      }
      // 境界検証 + コスト上限: 1 リクエスト最大 20 素材（従量課金の暴走防止）。
      const RECOMMEND_MAX = 20;
      const materials = rawMaterials
        .filter((m): m is Record<string, unknown> => !!m && typeof m === "object")
        .map((m) => ({
          id: typeof m.id === "string" ? m.id : "",
          text: typeof m.text === "string" ? m.text : "",
          lang: typeof m.lang === "string" ? m.lang : null,
          hasMedia: !!m.hasMedia,
          engagement:
            m.engagement && typeof m.engagement === "object"
              ? (m.engagement as Record<string, number>)
              : null,
        }))
        .filter((m) => m.id.length > 0 && m.text.trim().length > 0)
        .slice(0, RECOMMEND_MAX);
      if (materials.length === 0) {
        return Response.json({ recommendations: [] });
      }
      // 設定欠落（ANTHROPIC_API_KEY 未設定）は一過性の API 失敗と区別して明示ログ。
      // これが無いと new Anthropic({apiKey:undefined})→401→広い catch で「毎回 fail-open」となり
      // 設定ミスが恒久 silent 劣化する。
      if (!env.ANTHROPIC_API_KEY) {
        log(env, "error", "/admin/recommend: ANTHROPIC_API_KEY 未設定（設定欠落・推薦は恒久無効）");
        return Response.json({ recommendations: [], warning: "config: ANTHROPIC_API_KEY unset" });
      }
      try {
        const Anthropic = (await import("@anthropic-ai/sdk")).default;
        const { createClient } = await import("@supabase/supabase-js");
        const { recommendMaterials, RECOMMEND_MODEL } = await import("../lib/curation/recommend.js");
        const { recordCostLedger } = await import("../lib/cost/cost-ledger.js");
        // 重要: 課金前に fallible な準備（client 生成）を済ませる。Anthropic 課金が発生した後に
        // createClient が env 欠落で throw すると、トークン消費したのに cost_ledger 未計上＝
        // brownout 会計が過小になる。sb/anthropic を recommendMaterials より先に確定させ、
        // 課金確定後は fail-open な recordCostLedger だけが走るようにする（charge→必ず ledger）。
        const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
          db: { schema: process.env.SUPABASE_SCHEMA || "xad" },
        });
        const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
        const { recommendations, costJpy } = await recommendMaterials(
          anthropic as never,
          materials,
          { templates: listTemplateSummaries() },
        );
        // cost_ledger 計上（recordCostLedger は内部 fail-open で throw しない）。
        // ctx.waitUntil で応答をブロックしない。
        ctx.waitUntil(
          recordCostLedger(sb as never, {
            category: "recommend",
            costJpy,
            meta: { model: RECOMMEND_MODEL, materials: materials.length },
          }),
        );
        log(env, "info", `admin: recommend ${materials.length} materials → ${recommendations.length} recs`);
        return Response.json({ recommendations });
      } catch (e) {
        // fail-open: 推薦は付加価値。失敗しても UI を壊さず空推薦を返す（サイレント禁止＝warn）。
        // この経路に来る = client 生成失敗 or LLM 呼び出し自体の失敗（=課金前 or 課金なし）。
        log(env, "error", `/admin/recommend failed (fail-open): ${String(e)}`);
        return Response.json({ recommendations: [], warning: "recommend failed" });
      }
    }

    // 管理用: 承認済みストックのスロット割当プランを返す（read-only・DB 未書込）。
    // POST /admin/plan-slots  (Bearer <secret>・/admin/templates と同じ fail-closed 認可)
    // body: { includeToday?: boolean, days?: number }
    //   includeToday=true → startOffsetDays=0（当日含む same-day。現在時刻より後のピーク帯のみ）
    //   days → lookaheadDays 上書き（既定 SCHEDULE_CONFIG.lookaheadDays）
    // 返り: { ok, plan: [{ draftId, scheduledForISO }], approvedCount, reservedCount, ... }
    // CLI plan-scheduled-publish.ts と同じ planSlots(SSOT) を使い、二重予約/枠衝突を一意に防ぐ。
    if (url.pathname === "/admin/plan-slots") {
      if (request.method !== "POST") {
        return new Response("method not allowed", { status: 405 });
      }
      const authHeader = request.headers.get("authorization");
      const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      const key = bearer ?? url.searchParams.get("key");
      if (!env.OAUTH_ADMIN_SECRET || key !== env.OAUTH_ADMIN_SECRET) {
        return new Response("unauthorized", { status: 401 });
      }
      let payload: { includeToday?: unknown; days?: unknown };
      try {
        payload = (await request.json()) as { includeToday?: unknown; days?: unknown };
      } catch {
        return new Response("bad json", { status: 400 });
      }
      const includeToday = payload?.includeToday === true;
      const daysNum = Number(payload?.days);
      const config: ScheduleConfig =
        Number.isFinite(daysNum) && daysNum > 0
          ? { ...SCHEDULE_CONFIG, lookaheadDays: Math.floor(daysNum) }
          : SCHEDULE_CONFIG;
      try {
        const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
          db: { schema: "xad" },
        });
        // 承認済み未予約・未公開ストック（承認順 FIFO・id で安定化）
        // 決定1: スレッド draft (thread_bodies IS NOT NULL) は X 予約UIがスレッド未サポート
        //   のため予約スロット計画から除外（即時投稿 x-immediate-publish のみ対応）。
        // published_at IS NULL: 今すぐ投稿で公開済みの draft をプラン対象に含めると、FIFO で
        //   先に空きスロット（lookaheadDays=1・ピーク数枠のみ）を食い潰し、実在庫に割当が回らない。
        //   dashboard 表示 stock(schedule-queries) と同一3条件に揃える。
        const { data: stockRows, error: stockErr } = await sb
          .from("post_drafts")
          .select("id, human_approved_at")
          .eq("human_approval_status", "approved")
          .is("scheduled_for", null)
          .is("published_at", null)
          .is("thread_bodies", null)
          .order("human_approved_at", { ascending: true })
          .order("id", { ascending: true });
        if (stockErr) throw new Error(`approved ストック取得失敗: ${stockErr.message}`);
        // 既予約（同一スロット衝突回避 + 当日残枠クリップ用）
        const { data: reservedRows, error: reservedErr } = await sb
          .from("post_drafts")
          .select("scheduled_for")
          .not("scheduled_for", "is", null);
        if (reservedErr) throw new Error(`既予約取得失敗: ${reservedErr.message}`);

        const stock: StockDraft[] = (stockRows ?? []).map((r) => ({
          id: (r as { id: string }).id,
          human_approved_at: (r as { human_approved_at: string | null }).human_approved_at,
        }));
        const existing = (reservedRows ?? [])
          .map((r) => (r as { scheduled_for: string | null }).scheduled_for)
          .filter((v): v is string => typeof v === "string");

        const planned = planSlots(stock, {
          now: new Date(),
          config,
          existing,
          startOffsetDays: includeToday ? 0 : 1,
        });
        // endpoint 層の日次キャップ防御（非ピーク既予約が当日枠を超えないようクリップ）
        const clipped = clipPlanByDailyCap(planned, existing, config);

        return Response.json({
          ok: true,
          plan: clipped.map((p) => ({ draftId: p.draftId, scheduledForISO: p.scheduledForISO })),
          approvedCount: stock.length,
          reservedCount: existing.length,
          includeToday,
          lookaheadDays: config.lookaheadDays,
        });
      } catch (e) {
        // plan は read-only。失敗は fail-loud（500）で UI に明示（黙って空プランにしない）。
        log(env, "error", `/admin/plan-slots failed: ${String(e)}`);
        return new Response(`plan-slots error: ${String(e)}`, { status: 500 });
      }
    }

    // 管理用: 予約確定（本体 write）。冪等 UPDATE + 観測 trace を SSOT lib で実行。
    // POST /admin/mark-scheduled  (Bearer <secret>・/admin/plan-slots と同じ fail-closed 認可)
    // body: { reservations: [{ draftId, scheduledFor, scheduledPostId? }] }
    // 返り: { ok, applied, noop, runId, results:[{draftId, applied}] }
    // CLI record-scheduled-publish.ts と同一 lib（markScheduledReservations / recordScheduledPublish）。
    if (url.pathname === "/admin/mark-scheduled") {
      if (request.method !== "POST") {
        return new Response("method not allowed", { status: 405 });
      }
      const authHeader = request.headers.get("authorization");
      const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      const key = bearer ?? url.searchParams.get("key");
      if (!env.OAUTH_ADMIN_SECRET || key !== env.OAUTH_ADMIN_SECRET) {
        return new Response("unauthorized", { status: 401 });
      }
      let payload: { reservations?: unknown };
      try {
        payload = (await request.json()) as { reservations?: unknown };
      } catch {
        return new Response("bad json", { status: 400 });
      }
      const raw = Array.isArray(payload?.reservations) ? payload.reservations : [];
      // 境界検証: draftId / scheduledFor(string) 必須。不正要素は弾く（二重予約の要なので厳格）。
      const reservations: ScheduledReservation[] = [];
      for (const r of raw) {
        if (!r || typeof r !== "object") continue;
        const o = r as Record<string, unknown>;
        if (typeof o.draftId !== "string" || o.draftId.length === 0) continue;
        if (typeof o.scheduledFor !== "string" || Number.isNaN(new Date(o.scheduledFor).getTime())) {
          continue;
        }
        reservations.push({
          draftId: o.draftId,
          scheduledFor: o.scheduledFor,
          scheduledPostId: typeof o.scheduledPostId === "string" ? o.scheduledPostId : undefined,
        });
      }
      if (reservations.length === 0) {
        return new Response("reservations required (draftId/scheduledFor)", { status: 400 });
      }
      try {
        // 1. 本体 write: 冪等 UPDATE（scheduled_for IS NULL ガード）。既予約は no-op=applied:false。
        const marks = await markScheduledReservations(
          reservations.map((r) => ({
            draftId: r.draftId,
            scheduledFor: r.scheduledFor,
            scheduledPostId: r.scheduledPostId,
          })),
        );
        const applied = marks.filter((m) => m.applied).length;
        const noop = marks.length - applied;
        // 2. 観測 trace（fail-open）。runId を返す。
        const runId = await recordScheduledPublish(reservations);
        log(env, "info", `admin: mark-scheduled applied=${applied} noop=${noop} run=${runId}`);
        return Response.json({ ok: true, applied, noop, runId, results: marks });
      } catch (e) {
        // 本体 write の失敗は fail-loud（500）。二重予約防止の要なので握りつぶさない。
        log(env, "error", `/admin/mark-scheduled failed: ${String(e)}`);
        return new Response(`mark-scheduled error: ${String(e)}`, { status: 500 });
      }
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
      const runId = (m.body as { runId?: string }).runId;
      try {
        const r: HandleJobResult = await handleJob(m.body, env, ctx);
        if (runId)
          await updateRun(
            runId,
            r.skipped
              ? { status: "skipped", finished: true }
              : { status: "ok", finished: true },
          );
        m.ack();
      } catch (e) {
        const status = decideRunStatus({ ok: false, attempt: m.attempts, maxAttempts: MAX_ATTEMPTS });
        if (runId)
          await updateRun(runId, {
            status,
            attempt: m.attempts,
            error: String(e),
            finished: status === "error",
          });
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
