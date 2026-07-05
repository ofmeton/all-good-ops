import {
  buildBlockedSet,
  buildUpcomingMonths,
  fetchAvailability,
} from "../_lib/availability";
import type { SiteCopy } from "../copy/types";
import type { Locale } from "../i18n/config";
import { AvailabilityCalendarUI, type PlainMonth } from "./AvailabilityCalendarUI";

export async function AvailabilityCalendar({
  monthCount = 3,
  copy,
  locale,
}: {
  monthCount?: number;
  copy: SiteCopy;
  locale: Locale;
}) {
  const ranges = await fetchAvailability();
  const blocked = buildBlockedSet(ranges);
  const richMonths = buildUpcomingMonths(monthCount, blocked);
  const isLive = ranges.length > 0;

  // Date オブジェクトは server→client 境界をまたがず、day/blocked/today だけに圧縮
  const months: PlainMonth[] = richMonths.map((m) => ({
    year: m.year,
    month: m.month,
    weeks: m.weeks.map((week) =>
      week.map((cell) =>
        cell
          ? { day: cell.date.getDate(), blocked: cell.blocked, today: cell.today }
          : null,
      ),
    ),
  }));

  return (
    <AvailabilityCalendarUI
      months={months}
      isLive={isLive}
      locale={locale}
      airbnbUrl={copy.SITE.airbnbUrl}
      liveLabel={copy.RESERVE_PAGE.liveLabel}
    />
  );
}
