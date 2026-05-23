import Link from "next/link";
import { resolveAdminActor } from "@/lib/supabase-auth";
import { createServiceClient } from "@/lib/supabase-server";
import { getRequest } from "@/lib/db/requests";
import { getReportForRequest } from "@/lib/db/reports";
import { listProperties } from "@/lib/db/properties";
import { listStaff } from "@/lib/db/staff";
import { getPhotoSignedUrl } from "@/lib/storage";
import { redirect, notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge, type Status } from "@/components/ui/StatusBadge";
import { PropertyPhoto } from "@/components/ui/PropertyPhoto";
import { Avatar } from "@/components/ui/Avatar";
import { KV } from "@/components/ui/KV";
import { Badge } from "@/components/ui/Badge";
import { RequestActions } from "./RequestActions";

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

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await resolveAdminActor();
  if (!actor || actor.role !== "admin") redirect("/admin/login");
  const { id } = await params;
  const request = await getRequest(actor, id);
  if (!request) notFound();

  const [properties, staff] = await Promise.all([listProperties(actor), listStaff(actor)]);
  const propIdx = properties.findIndex((p) => p.id === request.property_id);
  const propertyName = properties[propIdx]?.name ?? "?";
  const staffName = staff.find((s) => s.id === request.assigned_staff_id)?.name ?? null;

  const db = createServiceClient();
  const { data: adjacent } = await db
    .from("cleaning_requests")
    .select("id, checkin_date, checkout_date, status")
    .eq("property_id", request.property_id)
    .neq("id", request.id)
    .neq("status", "cancelled");
  const adjacentRequests = (adjacent ?? []).filter(
    (other) =>
      other.checkin_date === request.checkout_date || other.checkout_date === request.checkin_date,
  );

  const reportData =
    request.status === "reported" || request.status === "confirmed"
      ? await getReportForRequest(actor, id)
      : null;
  const photoUrls = reportData
    ? await Promise.all(reportData.photos.map((p) => getPhotoSignedUrl(p.storage_path)))
    : [];

  // 通知ログ（最新 5 件）
  const { data: notifLogs } = await db
    .from("notifications_log")
    .select("kind, channel, status, sent_at")
    .order("sent_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link
            href="/admin/requests"
            className="inline-flex items-center gap-1 text-[12px] text-ink-500 hover:text-ink-800"
          >
            <Icon name="ArrowLeft" size={12} /> 戻る
          </Link>
          <div className="mt-1 flex items-center gap-3 flex-wrap">
            <h1 className="text-[22px] font-bold text-ink-900">依頼詳細</h1>
            <span className="num text-[14px] text-ink-500 font-semibold">
              #{request.id.slice(0, 8)}
            </span>
            <StatusBadge status={STATUS_MAP[request.status]} />
          </div>
          <p className="text-[12.5px] text-ink-500 mt-1">
            {propertyName} · チェックアウト後清掃 · {request.checkin_date} 開始予定
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Continuous booking warning */}
          {adjacentRequests.length > 0 && (
            <Card className="p-4 ring-1 ring-st-warn-dot/40">
              <div className="flex gap-3">
                <div className="h-9 w-9 rounded-lg bg-st-warn-bg flex items-center justify-center text-st-warn-text shrink-0">
                  <Icon name="TriangleAlert" size={18} />
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-bold text-st-warn-text">連続予約警告</div>
                  <p className="text-[12.5px] text-ink-700 mt-0.5">
                    この物件は前後の日に連続予約があります。割り当て時はスタッフの稼働状況にご注意ください。
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {adjacentRequests.map((a) => (
                      <li
                        key={a.id}
                        className="num text-[12px] text-ink-700 bg-white rounded-lg px-3 py-2 ring-1 ring-ink-100"
                      >
                        {a.checkin_date}〜{a.checkout_date}（{STATUS_MAP[a.status] ?? a.status}）
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {/* Basic info */}
          <Card className="p-5">
            <h3 className="text-[14px] font-bold text-ink-900 mb-4">基本情報</h3>
            <div
              className="grid gap-x-8 gap-y-3"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
            >
              <KV k="物件">
                <div className="flex items-center gap-2">
                  <PropertyPhoto tone={toneOf(propIdx)} size="xs" rounded="rounded-md" />
                  <span className="font-medium">{propertyName}</span>
                </div>
              </KV>
              <KV k="チェックイン">
                <span className="num">{request.checkin_date}</span>
              </KV>
              <KV k="チェックアウト">
                <span className="num">{request.checkout_date}</span>
              </KV>
              <KV k="人数">
                <span className="num">{request.guest_count} 名</span>
              </KV>
              <KV k="ステータス">
                <StatusBadge status={STATUS_MAP[request.status]} />
              </KV>
              <KV k="担当スタッフ">
                {staffName ? (
                  <div className="flex items-center gap-2">
                    <Avatar name={staffName.slice(0, 1)} color="bg-brand-600" size={22} />
                    <span>{staffName}</span>
                  </div>
                ) : (
                  <span className="text-ink-400">未割当</span>
                )}
              </KV>
              {request.option_memo && (
                <KV k="メモ" className="md:col-span-2">
                  {request.option_memo}
                </KV>
              )}
            </div>
          </Card>

          {/* Actions */}
          <Card className="p-5">
            <h3 className="text-[14px] font-bold text-ink-900 mb-3">操作</h3>
            <RequestActions
              requestId={request.id}
              status={request.status}
              assignedStaffId={request.assigned_staff_id}
              staff={staff}
              adjacentRequests={adjacentRequests}
            />
          </Card>

          {/* Completion report */}
          {reportData && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[14px] font-bold text-ink-900">完了報告</h3>
                <Badge tone="success">提出済み</Badge>
              </div>
              <ul className="space-y-2 text-[12.5px]">
                {reportData.report.checklist_result.map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span
                      className={`h-5 w-5 rounded flex items-center justify-center ${
                        item.checked
                          ? "bg-st-confirmed-bg text-st-confirmed-text"
                          : "border-2 border-ink-300"
                      }`}
                    >
                      {item.checked && <Icon name="Check" size={12} strokeWidth={3} />}
                    </span>
                    <span className={item.checked ? "text-ink-700" : "text-ink-500"}>
                      {item.label}
                      {item.note ? ` — ${item.note}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
              {photoUrls.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {photoUrls.map((url, i) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={i}
                      src={url}
                      alt={`完了写真 ${i + 1}`}
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Notification log */}
          <Card className="p-5">
            <h3 className="text-[14px] font-bold text-ink-900 mb-3">通知ログ</h3>
            <ul className="space-y-3 text-[12px]">
              {(notifLogs ?? []).map((l, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className={`h-6 w-6 mt-0.5 rounded-md bg-ink-50 flex items-center justify-center ${
                      l.channel === "line" ? "text-brand-600" : "text-ink-500"
                    }`}
                  >
                    <Icon name={l.channel === "line" ? "MessageCircle" : "Mail"} size={12} />
                  </span>
                  <div className="flex-1 leading-tight min-w-0">
                    <div className="text-ink-800 font-medium truncate">
                      {l.channel === "line" ? "LINE 通知" : "メール送信"} · {l.kind}
                    </div>
                    <div className="num text-[10.5px] text-ink-400">
                      {l.sent_at?.replace("T", " ").slice(0, 16) ?? "—"}
                    </div>
                  </div>
                </li>
              ))}
              {(!notifLogs || notifLogs.length === 0) && (
                <li className="text-[11.5px] text-ink-500 text-center py-3">通知履歴なし</li>
              )}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
