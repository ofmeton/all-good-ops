import "server-only";
import { createServiceClient } from "@/lib/supabase-server";
import {
  jstDateStringToUtcMs,
  todayInJST,
  toJstDateString,
} from "@/lib/date";

const DAY_MS = 24 * 60 * 60 * 1000;

export type ScheduleMarker =
  | { kind: "new" }
  | { kind: "changed"; previousGuestCount: number; currentGuestCount: number }
  | { kind: "cancelled" };

export type ScheduleRow = {
  id: string;
  checkinDate: string;
  checkoutDate: string;
  guestCount: number | null;
  requestStatus?: string | null;
  scheduledCleanDate?: string | null;
  staffName?: string | null;
  marker?: ScheduleMarker | null;
};

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function monthLabel(key: string): string {
  return `${Number(key.slice(5, 7))}月`;
}

function dayOf(date: string): number {
  return Number(date.slice(8, 10));
}

function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

function addMonths(date: string, months: number): string {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function addDays(date: string, days: number): string {
  return toJstDateString(new Date(jstDateStringToUtcMs(date) + days * DAY_MS));
}

function formatConfirmedSuffix(row: ScheduleRow): string {
  if (!row.scheduledCleanDate || !row.staffName) return "";
  const month = Number(row.scheduledCleanDate.slice(5, 7));
  const day = Number(row.scheduledCleanDate.slice(8, 10));
  return ` (${month}/${day}${row.staffName}さん清掃予定)`;
}

function formatRow(row: ScheduleRow): string {
  const dateRange = `${dayOf(row.checkinDate)}-${dayOf(row.checkoutDate)}`;
  if (row.marker?.kind === "changed") {
    return `🔺${dateRange} ${row.marker.previousGuestCount}名→${row.marker.currentGuestCount}名`;
  }

  const prefix =
    row.marker?.kind === "new" || row.requestStatus === "unassigned"
      ? "🆕"
      : row.marker?.kind === "cancelled" || row.requestStatus === "cancelled"
        ? "❌"
        : "";
  const guest = row.guestCount ?? "?";
  return `${prefix}${dateRange} ${guest}名${formatConfirmedSuffix(row)}`;
}

export function formatScheduleBlock(
  rows: ScheduleRow[],
  baseDate: string = todayInJST(),
): string {
  const startMonth = monthKey(monthStart(baseDate));
  const nextMonth = monthKey(addMonths(monthStart(baseDate), 1));
  const allowedMonths = [startMonth, nextMonth];
  const byMonth = new Map<string, ScheduleRow[]>();
  for (const key of allowedMonths) byMonth.set(key, []);

  for (const row of rows) {
    const key = monthKey(row.checkinDate);
    if (!byMonth.has(key)) continue;
    byMonth.get(key)!.push(row);
  }

  const sections: string[] = [];
  for (const key of allowedMonths) {
    const monthRows = (byMonth.get(key) ?? []).sort((a, b) =>
      a.checkinDate === b.checkinDate
        ? a.checkoutDate.localeCompare(b.checkoutDate)
        : a.checkinDate.localeCompare(b.checkinDate),
    );
    if (monthRows.length === 0) continue;
    sections.push([monthLabel(key), ...monthRows.map(formatRow)].join("\n"));
  }
  return sections.join("\n\n");
}

export async function buildScheduleBlock(
  propertyId: string,
  opts: {
    baseDate?: string;
    markers?: Record<string, ScheduleMarker>;
  } = {},
): Promise<string> {
  const base = opts.baseDate ?? todayInJST();
  const start = monthStart(base);
  const endExclusive = addMonths(start, 2);
  const db = createServiceClient();

  const { data: reservations, error: reservationError } = await db
    .from("reservations")
    .select("id, checkin_date, checkout_date, guest_count, status")
    .eq("property_id", propertyId)
    .lt("checkin_date", endExclusive)
    .gte("checkout_date", start)
    .order("checkin_date", { ascending: true });
  if (reservationError) throw reservationError;

  const { data: requests, error: requestError } = await db
    .from("cleaning_requests")
    .select("id, reservation_id, checkin_date, checkout_date, guest_count, status, scheduled_clean_date, staff:assigned_staff_id(name)")
    .eq("property_id", propertyId)
    .lt("checkin_date", endExclusive)
    .gte("checkout_date", start)
    .order("checkin_date", { ascending: true });
  if (requestError) throw requestError;

  const byReservationId = new Map<string, Record<string, unknown>>();
  const byDates = new Map<string, Record<string, unknown>>();
  const usedRequestIds = new Set<string>();
  for (const req of (requests ?? []) as unknown as Record<string, unknown>[]) {
    if (req.reservation_id) byReservationId.set(req.reservation_id as string, req);
    byDates.set(`${req.checkin_date}:${req.checkout_date}`, req);
  }

  const rows: ScheduleRow[] = [];
  for (const reservation of (reservations ?? []) as unknown as Record<string, unknown>[]) {
    if (reservation.status !== "active") continue;
    const linked =
      byReservationId.get(reservation.id as string) ??
      byDates.get(`${reservation.checkin_date}:${reservation.checkout_date}`) ??
      null;
    if (linked?.id) usedRequestIds.add(linked.id as string);
    const staff = linked?.staff as { name?: string | null } | null | undefined;
    const marker =
      opts.markers?.[(linked?.id as string | undefined) ?? (reservation.id as string)] ??
      null;
    rows.push({
      id: reservation.id as string,
      checkinDate: reservation.checkin_date as string,
      checkoutDate: reservation.checkout_date as string,
      guestCount:
        (linked?.guest_count as number | null | undefined) ??
        (reservation.guest_count as number | null | undefined) ??
        null,
      requestStatus: (linked?.status as string | null | undefined) ?? null,
      scheduledCleanDate:
        (linked?.scheduled_clean_date as string | null | undefined) ?? null,
      staffName: staff?.name ?? null,
      marker,
    });
  }

  for (const req of (requests ?? []) as unknown as Record<string, unknown>[]) {
    if (usedRequestIds.has(req.id as string)) {
      continue;
    }
    const staff = req.staff as { name?: string | null } | null | undefined;
    rows.push({
      id: req.id as string,
      checkinDate: req.checkin_date as string,
      checkoutDate: req.checkout_date as string,
      guestCount: req.guest_count as number,
      requestStatus: req.status as string,
      scheduledCleanDate: (req.scheduled_clean_date as string | null) ?? null,
      staffName: staff?.name ?? null,
      marker: opts.markers?.[req.id as string] ?? null,
    });
  }

  return formatScheduleBlock(rows, base);
}
