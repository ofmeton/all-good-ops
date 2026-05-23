import { resolveActorByToken } from "@/lib/auth";
import { listRequestsForStaff } from "@/lib/db/requests";
import { listProperties } from "@/lib/db/properties";
import { createServiceClient } from "@/lib/supabase-server";
import { Avatar } from "@/components/ui/Avatar";
import { RequestList } from "./RequestList";

export default async function StaffRequestsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const actor = await resolveActorByToken(token);
  if (!actor || actor.role !== "staff") return null;

  const [requests, properties] = await Promise.all([
    listRequestsForStaff(actor),
    listProperties({ role: "admin", adminId: "system", roleLevel: 99 }),
  ]);
  const propNameById = new Map(properties.map((p) => [p.id, p.name]));

  // staff name 取得
  const db = createServiceClient();
  const { data: staffRow } = await db
    .from("staff")
    .select("name")
    .eq("id", actor.staffId)
    .maybeSingle();
  const staffName = staffRow?.name ?? "スタッフ";

  const enriched = requests.map((r) => ({
    ...r,
    property_name: propNameById.get(r.property_id) ?? "物件",
  }));

  const todayCount = enriched.filter(
    (r) => r.status === "assigned" || r.status === "in_progress",
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Avatar name={staffName.slice(0, 1)} color="bg-brand-600" size={36} />
        <div className="leading-tight">
          <h1 className="text-[18px] font-bold text-ink-900">{staffName} さん</h1>
          <p className="num text-[11.5px] text-ink-500">本日の予定: {todayCount} 件</p>
        </div>
      </div>
      <RequestList token={token} requests={enriched} />
    </div>
  );
}
