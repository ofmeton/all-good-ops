// 週次の資金チェック（毎週金曜 7:00・mini の launchd ジョブ mf-cash-weekly から起動）。
// MF の一括更新 → CSV・残高の取り込み → refresh → 入金見込み（DMM・大工・バイト代）の書き込み →
// 今後2か月の残高の谷から「今使える額」と「買い物額ごとに必要な DMM 追加時間」を出し、Slack #milla-oc へ送る。
//
// 実行: npx --yes tsx@4.19.2 --conditions=react-server --tsconfig tsconfig.json scripts/weekly-cash-check.ts [options]
//   --dry-run          MF の一括更新・DB の書き込み・Slack・vault 記録をしない（読むだけ）
//   --skip-mf          MF に触らず、今ある DB のデータで計算する
//   --no-notify        Slack・vault に送らず、本文を標準出力に出す
//   --card-current=N   メインのカード（config.mainCard）の利用中の回の引落見込みを N 円に固定（手計算との突き合わせ用）
//   --card-monthly=N   メインのカードのまだ始まっていない回の引落見込みを N 円に固定
//   --now=ISO          現在時刻を差し替える（試験用）
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import {
  addMonths,
  capacityFrom,
  capacityNow,
  countDaikuDays,
  countDmmHours,
  dailySeries,
  daysInMonth,
  hoursNeeded,
  man,
  monthKey,
  payDate,
  projectCardCharges,
  shiftFrom,
  troughs,
  yen,
} from "../lib/weekly/estimate.mjs";
import * as mf from "./weekly-cash-check/mf";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(appDir, "data");
const dbPath = join(dataDir, "mf-finance.db");
const rawDir = join(appDir, "../../raw/finance/moneyforward");
const cfg = JSON.parse(readFileSync(join(appDir, "scripts/weekly-cash-check.config.json"), "utf8"));
const expand = (p: string) => p.replace(/^~(?=\/)/, homedir());

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"] as const;
  }),
);
const DRY = args.has("dry-run");
const SKIP_MF = args.has("skip-mf") || DRY;
const NOTIFY = !args.has("no-notify") && !DRY;
const now = args.get("now") ?? new Date().toISOString();
const jst = (iso: string) => new Date(Date.parse(iso) + 9 * 3600_000).toISOString();
const nowJst = `${jst(now).slice(0, 19)}+09:00`;
const today = nowJst.slice(0, 10);
const thisMonth = monthKey(today);
const stamp = nowJst.slice(0, 19).replace(/[-:T]/g, "");

const notes: string[] = []; // 報告の「注意」に出す
const writes: string[] = []; // 書き込んだ予測値（変更前→変更後）
const step = (s: string) => console.error(`[weekly-cash-check] ${s}`);

function run(cmd: string, argv: string[], env: Record<string, string> = {}) {
  const r = spawnSync(cmd, argv, { cwd: appDir, encoding: "utf8", env: { ...process.env, ...env }, timeout: 600_000 });
  if (r.status !== 0) throw new Error(`${cmd} ${argv.join(" ")} が失敗: ${(r.stderr || r.stdout).trim().slice(-500)}`);
  return r.stdout;
}

function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
  );
}

// ---- 1. MF から取り込む ----------------------------------------------------
type Balance = { account: string; balance: number; kind: string; as_of: string };

function mapPortfolio(rows: mf.PortfolioRow[]): Balance[] {
  const pasmo = rows.filter((r) => r.name === "PASMO").sort((a, b) => b.balance - a.balance);
  return rows.map((r) => {
    let account: string;
    let kind = "emoney";
    if (r.name === "現金") [account, kind] = ["現金", "cash"];
    else if (r.name === "PayPay") account = "PayPay";
    else if (r.name === "Suica") account = "モバイルSuica";
    else if (r.name === "PASMO") account = pasmo.indexOf(r) === 0 ? "モバイルPASMO" : "モバイルPASMO (2)";
    else if (/銀行/.test(r.institution)) [account, kind] = [`${r.institution} ${r.name}`, "bank"];
    else {
      account = `${r.institution} ${r.name}`;
      notes.push(`MF に知らない口座「${account}」があったので、そのままの名前で取り込んだ`);
    }
    return { account, balance: r.balance, kind, as_of: today };
  });
}

