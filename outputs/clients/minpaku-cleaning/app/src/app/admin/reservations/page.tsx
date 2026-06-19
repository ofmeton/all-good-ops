import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveAdminActor } from "@/lib/supabase-auth";
import { listProperties } from "@/lib/db/properties";
import { listReservations } from "@/lib/db/reservations";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { PropertyPhoto } from "@/components/ui/PropertyPhoto";
import { ReservationActions } from "./ReservationActions";

const TONES = ["a", "b", "c", "d", "e", "f"] as const;
const toneOf = (idx: number) => TONES[((idx % TONES.length) + TONES.length) % TONES.length];

export default async function ReservationsPage() {
  const actor = await resolveAdminActor();
  if (!actor || actor.role !== "admin") redirect("/admin/login");

  const [properties, reservations] = await Promise.all([
    listProperties(actor),
    listReservations(actor),
  ]);
  const reservationsByProperty = new Map<string, typeof reservations>();
  for (const property of properties) reservationsByProperty.set(property.id, []);
  for (const reservation of reservations) {
    const list = reservationsByProperty.get(reservation.property_id) ?? [];
    list.push(reservation);
    reservationsByProperty.set(reservation.property_id, list);
  }

  const activeCount = reservations.filter((r) => r.status === "active").length;
  const cancelledCount = reservations.filter((r) => r.status === "cancelled").length;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900">予約</h1>
          <p className="text-[12.5px] text-ink-500 mt-0.5">
            取込済み <span className="num font-bold text-ink-800">{reservations.length}</span> 件 · 有効{" "}
            <span className="num font-bold text-st-confirmed-text">{activeCount}</span> 件 · キャンセル{" "}
            <span className="num font-bold text-st-cancelled-text">{cancelledCount}</span> 件
          </p>
        </div>
      </div>

      {properties.length === 0 && (
        <Card className="p-5">
          <p className="text-[13px] text-ink-500">先に物件を登録してください。</p>
        </Card>
      )}

      <div className="space-y-4">
        {properties.map((property, idx) => {
          const items = reservationsByProperty.get(property.id) ?? [];
          return (
            <Card key={property.id} className="p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-ink-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <PropertyPhoto tone={toneOf(idx)} size="xs" rounded="rounded-md" />
                  <div className="min-w-0">
                    <Link
                      href={`/admin/properties/${property.id}`}
                      className="text-[14px] font-bold text-ink-900 hover:underline truncate block"
                    >
                      {property.name}
                    </Link>
                    <div className="text-[11px] text-ink-500">
                      <span className="num font-semibold text-ink-700">{items.length}</span> 件
                    </div>
                  </div>
                </div>
                <Icon name="CalendarClock" size={16} className="text-ink-400" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead className="bg-ink-50 text-ink-500 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="text-left font-semibold px-5 py-2.5">日程</th>
                      <th className="text-left font-semibold px-2 py-2.5">OTA</th>
                      <th className="text-left font-semibold px-2 py-2.5">UID</th>
                      <th className="text-left font-semibold px-2 py-2.5">状態</th>
                      <th className="text-right font-semibold px-5 py-2.5">人数・操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {items.map((reservation) => {
                      const disabled = reservation.status === "cancelled";
                      return (
                        <tr key={reservation.id} className="hover:bg-ink-50/50">
                          <td className="px-5 py-3 num text-ink-800 whitespace-nowrap">
                            {reservation.checkin_date}〜{reservation.checkout_date}
                          </td>
                          <td className="px-2 py-3 text-ink-700 whitespace-nowrap">
                            {reservation.feed_label ?? (reservation.source === "ical" ? "iCal" : "手動")}
                          </td>
                          <td className="px-2 py-3 num text-ink-500 max-w-[220px] truncate">
                            {reservation.external_uid ?? "—"}
                          </td>
                          <td className="px-2 py-3">
                            <Badge tone={reservation.status === "active" ? "success" : "danger"}>
                              {reservation.status === "active" ? "有効" : "キャンセル"}
                            </Badge>
                          </td>
                          <td className="px-5 py-3">
                            <ReservationActions
                              reservationId={reservation.id}
                              initialGuestCount={reservation.guest_count}
                              disabled={disabled}
                            />
                          </td>
                        </tr>
                      );
                    })}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-[12px] text-ink-500">
                          予約はまだありません。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
