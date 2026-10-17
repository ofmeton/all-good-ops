// 週次の資金チェック（scripts/weekly-cash-check.ts）の純ロジック。DB・ネットに触れない。
// 日付は JST の "YYYY-MM-DD"、日時は "+09:00" 付きの ISO 文字列を前提にする。

const HOUR_MS = 3600_000;

export function hoursOf(ev) {
  return (Date.parse(ev.end) - Date.parse(ev.start)) / HOUR_MS;
}

export function monthKey(iso) {
  return String(iso).slice(0, 7);
}

export function addMonths(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  const zero = y * 12 + (m - 1) + delta;
  return `${Math.floor(zero / 12)}-${String((zero % 12) + 1).padStart(2, "0")}`;
}

export function daysInMonth(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

// recurring_items.day（31 なら月末）を、その月の実在日に丸めた支払日。
export function payDate(ym, day) {
  const d = Math.min(Number(day) || 1, daysInMonth(ym));
  return `${ym}-${String(d).padStart(2, "0")}`;
}

export function addDays(date, n) {
  const t = new Date(`${date}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

export function diffDays(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400_000);
}

// kcgrp カレンダーの予定を「確定の DMM 稼働」として何時間に数えるか。数えないなら 0。
// TA課題共有は実際は1件10分（2026-10-08 本人）。括弧内に「期」を含むので、ゼミより先に判定する。
export function confirmedDmmHours(ev, rules) {
  const s = ev.summary ?? "";
  if (!ev.start?.includes("T")) return 0;
  if (new RegExp(rules.taPattern).test(s)) return rules.taHours;
  if (new RegExp(rules.regularPattern).test(s)) return rules.regularHours;
  if (new RegExp(rules.seminarPattern).test(s)) return ev.selfStatus === "accepted" ? hoursOf(ev) : 0;
  return 0;
}

// 対象月の DMM 稼働時間。過去（開始が now より前）は dmm_log だけ、
// 未来（開始が now 以降）は kcgrp の確定分だけを数える（2026-10-16/17 本人）。dmm_plan は別枠。
export function countDmmHours({ primaryEvents, kcgrpEvents, now, month, rules }) {
  const nowMs = Date.parse(now);
  const inMonth = (ev) => ev.start?.includes("T") && monthKey(ev.start) === month;
  const past = (ev) => Date.parse(ev.start) < nowMs;
  let logHours = 0;
  let planHours = 0;
  for (const ev of primaryEvents.filter(inMonth)) {
    if (ev.summary === rules.logSummary && past(ev)) logHours += hoursOf(ev);
    if (ev.summary === rules.planSummary && !past(ev)) planHours += hoursOf(ev);
  }
  let confirmedHours = 0;
  const confirmed = { seminar: 0, ta: 0, regular: 0 };
  for (const ev of kcgrpEvents.filter(inMonth)) {
    if (past(ev)) continue;
    const h = confirmedDmmHours(ev, rules);
    if (h <= 0) continue;
    confirmedHours += h;
    const s = ev.summary ?? "";
    if (new RegExp(rules.taPattern).test(s)) confirmed.ta += 1;
    else if (new RegExp(rules.regularPattern).test(s)) confirmed.regular += 1;
    else confirmed.seminar += 1;
  }
  return { logHours, confirmedHours, planHours, confirmed };
}

// 大工の日数（月内の「ジュンヤさん」の時間指定の予定。過去・未来とも）。
// 終日の「休み」や「？」付きの未確定の予定は数えない（2026-10 は5日・11月は1日で本人の値と一致）。
export function countDaikuDays({ primaryEvents, month, pattern, excludePattern }) {
  const re = new RegExp(pattern);
  const ex = excludePattern ? new RegExp(excludePattern) : null;
  return primaryEvents.filter(
    (ev) =>
      ev.start?.includes("T") &&
      monthKey(ev.start) === month &&
      re.test(ev.summary ?? "") &&
      !(ex && ex.test(ev.summary ?? "")),
  ).length;
}

// カード引落の見込み。人が入れた override はそのまま使う。
// 締め済みで override が無い回は DB の利用額、利用中の回は MF の利用残高から締め済み分を引いた額に
// 残り日数 × 日額を足す。まだ始まっていない回は月額平均。
// charges: [{ date, periodStart, periodEnd, appAmount, hasOverride }]（同じカードの引落を日付順）
export function projectCardCharges({ charges, today, liability, monthlyAvg, currentOverride = null }) {
  const daily = monthlyAvg / 30;
  const closed = charges.filter((c) => c.periodEnd < today);
  const closedTotal = closed.reduce((s, c) => s + c.appAmount, 0);
  return charges.map((c) => {
    if (c.hasOverride) return { ...c, amount: c.appAmount, basis: "override" };
    if (c.periodEnd < today) return { ...c, amount: c.appAmount, basis: "closed" };
    if (c.periodStart <= today) {
      if (currentOverride != null) return { ...c, amount: currentOverride, basis: "manual" };
      const soFar = liability == null ? c.appAmount : Math.max(c.appAmount, liability - closedTotal);
      const rest = Math.round(daily * Math.max(0, diffDays(today, c.periodEnd)));
      return { ...c, amount: soFar + rest, basis: "open", soFar, rest };
    }
    return { ...c, amount: Math.round(monthlyAvg), basis: "future" };
  });
}

// 日ごとの合計残高（その日の入出金を全部反映した後）。events は date 昇順でなくてもよい。
// 今日の翌日から horizonEnd まで、毎日 dailySpend を引く（PayPay・現金の日々の支出）。
export function dailySeries({ start, today, horizonEnd, events, dailySpend }) {
  const byDate = new Map();
  for (const e of events) {
    const v = e.kind === "income" ? e.amount : -e.amount;
    byDate.set(e.date, (byDate.get(e.date) ?? 0) + v);
  }
  const out = [];
  let bal = start + (byDate.get(today) ?? 0);
  out.push({ date: today, balance: bal });
  for (let d = addDays(today, 1); d <= horizonEnd; d = addDays(d, 1)) {
    bal += (byDate.get(d) ?? 0) - dailySpend;
    out.push({ date: d, balance: bal });
  }
  return out;
}

export function troughs(series) {
  const byMonth = new Map();
  for (const p of series) {
    const m = monthKey(p.date);
    const cur = byMonth.get(m);
    if (!cur || p.balance < cur.balance) byMonth.set(m, p);
  }
  return [...byMonth.entries()].map(([month, p]) => ({ month, date: p.date, balance: p.balance }));
}

export function shiftFrom(series, date, delta) {
  return series.map((p) => (p.date >= date ? { ...p, balance: p.balance + delta } : p));
}

// 余裕 buffer を残して使える額（追加稼働なし）。fromDate 以降の残高だけを見る（カードなら引落日以降）。
// 千円単位で切り捨て、マイナスなら 0。
export function capacityFrom(series, buffer, fromDate = "") {
  const after = series.filter((p) => p.date >= fromDate);
  if (!after.length) return 0;
  const min = Math.min(...after.map((p) => p.balance));
  return Math.max(0, Math.floor((min - buffer) / 1000) * 1000);
}

export function capacityNow(series, buffer) {
  return capacityFrom(series, buffer, "");
}

// 来月カードで X 円買う（debitDate に引き落とされる）時、今月中に必要な DMM 追加時間。
// 今月分の DMM は dmmPayDate に入る。debitDate〜dmmPayDate の前で余裕を割るなら、今月の稼働では間に合わない。
export function hoursNeeded({ series, buffer, rate, debitDate, dmmPayDate, amount, step = 0.5 }) {
  let need = 0;
  for (const p of series) {
    if (p.date < debitDate) continue;
    const short = amount + buffer - p.balance;
    if (short <= 0) continue;
    if (p.date < dmmPayDate) return { feasible: false, hours: null, date: p.date };
    need = Math.max(need, short / rate);
  }
  return { feasible: true, hours: Math.ceil(need / step) * step };
}

export function yen(n) {
  return `${Math.round(n).toLocaleString("ja-JP")}円`;
}

// 1.2万円 のような丸め表示（符号付き）。
export function man(n) {
  const v = Math.round(n / 1000) / 10;
  return `${v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("ja-JP")}万円`;
}

// 今月の DMM 稼働の進捗（毎晩の報告用）。実績は dmm_log、見込みは実績＋kcgrp の確定分＋これからの dmm_plan。
// 終わった dmm_plan のうち dmm_log と時間が重ならないものは「予定していたのに記録が無い」として別に返す。
export function dmmProgress({ primaryEvents, kcgrpEvents, now, month, rules }) {
  const h = countDmmHours({ primaryEvents, kcgrpEvents, now, month, rules });
  const nowMs = Date.parse(now);
  const timed = primaryEvents.filter((ev) => ev.start?.includes("T") && monthKey(ev.start) === month);
  const logs = timed.filter((ev) => ev.summary === rules.logSummary);
  const overlaps = (a, b) => Date.parse(a.start) < Date.parse(b.end) && Date.parse(b.start) < Date.parse(a.end);
  const missed = timed.filter(
    (ev) => ev.summary === rules.planSummary && Date.parse(ev.end) <= nowMs && !logs.some((l) => overlaps(ev, l)),
  );
  return {
    ...h,
    missed: missed.map((ev) => ({ start: ev.start, hours: hoursOf(ev) })),
    projectedHours: h.logHours + h.confirmedHours + h.planHours,
  };
}
