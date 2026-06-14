import "server-only";
import { db } from "./db";
import type {
  AccountUsage,
  DisposableResult,
  Freshness,
  LargeIncome,
  MonthAgg,
  MonthlySummary,
  RecurringItem,
  SeriesPoint,
  Tx,
} from "./types";
import { addMonths, formatYm } from "./format";
// 純Node .mjs（型なし→ allowJs で any 解決）。ロジックの SSOT はこちら（再実装しない）。
import { computeMonthlyDisposable } from "../scripts/lib/disposable.mjs";

// 月境界の文字列（'YYYY-MM-DD'）。tx.date が ISO 日付文字列なので辞書順比較で月抽出できる。
function monthBounds(year: number, month: number): { start: string; next: string } {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const ny = month === 12 ? year + 1 : year;
  const nm = month === 12 ? 1 : month + 1;
  const next = `${ny}-${String(nm).padStart(2, "0")}-01`;
  return { start, next };
}

export interface HomeData {
  year: number;
  month: number;
  disposable: DisposableResult;
}

export function getDisposable(year: number, month: number): HomeData {
  const { start, next } = monthBounds(year, month);
  const txs = db
    .prepare(
      "SELECT * FROM transactions WHERE included = 1 AND date >= ? AND date < ?",
    )
    .all(start, next) as Tx[];
  const recurring = db
    .prepare("SELECT * FROM recurring_items WHERE active = 1")
    .all() as RecurringItem[];
  const overrides = db
    .prepare("SELECT recurring_id, occurrence_date, skip, amount FROM recurring_overrides")
    .all();

  const disposable = computeMonthlyDisposable(txs, recurring, {
    year,
    month,
    overrides,
  }) as DisposableResult;
  return { year, month, disposable };
}

// データの最新性（取引の最大日付）— 連携鮮度の簡易指標。
export function getLatestTxDate(): string | null {
  const row = db.prepare("SELECT MAX(date) d FROM transactions").get() as {
    d: string | null;
  };
  return row.d;
}

// データが存在する最大の月キー（'YYYY-MM'）。翌月ボタンの上限・トレンド既定終端に使う。
export function getMaxYm(): string | null {
  const row = db
    .prepare("SELECT MAX(substr(date, 1, 7)) ym FROM transactions")
    .get() as { ym: string | null };
  return row.ym;
}

// 実績収支の集計条件（可処分とは別概念）:
//   included=1 / 内部移動・口座間振替を除外 / amount の符号で収入・支出を分離。
const SUMMARY_WHERE =
  "included = 1 AND is_transfer = 0 AND is_internal_move = 0";

// 1 ヶ月（'YYYY-MM'）の実績集計。データ無しでも 0 を返す。
function aggregateMonth(ym: string): MonthAgg & { count: number } {
  const row = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS income,
         COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0) AS expense,
         COUNT(*) AS count
       FROM transactions
       WHERE ${SUMMARY_WHERE} AND substr(date, 1, 7) = ?`,
    )
    .get(ym) as { income: number; expense: number; count: number };
  return {
    income: row.income,
    expense: row.expense,
    net: row.income - row.expense,
    count: row.count,
  };
}

// 選択月の実績収支サマリ + 前月 / 前年同月の比較。
export function getMonthlySummary(year: number, month: number): MonthlySummary {
  const ym = formatYm(year, month);
  const cur = aggregateMonth(ym);
  const prev = aggregateMonth(addMonths(ym, -1));
  const yoy = aggregateMonth(addMonths(ym, -12));
  return {
    ym,
    income: cur.income,
    expense: cur.expense,
    net: cur.net,
    count: cur.count,
    prev: { income: prev.income, expense: prev.expense, net: prev.net },
    yoy: { income: yoy.income, expense: yoy.expense, net: yoy.net },
  };
}

// 末尾 endYm（既定 = データ最大月、無ければ当月）から遡る N ヶ月の連続系列。
// データ欠損月は 0 埋めして必ず months 件返す（トレンドの軸を安定させる）。
export function getMonthlySeries(
  months = 12,
  endYm?: string,
): SeriesPoint[] {
  const now = new Date();
  const end = endYm ?? getMaxYm() ?? formatYm(now.getFullYear(), now.getMonth() + 1);
  const start = addMonths(end, -(months - 1));

  const rows = db
    .prepare(
      `SELECT substr(date, 1, 7) AS ym,
         COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS income,
         COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0) AS expense
       FROM transactions
       WHERE ${SUMMARY_WHERE}
         AND substr(date, 1, 7) >= ? AND substr(date, 1, 7) <= ?
       GROUP BY ym`,
    )
    .all(start, end) as { ym: string; income: number; expense: number }[];

  const map = new Map(rows.map((r) => [r.ym, r]));
  const out: SeriesPoint[] = [];
  for (let i = 0; i < months; i++) {
    const ym = addMonths(start, i);
    const r = map.get(ym);
    const income = r?.income ?? 0;
    const expense = r?.expense ?? 0;
    out.push({ ym, income, expense, net: income - expense });
  }
  return out;
}

// --- Phase 3: 鮮度 / 口座別利用 / 警告 ---

// 連携鮮度: 最新取引日と今日との差（日）。
export function getFreshness(): Freshness {
  const latest = getLatestTxDate();
  if (!latest) return { latest: null, daysSince: null };
  // 日付のみで差分（ローカルタイム基準）。
  const today = new Date();
  const t0 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const [y, m, d] = latest.split("-").map(Number);
  const t1 = Date.UTC(y, m - 1, d);
  const daysSince = Math.round((t0 - t1) / 86400000);
  return { latest, daysSince };
}

// 当月の口座/カード別利用（支出・入金）。内部移動・振替は除外。支出額の大きい順。
export function getAccountUsage(year: number, month: number): AccountUsage[] {
  const ym = formatYm(year, month);
  const rows = db
    .prepare(
      `SELECT COALESCE(account, '(不明)') AS account,
         COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0) AS spent,
         COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS received
       FROM transactions
       WHERE ${SUMMARY_WHERE} AND substr(date, 1, 7) = ?
       GROUP BY account
       HAVING spent > 0 OR received > 0
       ORDER BY spent DESC, received DESC`,
    )
    .all(ym) as AccountUsage[];
  return rows;
}

// 当月の大口入金（着金アラート用）。threshold 以上の単一入金を新しい順に。
export function getLargeIncomes(
  year: number,
  month: number,
  threshold = 50000,
): LargeIncome[] {
  const ym = formatYm(year, month);
  const rows = db
    .prepare(
      `SELECT date, COALESCE(description, '(明細なし)') AS description, amount
       FROM transactions
       WHERE ${SUMMARY_WHERE} AND substr(date, 1, 7) = ? AND amount >= ?
       ORDER BY amount DESC, date DESC
       LIMIT 5`,
    )
    .all(ym, threshold) as LargeIncome[];
  return rows;
}
