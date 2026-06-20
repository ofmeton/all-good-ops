import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveActorByToken } from "@/lib/auth";
import { getRequestForStaff } from "@/lib/db/requests";
import { getResponseForStaff } from "@/lib/db/responses";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { PropertyPhoto } from "@/components/ui/PropertyPhoto";
import { RespondPanel } from "./RespondPanel";

export default async function RespondPage({
  params,
}: {
  params: Promise<{ token: string; requestId: string }>;
}) {
  const { token, requestId } = await params;
  const actor = await resolveActorByToken(token);
  if (!actor || actor.role !== "staff") return null;
  const request = await getRequestForStaff(actor, requestId);
  if (!request) notFound();
  const response = await getResponseForStaff(actor, requestId);

  return (
    <div className="space-y-4">
      <Link
        href={`/staff/${token}`}
        className="inline-flex items-center gap-1 text-[12px] text-ink-500 hover:text-ink-800"
      >
        <Icon name="ArrowLeft" size={12} /> 一覧へ戻る
      </Link>

      <Card className="overflow-hidden">
        <PropertyPhoto tone="c" size="xl" rounded="rounded-none" className="!h-32" />
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
        </div>
      </Card>

      <RespondPanel
        token={token}
        requestId={request.id}
        status={request.status}
        offerDateStart={request.offer_date_start}
        offerDateEnd={request.offer_date_end}
        currentAnswer={response?.answer ?? null}
        currentOfferedDate={response?.offered_date ?? null}
      />
    </div>
  );
}
