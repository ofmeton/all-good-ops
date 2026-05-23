import Link from "next/link";
import { resolveAdminActor } from "@/lib/supabase-auth";
import { listRequests } from "@/lib/db/requests";
import { listProperties } from "@/lib/db/properties";
import { listStaff } from "@/lib/db/staff";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge, type Status } from "@/components/ui/StatusBadge";
import { PropertyPhoto } from "@/components/ui/PropertyPhoto";
import { Avatar } from "@/components/ui/Avatar";
import { RequestForm } from "./RequestForm";

const STATUS_MAP: Record<string, Status> = {
  unassigned: "unassigned",
  assigned: "assigned",
  in_progress: "cleaning",
  reported: "reported",
  confirmed: "confirmed",
  cancelled: "cancelled",
};
const TONES = ["a", "b", "c", "d", "e", "f"] as const;
const toneOf = (idx: number) => TONES[((idx % TONES.length) + TONES.length) % TONES.length];

export default async function RequestsPage() {
  const actor = await resolveAdminActor();
  if (!actor || actor.role !== "admin") redirect("/admin/login");
  const [requests, properties, staff] = await Promise.all([
    listRequests(actor),
    listProperties(actor),
    listStaff(actor),
  ]);
  const propIdxById = new Map(properties.map((p, i) => [p.id, i]));
  const propNameById = new Map(properties.map((p) => [p.id, p.name]));
  const staffById = new Map(staff.map((s) => [s.id, s]));

  const totalCount = requests.length;
  const unassigned = requests.filter((r) => r.status === "unassigned").length;
  const reported = requests.filter((r) => r.status === "reported").length;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900">依頼一覧</h1>
          <p className="text-[12.5px] text-ink-500 mt-0.5">
            合計 <span className="num font-bold text-ink-800">{totalCount}</span> 件 · 未割当{" "}
            <span className="num font-bold text-st-unassigned-text">{unassigned}</span> 件 · 報告待ち{" "}
            <span className="num font-bold text-st-reported-text">{reported}</span> 件
          </p>
        </div>
      </div>

      {properties.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
              <Icon name="Plus" size={16} />
            </div>
            <h3 className="text-[14px] font-bold text-ink-900">新規依頼を作成</h3>
          </div>
          <RequestForm properties={properties} />
        </Card>
      )}
      {properties.length === 0 && (
        <Card className="p-5">
          <p className="text-[13px] text-ink-500">先に物件を登録してください。</p>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="bg-ink-50 text-ink-500 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="text-left font-semibold px-5 py-2.5">ID</th>
                <th className="text-left font-semibold px-2 py-2.5">物件</th>
                <th className="text-left font-semibold px-2 py-2.5">予定日</th>
                <th className="text-left font-semibold px-2 py-2.5">ステータス</th>
                <th className="text-left font-semibold px-2 py-2.5">担当スタッフ</th>
                <th className="text-left font-semibold px-2 py-2.5">人数</th>
                <th className="text-right font-semibold px-5 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {requests.map((r) => {
                const idx = propIdxById.get(r.property_id) ?? 0;
                const propName = propNameById.get(r.property_id) ?? "?";
                const s = r.assigned_staff_id ? staffById.get(r.assigned_staff_id) ?? null : null;
                return (
                  <tr key={r.id} className="hover:bg-ink-50/50">
                    <td className="px-5 py-3 num font-semibold text-ink-800">
                      <Link href={`/admin/requests/${r.id}`} className="hover:underline">
                        #{r.id.slice(0, 6)}
                      </Link>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2.5">
                        <PropertyPhoto tone={toneOf(idx)} size="xs" rounded="rounded-md" />
                        <span className="text-ink-800">{propName}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3 num text-ink-700">
                      {r.checkin_date}〜{r.checkout_date}
                    </td>
                    <td className="px-2 py-3">
                      <StatusBadge status={STATUS_MAP[r.status]} size="sm" />
                    </td>
                    <td className="px-2 py-3">
                      {s ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={s.name.slice(0, 1)} color="bg-brand-600" size={22} />
                          <span className="text-ink-700">{s.name}</span>
                        </div>
                      ) : (
                        <span className="text-ink-400">—</span>
                      )}
                    </td>
                    <td className="px-2 py-3 num text-ink-700">{r.guest_count}名</td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin/requests/${r.id}`}
                        className="text-brand-600 text-[11.5px] font-medium hover:underline whitespace-nowrap"
                      >
                        詳細 →
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-[12.5px] text-ink-500">
                    依頼はまだありません。
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
