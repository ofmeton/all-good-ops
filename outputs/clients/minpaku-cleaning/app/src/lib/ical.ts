import ical from "node-ical";
import type { CalendarResponse, VEvent } from "node-ical";
import {
  isValidDateString,
  jstDateStringToUtcMs,
  toJstDateString,
} from "@/lib/date";

export type NormalizedEvent = {
  uid: string;
  checkinDate: string;
  checkoutDate: string;
  raw: {
    summary: string | null;
    description: string | null;
    url: string | null;
  };
};

type RawEventLike = Partial<VEvent> & {
  type?: string;
  uid?: string;
  start?: Date;
  end?: Date;
};

function textValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value == null) return null;
  if (typeof value === "object" && "val" in value) {
    const inner = (value as { val?: unknown }).val;
    return typeof inner === "string" ? inner : null;
  }
  return null;
}

function dateToReservationDay(value: unknown): string | null {
  if (!(value instanceof Date)) return null;
  const ymd = toJstDateString(value);
  return isValidDateString(ymd) ? ymd : null;
}

export function normalizeEvents(rawMap: CalendarResponse): NormalizedEvent[] {
  const normalized: NormalizedEvent[] = [];

  for (const item of Object.values(rawMap)) {
    const event = item as RawEventLike | undefined;
    if (!event || event.type !== "VEVENT") continue;

    const uid = typeof event.uid === "string" ? event.uid.trim() : "";
    const checkinDate = dateToReservationDay(event.start);
    const checkoutDate = dateToReservationDay(event.end);

    if (!uid || !checkinDate || !checkoutDate) continue;
    if (jstDateStringToUtcMs(checkoutDate) <= jstDateStringToUtcMs(checkinDate)) continue;

    normalized.push({
      uid,
      checkinDate,
      checkoutDate,
      raw: {
        summary: textValue(event.summary),
        description: textValue(event.description),
        url: textValue(event.url),
      },
    });
  }

  return normalized;
}

export function parseIcsText(text: string): NormalizedEvent[] {
  return normalizeEvents(ical.parseICS(text));
}

export async function fetchFeedEvents(url: string): Promise<NormalizedEvent[]> {
  const raw = await ical.async.fromURL(url);
  return normalizeEvents(raw);
}
