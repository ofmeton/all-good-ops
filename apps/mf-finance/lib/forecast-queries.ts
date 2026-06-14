import "server-only";
import { db } from "@/lib/db";
import { addMonths, formatYm } from "@/lib/format";
import { monthlyRecurringContribution } from "@/lib/cashflow/rolling.mjs";

// /assets ページ専用: キャッシュフロー予測（今後 N ヶ月）。
// 既存 lib/queries.ts / calendar-queries.ts には触れず本ファイルで自己完結させる。
//
// ── 予測モデル（シンプル優先・単純月次） ──────────────────────────
//   起点残高 startBalance = asset_history 最新の total
//   月次予測 net = (定期収入合計) − (定期支出合計) − (変動費見込み) − (負債の月次返済合計)
//     ・定期収入/支出 = recurring_items（active=1、amount は正の magnitude）の kind 別合計
//     ・変動費見込み  = 直近 3 populated 確定月の classification='variable' の ABS(amount) 合計平均
//                       （収支対象条件: included=1 AND is_transfer=0 AND is_internal_move=0）
//     ・負債返済      = manual_liabilities.monthly_payment 合計（0 件なら 0）
//   projectedBalance = startBalance に予測 net を月次で累積
//   当月（進行中の月）も按分せず 1 ヶ月分の net を満額適用する（保守側に倒れる）。
// ────────────────────────────────────────────────────────────────

// 実績集計条件（lib/queries.ts SUMMARY_WHERE と同一定義。共有ファイル編集禁止のため再定義）。
const SUMMARY_WHERE =
  "included = 1 AND is_transfer = 0 AND is_internal_move = 0";

// populated 月の閾値（lib/asset-queries.ts と同値。app/page.tsx SPARSE_TX_THRESHOLD=5 準拠）。
// 進行中の当月は日数が揃わず平均を下振れさせるため母集団から除外する。
const POPULATED_TX_THRESHOLD = 5;

function currentYm(): string {
  const now = new Date();
  return formatYm(now.getFullYear(), now.getMonth() + 1);
}

export interface ForecastPoint {
  ym: string; // 'YYYY-MM'
  projectedNet: number; // その月の予測収支（毎月同額の単純モデル）
  projectedBalance: number; // 月末時点の予測残高（累積）
}

// 予測の前提値（UI で「前提式」を表示するための内訳）。
export interface ForecastAssumptions {
  recurringIncome: number; // 定期収入合計 / 月
  recurringExpense: number; // 定期支出合計 / 月
  variableAvg: number; // 変動費見込み / 月（直近 3 populated 確定月平均）
  variableBasisYms: string[]; // 変動費平均の根拠にした月（新しい順）
  liabilityPayment: number; // 負債の月次返済合計
}

export interface Forecast {
  baseDate: string | null; // 起点残高の基準日（asset_history 最新日）。資産データ無しは null
  startBalance: number; // 起点残高（資産データ無しは 0）
  points: ForecastPoint[]; // 当月から months ヶ月分
  firstNegativeYm: string | null; // 予測残高が最初にマイナスへ転じる月。無ければ null
  assumptions: ForecastAssumptions;
}

// 直近 limit 件の populated 確定月の変動費実績（ABS 合計）。新しい順。
function recentVariableActuals(
  limit: number,
): { ym: string; variableAbs: number }[] {
  return db
    .prepare(
      `SELECT substr(date, 1, 7) AS ym,
              COALESCE(SUM(CASE WHEN classification = 'variable' THEN ABS(amount) ELSE 0 END), 0) AS variableAbs
         FROM transactions
        WHERE ${SUMMARY_WHERE} AND substr(date, 1, 7) < ?
        GROUP BY ym
       HAVING COUNT(*) > ?
        ORDER BY ym DESC
        LIMIT ?`,
    )
    .all(currentYm(), POPULATED_TX_THRESHOLD, limit) as {
    ym: string;
    variableAbs: number;
  }[];
}

function parseYm(ym: string): { year: number; month: number } {
  const [year, month] = ym.split("-").map(Number);
  return { year, month };
}

export function getForecast(months = 6): Forecast {
  // 起点残高（asset_history 最新 total）。
  const asset = db
    .prepare(
      `SELECT date, total FROM asset_history
        WHERE total IS NOT NULL
        ORDER BY date DESC LIMIT 1`,
    )
    .get() as { date: string; total: number } | undefined;
  const baseDate = asset?.date ?? null;
  const startBalance = asset?.total ?? 0;

  const recurring = db
    .prepare(
      `SELECT id, kind, name, amount, day, frequency, weekday, amount_type
       FROM recurring_items
       WHERE active = 1`,
    )
    .all() as {
    id: number;
    kind: "income" | "expense";
    name: string;
    amount: number;
    day: number | null;
    frequency: "monthly" | "weekly";
    weekday: number | null;
    amount_type: "fixed" | "variable";
  }[];
  const overrides = db
    .prepare("SELECT recurring_id, occurrence_date, skip, amount FROM recurring_overrides")
    .all();
  const recurringExpense = recurring
    .filter((r) => r.kind === "expense")
    .reduce((sum, r) => sum + r.amount, 0);

  // 変動費見込み = 直近 3 populated 確定月の variable 実績平均。
  const varMonths = recentVariableActuals(3);
  const variableAvg =
    varMonths.length > 0
      ? Math.round(
          varMonths.reduce((sum, m) => sum + m.variableAbs, 0) /
            varMonths.length,
        )
      : 0;

  // 負債の月次返済合計（manual_liabilities が 0 件でも 0 で成立）。
  const liab = db
    .prepare(
      "SELECT COALESCE(SUM(COALESCE(monthly_payment, 0)), 0) AS total FROM manual_liabilities",
    )
    .get() as { total: number };

  // 当月から months ヶ月分を累積（当月は按分しない単純月次）。
  const startYm = baseDate ? baseDate.slice(0, 7) : currentYm();
  let balance = startBalance;
  let firstNegativeYm: string | null = null;
  const points: ForecastPoint[] = [];
  let assumptionsRecurringIncome = 0;
  for (let i = 0; i < months; i++) {
    const ym = addMonths(startYm, i);
    const { year, month } = parseYm(ym);
    const recurringIncome = recurring
      .filter((r) => r.kind === "income")
      .reduce((sum, r) => sum + monthlyRecurringContribution(r, year, month, overrides), 0);
    if (i === 0) assumptionsRecurringIncome = recurringIncome;
    const projectedNet = recurringIncome - recurringExpense - variableAvg - liab.total;
    balance += projectedNet;
    if (balance < 0 && firstNegativeYm === null) firstNegativeYm = ym;
    points.push({ ym, projectedNet, projectedBalance: balance });
  }

  return {
    baseDate,
    startBalance,
    points,
    firstNegativeYm,
    assumptions: {
      recurringIncome: assumptionsRecurringIncome,
      recurringExpense,
      variableAvg,
      variableBasisYms: varMonths.map((m) => m.ym),
      liabilityPayment: liab.total,
    },
  };
}
