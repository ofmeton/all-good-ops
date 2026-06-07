/**
 * 予約投稿スロット提案 CLI（読み取り専用 / SELECT のみ）。
 *
 * 承認済みストック (post_drafts: human_approval_status='approved' AND scheduled_for IS NULL) を
 * 取得し、決定的 slot-planner で翌日以降のピーク帯スロット(JST) へ FIFO 割当した
 * 「予約プラン」を提案する。**DB へは一切書かない**（実 write は chrome-devtools 登録後の
 * record-scheduled-publish.ts）。x-scheduled-publish スキルの turnkey 第1ステップ。
 *
 * 使い方:
 *   npx tsx scripts/plan-scheduled-publish.ts [--days N]
 *     --days N : 何日先まで埋めるか（既定 SCHEDULE_CONFIG.lookaheadDays）
 *
 * 出力(stdout):
 *   1. 人向け要約（各 draft: スロット時刻(JST) + 本文先頭60字 + risk_level/flags）
 *   2. JSON プラン   : [{ draftId, scheduledForISO, fmat }]
 *   3. record 用 JSON: [{ draftId, scheduledFor }]  ← chrome 登録後 scheduledPostId を足して
 *                       record-scheduled-publish.ts へそのまま渡せる形
 *
 * .env.local の SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY を読む。
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { planSlots, type StockDraft } from "../lib/publishing/slot-planner.ts";
import { SCHEDULE_CONFIG, type ScheduleConfig } from "../lib/publishing/schedule-config.ts";

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
  } catch (e) {
    // env ファイル不在は許容（process.env をそのまま使う）。それ以外（権限/壊れ等）は顕在化させる
    if ((e as NodeJS.ErrnoException)?.code !== "ENOENT") throw e;
  }
}

function parseDays(argv: string[]): number | undefined {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--days") {
      const v = Number(argv[i + 1]);
      if (Number.isFinite(v) && v > 0) return Math.floor(v);
    } else if (a.startsWith("--days=")) {
      const v = Number(a.slice("--days=".length));
      if (Number.isFinite(v) && v > 0) return Math.floor(v);
    }
  }
  return undefined;
}

interface DraftRow {
  id: string;
  body: string;
  fmat: string | null;
  human_approved_at: string | null;
  risk_level: string | null;
  risk_reasons: string[] | null;
}

const WEEKDAY_JP = ["日", "月", "火", "水", "木", "金", "土"];

/** ISO(+09:00) を "06-09(火) 07:00" 形式の JST 表記に */
function fmtJst(iso: string): string {
  const d = new Date(iso);
  const shifted = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(shifted.getUTCDate()).padStart(2, "0");
  const hh = String(shifted.getUTCHours()).padStart(2, "0");
  const wd = WEEKDAY_JP[shifted.getUTCDay()];
  return `${mm}-${dd}(${wd}) ${hh}:00`;
}

function preview(body: string, n = 60): string {
  const oneLine = body.replace(/\s+/g, " ").trim();
  return oneLine.length > n ? `${oneLine.slice(0, n)}…` : oneLine;
}

(async () => {
  loadEnv();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です (.env.local を確認)");
  }
  // 非 public schema は型上 "public" にキャスト（既存 lib/trace/trace-store.ts 規約）
  const sb = createClient(url, key, { db: { schema: "xad" as "public" } });

  const days = parseDays(process.argv.slice(2));
  const config: ScheduleConfig = { ...SCHEDULE_CONFIG, ...(days ? { lookaheadDays: days } : {}) };

  // 1. 承認済みストック (approved かつ未予約) を承認順に取得
  const { data: stockRows, error: stockErr } = await sb
    .from("post_drafts")
    .select("id, body, fmat, human_approved_at, risk_level, risk_reasons")
    .eq("human_approval_status", "approved")
    .is("scheduled_for", null)
    .order("human_approved_at", { ascending: true })
    .order("id", { ascending: true }); // 同値/null 時の非決定性回避（FIFO 安定化）
  if (stockErr) throw new Error(`[plan] approved ストック取得失敗: ${stockErr.message}`);
  const rows = (stockRows ?? []) as DraftRow[];

  // 2. 既予約 (scheduled_for あり) の時刻群を取得（同一スロット衝突回避用）
  const { data: reservedRows, error: reservedErr } = await sb
    .from("post_drafts")
    .select("scheduled_for")
    .not("scheduled_for", "is", null);
  if (reservedErr) throw new Error(`[plan] 既予約取得失敗: ${reservedErr.message}`);
  const existing = (reservedRows ?? [])
    .map((r) => (r as { scheduled_for: string | null }).scheduled_for)
    .filter((v): v is string => typeof v === "string");

  // 3. 決定的 slot-planner で割当（DB へは書かない）
  const stock: StockDraft[] = rows.map((r) => ({ id: r.id, human_approved_at: r.human_approved_at }));
  const planned = planSlots(stock, { now: new Date(), config, existing });

  const byId = new Map(rows.map((r) => [r.id, r]));

  // 出力1: 人向け要約
  const lines: string[] = [];
  lines.push(
    `# 予約プラン提案（read-only / DB 未書込）  approved在庫=${rows.length} / 既予約=${existing.length} / lookahead=${config.lookaheadDays}日`,
  );
  if (planned.length === 0) {
    if (rows.length === 0) {
      lines.push("（承認済み未予約ストックが 0 件。空プラン）");
    } else {
      lines.push(
        `⚠️ 在庫 ${rows.length} 件あるが割当 0 件（lookahead=${config.lookaheadDays}日 内のピーク帯が満杯/枠不足）。` +
          `--days を増やす or 既予約(${existing.length}件)を確認。在庫 ${rows.length} 件は据置`,
      );
    }
  } else {
    lines.push(`翌日以降 ${planned.length} 件をピーク帯へ割当:`);
    for (const p of planned) {
      const r = byId.get(p.draftId);
      const flags =
        r?.risk_reasons && r.risk_reasons.length > 0 ? ` [${r.risk_reasons.join(",")}]` : "";
      const risk = r?.risk_level ? ` risk=${r.risk_level}` : "";
      lines.push(
        `  ${fmtJst(p.scheduledForISO)}  ${r ? preview(r.body) : "(本文不明)"}${risk}${flags}`,
      );
    }
    const leftover = rows.length - planned.length;
    if (leftover > 0) lines.push(`  …残 ${leftover} 件はスロット不足のため次回 (在庫据置)`);
  }
  console.log(lines.join("\n"));

  // 出力2: JSON プラン（draftId/scheduledForISO/fmat）
  const jsonPlan = planned.map((p) => ({
    draftId: p.draftId,
    scheduledForISO: p.scheduledForISO,
    fmat: byId.get(p.draftId)?.fmat ?? null,
  }));
  console.log("\n--- JSON_PLAN ---");
  console.log(JSON.stringify(jsonPlan, null, 2));

  // 出力3: record-scheduled-publish.ts へ渡しやすい形（chrome 登録後 scheduledPostId を追記）
  const recordArg = planned.map((p) => ({ draftId: p.draftId, scheduledFor: p.scheduledForISO }));
  console.log("\n--- RECORD_ARG (chrome 登録後に scheduledPostId を足して record-scheduled-publish.ts へ) ---");
  console.log(JSON.stringify(recordArg));
})().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exit(1);
});
