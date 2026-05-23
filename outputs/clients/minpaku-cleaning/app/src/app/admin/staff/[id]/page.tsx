import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { resolveAdminActor } from "@/lib/supabase-auth";
import { getStaff } from "@/lib/db/staff";
import { listStaff } from "@/lib/db/staff";
import { listProperties } from "@/lib/db/properties";
import { listRequests } from "@/lib/db/requests";
import { getActiveToken } from "@/lib/db/tokens";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge, type Status } from "@/components/ui/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { PropertyPhoto } from "@/components/ui/PropertyPhoto";
import { Badge } from "@/components/ui/Badge";
import { TokenControls } from "../../TokenControls";
import { EditStaffForm } from "./EditStaffForm";

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
const AVATAR_COLORS = [
  "bg-brand-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-rose-500",
  "bg-amber-500",
] as const;

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await resolveAdminActor();
  if (!actor || actor.role !== "admin") redirect("/admin/login");
  const { id } = await params;
  const [staff, allStaff, properties, requests] = await Promise.all([
    getStaff(actor, id),
    listStaff(actor),
    listProperties(actor),
    listRequests(actor),
  ]);
  if (!staff) notFound();
  const token = await getActiveToken(actor, { type: "staff", staffId: id });
  const idx = allStaff.findIndex((s) => s.id === id);
  const c = AVATAR_COLORS[(idx >= 0 ? idx : 0) % AVATAR_COLORS.length];
  const propIdxById = new Map(properties.map((p, i) => [p.id, i]));

  const myReqs = requests.filter((r) => r.assigned_staff_id === id);
  const fmtMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  const monthCount = myReqs.filter((r) => r.checkin_date.startsWith(fmtMonth)).length;
  const cleaning = myReqs.find((r) => r.status === "in_progress");
  const reported = myReqs.find((r) => r.status === "reported");
  const confirmedCount = myReqs.filter((r) => r.status === "confirmed").length;
  const activeStatus: Status = cleaning ? "cleaning" : reported ? "reported" : "unassigned";
  const activeLabel = cleaning ? "対応中" : reported ? "報告待ち" : "待機";

  const assignedProps = properties.filter((p) => staff.property_ids.includes(p.id));
  const history = [...myReqs]
    .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date))
    .slice(0, 6);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div className="flex items-center gap-5">
          <Avatar name={staff.name.slice(0, 1)} color={c} size={72} />
          <div>
            <Link
              href="/admin/staff"
              className="inline-flex items-center gap-1 text-[12px] text-ink-500 hover:text-ink-800"
            >
              <Icon name="ArrowLeft" size={12} /> スタッフ一覧に戻る
            </Link>
            <div className="mt-1 flex items-center gap-3 flex-wrap">
              <h1 className="text-[22px] font-bold text-ink-900">{staff.name}</h1>
              <StatusBadge status={activeStatus} size="md">
                {activeLabel}
              </StatusBadge>
            </div>
            <p className="text-[12.5px] text-ink-500 mt-1 num">
              担当物件 {staff.property_ids.length} 件 · 今月対応 {monthCount} 件
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <h3 className="text-[14px] font-bold text-ink-900 mb-4">基本情報</h3>
            <EditStaffForm staff={staff} properties={properties} />
          </Card>

          <Card className="p-5">
            <h3 className="text-[14px] font-bold text-ink-900 mb-4">活動履歴</h3>
            {history.length === 0 ? (
              <p className="text-[12px] text-ink-500 text-center py-6">活動履歴はまだありません。</p>
            ) : (
              <ul className="space-y-3">
                {history.map((r) => {
                  const pIdx = propIdxById.get(r.property_id) ?? 0;
                  const propName = properties.find((p) => p.id === r.property_id)?.name ?? "?";
                  return (
                    <li
                      key={r.id}
                      className="flex items-center gap-3 py-1 border-b border-ink-100 last:border-0 flex-wrap"
                    >
                      <div className="num text-[11px] text-ink-500 w-24">{r.checkin_date}</div>
                      <StatusBadge status={STATUS_MAP[r.status]} size="sm" />
                      <Link
                        href={`/admin/requests/${r.id}`}
                        className="text-[12.5px] text-ink-700 font-medium flex-1 hover:underline"
                      >
                        依頼を開く
                      </Link>
                      <div className="flex items-center gap-2">
                        <PropertyPhoto tone={toneOf(pIdx)} size="xs" rounded="rounded-md" />
                        <span className="text-[12px] text-ink-700">{propName}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-[14px] font-bold text-ink-900 mb-3">スタッフ用 URL</h3>
            <TokenControls
              target={{ type: "staff", staffId: id }}
              activeToken={token ? { id: token.id, token: token.token } : null}
              basePath="staff"
            />
            <p className="text-[10.5px] text-ink-500 mt-2">
              この URL でログインレス・トークンアクセスできます。
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-bold text-ink-900">
                担当物件 ({assignedProps.length})
              </h3>
            </div>
            {assignedProps.length === 0 ? (
              <p className="text-[12px] text-ink-500">
                担当物件は未設定です。下のフォームから物件にチェックを入れて保存してください。
              </p>
            ) : (
              <ul className="space-y-2">
                {assignedProps.map((p) => {
                  const pIdx = propIdxById.get(p.id) ?? 0;
                  return (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg ring-1 ring-ink-100"
                    >
                      <PropertyPhoto tone={toneOf(pIdx)} size="sm" rounded="rounded-md" />
                      <div className="flex-1 leading-tight min-w-0">
                        <Link
                          href={`/admin/properties/${p.id}`}
                          className="text-[12.5px] font-semibold text-ink-800 hover:underline truncate block"
                        >
                          {p.name}
                        </Link>
                        {p.address && (
                          <div className="text-[10.5px] text-ink-500 truncate">{p.address}</div>
                        )}
                      </div>
                      <Badge tone="neutral">担当</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="text-[14px] font-bold text-ink-900 mb-3">今月の実績</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  l: "対応件数",
                  v: monthCount,
                  a: "text-brand-600",
                  i: "ClipboardCheck" as const,
                },
                {
                  l: "進行中",
                  v: cleaning ? 1 : 0,
                  a: "text-st-cleaning-text",
                  i: "Clock" as const,
                },
                {
                  l: "完了確認済み",
                  v: confirmedCount,
                  a: "text-st-confirmed-text",
                  i: "CircleCheckBig" as const,
                },
                {
                  l: "報告待ち",
                  v: reported ? 1 : 0,
                  a: "text-st-reported-text",
                  i: "FileCheck" as const,
                },
              ].map((s) => (
                <div key={s.l} className="p-3 rounded-lg ring-1 ring-ink-100">
                  <div className={s.a}>
                    <Icon name={s.i} size={14} />
                  </div>
                  <div className="num text-[18px] font-extrabold text-ink-900 mt-1 leading-none">
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
