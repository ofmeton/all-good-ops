import { latestTraceByStage } from "@/lib/queries";
import { HomeClient } from "./HomeClient";

// 都度フレッシュ（trace の最新色を再デプロイなしに反映。設計書「最新を都度クエリ」）
export const dynamic = "force-dynamic";

export default async function Page() {
  const latest = await latestTraceByStage().catch(() => ({}));
  return <HomeClient latest={latest} />;
}
