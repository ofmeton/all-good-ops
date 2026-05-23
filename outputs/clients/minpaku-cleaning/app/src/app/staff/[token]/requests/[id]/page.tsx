import Link from "next/link";
import { resolveActorByToken } from "@/lib/auth";
import { getRequestForStaff } from "@/lib/db/requests";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge, type Status } from "@/components/ui/StatusBadge";
import { PropertyPhoto } from "@/components/ui/PropertyPhoto";
import { StaffRequestPanel } from "./StaffRequestPanel";

const STATUS_MAP: Record<string, Status> = {
  unassigned: "unassigned",
  assigned: "assigned",
  in_progress: "cleaning",
  reported: "reported",
  confirmed: "confirmed",
  cancelled: "cancelled",
};

export default async function StaffRequestDetailPage({
  params,
}: {
  params: Promise<{ token: string; id: string }>;
}) {
  const { token, id } = await params;
  const actor = await resolveActorByToken(token);
  if (!actor || actor.role !== "staff") return null;
  const request = await getRequestForStaff(actor, id);
  if (!request) notFound();

  const checklistTemplate = (request.property.checklist_template ?? []) as {
    label: string;
    type?: string;
  }[];
  const uiStatus = STATUS_MAP[request.status] ?? "unassigned";

  return (
    <div className="space-y-4">
      <Link
        href={`/staff/${token}`}
        className="inline-flex items-center gap-1 text-[12px] text-ink-500 hover:text-ink-800"
      >
        <Icon name="ArrowLeft" size={12} /> 一覧へ戻る
      </Link>

      <Card className="overflow-hidden">
        <div className="relative">
          <PropertyPhoto tone="b" size="xl" rounded="rounded-none" className="!h-32" />
          <div className="absolute top-3 left-3">
            <StatusBadge status={uiStatus} />
          </div>
        </div>
        <div className="p-4">
          <h1 className="text-[18px] font-bold text-ink-900">{request.property.name}</h1>
          <div className="num text-[12px] text-ink-600 mt-1 flex items-center gap-1.5 flex-wrap">
            <Icon name="Calendar" size={12} className="text-ink-400" />
            <span>{request.checkin_date}</span>
            <span className="text-ink-400">→</span>
            <span>{request.checkout_date}</span>
            <span className="text-ink-400">·</span>
            <span>{request.guest_count} 名</span>
          </div>
          {request.option_memo && (
            <p className="text-[12px] text-ink-700 mt-2 bg-ink-50 rounded-lg px-3 py-2">
              {request.option_memo}
            </p>
          )}
          {request.property.address && (
            <div className="text-[11.5px] text-ink-500 mt-2 flex items-center gap-1.5">
              <Icon name="MapPin" size={11} className="text-ink-400" />
              {request.property.address}
            </div>
          )}
          {request.property.access_info_note && (
            <Card className="p-3 bg-brand-50/40 ring-1 ring-brand-100 mt-3">
              <div className="flex gap-2.5">
                <Icon name="Info" size={14} className="text-brand-600 mt-0.5 shrink-0" />
                <p className="text-[12px] text-ink-800 leading-relaxed whitespace-pre-wrap">
                  {request.property.access_info_note}
                </p>
              </div>
            </Card>
          )}
        </div>
      </Card>

      <StaffRequestPanel
        token={token}
        requestId={request.id}
        propertyId={request.property_id}
        status={request.status}
        checklistTemplate={checklistTemplate}
      />
    </div>
  );
}
