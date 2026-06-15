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
import { Container } from "@/app/components/Container";
import { PageHeader } from "@/app/components/PageHeader";

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
    <Container>
      <PageHeader
        title="資産 — 推移・負債・予測"
        description="純資産と資産推移、月収目標の進捗、今後のキャッシュフロー予測をまとめて確認できます。"
      />

      <NetWorthCard data={netWorth} />
      <AssetTrendChart series={series} />
      <KgiCard data={kgi} />
      <LiabilityList items={liabilities} />
      <ForecastChart data={forecast} />
    </Container>
  );
}
