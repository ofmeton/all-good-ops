import "server-only";
import { db } from "@/lib/db";
import { getLatestAsset } from "@/lib/calendar-queries";
// 純ロジック（DB非依存・テスト済み）。
import {
  buildRolling,
  buildUpcomingWithdrawals,
  monthlyOccurrences,
  resolveOccurrence,
} from "@/lib/cashflow/rolling.mjs";
// kind 定数は client/server 両用の純モジュールへ分離（client が db を引き込まないため）。
import { type BalanceKind, KIND_LABEL, guessKind } from "@/lib/cashflow/kinds";
export { type BalanceKind, KIND_LABEL, guessKind };

// お金レーダー / 資金繰りの読取クエリ（server-only）。

export interface AccountBalanceRow {
  account: string;
  kind: BalanceKind;
  balance: number;
  as_of: string | null;
  source: "mf" | "manual";
}

export interface BalanceGroup {
  kind: BalanceKind;
  label: string;
  total: number;
  accounts: { account: string; balance: number }[];
}

// 今日（ローカル）'YYYY-MM-DD'。
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getAllAccountBalances(): AccountBalanceRow[] {
  return db
    .prepare("SELECT account, kind, balance, as_of, source FROM account_balances ORDER BY balance DESC")
    .all() as AccountBalanceRow[];
}

// kind 別グルーピング（表示順: bank→card→emoney→cash→crypto→other）。空なら groups=[]。
export function getAccountBalances(): { groups: BalanceGroup[]; total: number; asOf: string | null } {
  const rows = getAllAccountBalances();
  const order: BalanceKind[] = ["bank", "card", "emoney", "cash", "crypto", "other"];
  const byKind = new Map<BalanceKind, BalanceGroup>();
  let total = 0;
  let asOf: string | null = null;
  for (const r of rows) {
    total += r.balance;
    if (r.as_of && (!asOf || r.as_of > asOf)) asOf = r.as_of;
    const g = byKind.get(r.kind) ?? { kind: r.kind, label: KIND_LABEL[r.kind], total: 0, accounts: [] };
    g.total += r.balance;
    g.accounts.push({ account: r.account, balance: r.balance });
    byKind.set(r.kind, g);
  }
  const groups = order.filter((k) => byKind.has(k)).map((k) => byKind.get(k)!);
  return { groups, total, asOf };
}

// 起点残高 = account_balances 合計。無ければ最新資産 total。
function startBalance(): { start: number; baseDate: string | null } {
  const rows = getAllAccountBalances();
  if (rows.length > 0) {
    const start = rows.reduce((s, r) => s + r.balance, 0);
    const baseDate = rows.map((r) => r.as_of).filter(Boolean).sort().pop() ?? null;
    return { start, baseDate };
  }
  const asset = getLatestAsset();
  return { start: asset?.total ?? 0, baseDate: asset?.date ?? null };
}

export interface ActiveRecurringRow {
  id: number;
  kind: "income" | "expense";
  name: string;
  amount: number;
  day: number | null;
  frequency: "monthly" | "weekly";
  weekday: number | null;
  amount_type: "fixed" | "variable";
}

export interface RecurringOverrideRow {
  recurring_id: number;
  occurrence_date: string;
  skip: number;
  amount: number | null;
}

function activeRecurring(): ActiveRecurringRow[] {
  return db
    .prepare("SELECT id, kind, name, amount, day, frequency, weekday, amount_type FROM recurring_items WHERE active = 1")
    .all() as ActiveRecurringRow[];
}

export function getRecurringOverrides(): RecurringOverrideRow[] {
  return db
    .prepare("SELECT recurring_id, occurrence_date, skip, amount FROM recurring_overrides")
    .all() as RecurringOverrideRow[];
}

function scheduledRows(): { kind: "income" | "expense"; name: string; amount: number; date: string }[] {
  return db
    .prepare("SELECT kind, name, amount, scheduled_date AS date FROM scheduled_cashflow ORDER BY scheduled_date")
    .all() as { kind: "income" | "expense"; name: string; amount: number; date: string }[];
}

// 今月の引落予定トータル（今日〜月末）。
export function getUpcomingWithdrawals(): {
  total: number;
  items: { date: string; name: string; amount: number; source: string }[];
} {
  return buildUpcomingWithdrawals({
    today: todayIso(),
    recurring: activeRecurring(),
    scheduled: scheduledRows(),
  });
}

