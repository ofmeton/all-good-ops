import {
  isValidDateString,
  jstDateStringToUtcMs,
  toJstDateString,
} from "@/lib/date";

const DAY_MS = 24 * 60 * 60 * 1000;

function assertDate(value: string, field: string): void {
  if (!isValidDateString(value)) {
    throw new Error(`${field} は YYYY-MM-DD 形式で指定してください`);
  }
}

function addDays(date: string, days: number): string {
  return toJstDateString(new Date(jstDateStringToUtcMs(date) + days * DAY_MS));
}

export function offerWindow(
  checkoutDate: string,
  nextCheckinDate: string | null,
): { start: string; end: string } {
  assertDate(checkoutDate, "checkoutDate");
  if (nextCheckinDate !== null) assertDate(nextCheckinDate, "nextCheckinDate");

  const cappedEnd = addDays(checkoutDate, 3);
  const end =
    nextCheckinDate !== null && nextCheckinDate < cappedEnd
      ? nextCheckinDate
      : cappedEnd;
  return { start: checkoutDate, end };
}

export function offsetOf(date: string, checkoutDate: string): number {
  assertDate(date, "date");
  assertDate(checkoutDate, "checkoutDate");
  return Math.floor(
    (jstDateStringToUtcMs(date) - jstDateStringToUtcMs(checkoutDate)) / DAY_MS,
  );
}

export function isWithinWindow(date: string, start: string, end: string): boolean {
  assertDate(date, "date");
  assertDate(start, "start");
  assertDate(end, "end");
  return date >= start && date <= end;
}
