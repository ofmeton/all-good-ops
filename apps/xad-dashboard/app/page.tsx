import { latestTraceByStage } from "@/lib/queries";
import { dashboardKpis } from "@/lib/kpi-queries";
import { HomeClient } from "./HomeClient";

// 都度フレッシュ（trace の最新色を再デプロイなしに反映。設計書「最新を都度クエリ」）
export const dynamic = "force-dynamic";

export default async function Page() {
  // KPI は装飾。失敗時 null でストリップ非表示にし工程図本体を守る。
  const [latest, kpis] = await Promise.all([
    latestTraceByStage().catch(() => ({})),
    dashboardKpis().catch(() => null),
  ]);
  return <HomeClient latest={latest} kpis={kpis} />;
}
