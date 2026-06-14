import "server-only";
import { db } from "@/lib/db";
import { formatYm } from "@/lib/format";

// /assets ページ専用クエリ: 資産推移 / 純資産（資産−手入力負債）/ KGI 進捗。
// 既存 lib/queries.ts には触れず本ファイルで自己完結させる（並列開発の衝突回避）。

// 実績集計条件（lib/queries.ts SUMMARY_WHERE と同一定義。共有ファイル編集禁止のため再定義）。
const SUMMARY_WHERE =
  "included = 1 AND is_transfer = 0 AND is_internal_move = 0";

// 「populated 月」= 収支対象の取引がこの件数を超える月。
// app/page.tsx の SPARSE_TX_THRESHOLD=5（5件以下は空月扱い）と同じ閾値。
// 進行中の当月は日数が揃わず統計を歪めるため、populated 判定の母集団から除外する
//（= KGI・予測の基礎は「確定した月」のみ）。
const POPULATED_TX_THRESHOLD = 5;

// 当月キー（'YYYY-MM'、ローカルタイム）。これ未満の月を「確定月」とみなす。
function currentYm(): string {
  const now = new Date();
  return formatYm(now.getFullYear(), now.getMonth() + 1);
}

// --- 資産推移 ---

export interface AssetPoint {
  date: string; // 'YYYY-MM-DD'
  total: number; // 円
  deposit_cash_crypto: number | null;
  points: number | null;
}

// asset_history 全期間を日付昇順で返す（total が NULL の行はチャートに乗らないため除外）。
export function getAssetSeries(): AssetPoint[] {
  return db
    .prepare(
      `SELECT date, total, deposit_cash_crypto, points
         FROM asset_history
        WHERE total IS NOT NULL
        ORDER BY date ASC`,
    )
    .all() as AssetPoint[];
}

// --- 純資産（資産 − 手入力負債） ---

export interface NetWorth {
  latestAssetDate: string | null; // 最新資産スナップショット日。資産データ無しは null
  assetTotal: number; // 最新の asset_history.total（無ければ 0）
  liabilityTotal: number; // manual_liabilities.balance 合計（0 件なら 0）
  netWorth: number; // assetTotal − liabilityTotal
}

export function getNetWorth(): NetWorth {
  const asset = db
    .prepare(
      `SELECT date, total FROM asset_history
        WHERE total IS NOT NULL
        ORDER BY date DESC LIMIT 1`,
    )
    .get() as { date: string; total: number } | undefined;

  const liab = db
    .prepare(
      "SELECT COALESCE(SUM(COALESCE(balance, 0)), 0) AS total FROM manual_liabilities",
    )
    .get() as { total: number };

  const assetTotal = asset?.total ?? 0;
  return {
    latestAssetDate: asset?.date ?? null,
    assetTotal,
    liabilityTotal: liab.total,
    netWorth: assetTotal - liab.total,
  };
}

// --- 手入力負債の一覧（/assets ④ 負債一覧用） ---

export interface ManualLiability {
  id: number;
  name: string;
  lender: string | null;
  balance: number | null;
  rate: number | null; // 年利（%）
  monthly_payment: number | null;
  as_of_date: string | null;
}

export function getManualLiabilities(): ManualLiability[] {
  return db
    .prepare(
      `SELECT id, name, lender, balance, rate, monthly_payment, as_of_date
         FROM manual_liabilities
        ORDER BY COALESCE(balance, 0) DESC, id ASC`,
    )
    .all() as ManualLiability[];
}

// --- KGI 進捗（月収目標との比較） ---

// 月収目標。出典: wiki/self/goals「月収26万円」。
// 現在は凍結中の参考目標（UI 側で注記する）。
export const KGI_INCOME_TARGET = 260000;

export interface KgiProgress {
  target: number; // KGI_INCOME_TARGET
  // 直近の populated 確定月の実績収入。確定月が 1 つも無ければ null。
  latestMonth: { ym: string; income: number } | null;
  avg3m: number; // 直近 3 populated 確定月の収入平均（足りなければある分で平均、無ければ 0）
}

// 直近の populated 確定月（収支対象 tx 数 > 閾値、当月除外）を新しい順に最大 limit 件。
function recentPopulatedMonths(
  limit: number,
): { ym: string; income: number }[] {
  return db
    .prepare(
      `SELECT substr(date, 1, 7) AS ym,
              COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS income
         FROM transactions
        WHERE ${SUMMARY_WHERE} AND substr(date, 1, 7) < ?
        GROUP BY ym
       HAVING COUNT(*) > ?
        ORDER BY ym DESC
        LIMIT ?`,
    )
    .all(currentYm(), POPULATED_TX_THRESHOLD, limit) as {
    ym: string;
    income: number;
  }[];
}

export function getKgiProgress(): KgiProgress {
  const months = recentPopulatedMonths(3);
  const latestMonth = months[0] ?? null;
  const avg3m =
    months.length > 0
      ? Math.round(
          months.reduce((sum, m) => sum + m.income, 0) / months.length,
        )
      : 0;
  return { target: KGI_INCOME_TARGET, latestMonth, avg3m };
}