async function syncFromMf(): Promise<{ liabilities: Map<string, number>; cash: number | null }> {
  const liabilities = new Map<string, number>();
  let cash: number | null = null;
  await mf.withTab(async (tab) => {
    await mf.assertLoggedIn(tab);
    step("MF の一括更新");
    await mf.bulkUpdate(tab);

    for (const r of await mf.readAccountStatus(tab)) {
      if (r.status !== "正常") notes.push(`MF 連携「${r.name}」の状態が ${r.status}`);
      else if (r.lastFetched) {
        const [md, hm] = r.lastFetched.split(" ");
        const mmdd = md.replace("/", "-");
        const y = Number(today.slice(0, 4)) - (mmdd > today.slice(5, 10) ? 1 : 0);
        const age = (Date.parse(nowJst) - Date.parse(`${y}-${md.replace("/", "-")}T${hm}:00+09:00`)) / 86400_000;
        if (age > cfg.staleDays) notes.push(`MF 連携「${r.name}」の最終取得が ${r.lastFetched}（${Math.floor(age)}日前）`);
      }
    }

    step("CSV の取得");
    const prev = addMonths(thisMonth, -1);
    const files: [string, string][] = [];
    for (const ym of [prev, thisMonth]) {
      const [y, m] = ym.split("-").map(Number);
      const url = `https://moneyforward.com/cf/csv?from=${y}/${String(m).padStart(2, "0")}/01&month=${m}&year=${y}`;
      files.push([mf.downloadCsv(appDir, url), join(rawDir, `cashflow-${ym}-refetch-${stamp}.csv`)]);
    }
    await mf.selectAllAssetRange(tab);
    files.push([
      mf.downloadCsv(appDir, "https://moneyforward.com/bs/history/csv"),
      join(rawDir, `asset-history-2025-03_${thisMonth}-refetch-${stamp}.csv`),
    ]);
    for (const [, dest] of files) if (existsSync(dest)) throw new Error(`raw に同名のファイルがある: ${dest}`);
    for (const [src, dest] of files) copyFileSync(src, dest);

    step("口座残高の読み取り");
    const { depositTotal, rows } = await mf.readPortfolio(tab);
    const fromMf = mapPortfolio(rows);
    const sum = fromMf.reduce((s, r) => s + r.balance, 0);
    if (sum !== depositTotal) {
      notes.push(`MF の口座残高の合計（${yen(sum)}）が「預金・現金」（${yen(depositTotal)}）と合わないので、口座残高は前回のまま`);
    } else {
      const path = join(dataDir, "account-balances.json");
      const old: Balance[] = JSON.parse(readFileSync(path, "utf8"));
      const names = new Set(fromMf.map((r) => r.account));
      // MF に無い手入力口座（家賃口座など）は残す。消すと DB に古い残高が残り続ける。
      const manual = old.filter((r) => !names.has(r.account));
      writeFileSync(path, `[\n${[...fromMf, ...manual].map((r) => `  ${JSON.stringify(r)}`).join(",\n")}\n]\n`);
      for (const r of manual) notes.push(`手入力口座「${r.account}」は ${r.as_of} の ${yen(r.balance)} のまま`);
    }
    cash = fromMf.find((r) => r.account === "現金")?.balance ?? null;

    for (const l of await mf.readLiabilities(tab)) {
      if (l.kind === "クレジットカード利用残高") liabilities.set(l.institution, l.balance);
    }
  });
  return { liabilities, cash };
}

function backupDb(db: Database.Database, label: string) {
  const dest = join(dataDir, `mf-finance.db.backup-${label}-${stamp}`);
  return db.backup(dest).then(() => dest);
}

// ---- 2. カレンダー ----------------------------------------------------------
type Ev = { summary: string; start: string; end: string; selfStatus?: string };

function listEvents(calendarId: string, from: string, to: string): Ev[] {
  const params = { calendarId, timeMin: from, timeMax: to, singleEvents: true, maxResults: 250, orderBy: "startTime" };
  const out = run("gws", ["calendar", "events", "list", "--params", JSON.stringify(params), "--page-all"]);
  return out
    .split("\n")
    .filter((l) => l.trim().startsWith("{"))
    .flatMap((l) => JSON.parse(l).items ?? [])
    .filter((e: any) => e.status !== "cancelled")
    .map((e: any) => ({
      summary: e.summary ?? "",
      start: e.start?.dateTime ?? e.start?.date ?? "",
      end: e.end?.dateTime ?? e.end?.date ?? "",
      selfStatus: (e.attendees ?? []).find((a: any) => a.self)?.responseStatus,
    }));
}

