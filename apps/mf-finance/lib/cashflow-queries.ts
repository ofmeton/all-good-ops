import "server-only";
import { db } from "@/lib/db";
import { getLatestAsset } from "@/lib/calendar-queries";
// 純ロジック（DB非依存・テスト済み）。
import {
  buildAccountRolling,
  buildBalanceMatrix,
  buildRolling,
  buildUpcomingWithdrawals,
  expandCardChargeSchedules,
  monthEndOffsetDays,
  monthlyChargeDates,
  monthlyOccurrences,
  resolveOccurrence,
} from "@/lib/cashflow/rolling.mjs";
import { isKnownCardAccount as isKnownCardAccountFromSources } from "@/lib/cashflow/card-accounts.mjs";
// kind 定数は client/server 両用の純モジュールへ分離（client が db を引き込まないため）。
import {
  type BalanceKind,
  type CashflowPeriod,
  KIND_LABEL,
  guessKind,
  periodMonthsAhead,
} from "@/lib/cashflow/kinds";
export { type BalanceKind, type CashflowPeriod, KIND_LABEL, guessKind };

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

export function getAccountOptions(): { account: string; kind: BalanceKind }[] {
  return getAllAccountBalances().map((row) => ({ account: row.account, kind: row.kind }));
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
  account: string | null;
}

export interface RecurringOverrideRow {
  recurring_id: number;
  occurrence_date: string;
  skip: number;
  amount: number | null;
}

function activeRecurring(): ActiveRecurringRow[] {
  return db
    .prepare("SELECT id, kind, name, amount, day, frequency, weekday, amount_type, account FROM recurring_items WHERE active = 1")
    .all() as ActiveRecurringRow[];
}

export function getRecurringOverrides(): RecurringOverrideRow[] {
  return db
    .prepare("SELECT recurring_id, occurrence_date, skip, amount FROM recurring_overrides")
    .all() as RecurringOverrideRow[];
}

function scheduledRows(): { kind: "income" | "expense"; name: string; amount: number; date: string; account: string | null }[] {
  return db
    .prepare("SELECT kind, name, amount, scheduled_date AS date, account FROM scheduled_cashflow ORDER BY scheduled_date")
    .all() as { kind: "income" | "expense"; name: string; amount: number; date: string; account: string | null }[];
}

export interface TransferRow {
  id: number;
  from_account: string;
  to_account: string;
  amount: number;
  scheduled_date: string;
  date: string;
  name: string | null;
  fee: number;
  status: "pending" | "done" | "cancelled";
  done_at: string | null;
}

export interface CardChargeScheduleRow {
  id: number;
  card_account: string;
  charge_day: number;
  amount_type: "fixed" | "variable";
  fixed_amount: number | null;
  note: string | null;
  active: number;
  created_at: string;
}

function transferRows(): TransferRow[] {
  return db
    .prepare(
      `SELECT id, from_account, to_account, amount, scheduled_date, scheduled_date AS date, name, fee, status, done_at
         FROM manual_transfers
        WHERE status = 'pending' AND scheduled_date >= ?
        ORDER BY scheduled_date, id`,
    )
    .all(todayIso()) as TransferRow[];
}

export function getTransferList(): TransferRow[] {
  return db
    .prepare(
      `SELECT id, from_account, to_account, amount, scheduled_date, scheduled_date AS date, name, fee, status, done_at
         FROM manual_transfers
        ORDER BY scheduled_date, id`,
    )
    .all() as TransferRow[];
}

export function getCardChargeSchedules(): CardChargeScheduleRow[] {
  return db
    .prepare(
      `SELECT id, card_account, charge_day, amount_type, fixed_amount, note, active, created_at
         FROM card_charge_schedules
        WHERE active = 1
        ORDER BY card_account, charge_day, id`,
    )
    .all() as CardChargeScheduleRow[];
}

