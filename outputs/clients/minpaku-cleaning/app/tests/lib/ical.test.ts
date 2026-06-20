import { describe, expect, it } from "vitest";
import ical from "node-ical";
import {
  assertPublicHttpUrl,
  isBlockedAddress,
  normalizeEvents,
  parseIcsText,
} from "@/lib/ical";

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

describe("iCal SSRF ガード", () => {
  it("内部・リンクローカル IP を拒否対象として判定する", () => {
    expect(isBlockedAddress("127.0.0.1")).toBe(true);
    expect(isBlockedAddress("10.0.0.5")).toBe(true);
    expect(isBlockedAddress("172.16.0.1")).toBe(true);
    expect(isBlockedAddress("192.168.1.20")).toBe(true);
    expect(isBlockedAddress("169.254.169.254")).toBe(true);
    expect(isBlockedAddress("::1")).toBe(true);
    expect(isBlockedAddress("fe80::1")).toBe(true);
    expect(isBlockedAddress("fc00::1")).toBe(true);
  });

  it("公開 IP は拒否対象にしない", () => {
    expect(isBlockedAddress("8.8.8.8")).toBe(false);
    expect(isBlockedAddress("2001:4860:4860::8888")).toBe(false);
  });

  it("http/https 以外、localhost、内部IP URLを拒否し、通常の公開ホスト名は許可する", () => {
    const originalAllowlist = process.env.ICAL_FEED_ALLOWED_HOSTS;
    delete process.env.ICAL_FEED_ALLOWED_HOSTS;
    try {
      expect(() => assertPublicHttpUrl("file:///tmp/feed.ics")).toThrow();
      expect(() => assertPublicHttpUrl("http://localhost/feed.ics")).toThrow();
      expect(() => assertPublicHttpUrl("http://127.0.0.1/feed.ics")).toThrow();
      expect(() => assertPublicHttpUrl("http://10.0.0.1/feed.ics")).toThrow();
      expect(() => assertPublicHttpUrl("http://169.254.169.254/latest")).toThrow();
      expect(() => assertPublicHttpUrl("http://[::1]/feed.ics")).toThrow();
      expect(assertPublicHttpUrl("https://calendar.example.com/feed.ics").hostname).toBe(
        "calendar.example.com",
      );
    } finally {
      if (originalAllowlist === undefined) {
        delete process.env.ICAL_FEED_ALLOWED_HOSTS;
      } else {
        process.env.ICAL_FEED_ALLOWED_HOSTS = originalAllowlist;
      }
    }
  });
});
