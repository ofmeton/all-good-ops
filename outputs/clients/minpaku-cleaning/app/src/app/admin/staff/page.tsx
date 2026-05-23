import Link from "next/link";
import { resolveAdminActor } from "@/lib/supabase-auth";
import { listStaff } from "@/lib/db/staff";
import { listProperties } from "@/lib/db/properties";
import { listRequests } from "@/lib/db/requests";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge, type Status } from "@/components/ui/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { StaffForm } from "./StaffForm";

const STATUS_MAP: Record<string, Status> = {
  unassigned: "unassigned",
  assigned: "assigned",
  in_progress: "cleaning",
  reported: "reported",
  confirmed: "confirmed",
  cancelled: "cancelled",
};
const AVATAR_COLORS = [
  "bg-brand-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-rose-500",
  "bg-amber-500",
] as const;

export default async function StaffPage() {
  const actor = await resolveAdminActor();
  if (!actor || actor.role !== "admin") redirect("/admin/login");
  const [staff, properties, requests] = await Promise.all([
    listStaff(actor),
    listProperties(actor),
    listRequests(actor),
  ]);
  const propNameById = new Map(properties.map((p) => [p.id, p.name]));

  const fmtMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());

  const cleaningCount = staff.filter((s) =>
    requests.some((r) => r.assigned_staff_id === s.id && r.status === "in_progress"),
  ).length;
  const standby = staff.length - cleaningCount;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900">スタッフ管理</h1>
          <p className="text-[12.5px] text-ink-500 mt-0.5">
            登録スタッフ <span className="num font-bold text-ink-800">{staff.length}</span> 名 · 稼働中{" "}
            <span className="num font-bold text-st-cleaning-text">{cleaningCount}</span> · 待機{" "}
            <span className="num font-bold text-ink-700">{standby}</span>
          </p>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
            <Icon name="UserPlus" size={16} />
          </div>
          <h3 className="text-[14px] font-bold text-ink-900">スタッフを追加</h3>
        </div>
        <StaffForm properties={properties} />
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="bg-ink-50 text-ink-500 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="text-left font-semibold px-5 py-2.5">スタッフ</th>
                <th className="text-left font-semibold px-2 py-2.5">LINE ID</th>
                <th className="text-left font-semibold px-2 py-2.5">担当物件</th>
                <th className="text-left font-semibold px-2 py-2.5">今月対応</th>
                <th className="text-left font-semibold px-2 py-2.5">ステータス</th>
                <th className="text-right font-semibold px-5 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {staff.map((s, i) => {
                const c = AVATAR_COLORS[i % AVATAR_COLORS.length];
                const myReqs = requests.filter((r) => r.assigned_staff_id === s.id);
                const monthCount = myReqs.filter((r) => r.checkin_date.startsWith(fmtMonth)).length;
                const cleaning = myReqs.find((r) => r.status === "in_progress");
                const reported = myReqs.find((r) => r.status === "reported");
                const activeStatus: Status = cleaning
                  ? "cleaning"
                  : reported
                    ? "reported"
                    : "unassigned";
                const activeLabel = cleaning ? "対応中" : reported ? "報告待ち" : "待機";
                return (
                  <tr key={s.id} className="hover:bg-ink-50/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.name.slice(0, 1)} color={c} size={32} />
                        <Link
                          href={`/admin/staff/${s.id}`}
                          className="font-semibold text-ink-900 hover:underline"
                        >
                          {s.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-2 py-3 num text-ink-700">
                      {s.line_user_id ? `@${s.line_user_id}` : <span className="text-ink-400">—</span>}
                    </td>
                    <td className="px-2 py-3">
                      {s.property_ids.length === 0 ? (
                        <Badge tone="warn">未設定</Badge>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {s.property_ids.slice(0, 3).map((pid) => (
                            <span
                              key={pid}
                              className="inline-flex items-center h-5 px-1.5 rounded text-[10.5px] bg-ink-100 text-ink-700"
                            >
                              {propNameById.get(pid) ?? "?"}
                            </span>
                          ))}
                          {s.property_ids.length > 3 && (
                            <span className="text-[10.5px] text-ink-500 self-center">
                              +{s.property_ids.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-3 num font-semibold text-ink-800">{monthCount} 件</td>
                    <td className="px-2 py-3">
                      <StatusBadge status={activeStatus} size="sm">
                        {activeLabel}
                      </StatusBadge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin/staff/${s.id}`}
                        className="text-brand-600 text-[11.5px] font-medium hover:underline whitespace-nowrap"
                      >
                        詳細 →
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-[12.5px] text-ink-500">
                    スタッフはまだ登録されていません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