// ---- 3. 入金見込みの書き込み ------------------------------------------------
// このジョブが書いた値だけを上書きする（owned に記録）。人が入れた値（請求書の確定額など）は触らず、報告に回す。
const owned: Record<string, number> = {};
function upsertOverride(db: Database.Database, name: string, ym: string, amount: number, why: string) {
  const item = db.prepare("SELECT id, day FROM recurring_items WHERE name = ? AND active = 1").get(name) as
    | { id: number; day: number }
    | undefined;
  if (!item) {
    notes.push(`定期収入「${name}」が見つからないので見込みを書けなかった`);
    return;
  }
  const date = payDate(ym, item.day);
  if (date < today) return;
  const cur = db
    .prepare("SELECT amount FROM recurring_overrides WHERE recurring_id = ? AND occurrence_date = ?")
    .get(item.id, date) as { amount: number } | undefined;
  const key = `${name}|${date}`;
  const label = `${name} ${date.slice(5).replace("-", "/")}: ${cur ? yen(cur.amount) : "未設定"} → ${yen(amount)}（${why}）`;
  if (cur && owned[key] !== cur.amount) {
    if (cur.amount !== amount) writes.push(`${name} ${date.slice(5).replace("-", "/")}: 人が入れた ${yen(cur.amount)} のまま（見積もりは ${yen(amount)}・${why}）`);
    else writes.push(`${name} ${date.slice(5).replace("-", "/")}: ${yen(amount)}（${why}）`);
    return;
  }
  owned[key] = amount;
  if (cur?.amount === amount) {
    writes.push(`${name} ${date.slice(5).replace("-", "/")}: ${yen(amount)}（変更なし・${why}）`);
    return;
  }
  writes.push(label);
  if (DRY) return;
  db.prepare(
    `INSERT INTO recurring_overrides (recurring_id, occurrence_date, skip, amount, created_at)
     VALUES (?, ?, 0, ?, ?)
     ON CONFLICT(recurring_id, occurrence_date) DO UPDATE SET skip = 0, amount = excluded.amount`,
  ).run(item.id, date, amount, new Date().toISOString().replace(/\.\d+Z$/, "Z"));
}

