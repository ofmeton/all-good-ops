import Link from "next/link";
import { resolveAdminActor } from "@/lib/supabase-auth";
import { listOwners } from "@/lib/db/owners";
import { listProperties } from "@/lib/db/properties";
import { listRequests } from "@/lib/db/requests";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { PropertyPhoto } from "@/components/ui/PropertyPhoto";
import { Badge } from "@/components/ui/Badge";
import { OwnerForm } from "./OwnerForm";

const TONES = ["a", "b", "c", "d", "e", "f"] as const;
const toneOf = (idx: number) => TONES[((idx % TONES.length) + TONES.length) % TONES.length];
const AVATAR_COLORS = [
  "bg-ink-700",
  "bg-blue-700",
  "bg-emerald-700",
  "bg-violet-700",
  "bg-amber-700",
] as const;

export default async function OwnersPage() {
  const actor = await resolveAdminActor();
  if (!actor || actor.role !== "admin") redirect("/admin/login");
  const [owners, properties, requests] = await Promise.all([
    listOwners(actor),
    listProperties(actor),
    listRequests(actor),
  ]);
  const propIdxById = new Map(properties.map((p, i) => [p.id, i]));
  const fmtMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());

  const totalProps = properties.length;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900">オーナー管理</h1>
          <p className="text-[12.5px] text-ink-500 mt-0.5">
            登録オーナー <span className="num font-bold text-ink-800">{owners.length}</span> 名 ·
            合計所有物件 <span className="num font-bold text-ink-800">{totalProps}</span> 件
          </p>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
            <Icon name="UserPlus" size={16} />
          </div>
          <h3 className="text-[14px] font-bold text-ink-900">オーナーを追加</h3>
        </div>
        <OwnerForm />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {owners.map((o, i) => {
          const myProps = properties.filter((p) => p.owner_id === o.id);
          const myReqs = requests.filter((r) =>
            myProps.some((p) => p.id === r.property_id) && r.checkin_date.startsWith(fmtMonth),
          );
          const c = AVATAR_COLORS[i % AVATAR_COLORS.length];
          return (
            <Card key={o.id} className="p-5">
              <div className="flex items-start gap-4">
                <Avatar name={o.name.slice(0, 1)} color={c} size={48} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[15px] font-bold text-ink-900 truncate">{o.name}</h3>
                  </div>
                  {o.email && (
                    <div className="text-[11.5px] text-ink-500 num mt-0.5 flex items-center gap-1.5">
                      <Icon name="Mail" size={11} />
                      <span className="truncate">{o.email}</span>
                    </div>
                  )}

                  <div className="mt-3">
                    <div className="text-[10.5px] text-ink-500 mb-1.5">
                      所有物件 ({myProps.length})
                    </div>
                    {myProps.length === 0 ? (
                      <Badge tone="warn">所有物件なし</Badge>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {myProps.map((p) => {
                          const pIdx = propIdxById.get(p.id) ?? 0;
                          return (
                            <Link
                              key={p.id}
                              href={`/admin/properties/${p.id}`}
                              className="inline-flex items-center gap-1.5 h-7 pl-1 pr-2.5 rounded-full ring-1 ring-ink-200 bg-white text-[11.5px] text-ink-700 hover:bg-ink-50"
                            >
                              <PropertyPhoto
                                tone={toneOf(pIdx)}
                                size="xs"
                                rounded="rounded-full"
                                className="!h-5 !w-5"
                              />
                              {p.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between text-[11px]">
                    <span className="text-ink-500">
                      今月清掃 <span className="num font-bold text-ink-800">{myReqs.length}</span> 件
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {owners.length === 0 && (
        <Card className="p-10 text-center">
          <Icon name="IdCard" size={32} className="text-ink-400 mx-auto" />
          <p className="text-[13px] text-ink-500 mt-2">オーナーはまだ登録されていません。</p>
        </Card>
      )}
    </div>
  );
}
