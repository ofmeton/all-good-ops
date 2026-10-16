// scripts/load-ricecream-forecast.mjs — 勤怠アプリ(ricecream-attendance)の公開済みシフトから
// 給与見込みを計算し、recurring_overrides へ「RICE CREAM バイト代」の実額として投入する。
//
// 計算は勤怠側 src/lib/payroll/shiftForecast.ts と同じ規則で行う（日単位で拘束時間を合算 →
// 店舗ルールの推奨休憩を控除 → その日に有効な時給・交通費を適用 → 交通費は出勤日ごとに1回）。
// 勤怠側のロジックを変えたらこちらも合わせること。
//
// 必要な環境変数（無ければ何もせず終了し、refresh チェーンは壊さない）:
//   RICECREAM_SUPABASE_URL              例 https://xxxx.supabase.co
//   RICECREAM_SUPABASE_SERVICE_ROLE_KEY 時給・交通費は本人か管理者しか読めないため必要
//   RICECREAM_STAFF_ID                  任意。未指定なら RICECREAM_STAFF_NAME で引く
//   RICECREAM_STAFF_NAME                任意。既定 "工藤陸"
//   RICECREAM_RECURRING_NAME            任意。既定 "RICE CREAM バイト代"
//
// 実行例: op run --env-file=.env.op -- npm run load:ricecream
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dataDir } from "./lib/paths.mjs";
import Database from "better-sqlite3";
import { applyRecurringMigrations } from "../db/migrate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = join(__dirname, "..");
const dbPath = join(dataDir(), "mf-finance.db");
const schemaPath = join(appRoot, "db", "schema.sql");

const SUPABASE_URL = (process.env.RICECREAM_SUPABASE_URL ?? "").replace(/\/+$/, "");
const SERVICE_KEY = process.env.RICECREAM_SUPABASE_SERVICE_ROLE_KEY ?? "";
const STAFF_ID = process.env.RICECREAM_STAFF_ID ?? "";
const STAFF_NAME = process.env.RICECREAM_STAFF_NAME ?? "工藤陸";
const RECURRING_NAME = process.env.RICECREAM_RECURRING_NAME ?? "RICE CREAM バイト代";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.log(
    "未取込: RICECREAM_SUPABASE_URL / RICECREAM_SUPABASE_SERVICE_ROLE_KEY が未設定（勤怠アプリの給与見込み）",
  );
  process.exit(0);
}

const TIME_KEY = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

