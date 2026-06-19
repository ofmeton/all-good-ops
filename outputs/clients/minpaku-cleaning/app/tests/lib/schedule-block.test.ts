import { describe, expect, it } from "vitest";
import { formatScheduleBlock, type ScheduleRow } from "@/lib/notify/templates/schedule-block";

describe("schedule-block", () => {
  it("🆕🔺❌ と確定付記を月ごとに整形する", () => {
    const rows: ScheduleRow[] = [
      {
        id: "a",
        checkinDate: "2026-05-27",
        checkoutDate: "2026-05-29",
        guestCount: 2,
        requestStatus: "unassigned",
      },
      {
        id: "b",
        checkinDate: "2026-05-29",
        checkoutDate: "2026-05-30",
        guestCount: 3,
        marker: { kind: "changed", previousGuestCount: 4, currentGuestCount: 3 },
      },
      {
        id: "c",
        checkinDate: "2026-05-30",
        checkoutDate: "2026-05-31",
        guestCount: 4,
        requestStatus: "cancelled",
      },
      {
        id: "d",
        checkinDate: "2026-05-31",
        checkoutDate: "2026-06-01",
        guestCount: 2,
        scheduledCleanDate: "2026-06-02",
        staffName: "佐藤",
      },
      {
        id: "e",
        checkinDate: "2026-06-03",
        checkoutDate: "2026-06-04",
        guestCount: 1,
      },
    ];

    expect(formatScheduleBlock(rows, "2026-05-01")).toBe(
      [
        "5月",
        "🆕27-29 2名",
        "🔺29-30 4名→3名",
        "❌30-31 4名",
        "31-1 2名 (6/2佐藤さん清掃予定)",
        "",
        "6月",
        "3-4 1名",
      ].join("\n"),
    );
  });
});
