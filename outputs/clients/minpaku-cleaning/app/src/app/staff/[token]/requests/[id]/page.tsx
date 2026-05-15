import { resolveActorByToken } from "@/lib/auth";
import { getRequestForStaff } from "@/lib/db/requests";
import { notFound } from "next/navigation";
import { StaffRequestPanel } from "./StaffRequestPanel";

const STATUS_LABEL: Record<string, string> = {
  unassigned: "未割当",
  assigned: "割当済み",
  in_progress: "清掃中",
  reported: "報告済み",
  confirmed: "確認済み",
  cancelled: "キャンセル",
};

export default async function StaffRequestDetailPage({
  params,
}: {
  params: Promise<{ token: string; id: string }>;
}) {
  const { token, id } = await params;
  const actor = await resolveActorByToken(token);
  if (!actor || actor.role !== "staff") return null; // layout がガード済み
  const request = await getRequestForStaff(actor, id);
  if (!request) notFound();

  const checklistTemplate = (request.property.checklist_template ??
    []) as { label: string; type?: string }[];

  return (
    <main className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold">
        {request.property.name} / {request.checkin_date}〜
        {request.checkout_date}
      </h1>
      <dl className="text-sm space-y-1 border rounded p-3">
        <div>
          ステータス: {STATUS_LABEL[request.status] ?? request.status}
        </div>
        <div>人数: {request.guest_count}名</div>
        {request.option_memo && <div>メモ: {request.option_memo}</div>}
      </dl>
      <StaffRequestPanel
        token={token}
        requestId={request.id}
        propertyId={request.property_id}
        status={request.status}
        checklistTemplate={checklistTemplate}
      />
    </main>
  );
}
