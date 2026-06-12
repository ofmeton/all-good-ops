import "server-only";
import { db } from "./db";
import { addMonths, formatYm } from "./format";

// 実績集計条件（lib/queries.ts と同義。編集禁止ファイルのためこのファイルに再定義）。
const SPEND_WHERE = "included = 1 AND is_transfer = 0 AND is_internal_move = 0";

// NULL の大項目はデータ上の '未分類' に合流させる（表示・ドリルダウンの一貫性のため）。
const MAJOR_EXPR = "COALESCE(category_major, '未分類')";
const MIDDLE_EXPR = "COALESCE(category_middle, '未分類')";

// --- 型（このモジュール専用） ---

// 大項目 1 行: 当月支出（正の magnitude）+ 前月同値 + 当月件数。
export interface CategorySpend {
  major: string;
  spend: number; // 当月の支出合計（amount<0 の絶対値）
  prevSpend: number; // 前月の同カテゴリ支出（無ければ 0）
  count: number; // 当月の支出明細件数
}

// 中項目 1 行。
export interface CategoryMiddleSpend {
  middle: string;
  spend: number;
  count: number;
}

// 明細 1 行。
export interface CategoryTx {
  date: string; // 'YYYY-MM-DD'
  description: string;
  amount: number; // 負=支出（元の符号のまま）
}

export interface CategoryDetail {
  major: string;
  middles: CategoryMiddleSpend[]; // 支出降順
  transactions: CategoryTx[]; // 支出額の大きい順トップ20
}

// データが存在する最大の月キー（月セレクタの上限）。lib/queries.ts は編集禁止のため自前定義。
export function getCategoryMaxYm(): string | null {
  const row = db
    .prepare("SELECT MAX(substr(date, 1, 7)) ym FROM transactions")
    .get() as { ym: string | null };
  return row.ym;
}

// 月内の大項目別支出を 1 ヶ月分集計（共有 prepared SQL）。
function spendByMajor(
  ym: string,
): { major: string; spend: number; count: number }[] {
  return db
    .prepare(
      `SELECT ${MAJOR_EXPR} AS major,
         SUM(-amount) AS spend,
         COUNT(*) AS count
       FROM transactions
       WHERE ${SPEND_WHERE} AND amount < 0 AND substr(date, 1, 7) = ?
       GROUP BY major`,
    )
    .all(ym) as { major: string; spend: number; count: number }[];
}

// 大項目別の支出合計（降順）+ 前月同値 + 件数。空月は []。
export function getCategorySpend(year: number, month: number): CategorySpend[] {
  const ym = formatYm(year, month);
  const cur = spendByMajor(ym);
  const prev = spendByMajor(addMonths(ym, -1));
  const prevMap = new Map(prev.map((r) => [r.major, r.spend]));
  return cur
    .map((r) => ({
      major: r.major,
      spend: r.spend,
      prevSpend: prevMap.get(r.major) ?? 0,
      count: r.count,
    }))
    .sort((a, b) => b.spend - a.spend);
}

// 指定大項目の中項目別合計 + 支出額の大きい順の明細トップ20。
export function getCategoryDetail(
  year: number,
  month: number,
  major: string,
): CategoryDetail {
  const ym = formatYm(year, month);

  const middles = db
    .prepare(
      `SELECT ${MIDDLE_EXPR} AS middle,
         SUM(-amount) AS spend,
         COUNT(*) AS count
       FROM transactions
       WHERE ${SPEND_WHERE} AND amount < 0
         AND substr(date, 1, 7) = ? AND ${MAJOR_EXPR} = ?
       GROUP BY middle
       ORDER BY spend DESC`,
    )
    .all(ym, major) as CategoryMiddleSpend[];

  // 支出額の大きい順 = amount（負値）の昇順。同額は新しい日付を先に。
  const transactions = db
    .prepare(
      `SELECT date, COALESCE(description, '(明細なし)') AS description, amount
       FROM transactions
       WHERE ${SPEND_WHERE} AND amount < 0
         AND substr(date, 1, 7) = ? AND ${MAJOR_EXPR} = ?
       ORDER BY amount ASC, date DESC
       LIMIT 20`,
    )
    .all(ym, major) as CategoryTx[];

  return { major, middles, transactions };
}
