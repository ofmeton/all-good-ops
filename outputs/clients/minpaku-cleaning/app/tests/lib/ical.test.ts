import { describe, expect, it } from "vitest";
import ical from "node-ical";
import { normalizeEvents, parseIcsText } from "@/lib/ical";

const fixture = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//StayClean//iCal Test//EN
BEGIN:VEVENT
UID:all-day-1
DTSTART;VALUE=DATE:20260620
DTEND;VALUE=DATE:20260622
SUMMARY:終日予約
DESCRIPTION:2泊
URL:https://example.com/reservation/all-day-1
END:VEVENT
BEGIN:VEVENT
UID:tokyo-time-1
DTSTART;TZID=Asia/Tokyo:20260625T150000
DTEND;TZID=Asia/Tokyo:20260627T100000
SUMMARY:TZID予約
END:VEVENT
BEGIN:VEVENT
UID:bad-same-day
DTSTART;VALUE=DATE:20260701
DTEND;VALUE=DATE:20260701
SUMMARY:不正日付
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260702
DTEND;VALUE=DATE:20260703
SUMMARY:UIDなし
END:VEVENT
END:VCALENDAR`;

describe("iCal 正規化", () => {
  it("終日VEVENTとTZID付きVEVENTをJSTの予約日へ正規化し、不正VEVENTを破棄する", () => {
    const events = normalizeEvents(ical.parseICS(fixture));
    expect(events).toEqual([
      {
        uid: "all-day-1",
        checkinDate: "2026-06-20",
        checkoutDate: "2026-06-22",
        raw: {
          summary: "終日予約",
          description: "2泊",
          url: "https://example.com/reservation/all-day-1",
        },
      },
      {
        uid: "tokyo-time-1",
        checkinDate: "2026-06-25",
        checkoutDate: "2026-06-27",
        raw: {
          summary: "TZID予約",
          description: null,
          url: null,
        },
      },
    ]);
  });

  it("parseIcsText は .ics 文字列から正規化済みイベントを返す", () => {
    expect(parseIcsText(fixture).map((e) => e.uid)).toEqual([
      "all-day-1",
      "tokyo-time-1",
    ]);
  });

  it("日付が Date として解釈できない VEVENT は破棄する", () => {
    const events = normalizeEvents({
      bad: {
        type: "VEVENT",
        uid: "bad-date",
        start: "2026-06-20",
        end: new Date("2026-06-22T00:00:00Z"),
      },
    } as never);
    expect(events).toEqual([]);
  });
});
