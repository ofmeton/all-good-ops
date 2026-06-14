import {
  getAssetSeries,
  getNetWorth,
  getKgiProgress,
  getManualLiabilities,
} from "@/lib/asset-queries";
import { getForecast } from "@/lib/forecast-queries";
import { NetWorthCard } from "@/app/assets/NetWorthCard";
import { AssetTrendChart } from "@/app/assets/AssetTrendChart";
import { KgiCard } from "@/app/assets/KgiCard";
import { LiabilityList } from "@/app/assets/LiabilityList";
import { ForecastChart } from "@/app/assets/ForecastChart";

// SQLite ファイル更新を再ビルドなしで反映（他ページと同じ方針）。
export const dynamic = "force-dynamic";

// /assets: ①純資産 ②資産推移 ③KGI ④負債一覧 ⑤キャッシュフロー予測。
export default function AssetsPage() {
  const netWorth = getNetWorth();
  const series = getAssetSeries();
  const kgi = getKgiProgress();
  const liabilities = getManualLiabilities();
  const forecast = getForecast(6);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      <a
        href="/"
        className="inline-flex h-9 items-center text-sm font-medium text-primary transition-colors duration-150 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        ← ダッシュボードへ戻る
      </a>

      <header className="mb-4 mt-3">
        <h1 className="text-lg font-semibold text-foreground sm:text-xl">
          資産 — 推移・負債・予測
        </h1>
        <p className="mt-1 text-xs text-muted">
          純資産と資産推移、月収目標の進捗、今後のキャッシュフロー予測をまとめて確認できます。
        </p>
      </header>

      <NetWorthCard data={netWorth} />
      <AssetTrendChart series={series} />
      <KgiCard data={kgi} />
      <LiabilityList items={liabilities} />
      <ForecastChart data={forecast} />
    </main>
  );
}
