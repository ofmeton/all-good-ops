import Link from "next/link";
import { resolveAdminActor } from "@/lib/supabase-auth";
import { listProperties } from "@/lib/db/properties";
import { listOwners } from "@/lib/db/owners";
import { listStaff } from "@/lib/db/staff";
import { listRequests } from "@/lib/db/requests";
import { getActiveToken } from "@/lib/db/tokens";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { PropertyPhoto } from "@/components/ui/PropertyPhoto";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { PropertyForm } from "./PropertyForm";
import { TokenControls } from "../TokenControls";

const TONES = ["a", "b", "c", "d", "e", "f"] as const;
const toneOf = (idx: number) => TONES[((idx % TONES.length) + TONES.length) % TONES.length];

const AVATAR_COLORS = [
  "bg-brand-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-rose-500",
  "bg-amber-500",
] as const;

export default async function PropertiesPage() {
  const actor = await resolveAdminActor();
  if (!actor || actor.role !== "admin") redirect("/admin/login");
  const [properties, owners, staff, requests] = await Promise.all([
    listProperties(actor),
    listOwners(actor),
    listStaff(actor),
    listRequests(actor),
  ]);
  const tokens = await Promise.all(
    properties.map((p) => getActiveToken(actor, { type: "owner", propertyId: p.id })),
  );
  const ownerById = new Map(owners.map((o) => [o.id, o]));
  const staffIdxById = new Map(staff.map((s, i) => [s.id, i]));

  // 今月の依頼数 (property別)
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  });
  const thisMonth = fmt.format(new Date());
  const monthCountByProp = new Map<string, number>();
  for (const r of requests) {
    if (r.checkin_date.startsWith(thisMonth)) {
      monthCountByProp.set(r.property_id, (monthCountByProp.get(r.property_id) ?? 0) + 1);
    }
  }

  // 次回清掃 (property別)
  const todayStr = fmt
    .format(new Date())
    .concat("-01"); // we'll use checkin_date >= today comparison
  const nowJST = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const nextByProp = new Map<string, string>();
  for (const r of requests) {
    if (r.status === "cancelled") continue;
    if (r.checkin_date < nowJST) continue;
    const prev = nextByProp.get(r.property_id);
    if (!prev || r.checkin_date < prev) nextByProp.set(r.property_id, r.checkin_date);
  }

  const total = properties.length;
  const noStaffCount = properties.filter(
    (p) => !staff.some((s) => s.property_ids.includes(p.id)),
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900">物件管理</h1>
          <p className="text-[12.5px] text-ink-500 mt-0.5">
            登録物件 <span className="num font-bold text-ink-800">{total}</span> 件 · 担当未設定{" "}
            <span className="num font-bold text-st-warn-text">{noStaffCount}</span>
          </p>
        </div>
      </div>

      {owners.length === 0 ? (
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <Icon name="Info" size={18} className="text-ink-500" />
            <p className="text-[13px] text-ink-700">
              先にオーナーを登録してください。{" "}
              <Link href="/admin/owners" className="text-brand-600 font-medium hover:underline">
                オーナー管理 →
              </Link>
            </p>
          </div>
        </Card>
      ) : (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
              <Icon name="Plus" size={16} />
            </div>
            <h3 className="text-[14px] font-bold text-ink-900">新規物件を追加</h3>
          </div>
          <PropertyForm owners={owners} />
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {properties.map((p, i) => {
          const assignedStaff = staff.filter((s) => s.property_ids.includes(p.id));
          const monthCount = monthCountByProp.get(p.id) ?? 0;
          const next = nextByProp.get(p.id);
          const owner = ownerById.get(p.owner_id);
          const tok = tokens[i];
          const tone = toneOf(i);
          return (
            <Card key={p.id} className="overflow-hidden">
              <div className="relative">
                <Link href={`/admin/properties/${p.id}`}>
                  <PropertyPhoto tone={tone} size="xl" rounded="rounded-none" />
                </Link>
                {assignedStaff.length === 0 && (
                  <div className="absolute top-3 left-3">
                    <Badge tone="warn">担当未設定</Badge>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/properties/${p.id}`}
                      className="text-[15px] font-bold text-ink-900 hover:underline truncate block"
                    >
                      {p.name}
                    </Link>
                    {p.address && (
                      <p className="text-[11.5px] text-ink-500 mt-0.5 truncate">{p.address}</p>
                    )}
                  </div>
                  {owner && <Badge tone="neutral">{owner.name}</Badge>}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-[10.5px] text-ink-500">担当</div>
                    {assignedStaff.length > 0 ? (
                      <div className="flex -space-x-1.5">
                        {assignedStaff.slice(0, 3).map((s) => {
                          const c =
                            AVATAR_COLORS[
                              (staffIdxById.get(s.id) ?? 0) % AVATAR_COLORS.length
                            ];
                          return (
                            <Avatar
                              key={s.id}
                              name={s.name.slice(0, 1)}
                              color={c}
                              size={22}
                              className="ring-2 ring-white"
                            />
                          );
                        })}
                        {assignedStaff.length > 3 && (
                          <span className="ml-2 num text-[10.5px] text-ink-500 self-center">
                            +{assignedStaff.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11.5px] text-st-warn-text font-medium">未設定</span>
                    )}
                  </div>
                  <div className="num text-[11px] text-ink-500">
                    今月 <span className="font-bold text-ink-800">{monthCount}</span> 件
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 text-[11.5px] text-ink-600 bg-ink-50 rounded-lg px-3 py-2">
                  <Icon name="CalendarClock" size={12} className="text-ink-500" />
                  <span className="text-ink-500">次回清掃:</span>
                  <span className="num font-semibold text-ink-800">{next ?? "未設定"}</span>
                </div>

                <div className="mt-3">
                  <TokenControls
                    target={{ type: "owner", propertyId: p.id }}
                    activeToken={tok ? { id: tok.id, token: tok.token } : null}
                    basePath="property"
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {properties.length === 0 && (
        <Card className="p-10 text-center">
          <Icon name="Building2" size={32} className="text-ink-400 mx-auto" />
          <p className="text-[13px] text-ink-500 mt-2">物件はまだ登録されていません。</p>
        </Card>
      )}
    </div>
  );
}