// 来月のカード引落見込み = 各カード口座の「当月利用額合計」。締め日不明のため近似。
export function getNextMonthCardCharge(): {
  total: number;
  byCard: { account: string; amount: number }[];
  month: string;
} {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  // kind='card' の口座（account_balances に無ければ guessKind で transactions から）
  const cardAccounts = new Set(
    getAllAccountBalances().filter((r) => r.kind === "card").map((r) => r.account),
  );
  const rows = db
    .prepare(
      `SELECT account, COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0) AS spent
         FROM transactions
        WHERE included = 1 AND is_transfer = 0 AND is_internal_move = 0
          AND substr(date,1,7) = ? AND account IS NOT NULL
        GROUP BY account`,
    )
    .all(ym) as { account: string; spent: number }[];
  const byCard = rows
    .filter((r) => (cardAccounts.size > 0 ? cardAccounts.has(r.account) : guessKind(r.account) === "card"))
    .filter((r) => r.spent > 0)
    .map((r) => ({ account: r.account, amount: r.spent }))
    .sort((a, b) => b.amount - a.amount);
  const total = byCard.reduce((s, c) => s + c.amount, 0);
  return { total, byCard, month: ym };
}

export interface ScheduledListRow {
  id: number;
  kind: "income" | "expense";
  name: string;
  amount: number;
  scheduled_date: string;
  account: string | null;
}

// 登録済みの単発予定一覧（id 付き・削除/編集 UI 用）。scheduled_date 昇順。
export function getScheduledList(): ScheduledListRow[] {
  return db
    .prepare(
      "SELECT id, kind, name, amount, scheduled_date, account FROM scheduled_cashflow ORDER BY scheduled_date, id",
    )
    .all() as ScheduledListRow[];
}

export interface RollingEvent {
  date: string;
  kind: "income" | "expense";
  name: string;
  amount: number;
  source: string;
  recurringId?: number;
  occurrenceDate?: string;
  status: "normal" | "pending" | "skipped";
  balanceAfter: number;
}
export interface RollingCashflow {
  start: number;
  baseDate: string | null;
  days: number;
  events: RollingEvent[];
  end: number;
  minBalance: number;
  firstNegativeDate: string | null;
  cardChargeEstimate: number; // 参考（残高には未算入）
}

// 向こう days 日のローリング資金繰り（recurring + scheduled。カード見込みは別参考値）。
export function getRollingCashflow(days = 30): RollingCashflow {
  const { start, baseDate } = startBalance();
  const overrides = getRecurringOverrides();
  const r = buildRolling({
    today: todayIso(),
    days,
    startBalance: start,
    recurring: activeRecurring(),
    scheduled: scheduledRows(),
    overrides,
  });
  return {
    start: r.start,
    baseDate,
    days,
    events: r.events as RollingEvent[],
    end: r.end,
    minBalance: r.minBalance,
    firstNegativeDate: r.firstNegativeDate,
    cardChargeEstimate: getNextMonthCardCharge().total,
  };
}

export interface UpcomingOccurrence {
  recurringId: number;
  name: string;
  date: string;
  weekday: number;
  status: "normal" | "pending" | "skipped";
  amount: number;
  overrideSkip: boolean;
  overrideAmount: number | null;
}

function addMonthsToYearMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const zero = year * 12 + (month - 1) + delta;
  return { year: Math.floor(zero / 12), month: (zero % 12) + 1 };
}

export function getUpcomingOccurrences(days = 60): UpcomingOccurrence[] {
  const today = todayIso();
  const end = (() => {
    const [y, m, d] = today.split("-").map(Number);
    const t = new Date(Date.UTC(y, m - 1, d + days));
    return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
  })();
  const [startYear, startMonth] = today.split("-").map(Number);
  const monthSpan = Math.ceil((days + 31) / 28);
  const recurring = activeRecurring().filter((r) => r.kind === "income");
  const overrides = new Map(
    getRecurringOverrides().map((ov) => [`${ov.recurring_id}|${ov.occurrence_date}`, ov]),
  );
  const out: UpcomingOccurrence[] = [];

  for (const r of recurring) {
    for (let i = 0; i < monthSpan; i++) {
      const { year, month } = addMonthsToYearMonth(startYear, startMonth, i);
      for (const date of monthlyOccurrences(r, year, month)) {
        if (date < today || date > end) continue;
        const ov = overrides.get(`${r.id}|${date}`) as RecurringOverrideRow | undefined;
        const occurrence = resolveOccurrence(r, ov);
        out.push({
          recurringId: r.id,
          name: r.name,
          date,
          weekday: new Date(Date.UTC(year, month - 1, Number(date.slice(8, 10)))).getUTCDay(),
          status: occurrence.status as "normal" | "pending" | "skipped",
          amount: occurrence.amount,
          overrideSkip: Boolean(ov?.skip),
          overrideAmount: ov?.amount ?? null,
        });
      }
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date) || a.recurringId - b.recurringId);
}
