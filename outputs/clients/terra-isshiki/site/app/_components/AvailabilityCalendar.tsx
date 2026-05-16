import {
  buildBlockedSet,
  buildUpcomingMonths,
  fetchAvailability,
} from "../_lib/availability";
import { AvailabilityCalendarUI, type PlainMonth } from "./AvailabilityCalendarUI";

export async function AvailabilityCalendar({
  monthCount = 3,
}: {
  monthCount?: number;
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

  return <AvailabilityCalendarUI months={months} isLive={isLive} />;
}