export function getCardChargeScheduleList(): CardChargeScheduleRow[] {
  return db
    .prepare(
      `SELECT id, card_account, charge_day, amount_type, fixed_amount, note, active, created_at
         FROM card_charge_schedules
        ORDER BY active DESC, card_account, charge_day, id`,
    )
    .all() as CardChargeScheduleRow[];
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

export function getDueTransfers(withinDays = 3): TransferRow[] {
  const today = todayIso();
  const end = addDaysIso(today, Math.max(0, Math.round(withinDays)));
  return db
    .prepare(
      `SELECT id, from_account, to_account, amount, scheduled_date, scheduled_date AS date, name, fee, status, done_at
         FROM manual_transfers
        WHERE status = 'pending' AND scheduled_date <= ?
        ORDER BY scheduled_date, id`,
    )
    .all(end) as TransferRow[];
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
      // カード請求額＝そのカード口座への全チャージ。Suica/PASMO チャージ等は is_transfer=1 /
      // included=0（収支対象外）だが実際にカードに請求され引落される債務なので、カード口座では
      // それらも含めて合計する（included/is_transfer/is_internal_move でフィルタしない）。
      `SELECT account, COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0) AS spent
         FROM transactions
        WHERE substr(date,1,7) = ? AND account IS NOT NULL
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

function previousYearMonthFromDate(iso: string): string {
  const [year, month] = iso.split("-").map(Number);
  const zeroBasedMonth = year * 12 + (month - 1) - 1;
  const billingYear = Math.floor(zeroBasedMonth / 12);
  const billingMonth = (zeroBasedMonth % 12) + 1;
  return `${billingYear}-${String(billingMonth).padStart(2, "0")}`;
}

export function getCardUsageByMonth(accounts: string[], months: string[]): Map<string, number> {
  const accountList = [...new Set(accounts.filter(Boolean))].sort();
  const monthList = [...new Set(months.filter(Boolean))].sort();
  const out = new Map<string, number>();
  if (accountList.length === 0 || monthList.length === 0) return out;

  const accountPlaceholders = accountList.map(() => "?").join(", ");
  const monthPlaceholders = monthList.map(() => "?").join(", ");
  const rows = db
    .prepare(
      // カード請求額なので included/is_transfer/is_internal_move でフィルタしない（getNextMonthCardCharge と同方針）。
      // ここで渡る accounts はカード口座に限定されている。
      `SELECT account, substr(date,1,7) AS month,
              COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0) AS spent
         FROM transactions
        WHERE account IN (${accountPlaceholders})
          AND substr(date,1,7) IN (${monthPlaceholders})
        GROUP BY account, substr(date,1,7)`,
    )
    .all(...accountList, ...monthList) as { account: string; month: string; spent: number }[];

  for (const row of rows) {
    out.set(`${row.account}|${row.month}`, Number(row.spent) || 0);
  }
  return out;
}

export function isKnownCardAccount(account: string): boolean {
  return isKnownCardAccountFromSources(account, {
    accountBalanceCards: getAllAccountBalances().filter((row) => row.kind === "card"),
    nextMonthCards: getNextMonthCardCharge().byCard,
    guessKindFn: guessKind,
  });
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
  account: string | null;
  source: "recurring" | "scheduled" | "transfer" | "card_charge" | string;
  recurringId?: number;
  occurrenceDate?: string;
  status: "normal" | "pending" | "skipped";
  balanceAfter: number;
  affectsTotal?: boolean;
  estimated?: boolean;
}
export interface RollingCashflow {
  start: number;
  baseDate: string | null;
  days: number;
  events: RollingEvent[];
  end: number;
  minBalance: number;
  firstNegativeDate: string | null;
  cardChargeEstimate: number; // 参考表示用の当月カード利用額合計
}

export interface RollingLocation {
  key: string | null;
  account: string | null;
  kind: BalanceKind | null;
  start: number;
  end: number;
  minBalance: number;
  firstNegativeDate: string | null;
  events: RollingEvent[];
}

export interface AccountRollingCashflow {
  period: CashflowPeriod;
  days: number;
  baseDate: string | null;
  total: RollingCashflow;
  locations: RollingLocation[];
  matrix: {
    rows: { event: RollingEvent; balances: Record<string, number> }[];
    endBalances: Record<string, number>;
  };
  cardChargeEstimate: number;
}

type ExpandedCardCharge = {
  date: string;
  amount: number;
  account: string;
  name: string;
  amountType: "fixed" | "variable";
  estimated: boolean;
};

function formatRollingResult(
  r: {
    start: number;
    events: unknown[];
    end: number;
    minBalance: number;
    firstNegativeDate: string | null;
  },
  baseDate: string | null,
  days: number,
  cardChargeEstimate: number,
): RollingCashflow {
  return {
    start: r.start,
    baseDate,
    days,
    events: r.events as RollingEvent[],
    end: r.end,
    minBalance: r.minBalance,
    firstNegativeDate: r.firstNegativeDate,
    cardChargeEstimate,
  };
}

function expandCardCharges(
  schedules: CardChargeScheduleRow[],
  today: string,
  days: number,
): ExpandedCardCharge[] {
  const accounts = new Set<string>();
  const months = new Set<string>();
  const chargeDates = monthlyChargeDates as (today: string, days: number, chargeDay: number) => string[];

  for (const schedule of schedules) {
    const amountType = schedule.amount_type === "fixed" ? "fixed" : "variable";
    const account = schedule.card_account;
    if (!account || amountType === "fixed") continue;
    accounts.add(account);
    for (const date of chargeDates(today, days, schedule.charge_day)) {
      months.add(previousYearMonthFromDate(date));
    }
  }

  const variableByCardMonth = getCardUsageByMonth([...accounts], [...months]);
  const expand = expandCardChargeSchedules as (input: {
    schedules: CardChargeScheduleRow[];
    today: string;
    days: number;
    variableByCardMonth: Map<string, number>;
  }) => ExpandedCardCharge[];
  return expand({ schedules, today, days, variableByCardMonth });
}

// 向こう days 日のローリング資金繰り（recurring + scheduled + transfer + cardCharges）。
export function getRollingCashflow(days = 30): RollingCashflow {
  const today = todayIso();
  const { start, baseDate } = startBalance();
  const overrides = getRecurringOverrides();
  const cardChargeEstimate = getNextMonthCardCharge();
  const r = buildRolling({
    today,
    days,
    startBalance: start,
    recurring: activeRecurring(),
    scheduled: scheduledRows(),
    cardCharges: expandCardCharges(getCardChargeSchedules(), today, days),
    transfers: transferRows(),
    overrides,
  });
  return formatRollingResult(r, baseDate, days, cardChargeEstimate.total);
}

const KIND_ORDER: BalanceKind[] = ["bank", "card", "emoney", "cash", "crypto", "other"];

export function getAccountRollingCashflow(period: CashflowPeriod): AccountRollingCashflow {
  const today = todayIso();
  const days = monthEndOffsetDays(today, periodMonthsAhead(period));
  const { start, baseDate } = startBalance();
  const cardChargeEstimate = getNextMonthCardCharge();
  const r = buildAccountRolling({
    today,
    days,
    startBalance: start,
    balances: getAllAccountBalances().map((row) => ({
      account: row.account,
      kind: row.kind,
      balance: row.balance,
    })),
    recurring: activeRecurring(),
    scheduled: scheduledRows(),
    cardCharges: expandCardCharges(getCardChargeSchedules(), today, days),
    transfers: transferRows(),
    overrides: getRecurringOverrides(),
  });
  const locations = (r.locations as RollingLocation[]).sort((a, b) => {
    if (a.key == null && b.key != null) return 1;
    if (a.key != null && b.key == null) return -1;
    const ai = a.kind ? KIND_ORDER.indexOf(a.kind) : KIND_ORDER.length;
    const bi = b.kind ? KIND_ORDER.indexOf(b.kind) : KIND_ORDER.length;
    if (ai !== bi) return ai - bi;
    return String(a.account ?? "").localeCompare(String(b.account ?? ""), "ja");
  });
  return {
    period,
    days,
    baseDate,
    total: formatRollingResult(r.total, baseDate, days, cardChargeEstimate.total),
    locations,
    matrix: buildBalanceMatrix(r.total.events, locations) as AccountRollingCashflow["matrix"],
    cardChargeEstimate: cardChargeEstimate.total,
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
