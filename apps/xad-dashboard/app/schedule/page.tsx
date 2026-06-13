import { listApprovedStock, fetchSlotPlan } from "@/lib/schedule-queries";
import type { PlanRow, ScheduleStock } from "@/lib/schedule-logic";
import { ScheduleClient } from "./ScheduleClient";

// approval/page.tsx と同型（server / force-dynamic）。
export const dynamic = "force-dynamic";
const LIMIT = 100;

export default async function SchedulePage() {
  // 在庫は service role で直読み。初期プランは Worker から（翌日起点・当日トグル OFF）。
  // 初期プランは Worker 不達でも画面を出すため [] にフォールバック（UI から再プラン可能）。
  const [stock, plan]: [ScheduleStock[], PlanRow[]] = await Promise.all([
    listApprovedStock(LIMIT).catch(() => []),
    fetchSlotPlan({ includeToday: false }).catch(() => []),
  ]);
  return <ScheduleClient initialStock={stock} initialPlan={plan} />;
}