function pad(n) {
  return String(n).padStart(2, "0");
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addMonths(year, month, delta) {
  const base = year * 12 + (month - 1) + delta;
  return { year: Math.floor(base / 12), month: (base % 12) + 1 };
}

function minutesOfDay(value) {
  if (!TIME_KEY.test(value)) throw new Error(`シフトの時刻が不正です: ${value}`);
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

// 勤怠側 breakSuggestion.ts の suggestedBreakMinutes と同じ。
function suggestBreakMinutes(boundMinutes) {
  if (boundMinutes >= 480) return 60;
  if (boundMinutes > 360) return 45;
  return 0;
}

// 勤怠側 calculatePayroll.ts の isEffectiveOn と同じ（重複は事故なので落とす）。
function effectiveOn(entries, workDate) {
  const hit = entries.filter(
    (e) => e.effective_from <= workDate && (!e.effective_to || e.effective_to >= workDate),
  );
  if (hit.length > 1) throw new Error(`給与設定が重複しています: ${workDate}`);
  return hit[0];
}

async function rest(path, params) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Accept-Profile": "kintai",
    },
  });
  if (!res.ok) {
    throw new Error(`勤怠アプリの取得に失敗 (${path}): ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function resolveStaffId() {
  if (STAFF_ID) return STAFF_ID;
  const rows = await rest("profiles", {
    select: "id,display_name",
    display_name: `eq.${STAFF_NAME}`,
  });
  if (rows.length !== 1) {
    throw new Error(
      `スタッフを一意に特定できません（display_name="${STAFF_NAME}" が ${rows.length} 件）。RICECREAM_STAFF_ID を指定してください`,
    );
  }
  return rows[0].id;
}

// 対象月の公開済みシフトから見込み総額を出す。
async function forecastMonth(staffId, year, month, wageHistory, transportHistory) {
  const from = `${year}-${pad(month)}-01`;
  const next = addMonths(year, month, 1);
  const to = `${next.year}-${pad(next.month)}-01`;

  const shifts = await rest("shifts", {
    select: "shift_date,start_time,end_time",
    staff_id: `eq.${staffId}`,
    status: "eq.published",
    and: `(shift_date.gte.${from},shift_date.lt.${to})`,
  });

  const boundByDate = new Map();
  let skipped = 0;
  for (const s of shifts) {
    const bound = minutesOfDay(s.end_time) - minutesOfDay(s.start_time);
    if (bound <= 0) {
      skipped += 1;
      continue;
    }
    boundByDate.set(s.shift_date, (boundByDate.get(s.shift_date) ?? 0) + bound);
  }

  let workMinutesTotal = 0;
  let hourlyPayTotal = 0;
  let transportTotal = 0;
  for (const [workDate, boundMinutes] of boundByDate) {
    const wage = effectiveOn(wageHistory, workDate);
    const transport = effectiveOn(transportHistory, workDate);
    if (!wage) throw new Error(`時給が未設定です: ${workDate}`);
    if (!transport) throw new Error(`交通費が未設定です: ${workDate}`);
    const workMinutes = boundMinutes - suggestBreakMinutes(boundMinutes);
    workMinutesTotal += workMinutes;
    hourlyPayTotal += (workMinutes * Number(wage.hourly_wage)) / 60;
    transportTotal += Number(transport.daily_transport_amount);
  }

  return {
    workdays: boundByDate.size,
    workMinutes: workMinutesTotal,
    hourlyPay: hourlyPayTotal,
    transport: transportTotal,
    total: Math.round(hourlyPayTotal + transportTotal),
    skipped,
  };
}

const staffId = await resolveStaffId();
const wageHistory = await rest("wage_history", {
  select: "hourly_wage,effective_from,effective_to",
  staff_id: `eq.${staffId}`,
});
const transportHistory = await rest("transport_history", {
  select: "daily_transport_amount,effective_from,effective_to",
  staff_id: `eq.${staffId}`,
});

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(readFileSync(schemaPath, "utf8"));
applyRecurringMigrations(db);

const item = db
  .prepare("SELECT id, day FROM recurring_items WHERE name = ? AND kind = 'income'")
  .get(RECURRING_NAME);
if (!item) {
  console.log(`未取込: 定期収入「${RECURRING_NAME}」が見つかりません`);
  db.close();
  process.exit(0);
}
if (item.day == null) {
  console.log(`未取込: 定期収入「${RECURRING_NAME}」に発生日が設定されていません`);
  db.close();
  process.exit(0);
}

const upsert = db.prepare(
  `INSERT INTO recurring_overrides (recurring_id, occurrence_date, skip, amount)
   VALUES (@recurring_id, @occurrence_date, 0, @amount)
   ON CONFLICT(recurring_id, occurrence_date) DO UPDATE SET skip = 0, amount = excluded.amount`,
);

const now = new Date();
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
// 締めは末日、支払いは翌月。当月分と翌月分を見て、支払日が未来のものだけ書き換える。
const targets = [
  { year: now.getFullYear(), month: now.getMonth() + 1 },
  addMonths(now.getFullYear(), now.getMonth() + 1, 1),
];

const written = [];
for (const t of targets) {
  const pay = addMonths(t.year, t.month, 1);
  // 発生日は定期項目の day に合わせる。ずらすと rolling 側の発生日と噛み合わず反映されない。
  const payDate = `${pay.year}-${pad(pay.month)}-${pad(Math.min(item.day, daysInMonth(pay.year, pay.month)))}`;
  if (payDate < today) continue;

  const f = await forecastMonth(staffId, t.year, t.month, wageHistory, transportHistory);
  if (f.total <= 0) continue;

  upsert.run({ recurring_id: item.id, occurrence_date: payDate, amount: f.total });
  written.push({ month: `${t.year}-${pad(t.month)}`, payDate, ...f });
}

if (written.length === 0) {
  console.log(`${RECURRING_NAME}: 公開済みシフトから見込める支払いはありません`);
} else {
  for (const w of written) {
    const hours = (w.workMinutes / 60).toFixed(1);
    console.log(
      `${RECURRING_NAME}: ${w.month} 分 ${w.workdays}日 ${hours}時間 → ${w.payDate} に ¥${w.total.toLocaleString()}` +
        `（勤務 ¥${Math.round(w.hourlyPay).toLocaleString()} + 交通費 ¥${Math.round(w.transport).toLocaleString()}）` +
        (w.skipped > 0 ? ` ※日またぎ ${w.skipped} 枠は除外` : ""),
    );
  }
}
db.close();
