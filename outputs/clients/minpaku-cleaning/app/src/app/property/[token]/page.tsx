import { resolveActorByToken } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase-server";
import { getPhotoSignedUrl } from "@/lib/storage";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge, type Status } from "@/components/ui/StatusBadge";
import { PropertyPhoto } from "@/components/ui/PropertyPhoto";
import { Badge } from "@/components/ui/Badge";

const STATUS_MAP: Record<string, Status> = {
  unassigned: "unassigned",
  assigned: "assigned",
  in_progress: "cleaning",
  reported: "reported",
  confirmed: "confirmed",
  cancelled: "cancelled",
};

export default async function OwnerPropertyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: _token } = await params;
  const actor = await resolveActorByToken(_token);
  if (!actor || actor.role !== "owner") return null;

  const db = createServiceClient();
  const propertyId = actor.propertyId;

  const { data: property } = await db
    .from("properties")
    .select("id, name, address, access_info_note")
    .eq("id", propertyId)
    .maybeSingle();
  if (!property) notFound();

  const { data: requests } = await db
    .from("cleaning_requests")
    .select("*")
    .eq("property_id", propertyId)
    .order("checkin_date", { ascending: false });
  const list = requests ?? [];

  // 集計
  const fmtMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  const monthCount = list.filter((r) => r.checkin_date.startsWith(fmtMonth)).length;
  const reportedCount = list.filter((r) => r.status === "reported").length;
  const confirmedCount = list.filter((r) => r.status === "confirmed").length;
  const totalRecent = list.length;

  // reported/confirmed の完了報告と写真
  const reportedIds = list
    .filter((r) => r.status === "reported" || r.status === "confirmed")
    .map((r) => r.id);
  type ReportRow = {
    id: string;
    request_id: string;
    checklist_result: { label: string; checked: boolean; note?: string }[];
    submitted_at: string;
  };
  const reportsByRequest = new Map<
    string,
    {
      report: ReportRow;
      photoUrls: string[];
    }
  >();
  if (reportedIds.length > 0) {
    const { data: reports } = await db
      .from("cleaning_reports")
      .select("id, request_id, checklist_result, submitted_at")
      .in("request_id", reportedIds);
    const reportList = (reports ?? []) as ReportRow[];
    for (const r of reportList) {
      const { data: photos } = await db
        .from("report_photos")
        .select("storage_path")
        .eq("report_id", r.id);
      const photoUrls = await Promise.all(
        ((photos ?? []) as { storage_path: string }[]).map((p) =>
          getPhotoSignedUrl(p.storage_path),
        ),
      );
      reportsByRequest.set(r.request_id, { report: r, photoUrls });
    }
  }

  // 備品補充
  const { data: supplies } = await db
    .from("supply_requests")
    .select("id, items, created_at")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Aside: property summary */}
      <aside className="space-y-4">
        <PropertyPhoto tone="b" size="xl" rounded="rounded-2xl" />
        <div>
          <Badge tone="brand">所有物件</Badge>
          <h1 className="mt-2 text-[22px] font-bold text-ink-900">{property.name}</h1>
          {property.address && (
            <div className="mt-1 text-[12.5px] text-ink-500 flex items-center gap-1.5">
              <Icon name="MapPin" size={13} />
              {property.address}
            </div>
          )}
        </div>

        {property.access_info_note && (
          <Card className="p-4">
            <div className="text-[11px] text-ink-500 font-semibold uppercase tracking-wider mb-2">
              アクセス情報・備考
            </div>
            <p className="text-[12.5px] text-ink-700 whitespace-pre-wrap leading-relaxed">
              {property.access_info_note}
            </p>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          {[
            { l: "今月の清掃", v: monthCount, icon: "Sparkles" as const, a: "text-brand-600" },
            {
              l: "確認待ち",
              v: reportedCount,
              icon: "Clock" as const,
              a: "text-st-reported-text",
            },
            {
              l: "確認済み",
              v: confirmedCount,
              icon: "CircleCheckBig" as const,
              a: "text-st-confirmed-text",
            },
            { l: "履歴総数", v: totalRecent, icon: "History" as const, a: "text-ink-500" },
          ].map((s) => (
            <Card key={s.l} className="p-3">
              <div className={s.a}>
                <Icon name={s.icon} size={14} />
              </div>
              <div className="num text-[20px] font-extrabold text-ink-900 leading-none mt-1">
                {s.v}
              </div>
              <div className="text-[10.5px] text-ink-500 mt-1">{s.l}</div>
            </Card>
          ))}
        </div>
      </aside>

      {/* Main: history */}
      <section className="lg:col-span-2 space-y-4">
        <div>
          <h2 className="text-[16px] font-bold text-ink-900">清掃履歴</h2>
          <p className="text-[11.5px] text-ink-500 mt-0.5">
            完了済みの依頼にはチェックリストと写真が表示されます。
          </p>
        </div>

        {list.length === 0 ? (
          <Card className="p-10 text-center">
            <Icon name="History" size={32} className="text-ink-400 mx-auto" />
            <p className="text-[13px] text-ink-500 mt-2">清掃履歴はまだありません。</p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {list.map((r) => {
              const rep = reportsByRequest.get(r.id);
              return (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="num text-[13.5px] font-semibold text-ink-800">
                        {r.checkin_date}〜{r.checkout_date}
                      </div>
                      <div className="num text-[11.5px] text-ink-500">{r.guest_count} 名</div>
                    </div>
                    <StatusBadge status={STATUS_MAP[r.status as string] ?? "unassigned"} />
                  </div>
                  {rep && (
                    <div className="mt-4 space-y-3">
                      <div>
                        <div className="text-[11px] text-ink-500 font-semibold uppercase tracking-wider mb-2">
                          チェックリスト
                        </div>
                        <ul className="space-y-1.5">
                          {rep.report.checklist_result.map((item, i) => (
                            <li
                              key={i}
                              className="flex items-center gap-3 text-[12.5px] text-ink-700"
                            >
                              <span
                                className={`h-5 w-5 rounded-md flex items-center justify-center shrink-0 ${
                                  item.checked
                                    ? "bg-st-confirmed-bg text-st-confirmed-text"
                                    : "border-2 border-ink-300"
                                }`}
                              >
                                {item.checked && <Icon name="Check" size={12} strokeWidth={3} />}
                              </span>
                              <span>
                                {item.label}
                                {item.note ? ` — ${item.note}` : ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {rep.photoUrls.length > 0 && (
                        <div>
                          <div className="text-[11px] text-ink-500 font-semibold uppercase tracking-wider mb-2">
                            完了写真（{rep.photoUrls.length} 枚）
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {rep.photoUrls.map((url, i) => (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                key={i}
                                src={url}
                                alt={`完了写真 ${i + 1}`}
                                className="w-full aspect-square object-cover rounded-lg"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </ul>
        )}

        {/* Supplies history */}
        <div className="pt-4">
          <h2 className="text-[16px] font-bold text-ink-900 mb-3">備品補充の履歴</h2>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead className="bg-ink-50 text-ink-500 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="text-left font-semibold px-4 py-2.5">日付</th>
                    <th className="text-left font-semibold px-2 py-2.5">品目</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {(supplies ?? []).map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-3 num text-ink-700 whitespace-nowrap">
                        {new Date(s.created_at).toLocaleDateString("ja-JP", {
                          timeZone: "Asia/Tokyo",
                        })}
                      </td>
                      <td className="px-2 py-3 text-ink-800">{s.items}</td>
                    </tr>
                  ))}
                  {(supplies ?? []).length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-4 py-6 text-center text-[12px] text-ink-500">
                        備品補充依頼の履歴はまだありません。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
