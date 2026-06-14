// lib/cashflow/rolling.mjs — 向こう N 日のローリング資金繰りの純ロジック（DB非依存・テスト対象）。
// recurring(毎月day) と scheduled(特定日) を起点残高に適用し、残高推移を返す。
// カード引落見込みは引落日が未知のため**含めない**（別表示）。

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

export function indexOverrides(arr) {
  if (arr instanceof Map) return arr;
  const map = new Map();
  for (const ov of arr ?? []) {
    map.set(`${ov.recurring_id}|${ov.occurrence_date}`, ov);
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
export function buildRolling(opts) {
  const today = opts.today;
  const days = opts.days ?? 30;
  const startBalance = opts.startBalance ?? 0;
  const recurring = opts.recurring ?? [];
  const scheduled = opts.scheduled ?? [];
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
            source: "transfer",
            status: "normal",
            affectsTotal: false,
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
