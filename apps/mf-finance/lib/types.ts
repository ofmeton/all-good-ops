// 純Nodeライブラリ scripts/lib/*.mjs に型が無いため、受け側だけ最小の型を定義。
// SSOT のロジックは .mjs 側、ここは形だけ。

export interface Tx {
  id: string;
  included: number; // 0/1（SQLite）— disposable.mjs は truthy/falsy で判定するのでそのまま渡せる
  date: string; // 'YYYY-MM-DD'
  description: string | null;
  amount: number; // 負=支出
  account: string | null;
  category_major: string | null;
  category_middle: string | null;
  classification: string | null; // income/fixed/variable/transfer/internal/unknown
  source_type: string | null;
  is_transfer: number;
  is_internal_move: number;
}

export interface RecurringItem {
  id: number;
  kind: "income" | "expense";
  name: string;
  amount: number; // 正の magnitude
  day: number | null;
  active: number; // 0/1
  confirmed: "auto" | "user";
}

// computeMonthlyDisposable の戻り値（disposable.mjs:29）
export interface DisposableResult {
  incomeRecurring: number;
  incomeSpot: number;
  incomeTotal: number;
  fixed: number;
  variableActual: number;
  disposableBudget: number;
  remaining: number;
}

// --- Phase 2: 月次実績収支 ---

// 1 ヶ月の実績集計（hero の「見込み込み可処分」とは別概念の実績収支）。
export interface MonthAgg {
  income: number; // amount>0 の合計（実入金）
  expense: number; // amount<0 の絶対値合計（実支出）
  net: number; // income − expense
}

// 選択月のサマリ + 前月 / 前年同月の比較対象。
export interface MonthlySummary extends MonthAgg {
  ym: string; // 'YYYY-MM'
  count: number; // 収支対象の取引件数（空月 UX 判定用）
  prev: MonthAgg; // 前月（データ無しは 0 埋め）
  yoy: MonthAgg; // 前年同月（データ無しは 0 埋め）
}

// トレンド用の 1 点。
export interface SeriesPoint extends MonthAgg {
  ym: string;
}
