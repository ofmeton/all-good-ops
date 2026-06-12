import {
  getAccountUsage,
  getDisposable,
  getFreshness,
  getLargeIncomes,
  getMaxYm,
  getMonthlySeries,
  getMonthlySummary,
} from "@/lib/queries";
import { formatYm, isValidYm, parseYm } from "@/lib/format";
import { DisposableHero } from "@/app/components/DisposableHero";
import { DisposableBreakdown } from "@/app/components/DisposableBreakdown";
import { MonthSelector } from "@/app/components/MonthSelector";
import { MonthlySummary } from "@/app/components/MonthlySummary";
import { TrendChart } from "@/app/components/TrendChart";
import { FreshnessBanner } from "@/app/components/FreshnessBanner";
import { AccountBreakdown } from "@/app/components/AccountBreakdown";
import { Alerts } from "@/app/components/Alerts";
import { PayoutCalendar } from "@/app/components/PayoutCalendar";
import { getLatestAsset, getProjectedBalance } from "@/lib/calendar-queries";

// SQLite ファイル更新を再ビルドなしで反映（毎リクエスト最新化）。
export const dynamic = "force-dynamic";

// 収支対象がこの件数以下の月は「ほぼ空（連携待ち）」とみなし控えめに注記。
const SPARSE_TX_THRESHOLD = 5;

export default async function Home({
  searchParams,
}: {
  // Next 16: searchParams は Promise。
  searchParams: Promise<{ ym?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const defaultYm = formatYm(now.getFullYear(), now.getMonth() + 1);
  const ym = isValidYm(sp.ym) ? sp.ym : defaultYm;
  const { year, month } = parseYm(ym);

  const maxYm = getMaxYm();
  // トレンドは選択月で終端（データ最大月を超えない）→ 選択バーを常に右端に可視化。
  const trendEnd = maxYm && ym > maxYm ? maxYm : ym;
  const { disposable } = getDisposable(year, month);
  const summary = getMonthlySummary(year, month);
  const series = getMonthlySeries(12, trendEnd);
  const accounts = getAccountUsage(year, month);
  const largeIncomes = getLargeIncomes(year, month);
  const freshness = getFreshness();
  const projected = getProjectedBalance(year, month);
  const latestAsset = getLatestAsset();

  const sparse = summary.count <= SPARSE_TX_THRESHOLD;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      <header className="mb-4">
        <h1 className="text-lg font-semibold text-foreground sm:text-xl">
          家計ダッシュボード
        </h1>
      </header>

      <div className="mb-4">
        <FreshnessBanner data={freshness} />
      </div>

      <div className="mb-4">
        <MonthSelector ym={ym} maxYm={maxYm} />
      </div>

      {sparse && (
        <p
          className="mb-4 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning"
          role="status"
        >
          この月はデータがほとんどありません（連携待ち）。表示中の金額は実態を反映していない可能性があります。
        </p>
      )}

      <Alerts disposable={disposable} largeIncomes={largeIncomes} />

      <DisposableHero data={disposable} />
      <DisposableBreakdown data={disposable} />
      <MonthlySummary data={summary} />
      <AccountBreakdown data={accounts} />
      <PayoutCalendar projected={projected} latestAsset={latestAsset} />
      <TrendChart series={series} selectedYm={ym} />
    </main>
  );
}