// ---- main ---------------------------------------------------------------------
async function main() {
  let liabilities = new Map<string, number>();
  let cash: number | null = null;
  const statePath = join(dataDir, "weekly-cash-check-state.json");
  const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : {};
  Object.assign(owned, state.owned ?? {});

  if (!SKIP_MF) {
    try {
      ({ liabilities, cash } = await syncFromMf());
    } catch (e) {
      notes.push(`MF の更新に失敗したので、前回までのデータで計算した: ${(e as Error).message}`);
    }
  }

  const db = new Database(dbPath, { fileMustExist: true });
  if (!DRY) {
    await backupDb(db, "weekly");
    step("refresh");
    const secrets = readEnvFile(expand(cfg.secretsEnvFile));
    run("npm", ["run", "refresh"], secrets);
    run("npm", ["run", "detect"]);
    run("npm", ["run", "export:unknowns"]);
    if (!secrets.RICECREAM_SUPABASE_SERVICE_ROLE_KEY) {
      notes.push(`勤怠アプリの鍵ファイル（${cfg.secretsEnvFile}）が無いので、バイト代の見込みは更新していない`);
    }
  }

  step("入金見込み");
  const prev = addMonths(thisMonth, -1);
  const from = `${prev}-01T00:00:00+09:00`;
  const to = `${addMonths(thisMonth, 2)}-01T00:00:00+09:00`;
  const primary = listEvents(cfg.calendars.primary, from, to);
  const kcgrp = listEvents(cfg.calendars.dmm, from, to);
  const dmm: Record<string, ReturnType<typeof countDmmHours>> = {};
  // 翌月分も、承諾済みのゼミ等から見込む（翌々月末の入金。谷の計算に要る）。
  for (const ym of [prev, thisMonth, addMonths(thisMonth, 1)]) {
    const h = countDmmHours({ primaryEvents: primary, kcgrpEvents: kcgrp, now: nowJst, month: ym, rules: cfg.dmmRules });
    dmm[ym] = h;
    const hours = h.logHours + h.confirmedHours;
    const why = `${Number(ym.slice(5))}月 dmm_log ${h.logHours}h＋確定 ${Math.round(h.confirmedHours * 100) / 100}h`;
    upsertOverride(db, cfg.recurringNames.dmm, addMonths(ym, 1), Math.round(hours * cfg.dmmRateYen), why);
    const days = countDaikuDays({ primaryEvents: primary, month: ym, pattern: cfg.daikuPattern, excludePattern: cfg.daikuExcludePattern });
    upsertOverride(db, cfg.recurringNames.daiku, addMonths(ym, 1), days * cfg.daikuDailyYen, `${Number(ym.slice(5))}月 ${days}日`);
  }
  const rc = db
    .prepare(
      `SELECT o.occurrence_date d, o.amount a FROM recurring_overrides o JOIN recurring_items r ON r.id = o.recurring_id
        WHERE r.name = ? AND o.occurrence_date >= ? ORDER BY 1`,
    )
    .all(cfg.recurringNames.ricecream, today) as { d: string; a: number }[];

  step("試算");
  const { getAccountRollingCashflow } = await import("@/lib/cashflow-queries");
  const { cardBillingPeriod } = await import("@/lib/cashflow/rolling.mjs");
  const roll = getAccountRollingCashflow("after");
  const schedules = db.prepare("SELECT id, card_account, billing_month_offset, closing_day FROM card_charge_schedules WHERE active = 1").all() as any[];
  const ovKeys = new Set((db.prepare("SELECT schedule_id, occurrence_date FROM card_charge_overrides").all() as any[]).map((o) => `${o.schedule_id}|${o.occurrence_date}`));
  const isCharge = (e: any) => e.source === "card_charge" && e.scheduleId != null;
  const cardLines: string[] = [];
  const delta = new Map<string, number>(); // "scheduleId|date" → 見込み − アプリの値
  for (const s of schedules) {
    const evs = roll.total.events.filter((e: any) => isCharge(e) && e.scheduleId === s.id).sort((a: any, b: any) => a.date.localeCompare(b.date));
    const charges = evs.map((e: any) => {
      const p = cardBillingPeriod(e.date, s.billing_month_offset ?? 1, s.closing_day ?? 31) as { start: string; end: string };
      return { date: e.date, periodStart: p.start, periodEnd: p.end, appAmount: e.amount, hasOverride: ovKeys.has(`${s.id}|${e.date}`) };
    });
    const pattern = cfg.cardDebitPatterns[s.card_account];
    const debits = pattern
      ? (db.prepare("SELECT -amount a FROM transactions WHERE amount < 0 AND description LIKE ? ORDER BY date DESC LIMIT 3").all(`%${pattern}%`) as { a: number }[])
      : [];
    const isMain = s.card_account.startsWith(cfg.mainCard);
    const avg = isMain && args.get("card-monthly") ? Number(args.get("card-monthly")) : debits.length ? debits.reduce((x, d) => x + d.a, 0) / debits.length : 0;
    const liabilityKey = [...liabilities.keys()].find((k) => k.startsWith(s.card_account.split(" ")[0]));
    const projected = projectCardCharges({
      charges,
      today,
      liability: liabilityKey ? liabilities.get(liabilityKey)! : null,
      monthlyAvg: avg,
      currentOverride: isMain && args.get("card-current") ? Number(args.get("card-current")) : null,
    });
    for (const c of projected) {
      delta.set(`${s.id}|${c.date}`, c.amount - c.appAmount);
      const basis = { override: "確定額", closed: "締め済みの利用額", open: `今の利用額${c.soFar != null ? yen(c.soFar) : ""}＋残り日数分`, manual: "手入力", future: `直近の引落${debits.length}回の平均` }[c.basis as string];
      cardLines.push(`${s.card_account} ${c.date.slice(5).replace("-", "/")}: ${yen(c.amount)}（${basis}）`);
    }
  }
  const adjust = (e: any) => (isCharge(e) ? e.amount + (delta.get(`${e.scheduleId}|${e.date}`) ?? 0) : e.amount);
  const counted = (e: any) => e.status !== "skipped" && e.affectsTotal !== false;
  const horizonEnd = `${addMonths(thisMonth, 2)}-${String(daysInMonth(addMonths(thisMonth, 2))).padStart(2, "0")}`;
  const events = roll.total.events.filter(counted).map((e: any) => ({ date: e.date, kind: e.kind, amount: adjust(e) }));
  const series = dailySeries({ start: roll.total.start, today, horizonEnd, events, dailySpend: cfg.dailySpendYen });

  const dmmPay = payDate(addMonths(thisMonth, 1), 31);
  const planYen = Math.round(dmm[thisMonth].planHours * cfg.dmmRateYen);
  const planSeries = shiftFrom(series, dmmPay, planYen);
  const smbc = schedules.find((s) => s.card_account.startsWith(cfg.mainCard)) ?? schedules[0];
  const mainDebits = roll.total.events.filter((e: any) => isCharge(e) && e.scheduleId === smbc?.id).map((e: any) => e.date).sort();
  const periodOf = (d: string) => cardBillingPeriod(d, smbc.billing_month_offset ?? 1, smbc.closing_day ?? 31) as { start: string; end: string };
  const curDebit = mainDebits.find((d: string) => periodOf(d).start <= today && today <= periodOf(d).end);
  const nextDebit = mainDebits.find((d: string) => periodOf(d).start > today);

  // 口座ごとの引落不足（銀行だけ）。一番少なくなる額と、最初にマイナスになる予定を出す。
  const shortLines: string[] = [];
  for (const loc of roll.locations as any[]) {
    if (loc.kind !== "bank") continue;
    let bal = loc.start;
    let min = { bal: Infinity, date: "" };
    let first: any = null;
    for (const e of [...loc.events].filter(counted).sort((a: any, b: any) => a.date.localeCompare(b.date))) {
      const v = adjust(e);
      bal += e.kind === "income" ? v : -v;
      if (bal < min.bal) min = { bal, date: e.date };
      if (bal < 0 && !first) first = e;
    }
    if (first) {
      const d = (x: string) => `${Number(x.slice(5, 7))}/${Number(x.slice(8, 10))}`;
      shortLines.push(`${loc.account}: ${d(first.date)}「${first.name}」でマイナスになり、${d(min.date)}に ${yen(min.bal)} まで下がる見込み`);
    }
  }

  // ---- 報告 ----
  const T = troughs(series);
  const cap = capacityNow(series, cfg.bufferYen);
  const capCur = curDebit ? capacityFrom(series, cfg.bufferYen, curDebit) : null;
  const capNext = nextDebit ? capacityFrom(series, cfg.bufferYen, nextDebit) : null;
  const capCurPlan = curDebit ? capacityFrom(planSeries, cfg.bufferYen, curDebit) : null;
  const capNextPlan = nextDebit ? capacityFrom(planSeries, cfg.bufferYen, nextDebit) : null;
  const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
  const cur = dmm[thisMonth];
  const lines: string[] = [];
  lines.push(`*週次の資金チェック（${md(today)} ${nowJst.slice(11, 16)}）*`);
  lines.push(`*今使える額*（${man(cfg.bufferYen)}は残す前提。追加の稼働なし）`);
  lines.push(`・現金・PayPay で今すぐ: ${yen(cap)}`);
  if (capCur != null) lines.push(`・今月カードで（${md(curDebit!)}引落）: ${yen(capCur)}`);
  if (capNext != null) lines.push(`・来月カードで（${md(nextDebit!)}引落）: ${yen(capNext)}`);
  lines.push(
    `dmm_plan（今月あと ${cur.planHours}h）を全部こなすと: 今月カード ${capCurPlan != null ? yen(capCurPlan) : "—"}／来月カード ${capNextPlan != null ? yen(capNextPlan) : "—"}`,
  );
  // 買い物・遊び（config.funSpend）の今月分。上限が未設定なら先月の同じ日までと比べるだけ
  const fun = cfg.funSpend;
  const funSum = (from: string, to: string) => {
    const inc = new RegExp(fun.includePattern);
    const exc = new RegExp(fun.excludePattern);
    const rows = db
      .prepare("SELECT description d, category_major c, -amount a FROM transactions WHERE included = 1 AND is_transfer = 0 AND is_internal_move = 0 AND amount < 0 AND date BETWEEN ? AND ?")
      .all(from, to) as { d: string | null; c: string | null; a: number }[];
    return rows.filter((r) => (fun.categories.includes(r.c) || inc.test(r.d ?? "")) && !exc.test(r.d ?? "")).reduce((s, r) => s + r.a, 0);
  };
  const [fy, fm] = today.split("-").map(Number);
  const [py, pm] = fm === 1 ? [fy - 1, 12] : [fy, fm - 1];
  const prevKey = `${py}-${String(pm).padStart(2, "0")}`;
  const prevDay = Math.min(Number(today.slice(8, 10)), new Date(Date.UTC(py, pm, 0)).getUTCDate());
  const funNow = funSum(`${thisMonth}-01`, today);
  const funPrev = funSum(`${prevKey}-01`, `${prevKey}-${String(prevDay).padStart(2, "0")}`);
  const funCap: number | null = fun.capYen;
  lines.push(
    funCap == null
      ? `*今月の買い物・遊び*: ${yen(funNow)}（先月の同じ日まで ${yen(funPrev)}）`
      : `*今月の買い物・遊び*: ${yen(funNow)} / 上限 ${yen(funCap)}（${funNow > funCap ? `${yen(funNow - funCap)} 超えた` : `残り ${yen(funCap - funNow)}`}、先月の同じ日まで ${yen(funPrev)}）`,
  );
  lines.push("");
  lines.push("*残高が一番少ない日*");
  for (const t of T) lines.push(`・${Number(t.month.slice(5))}月: ${md(t.date)} ${man(t.balance)}`);
  if (shortLines.length) {
    lines.push("");
    lines.push("*引き落とし不足に注意*");
    for (const l of shortLines) lines.push(`・${l}`);
  }
  if (nextDebit) {
    lines.push("");
    lines.push(`*来月カードで買う場合（${md(nextDebit)}引落）に、今月中に必要な DMM 追加時間*`);
    lines.push(`（確定分 ${Math.round((cur.logHours + cur.confirmedHours) * 100) / 100}h とは別。dmm_plan もここに含めて数える）`);
    for (const amount of cfg.purchaseAmounts) {
      const h = hoursNeeded({ series, buffer: cfg.bufferYen, rate: cfg.dmmRateYen, debitDate: nextDebit, dmmPayDate: dmmPay, amount });
      lines.push(`・${man(amount)}: ${h.feasible ? `+${h.hours}h` : `今月の稼働では間に合わない（${md(h.date)}に不足）`}`);
    }
  }
  lines.push("");
  lines.push("*入金見込み（予測値に書き込んだもの）*");
  for (const w of writes) lines.push(`・${w}`);
  for (const r of rc) lines.push(`・RICE CREAM バイト代 ${md(r.d)}: ${yen(r.a)}`);
  lines.push(`・DMM 今月の内訳: dmm_log ${cur.logHours}h、確定 ゼミ${cur.confirmed.seminar}件・TA課題共有${cur.confirmed.ta}件・定例${cur.confirmed.regular}件`);
  lines.push("");
  lines.push("*カード引落の見込み*");
  for (const c of cardLines) lines.push(`・${c}`);
  lines.push(`・PayPay・現金の支出は1日 ${yen(cfg.dailySpendYen)} で見ている`);
  if (cash != null && state.cash === cash) notes.push(`MF の現金が先週と同じ ${yen(cash)}（木曜の入力がまだかも）`);
  const unknowns = existsSync(join(dataDir, "unknowns.json")) ? JSON.parse(readFileSync(join(dataDir, "unknowns.json"), "utf8")) : null;
  if (Array.isArray(unknowns) && unknowns.length) notes.push(`未分類の取引が ${unknowns.length} 種類ある（data/unknowns.json）`);
  if (notes.length) {
    lines.push("");
    lines.push("*注意*");
    for (const n of notes) lines.push(`・${n}`);
  }
  const text = lines.join("\n");

  if (!NOTIFY) {
    console.log(text);
  } else {
    run(expand("~/.local/bin/milla-oc-notify"), ["INFO", text, "mf-cash-weekly"]);
    const fact = spawnSync(expand("~/vault/scripts/vault-fact"), ["--writer", "milla", "--category", "situations", "--slug", "mf-cash-weekly", "--title", `週次の資金チェック（${today}）`], {
      cwd: expand("~/vault"),
      input: text.replace(/\*/g, ""),
      encoding: "utf8",
    });
    if (fact.status !== 0) console.error(`vault への記録に失敗: ${(fact.stderr || fact.stdout).trim()}`);
  }
  if (!DRY) writeFileSync(statePath, `${JSON.stringify({ lastRun: nowJst, cash: cash ?? state.cash ?? null, owned }, null, 2)}\n`);
  db.close();
}

main().catch((e) => {
  console.error(`[weekly-cash-check] 失敗: ${(e as Error).stack ?? e}`);
  process.exit(1);
});
