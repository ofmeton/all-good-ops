/**
 * scheduled-publish の予約結果を確定記録する CLI。
 * x-scheduled-publish スキルが chrome-devtools で予約登録した後に呼ぶ。
 *
 * 使い方:
 *   npx tsx scripts/record-scheduled-publish.ts '<JSON配列>'
 * 例:
 *   npx tsx scripts/record-scheduled-publish.ts \
 *     '[{"draftId":"...","scheduledFor":"2026-06-07T07:00:00+09:00","scheduledPostId":"..."}]'
 *
 * .env.local の SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY を読み:
 *   1. post_drafts.scheduled_for / scheduled_post_id を**冪等 UPDATE**（`scheduled_for is null`
 *      ガード）。既予約は no-op。plan-scheduled-publish の再プラン→二重予約を防ぐ（本体write）。
 *   2. xad.run / xad.run_trace に 1 run + 予約件数分の trace を書く (fail-open・観測)。
 * stdout に runId と applied(今回確定)/noop(既予約) 件数を出す。
 */
import { readFileSync } from "node:fs";
import { recordScheduledPublish, type ScheduledReservation } from "../lib/trace/scheduled-publish-trace.ts";
import { markScheduledReservations } from "../lib/publishing/mark-scheduled.ts";

const ENV_FILE =
  process.env.XAD_ENV_FILE ??
  "/Users/rikukudo/Projects/private-agents/all-good-ops/apps/x-account-system/.env.local";

function loadEnv(): void {
  try {
    for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* env ファイルが無ければ process.env をそのまま使う */
  }
}

function parseReservations(arg: string | undefined): ScheduledReservation[] {
  if (!arg) throw new Error("引数に予約 JSON 配列を渡してください");
  const parsed = JSON.parse(arg) as unknown;
  if (!Array.isArray(parsed)) throw new Error("予約 JSON は配列である必要があります");
  return parsed.map((r) => {
    const o = r as Record<string, unknown>;
    if (typeof o.draftId !== "string" || typeof o.scheduledFor !== "string") {
      throw new Error("各要素は draftId / scheduledFor (string) が必須");
    }
    // attachmentsResolved（media-fetch の uploaded/skipped）。数値なら採用、欠落は未指定。
    let attachmentsResolved: { uploaded: number; skipped: number } | undefined;
    const ar = o.attachmentsResolved as Record<string, unknown> | undefined;
    if (ar && typeof ar.uploaded === "number" && typeof ar.skipped === "number") {
      attachmentsResolved = { uploaded: ar.uploaded, skipped: ar.skipped };
    }
    return {
      draftId: o.draftId,
      scheduledFor: o.scheduledFor,
      scheduledPostId: typeof o.scheduledPostId === "string" ? o.scheduledPostId : undefined,
      attachmentsResolved,
    };
  });
}

(async () => {
  loadEnv();
  const reservations = parseReservations(process.argv[2]);

  // 1. 本体 write: 冪等 UPDATE（既予約は no-op）。失敗は throw（二重予約防止の要なので握りつぶさない）。
  const marks = await markScheduledReservations(
    reservations.map((r) => ({
      draftId: r.draftId,
      scheduledFor: r.scheduledFor,
      scheduledPostId: r.scheduledPostId,
    })),
  );
  const applied = marks.filter((m) => m.applied).length;
  const noop = marks.length - applied;
  if (noop > 0) {
    const ids = marks.filter((m) => !m.applied).map((m) => m.draftId);
    console.error(
      JSON.stringify({
        level: "warn",
        msg: "[record-scheduled-publish] 既予約のため no-op（再記録/二重実行の可能性）",
        noop,
        draftIds: ids,
      }),
    );
  }

  // 2. 観測 trace（fail-open）
  const runId = await recordScheduledPublish(reservations);
  console.log(JSON.stringify({ ok: true, runId, count: reservations.length, applied, noop }));
})().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exit(1);
});
