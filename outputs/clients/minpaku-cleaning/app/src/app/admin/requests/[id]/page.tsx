import { resolveAdminActor } from "@/lib/supabase-auth";
import { getRequest } from "@/lib/db/requests";
import { getReportForRequest } from "@/lib/db/reports";
import { listProperties } from "@/lib/db/properties";
import { listStaff } from "@/lib/db/staff";
import { getPhotoSignedUrl } from "@/lib/storage";
import { redirect, notFound } from "next/navigation";
import { RequestActions } from "./RequestActions";

const STATUS_LABEL: Record<string, string> = {
  unassigned: "未割当",
  assigned: "割当済み",
  in_progress: "清掃中",
  reported: "報告済み",
  confirmed: "確認済み",
  cancelled: "キャンセル",
};

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await resolveAdminActor();
  if (!actor) redirect("/admin/login");
  const { id } = await params;
  const request = await getRequest(actor, id);
  if (!request) notFound();

  const [properties, staff] = await Promise.all([
    listProperties(actor),
    listStaff(actor),
  ]);
  const propertyName =
    properties.find((p) => p.id === request.property_id)?.name ?? "?";
  const staffName =
    staff.find((s) => s.id === request.assigned_staff_id)?.name ?? null;

  // reported / confirmed なら完了報告と写真を取得し、写真は署名URLにする
  const reportData =
    request.status === "reported" || request.status === "confirmed"
      ? await getReportForRequest(actor, id)
      : null;
  const photoUrls = reportData
    ? await Promise.all(
        reportData.photos.map((p) => getPhotoSignedUrl(p.storage_path)),
      )
    : [];

  return (
    <main className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold">
        {propertyName} / {request.checkin_date}〜{request.checkout_date}
      </h1>
      <dl className="text-sm space-y-1 border rounded p-3">
        <div>ステータス: {STATUS_LABEL[request.status] ?? request.status}</div>
        <div>人数: {request.guest_count}名</div>
        <div>担当スタッフ: {staffName ?? "未割当"}</div>
        {request.option_memo && <div>メモ: {request.option_memo}</div>}
      </dl>

      <RequestActions
        requestId={request.id}
        status={request.status}
        assignedStaffId={request.assigned_staff_id}
        staff={staff}
      />

      {reportData && (
        <section className="space-y-2 border rounded p-3">
          <h2 className="font-bold text-sm">完了報告</h2>
          <ul className="text-sm space-y-1">
            {reportData.report.checklist_result.map((item, i) => (
              <li key={i}>
                {item.checked ? "☑" : "☐"} {item.label}
                {item.note ? ` — ${item.note}` : ""}
              </li>
            ))}
          </ul>
          {photoUrls.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {photoUrls.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={url}
                  alt={`完了写真 ${i + 1}`}
                  className="w-32 h-32 object-cover rounded border"
                />
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
