// scripts/load-ricecream-forecast.mjs — 勤怠アプリ(ricecream-attendance)の実績と公開済みシフトから
// 給与見込みを計算し、recurring_overrides へ「RICE CREAM バイト代」の実額として投入する。
//
// 計算は勤怠側のホーム「給与見込み」と同じ規則で行う:
//   今日(JST)より前の日 = 有効な勤怠の実績（入力済みの休憩。休憩が無い日は法定最低）
//   今日以降の日       = 公開済みシフト（同日の枠は合算）から法定最低の休憩を引く
//   その日に有効な時給・交通費を適用し、交通費は勤務日ごとに1回。
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

// 勤怠側 breakSuggestion.ts の legalMinimumBreakMinutes と同じ（労働時間ベースの法定休憩）。
// 引数は休憩込みの拘束分。労働を6h／8hちょうどに収められる幅では、その分だけ休憩を取れば足りる。
function legalMinimumBreakMinutes(boundMinutes) {
  if (boundMinutes <= 360) return 0;
  if (boundMinutes <= 405) return boundMinutes - 360;
  if (boundMinutes <= 525) return 45;
  if (boundMinutes <= 540) return boundMinutes - 480;
  return 60;
}

function jstDateKey(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
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

// 対象月の見込み総額を出す。today より前は実績、today 以降は公開済みシフト。
async function forecastMonth(staffId, year, month, today, wageHistory, transportHistory) {
  const from = `${year}-${pad(month)}-01`;
  const next = addMonths(year, month, 1);
  const to = `${next.year}-${pad(next.month)}-01`;
  const range = `(work_date.gte.${from},work_date.lt.${to})`;

  const [shifts, sessions, breaks] = await Promise.all([
    rest("shifts", {
      select: "shift_date,start_time,end_time",
      staff_id: `eq.${staffId}`,
      status: "eq.published",
      and: `(shift_date.gte.${from},shift_date.lt.${to})`,
    }),
    rest("work_sessions", {
      select: "work_date,clock_in,clock_out",
      staff_id: `eq.${staffId}`,
      is_invalidated: "eq.false",
      and: range,
    }),
    rest("daily_breaks", {
      select: "work_date,break_minutes",
      staff_id: `eq.${staffId}`,
      and: range,
    }),
  ]);

  // 実績: 今日より前の、退勤済みの区間だけ。
  const actualBound = new Map();
  for (const s of sessions) {
    if (s.work_date >= today || !s.clock_out) continue;
    const minutes = Math.round((Date.parse(s.clock_out) - Date.parse(s.clock_in)) / 60_000);
    if (minutes <= 0) continue;
    actualBound.set(s.work_date, (actualBound.get(s.work_date) ?? 0) + minutes);
  }
  const breakByDate = new Map(breaks.map((b) => [b.work_date, Number(b.break_minutes)]));

  // 予定: 今日以降の公開済みシフト。
  const plannedBound = new Map();
  const missingDates = new Set();
  let skipped = 0;
  for (const s of shifts) {
    if (s.shift_date < today) {
      if (!actualBound.has(s.shift_date)) missingDates.add(s.shift_date);
      continue;
    }
    const bound = minutesOfDay(s.end_time) - minutesOfDay(s.start_time);
    if (bound <= 0) {
      skipped += 1;
      continue;
    }
    plannedBound.set(s.shift_date, (plannedBound.get(s.shift_date) ?? 0) + bound);
  }

  const days = [
    ...[...actualBound].map(([workDate, bound]) => ({
      workDate,
      bound,
      breakMinutes: Math.max(breakByDate.get(workDate) ?? 0, legalMinimumBreakMinutes(bound)),
      actual: true,
    })),
    ...[...plannedBound].map(([workDate, bound]) => ({
      workDate,
      bound,
      breakMinutes: legalMinimumBreakMinutes(bound),
      actual: false,
    })),
  ];

  const sum = { actualMinutes: 0, plannedMinutes: 0, hourlyPay: 0, transport: 0 };
  for (const d of days) {
    const wage = effectiveOn(wageHistory, d.workDate);
    const transport = effectiveOn(transportHistory, d.workDate);
    if (!wage) throw new Error(`時給が未設定です: ${d.workDate}`);
    if (!transport) throw new Error(`交通費が未設定です: ${d.workDate}`);
    const workMinutes = d.bound - d.breakMinutes;
    if (d.actual) sum.actualMinutes += workMinutes;
    else sum.plannedMinutes += workMinutes;
    sum.hourlyPay += (workMinutes * Number(wage.hourly_wage)) / 60;
    sum.transport += Number(transport.daily_transport_amount);
  }

  return {
    workdays: days.length,
    actualDays: actualBound.size,
    plannedDays: plannedBound.size,
    workMinutes: sum.actualMinutes + sum.plannedMinutes,
    actualMinutes: sum.actualMinutes,
    plannedMinutes: sum.plannedMinutes,
    hourlyPay: sum.hourlyPay,
    transport: sum.transport,
    total: Math.round(sum.hourlyPay + sum.transport),
    missingDates: [...missingDates].sort(),
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

const today = jstDateKey(new Date());
const [thisYear, thisMonth] = today.split("-").map(Number);
// 締めは末日、支払いは翌月。当月分と翌月分を見て、支払日が未来のものだけ書き換える。
const targets = [{ year: thisYear, month: thisMonth }, addMonths(thisYear, thisMonth, 1)];

const written = [];
for (const t of targets) {
  const pay = addMonths(t.year, t.month, 1);
  // 発生日は定期項目の day に合わせる。ずらすと rolling 側の発生日と噛み合わず反映されない。
  const payDate = `${pay.year}-${pad(pay.month)}-${pad(Math.min(item.day, daysInMonth(pay.year, pay.month)))}`;
  if (payDate < today) continue;

  const f = await forecastMonth(staffId, t.year, t.month, today, wageHistory, transportHistory);
  if (f.total <= 0) continue;

  upsert.run({ recurring_id: item.id, occurrence_date: payDate, amount: f.total });
  written.push({ month: `${t.year}-${pad(t.month)}`, payDate, ...f });
}

if (written.length === 0) {
  console.log(`${RECURRING_NAME}: 実績・公開済みシフトから見込める支払いはありません`);
} else {
  const h = (minutes) => (minutes / 60).toFixed(1);
  for (const w of written) {
    console.log(
      `${RECURRING_NAME}: ${w.month} 分 ${w.workdays}日 ${h(w.workMinutes)}時間` +
        `（実績 ${w.actualDays}日 ${h(w.actualMinutes)}h ＋ 予定 ${w.plannedDays}日 ${h(w.plannedMinutes)}h）` +
        ` → ${w.payDate} に ¥${w.total.toLocaleString()}` +
        `（勤務 ¥${Math.round(w.hourlyPay).toLocaleString()} + 交通費 ¥${Math.round(w.transport).toLocaleString()}）` +
        (w.missingDates.length > 0 ? ` ※シフトはあるが勤怠の記録がない日: ${w.missingDates.join(", ")}` : "") +
        (w.skipped > 0 ? ` ※日またぎ ${w.skipped} 枠は除外` : ""),
    );
  }
}
db.close();
