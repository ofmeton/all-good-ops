import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { resolveAdminActor } from "@/lib/supabase-auth";
import { getProperty } from "@/lib/db/properties";
import { listProperties } from "@/lib/db/properties";
import { listOwners } from "@/lib/db/owners";
import { listStaff } from "@/lib/db/staff";
import { listRequests } from "@/lib/db/requests";
import { getActiveToken } from "@/lib/db/tokens";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge, type Status } from "@/components/ui/StatusBadge";
import { PropertyPhoto } from "@/components/ui/PropertyPhoto";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { TokenControls } from "../../TokenControls";
import { EditPropertyForm } from "./EditPropertyForm";

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

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await resolveAdminActor();
  if (!actor || actor.role !== "admin") redirect("/admin/login");
  const { id } = await params;
  const [property, properties, owners, allStaff, requests] = await Promise.all([
    getProperty(actor, id),
    listProperties(actor),
    listOwners(actor),
    listStaff(actor),
    listRequests(actor),
  ]);
  if (!property) notFound();
  const propIdx = properties.findIndex((p) => p.id === id);
  const tone = toneOf(propIdx >= 0 ? propIdx : 0);
  const owner = owners.find((o) => o.id === property.owner_id);
  const assignedStaff = allStaff.filter((s) => s.property_ids.includes(id));
  const token = await getActiveToken(actor, { type: "owner", propertyId: id });

  const propRequests = requests.filter((r) => r.property_id === id);
  const fmtMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  const monthCount = propRequests.filter((r) => r.checkin_date.startsWith(fmtMonth)).length;
  const unassigned = propRequests.filter((r) => r.status === "unassigned").length;
  const reportedCount = propRequests.filter((r) => r.status === "reported").length;
  const cleaningCount = propRequests.filter((r) => r.status === "in_progress").length;

  // 直近清掃履歴 5件
  const history = [...propRequests]
    .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date))
    .slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Hero header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:items-end">
        <div className="lg:col-span-2 flex items-center gap-5">
          <PropertyPhoto tone={tone} size="xl" rounded="rounded-2xl" className="!h-24 !w-32" />
          <div className="min-w-0">
            <Link
              href="/admin/properties"
              className="inline-flex items-center gap-1 text-[12px] text-ink-500 hover:text-ink-800"
            >
              <Icon name="ArrowLeft" size={12} /> 物件一覧に戻る
            </Link>
            <div className="mt-1 flex items-center gap-3 flex-wrap">
              <h1 className="text-[22px] font-bold text-ink-900 truncate">{property.name}</h1>
              {assignedStaff.length > 0 ? (
                <Badge tone="success">稼働中</Badge>
              ) : (
                <Badge tone="warn">担当未設定</Badge>
              )}
            </div>
            <p className="text-[12.5px] text-ink-500 mt-1 flex items-center gap-1.5 flex-wrap">
              {property.address && (
                <>
                  <Icon name="MapPin" size={13} />
                  {property.address}
                </>
              )}
              {owner && (
                <>
                  <span>·</span>
                  <span>
                    オーナー <span className="font-semibold text-ink-700">{owner.name}</span>
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: basic info + history */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <h3 className="text-[14px] font-bold text-ink-900 mb-4">基本情報</h3>
            <EditPropertyForm property={property} owners={owners} />
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-bold text-ink-900">清掃履歴</h3>
              <Link
                href="/admin/requests"
                className="text-[11.5px] text-brand-600 font-medium hover:underline"
              >
                すべて見る →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead className="text-ink-500 text-[11px] uppercase tracking-wider border-b border-ink-100">
                  <tr>
                    <th className="text-left font-semibold py-2">日付</th>
                    <th className="text-left font-semibold py-2">ステータス</th>
                    <th className="text-left font-semibold py-2">担当</th>
                    <th className="text-left font-semibold py-2">人数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {history.map((r) => {
                    const s = r.assigned_staff_id
                      ? allStaff.find((x) => x.id === r.assigned_staff_id) ?? null
                      : null;
                    return (
                      <tr key={r.id}>
                        <td className="py-3 num text-ink-700">
                          <Link href={`/admin/requests/${r.id}`} className="hover:underline">
                            {r.checkin_date}〜{r.checkout_date}
                          </Link>
                        </td>
                        <td className="py-3">
                          <StatusBadge status={STATUS_MAP[r.status]} size="sm" />
                        </td>
                        <td className="py-3">
                          {s ? (
                            <div className="flex items-center gap-2">
                              <Avatar name={s.name.slice(0, 1)} color="bg-brand-600" size={22} />
                              <span className="text-ink-700">{s.name}</span>
                            </div>
                          ) : (
                            <span className="text-ink-400">—</span>
                          )}
                        </td>
                        <td className="py-3 num text-ink-700">{r.guest_count}名</td>
                      </tr>
                    );
                  })}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-[12px] text-ink-500">
                        清掃履歴はまだありません。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-bold text-ink-900">
                担当スタッフ ({assignedStaff.length})
              </h3>
            </div>
            {assignedStaff.length === 0 ? (
              <p className="text-[12px] text-ink-500">
                担当スタッフは未割当です。スタッフ詳細ページからこの物件にチェックを入れてください。
              </p>
            ) : (
              <ul className="space-y-2">
                {assignedStaff.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg ring-1 ring-ink-100"
                  >
                    <Avatar name={s.name.slice(0, 1)} color="bg-brand-600" size={32} />
                    <div className="flex-1 leading-tight min-w-0">
                      <Link
                        href={`/admin/staff/${s.id}`}
                        className="text-[12.5px] font-semibold text-ink-800 hover:underline block truncate"
                      >
                        {s.name}
                      </Link>
                      {s.email && (
                        <div className="text-[10.5px] text-ink-500 truncate">{s.email}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="text-[14px] font-bold text-ink-900 mb-3">オーナー閲覧 URL</h3>
            <TokenControls
              target={{ type: "owner", propertyId: id }}
              activeToken={token ? { id: token.id, token: token.token } : null}
              basePath="property"
            />
          </Card>

          <Card className="p-5">
            <h3 className="text-[14px] font-bold text-ink-900 mb-3">サマリ</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  l: "今月の依頼",
                  v: monthCount,
                  a: "text-brand-600",
                  i: "ClipboardList" as const,
                },
                { l: "未割当", v: unassigned, a: "text-ink-500", i: "UserX" as const },
                {
                  l: "報告待ち",
                  v: reportedCount,
                  a: "text-st-reported-text",
                  i: "FileCheck" as const,
                },
                {
                  l: "清掃中",
                  v: cleaningCount,
                  a: "text-st-cleaning-text",
                  i: "Sparkles" as const,
                },
              ].map((s) => (
                <div key={s.l} className="p-3 rounded-lg ring-1 ring-ink-100">
                  <div className={s.a}>
                    <Icon name={s.i} size={14} />
                  </div>
                  <div className="num text-[20px] font-extrabold text-ink-900 mt-1 leading-none">
                    {s.v}
                  </div>
                  <div className="text-[10.5px] text-ink-500 mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
