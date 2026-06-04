import { latestTraceByStage } from "@/lib/queries";
import { HomeClient } from "./HomeClient";
export default async function Page() {
  const latest = await latestTraceByStage().catch(() => ({}));
  return <HomeClient latest={latest} />;
}
