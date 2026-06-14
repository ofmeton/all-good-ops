import "server-only";
import { db } from "./db";
import { formatYm } from "./format";

// 実績集計条件（queries.ts の SUMMARY_WHERE と同義だが、モジュール独立のため自ファイルで再定義）。
const ACTUAL_WHERE =
  "included = 1 AND is_transfer = 0 AND is_internal_move = 0";

// NULL / 空白カテゴリは「未分類」へ畳む（transactions には文字列 '未分類' も実在する）。
const CAT_EXPR = "COALESCE(NULLIF(TRIM(category_major), ''), '未分類')";

export interface BudgetVsActualRow {
  category_major: string;
  budget: number | null; // 未設定は null
  actual: number; // 当月支出（正の magnitude）
  avg3: number | null; // 直近3 populated 月（そのカテゴリに支出がある月のみ）の平均支出。過去実績ゼロなら null
  over: boolean; // 予算設定済みかつ actual > budget
}

// 選択月のカテゴリ別 予算 vs 実績。支出実績降順（同額はカテゴリ名順）。
// カテゴリ母集合 = 全期間の支出カテゴリ DISTINCT ∪ budgets 設定済みカテゴリ。
export function getBudgetVsActual(
  year: number,
  month: number,
): BudgetVsActualRow[] {
  const ym = formatYm(year, month);

  const actuals = db
    .prepare(
      `SELECT ${CAT_EXPR} AS cat, SUM(-amount) AS actual
       FROM transactions
       WHERE ${ACTUAL_WHERE} AND amount < 0 AND substr(date, 1, 7) = ?
       GROUP BY cat`,
    )
    .all(ym) as { cat: string; actual: number }[];

  // 直近3 populated 月平均: 選択月より前で、そのカテゴリに支出が存在する月だけを
  // 新しい順に最大3つ取り平均（歯抜け月はスキップ）。
  const avgs = db
    .prepare(
      `WITH monthly AS (
         SELECT ${CAT_EXPR} AS cat, substr(date, 1, 7) AS m, SUM(-amount) AS spend
         FROM transactions
         WHERE ${ACTUAL_WHERE} AND amount < 0 AND substr(date, 1, 7) < ?
         GROUP BY cat, m
         HAVING spend > 0
       ),
       ranked AS (
         SELECT cat, spend,
                ROW_NUMBER() OVER (PARTITION BY cat ORDER BY m DESC) AS rn
         FROM monthly
       )
       SELECT cat, AVG(spend) AS avg3 FROM ranked WHERE rn <= 3 GROUP BY cat`,
    )
    .all(ym) as { cat: string; avg3: number }[];

  const budgets = db
    .prepare("SELECT category_major AS cat, amount FROM budgets")
    .all() as { cat: string; amount: number }[];

  const allCats = db
    .prepare(
      `SELECT DISTINCT ${CAT_EXPR} AS cat
       FROM transactions
       WHERE ${ACTUAL_WHERE} AND amount < 0`,
    )
    .all() as { cat: string }[];

  const actualMap = new Map(actuals.map((r) => [r.cat, r.actual]));
  const avgMap = new Map(avgs.map((r) => [r.cat, r.avg3]));
  const budgetMap = new Map(budgets.map((r) => [r.cat, r.amount]));
  const cats = new Set<string>([
    ...allCats.map((r) => r.cat),
    ...budgets.map((r) => r.cat),
  ]);

  const rows: BudgetVsActualRow[] = [...cats].map((cat) => {
    const budget = budgetMap.get(cat) ?? null;
    const actual = actualMap.get(cat) ?? 0;
    const avg3raw = avgMap.get(cat);
    return {
      category_major: cat,
      budget,
      actual,
      avg3: avg3raw != null ? Math.round(avg3raw) : null,
      over: budget != null && actual > budget,
    };
  });

  rows.sort(
    (a, b) =>
      b.actual - a.actual ||
      a.category_major.localeCompare(b.category_major, "ja"),
  );
  return rows;
}

// データが存在する最大の月キー（月セレクタ上限）。queries.ts と同義だが自前で持つ（依存独立）。
export function getBudgetMaxYm(): string | null {
  const row = db
    .prepare("SELECT MAX(substr(date, 1, 7)) ym FROM transactions")
    .get() as { ym: string | null };
  return row.ym;
}
