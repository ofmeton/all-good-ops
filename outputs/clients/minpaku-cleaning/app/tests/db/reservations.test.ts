import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addIcalFeed,
  cancelReservationManually,
  detectCancellations,
  setReservationGuestCount,
  syncFeed,
  type IcalFeed,
} from "@/lib/db/reservations";
import { createServiceClient } from "@/lib/supabase-server";
import { resetDb } from "../helpers/reset-db";
import type { Actor } from "@/lib/auth";
import { fetchFeedEvents } from "@/lib/ical";

vi.mock("@/lib/ical", () => ({
  fetchFeedEvents: vi.fn(),
}));

const db = createServiceClient();
const admin: Actor = {
  role: "admin",
  adminId: "00000000-0000-0000-0000-000000000001",
  roleLevel: 1,
};

let propertyId: string;
let feed: IcalFeed;

beforeEach(async () => {
  vi.mocked(fetchFeedEvents).mockReset();
  await resetDb();

  const { data: owner, error: ownerError } = await db
    .from("owners")
    .insert({ name: "予約テストオーナー" })
    .select()
    .single();
  if (ownerError) throw ownerError;

  const { data: property, error: propertyError } = await db
    .from("properties")
    .insert({ owner_id: owner!.id, name: "予約テスト物件" })
    .select()
    .single();
  if (propertyError) throw propertyError;
  propertyId = property!.id;

  feed = await addIcalFeed(
    admin,
    propertyId,
    "https://example.com/calendar.ics",
    "Airbnb",
  );
});

describe("reservations DB access", () => {
  it("syncFeed は既存 reservation の guest_count を上書きしない", async () => {
    const { error: seedError } = await db.from("reservations").insert({
      property_id: propertyId,
      feed_id: feed.id,
      external_uid: "uid-1",
      source: "ical",
      checkin_date: "2026-06-20",
      checkout_date: "2026-06-22",
      guest_count: 3,
      status: "active",
    });
    if (seedError) throw seedError;

    vi.mocked(fetchFeedEvents).mockResolvedValue([
      {
        uid: "uid-1",
        checkinDate: "2026-06-21",
        checkoutDate: "2026-06-23",
        raw: { summary: "更新", description: null, url: null },
      },
    ]);

    const result = await syncFeed(admin, feed);
    expect(result.upsertedCount).toBe(1);
    expect(result.updatedUids).toEqual(["uid-1"]);

    const { data } = await db
      .from("reservations")
      .select("checkin_date, checkout_date, guest_count, status")
      .eq("feed_id", feed.id)
      .eq("external_uid", "uid-1")
      .single();
    expect(data).toMatchObject({
      checkin_date: "2026-06-21",
      checkout_date: "2026-06-23",
      guest_count: 3,
      status: "active",
    });
  });

  it("detectCancellations は feed スコープ内だけをキャンセルする", async () => {
    const otherFeed = await addIcalFeed(
      admin,
      propertyId,
      "https://example.com/other.ics",
      "Booking.com",
    );
    const { error } = await db.from("reservations").insert([
      {
        property_id: propertyId,
        feed_id: feed.id,
        external_uid: "old-feed-1",
        source: "ical",
        checkin_date: "2026-06-20",
        checkout_date: "2026-06-22",
        status: "active",
      },
      {
        property_id: propertyId,
        feed_id: otherFeed.id,
        external_uid: "old-other-feed",
        source: "ical",
        checkin_date: "2026-06-20",
        checkout_date: "2026-06-22",
        status: "active",
      },
    ]);
    if (error) throw error;

    const cancelled = await detectCancellations(admin, feed.id, ["new-feed-1"]);
    expect(cancelled.map((r) => r.external_uid)).toEqual(["old-feed-1"]);

    const { data: other } = await db
      .from("reservations")
      .select("status")
      .eq("feed_id", otherFeed.id)
      .eq("external_uid", "old-other-feed")
      .single();
    expect(other?.status).toBe("active");
  });

  it("detectCancellations は seenUids 空配列で全キャンセルしない", async () => {
    const { error } = await db.from("reservations").insert({
      property_id: propertyId,
      feed_id: feed.id,
      external_uid: "still-active",
      source: "ical",
      checkin_date: "2026-06-20",
      checkout_date: "2026-06-22",
      status: "active",
    });
    if (error) throw error;

    const cancelled = await detectCancellations(admin, feed.id, []);
    expect(cancelled).toEqual([]);

    const { data } = await db
      .from("reservations")
      .select("status")
      .eq("external_uid", "still-active")
      .single();
    expect(data?.status).toBe("active");
  });

  it("手動人数補完と手動キャンセルができる", async () => {
    const { data: reservation, error } = await db
      .from("reservations")
      .insert({
        property_id: propertyId,
        feed_id: feed.id,
        external_uid: "manual-target",
        source: "ical",
        checkin_date: "2026-06-20",
        checkout_date: "2026-06-22",
        status: "active",
      })
      .select("id")
      .single();
    if (error) throw error;

    await setReservationGuestCount(admin, reservation!.id, 5);
    await cancelReservationManually(admin, reservation!.id);

    const { data } = await db
      .from("reservations")
      .select("guest_count, status")
      .eq("id", reservation!.id)
      .single();
    expect(data).toMatchObject({ guest_count: 5, status: "cancelled" });
  });
});
