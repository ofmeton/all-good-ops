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

// recurring の day を当該月の日数でクランプ（31→30 等）。
export function effectiveDay(day, year, month) {
  return Math.min(day, daysInMonth(year, month));
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
  const events = [];
  for (let i = 0; i <= days; i++) {
    const date = addDays(today, i);
    const { y, m, d } = parse(date);
    // recurring: その月の effectiveDay と一致する日に発火
    for (const r of recurring) {
      if (r.day == null) continue;
      if (effectiveDay(r.day, y, m) === d) {
        events.push({ date, kind: r.kind, name: r.name, amount: Math.abs(r.amount), source: "recurring" });
      }
    }
    // scheduled: 日付完全一致
    for (const s of scheduled) {
      if (s.date === date) {
        events.push({ date, kind: s.kind, name: s.name, amount: Math.abs(s.amount), source: "scheduled" });
      }
    }
  }
  // date 昇順は生成順で担保。残高 walk。
  let running = startBalance;
  let minBalance = startBalance;
  let firstNegativeDate = null;
  const withBalance = events.map((e) => {
    running += e.kind === "income" ? e.amount : -e.amount;
    if (running < minBalance) minBalance = running;
    if (running < 0 && firstNegativeDate == null) firstNegativeDate = e.date;
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
