/**
 * scheduled-publish の予約結果を観測トレースに記録する CLI。
 * x-scheduled-publish スキルが chrome-devtools で予約登録した後に呼ぶ。
 *
 * 使い方:
 *   npx tsx scripts/record-scheduled-publish.ts '<JSON配列>'
 * 例:
 *   npx tsx scripts/record-scheduled-publish.ts \
 *     '[{"draftId":"...","scheduledFor":"2026-06-07T07:00:00+09:00","scheduledPostId":"..."}]'
 *
 * .env.local の SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY を読み、xad.run / xad.run_trace
 * に 1 run + 予約件数分の trace を書く (fail-open)。stdout に runId を出す。
 */
import { readFileSync } from "node:fs";
import { recordScheduledPublish, type ScheduledReservation } from "../lib/trace/scheduled-publish-trace.ts";

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
    return {
      draftId: o.draftId,
      scheduledFor: o.scheduledFor,
      scheduledPostId: typeof o.scheduledPostId === "string" ? o.scheduledPostId : undefined,
    };
  });
}

(async () => {
  loadEnv();
  const reservations = parseReservations(process.argv[2]);
  const runId = await recordScheduledPublish(reservations);
  console.log(JSON.stringify({ ok: true, runId, count: reservations.length }));
})().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exit(1);
});
