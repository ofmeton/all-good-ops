// lib/cashflow/rolling.mjs — 向こう N 日のローリング資金繰りの純ロジック（DB非依存・テスト対象）。
// recurring(毎月day) / scheduled(特定日) / cardCharges(展開済みカード引落) を起点残高に適用し、残高推移を返す。

// 'YYYY-MM-DD' → {y,m,d}
function parse(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}
function fmt(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
// today から i 日後の 'YYYY-MM-DD'
function addDays(iso, i) {
  const { y, m, d } = parse(iso);
  const t = new Date(Date.UTC(y, m - 1, d + i));
  return fmt(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}
function addMonthsToYearMonth(year, month, delta) {
  const zero = year * 12 + (month - 1) + delta;
  return { y: Math.floor(zero / 12), m: (zero % 12) + 1 };
}
function normalizedOffsetMonths(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 6 ? n : 1;
}
function normalizedClosingDay(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 31 ? n : 31;
}
function normalizedDays(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}
function diffDays(startIso, endIso) {
  const s = parse(startIso);
  const e = parse(endIso);
  const start = Date.UTC(s.y, s.m - 1, s.d);
  const end = Date.UTC(e.y, e.m - 1, e.d);
  return Math.round((end - start) / 86400000);
}

// recurring の day を当該月の日数でクランプ（31→30 等）。
export function effectiveDay(day, year, month) {
  return Math.min(day, daysInMonth(year, month));
}

export function weekdayOf(iso) {
  const { y, m, d } = parse(iso);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function monthEndOffsetDays(today, monthsAhead) {
  const { y, m } = parse(today);
  const target = addMonthsToYearMonth(y, m, Number(monthsAhead) || 0);
  return diffDays(today, fmt(target.y, target.m, daysInMonth(target.y, target.m)));
}

export function monthlyChargeDates(today, days, chargeDay) {
  const start = parse(today);
  const end = addDays(today, Math.max(0, Math.round(Number(days) || 0)));
  const monthSpan = Math.ceil(((Number(days) || 0) + 31) / 28);
  const out = [];
  for (let i = 0; i < monthSpan; i++) {
    const target = addMonthsToYearMonth(start.y, start.m, i);
    const date = fmt(target.y, target.m, effectiveDay(chargeDay, target.y, target.m));
    if (date >= today && date <= end) out.push(date);
  }
  return out;
}

export function cardBillingPeriod(chargeDateIso, offsetMonths, closingDay) {
  const charge = parse(chargeDateIso);
  const closeMonth = addMonthsToYearMonth(charge.y, charge.m, -normalizedOffsetMonths(offsetMonths));
  const startMonth = addMonthsToYearMonth(closeMonth.y, closeMonth.m, -1);
  const closeDay = normalizedClosingDay(closingDay);
  return {
    start: fmt(startMonth.y, startMonth.m, effectiveDay(closeDay, startMonth.y, startMonth.m)),
    end: fmt(closeMonth.y, closeMonth.m, effectiveDay(closeDay, closeMonth.y, closeMonth.m)),
  };
}

export function expandCardChargeSchedules({
  schedules = [],
  today,
  days,
  variableByPeriod = new Map(),
  overrides = new Map(),
}) {
  const variableMap =
    variableByPeriod instanceof Map
      ? variableByPeriod
      : new Map(Object.entries(variableByPeriod ?? {}));
  const overrideMap = overrides instanceof Map ? overrides : indexCardChargeOverrides(overrides);
  const out = [];

  for (const schedule of schedules) {
    const amountType = schedule.amount_type === "fixed" || schedule.amountType === "fixed" ? "fixed" : "variable";
    const cardAccount = schedule.card_account ?? schedule.account;
    if (!cardAccount) continue;
    const debitAccount = schedule.debit_account ?? schedule.debitAccount ?? null;
    const scheduleId = schedule.id ?? null;
    for (const date of monthlyChargeDates(today, days, schedule.charge_day ?? schedule.chargeDay)) {
      const period = cardBillingPeriod(
        date,
        schedule.billing_month_offset ?? schedule.billingMonthOffset,
        schedule.closing_day ?? schedule.closingDay,
      );
      const override =
        amountType === "variable" && scheduleId != null ? overrideMap.get(`${scheduleId}|${date}`) : undefined;
      const estimated = amountType === "variable" && override == null;
      const amount =
        amountType === "fixed"
          ? Math.abs(Math.round(Number(schedule.fixed_amount ?? schedule.fixedAmount) || 0))
          : override != null
            ? Math.abs(Math.round(Number(override.amount) || 0))
            : Math.abs(Math.round(Number(variableMap.get(`${cardAccount}|${period.end}`)) || 0));
      if (amountType === "fixed" && amount <= 0) continue;
      out.push({
        date,
        amount,
        account: debitAccount,
        name: schedule.name ?? `${cardAccount} カード引落`,
        amountType,
        estimated,
        scheduleId,
      });
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date) || String(a.account ?? "").localeCompare(String(b.account ?? ""), "ja"));
}

// 定期振替を today(含む)〜today+days に月次展開する。manual_transfers に同じ
// 出金元/入金先/月の行がある場合は、実績または個別予定を優先して二重計上しない。
/**
 * @param {{
 *   today: string,
 *   days: number,
 *   recurringTransfers?: Array<{ id: number, from_account: string, to_account: string, amount: number, day: number, fee?: number, name?: string | null, active?: number }>,
 *   overrides?: Array<{ recurring_transfer_id: number, occurrence_date: string, skip?: number, amount?: number | null }> | Map<string, { recurring_transfer_id: number, occurrence_date: string, skip?: number, amount?: number | null }>,
 *   materialized?: Array<{ from_account: string, to_account: string, scheduled_date: string }>
 * }} input
 */
export function expandRecurringTransfers({
  today,
  days,
  recurringTransfers = [],
  overrides = [],
  materialized = [],
}) {
  const end = addDays(today, normalizedDays(days));
  const startMonth = parse(today);
  const endMonth = parse(end);
  const overrideMap = new Map();
  const materializedMonths = new Set();

  for (const override of overrides instanceof Map ? overrides.values() : overrides ?? []) {
    overrideMap.set(`${override.recurring_transfer_id}|${override.occurrence_date}`, override);
  }
  for (const transfer of materialized ?? []) {
    if (!transfer?.from_account || !transfer?.to_account || !transfer?.scheduled_date) continue;
    materializedMonths.add(
      `${transfer.from_account}|${transfer.to_account}|${String(transfer.scheduled_date).slice(0, 7)}`,
    );
  }

  const out = [];
  for (const transfer of recurringTransfers) {
    if (Number(transfer.active) === 0) continue;
    const day = Number(transfer.day);
    if (!Number.isInteger(day) || day < 1 || day > 31) continue;

    let target = { y: startMonth.y, m: startMonth.m };
    while (target.y < endMonth.y || (target.y === endMonth.y && target.m <= endMonth.m)) {
      const date = fmt(target.y, target.m, effectiveDay(day, target.y, target.m));
      const monthKey = `${transfer.from_account}|${transfer.to_account}|${date.slice(0, 7)}`;
      const override = overrideMap.get(`${transfer.id}|${date}`);
      if (date >= today && date <= end && !override?.skip && !materializedMonths.has(monthKey)) {
        out.push({
          from_account: transfer.from_account,
          to_account: transfer.to_account,
          amount: Math.abs(Number(override?.amount ?? transfer.amount) || 0),
          fee: Math.abs(Number(transfer.fee) || 0),
          date,
          name: transfer.name ?? null,
          source: "recurring_transfer",
          recurring_transfer_id: transfer.id,
        });
      }
      target = addMonthsToYearMonth(target.y, target.m, 1);
    }
  }

  return out.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      String(a.from_account).localeCompare(String(b.from_account), "ja") ||
      String(a.to_account).localeCompare(String(b.to_account), "ja"),
  );
}

export function indexOverrides(arr) {
  if (arr instanceof Map) return arr;
  const map = new Map();
  for (const ov of arr ?? []) {
    map.set(`${ov.recurring_id}|${ov.occurrence_date}`, ov);
  }
  return map;
}

export function indexCardChargeOverrides(arr) {
  if (arr instanceof Map) return arr;
  const map = new Map();
  for (const ov of arr ?? []) {
    map.set(`${ov.schedule_id}|${ov.occurrence_date}`, ov);
  }
  return map;
}

export function resolveOccurrence(r, ov) {
  if (ov?.skip) return { status: "skipped", amount: 0 };
  if (ov?.amount != null) return { status: "normal", amount: Math.abs(ov.amount) };
  if (r.amount_type === "variable") return { status: "pending", amount: 0 };
  return { status: "normal", amount: Math.abs(r.amount) };
}

export function monthlyOccurrences(r, year, month) {
  if (r.frequency === "weekly" && r.weekday != null) {
    const out = [];
    const dim = daysInMonth(year, month);
    for (let d = 1; d <= dim; d++) {
      const date = fmt(year, month, d);
      if (weekdayOf(date) === Number(r.weekday)) out.push(date);
    }
    return out;
  }
  // weekly は weekday 必須。DB 外から壊れた行が来た場合は発生なしとして扱う。
  if (r.frequency === "weekly") return [];
  if (r.day == null) return [];
  return [fmt(year, month, effectiveDay(r.day, year, month))];
}

export function monthlyRecurringContribution(r, year, month, overrides = []) {
  const ovMap = indexOverrides(overrides);
  const dates = monthlyOccurrences(r, year, month);
  if (dates.length === 0 && r.frequency !== "weekly") {
    const occurrence = resolveOccurrence(r, undefined);
    return occurrence.status === "normal" ? occurrence.amount : 0;
  }
  return dates.reduce((sum, date) => {
    const ov = ovMap.get(`${r.id}|${date}`);
    const occurrence = resolveOccurrence(r, ov);
    return occurrence.status === "normal" ? sum + occurrence.amount : sum;
  }, 0);
}

// 純: today(含む)〜today+days のイベントと残高推移を返す。
// recurring: [{kind:'income'|'expense', name, amount(正), day}]
// scheduled: [{kind, name, amount(正), date:'YYYY-MM-DD'}]
// cardCharges: [{date:'YYYY-MM-DD', amount(正), account, name, amountType, estimated}]
export function buildRolling(opts) {
  const today = opts.today;
  const days = opts.days ?? 30;
  const startBalance = opts.startBalance ?? 0;
  const recurring = opts.recurring ?? [];
  const scheduled = opts.scheduled ?? [];
  const cardCharges = opts.cardCharges ?? [];
  const transfers = opts.transfers ?? [];
  const overrides = indexOverrides(opts.overrides ?? []);
  const events = [];
  for (let i = 0; i <= days; i++) {
    const date = addDays(today, i);
    const { y, m, d } = parse(date);
    // recurring: monthly は effectiveDay、weekly は曜日一致で発火。
    for (const r of recurring) {
      const fires =
        r.frequency === "weekly" && r.weekday != null
          ? weekdayOf(date) === Number(r.weekday)
          : r.day != null && effectiveDay(r.day, y, m) === d;
      if (fires) {
        const occurrenceDate = date;
        const ov = overrides.get(`${r.id}|${occurrenceDate}`);
        const occurrence = resolveOccurrence(r, ov);
        if (occurrence.status !== "skipped") {
          events.push({
            date,
            kind: r.kind,
            name: r.name,
            amount: occurrence.amount,
            account: r.account ?? null,
            source: "recurring",
            recurringId: r.id,
            occurrenceDate,
            status: occurrence.status,
          });
        }
      }
    }
    // scheduled: 日付完全一致
    for (const s of scheduled) {
      if (s.date === date) {
        events.push({
          date,
          kind: s.kind,
          name: s.name,
          amount: Math.abs(s.amount),
          account: s.account ?? null,
          source: "scheduled",
          status: "normal",
        });
      }
    }
    // card charge schedules are pre-expanded by query layer because DB-specific
    // estimated amount resolution belongs outside this pure rolling logic.
    for (const c of cardCharges) {
      if (c.date === date) {
        events.push({
          date,
          kind: "expense",
          name: c.name,
          amount: Math.abs(c.amount),
          account: c.account ?? null,
          source: "card_charge",
          status: "normal",
          estimated: !!c.estimated,
          scheduleId: c.scheduleId ?? null,
          amountType: c.amountType ?? null,
        });
      }
    }
    // manual_transfers: 元本移動は合計残高を変えず、手数料だけ合計残高を減らす。
    for (const t of transfers) {
      if (t.date === date && (t.status == null || t.status === "pending")) {
        const amount = Math.abs(Number(t.amount) || 0);
        const fee = Math.abs(Number(t.fee) || 0);
        const name = t.name || "資金移動";
        if (amount > 0) {
          events.push({
            date,
            kind: "expense",
            name: `${name}（振替出金）`,
            amount,
            account: t.from_account ?? null,
            source: t.source === "recurring_transfer" ? "recurring_transfer" : "transfer",
            status: "normal",
            affectsTotal: false,
            recurringTransferId: t.source === "recurring_transfer" ? t.recurring_transfer_id : undefined,
            occurrenceDate: t.source === "recurring_transfer" ? t.date : undefined,
          });
          if (fee > 0) {
            events.push({
              date,
              kind: "expense",
              name: `${name}（手数料）`,
              amount: fee,
              account: t.from_account ?? null,
              source: "transfer",
              status: "normal",
              affectsTotal: true,
            });
          }
          events.push({
            date,
            kind: "income",
            name: `${name}（振替入金）`,
            amount,
            account: t.to_account ?? null,
            source: "transfer",
            status: "normal",
            affectsTotal: false,
          });
        }
      }
    }
  }
  // date 昇順は生成順で担保。残高 walk。
  let running = startBalance;
  let minBalance = startBalance;
  let firstNegativeDate = null;
  const withBalance = events.map((e) => {
    if (e.status === "normal" && e.affectsTotal !== false) {
      running += e.kind === "income" ? e.amount : -e.amount;
      if (running < minBalance) minBalance = running;
      if (running < 0 && firstNegativeDate == null) firstNegativeDate = e.date;
    }
    return { ...e, balanceAfter: running };
  });
  return {
    start: startBalance,
    events: withBalance,
    end: running,
    minBalance,
    firstNegativeDate,
  };
}

function locationKey(key) {
  return key == null ? "__unassigned__" : String(key);
}

function sameEvent(a, b) {
  return (
    a != null &&
    b != null &&
    a.date === b.date &&
    a.kind === b.kind &&
    a.name === b.name &&
    a.amount === b.amount &&
    (a.account ?? null) === (b.account ?? null) &&
    a.source === b.source &&
    a.status === b.status
  );
}

export function buildBalanceMatrix(totalEvents, locations) {
  const cursors = new Map();
  const running = new Map();
  for (const location of locations ?? []) {
    const key = locationKey(location.key ?? location.account ?? null);
    cursors.set(key, 0);
    running.set(key, Number(location.start) || 0);
  }

  const rows = (totalEvents ?? []).map((event) => {
    const balances = {};
    for (const location of locations ?? []) {
      const key = locationKey(location.key ?? location.account ?? null);
      const events = location.events ?? [];
      const cursor = cursors.get(key) ?? 0;
      const next = events[cursor];
      if (sameEvent(next, event)) {
        running.set(key, Number(next.balanceAfter) || 0);
        cursors.set(key, cursor + 1);
      }
      balances[key] = running.get(key) ?? 0;
    }
    return { event, balances };
  });

  const endBalances = {};
  for (const [key, value] of running.entries()) {
    endBalances[key] = value;
  }
  return { rows, endBalances };
}

export function buildAccountRolling(opts) {
  const total = buildRolling(opts);
  const balances = opts.balances ?? [];
  const byAccount = new Map();
  let balanceTotal = 0;
  for (const b of balances) {
    const key = b.account ?? null;
    const start = Number(b.balance) || 0;
    balanceTotal += start;
    byAccount.set(key, {
      account: key,
      kind: b.kind ?? null,
      start,
    });
  }
  const unassignedStart = (opts.startBalance ?? 0) - balanceTotal;
  if (byAccount.has(null)) {
    const seed = byAccount.get(null);
    byAccount.set(null, { ...seed, start: seed.start + unassignedStart });
  } else if (unassignedStart !== 0) {
    byAccount.set(null, { account: null, kind: null, start: unassignedStart });
  }

  const keys = new Set();
  for (const key of byAccount.keys()) keys.add(key);
  for (const e of total.events) keys.add(e.account ?? null);

  const locations = [...keys].map((key) => {
    const seed = byAccount.get(key) ?? { account: key, kind: null, start: 0 };
    let running = seed.start;
    let minBalance = seed.start;
    let firstNegativeDate = null;
    const events = total.events
      .filter((e) => (e.account ?? null) === key)
      .map((e) => {
        if (e.status === "normal") {
          running += e.kind === "income" ? e.amount : -e.amount;
          if (running < minBalance) minBalance = running;
          if (running < 0 && firstNegativeDate == null) firstNegativeDate = e.date;
        }
        return { ...e, balanceAfter: running };
      });
    return {
      key,
      account: key,
      kind: seed.kind,
      start: seed.start,
      end: running,
      minBalance,
      firstNegativeDate,
      events,
    };
  });

  return { total, locations };
}

// 純: 今日〜今月末の引落予定（recurring expense で day>=今日, scheduled expense で当月内）。
export function buildUpcomingWithdrawals(opts) {
  const today = opts.today;
  const recurring = opts.recurring ?? [];
  const scheduled = opts.scheduled ?? [];
  const { y, m, d: todayDay } = parse(today);
  const dim = daysInMonth(y, m);
  const mm = String(m).padStart(2, "0");
  const items = [];
  for (const r of recurring) {
    if (r.kind !== "expense" || r.day == null) continue;
    const eff = effectiveDay(r.day, y, m);
    if (eff >= todayDay) {
      items.push({ date: `${y}-${mm}-${String(eff).padStart(2, "0")}`, name: r.name, amount: Math.abs(r.amount), source: "recurring" });
    }
  }
  for (const s of scheduled) {
    if (s.kind !== "expense") continue;
    const { y: sy, m: sm, d: sd } = parse(s.date);
    if (sy === y && sm === m && sd >= todayDay && sd <= dim) {
      items.push({ date: s.date, name: s.name, amount: Math.abs(s.amount), source: "scheduled" });
    }
  }
  items.sort((a, b) => a.date.localeCompare(b.date));
  const total = items.reduce((s, x) => s + x.amount, 0);
  return { total, items };
}
