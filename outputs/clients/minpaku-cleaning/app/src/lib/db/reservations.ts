import "server-only";
import { createServiceClient } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/db/scope";
import type { Actor } from "@/lib/auth";
import { fetchFeedEvents, type NormalizedEvent } from "@/lib/ical";

export type ReservationStatus = "active" | "cancelled";
export type ReservationSource = "ical" | "manual";

export type IcalFeed = {
  id: string;
  property_id: string;
  url: string;
  ota_label: string | null;
  last_fetched_at: string | null;
  last_status: string | null;
  created_at: string;
};

export type Reservation = {
  id: string;
  property_id: string;
  feed_id: string | null;
  external_uid: string | null;
  source: ReservationSource;
  checkin_date: string;
  checkout_date: string;
  guest_count: number | null;
  status: ReservationStatus;
  raw: unknown | null;
  created_at: string;
  updated_at: string;
  property_name?: string | null;
  feed_label?: string | null;
  feed_url?: string | null;
};

export type ReservationFilters = {
  propertyId?: string;
  from?: string;
  to?: string;
};

export type SyncFeedResult = {
  upsertedCount: number;
  createdUids: string[];
  updatedUids: string[];
  seenUids: string[];
};

function normalizeReservationRow(row: Record<string, unknown>): Reservation {
  const property = row.properties as { name?: string | null } | null | undefined;
  const feed = row.property_ical_feeds as
    | { ota_label?: string | null; url?: string | null }
    | null
    | undefined;
  return {
    id: row.id as string,
    property_id: row.property_id as string,
    feed_id: (row.feed_id as string | null) ?? null,
    external_uid: (row.external_uid as string | null) ?? null,
    source: row.source as ReservationSource,
    checkin_date: row.checkin_date as string,
    checkout_date: row.checkout_date as string,
    guest_count: (row.guest_count as number | null) ?? null,
    status: row.status as ReservationStatus,
    raw: row.raw ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    property_name: property?.name ?? null,
    feed_label: feed?.ota_label ?? null,
    feed_url: feed?.url ?? null,
  };
}

export async function listReservations(
  actor: Actor,
  opts: ReservationFilters = {},
): Promise<Reservation[]> {
  assertAdmin(actor);
  const db = createServiceClient();
  let query = db
    .from("reservations")
    .select("*, properties(name), property_ical_feeds(ota_label, url)")
    .order("checkin_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (opts.propertyId) query = query.eq("property_id", opts.propertyId);
  if (opts.from) query = query.gte("checkout_date", opts.from);
  if (opts.to) query = query.lte("checkin_date", opts.to);

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(normalizeReservationRow);
}

export async function listIcalFeeds(
  actor: Actor,
  propertyId: string,
): Promise<IcalFeed[]> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db
    .from("property_ical_feeds")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as IcalFeed[];
}

export async function listAllIcalFeeds(actor: Actor): Promise<IcalFeed[]> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db
    .from("property_ical_feeds")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as IcalFeed[];
}

export async function addIcalFeed(
  actor: Actor,
  propertyId: string,
  url: string,
  otaLabel?: string,
): Promise<IcalFeed> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db
    .from("property_ical_feeds")
    .insert({
      property_id: propertyId,
      url,
      ota_label: otaLabel?.trim() || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as IcalFeed;
}

export async function removeIcalFeed(actor: Actor, feedId: string): Promise<void> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { error } = await db.from("property_ical_feeds").delete().eq("id", feedId);
  if (error) throw error;
}

async function upsertEventForFeed(
  feed: IcalFeed,
  event: NormalizedEvent,
): Promise<"created" | "updated"> {
  const db = createServiceClient();
  const { data: existing, error: readError } = await db
    .from("reservations")
    .select("id")
    .eq("feed_id", feed.id)
    .eq("external_uid", event.uid)
    .maybeSingle();
  if (readError) throw readError;

  const now = new Date().toISOString();
  const patch = {
    property_id: feed.property_id,
    feed_id: feed.id,
    external_uid: event.uid,
    source: "ical" as const,
    checkin_date: event.checkinDate,
    checkout_date: event.checkoutDate,
    status: "active" as const,
    raw: event.raw,
    updated_at: now,
  };

  if (existing) {
    const { error } = await db
      .from("reservations")
      .update(patch)
      .eq("id", existing.id);
    if (error) throw error;
    return "updated";
  }

  const { error } = await db.from("reservations").insert(patch);
  if (error) throw error;
  return "created";
}

export async function syncFeed(actor: Actor, feed: IcalFeed): Promise<SyncFeedResult> {
  assertAdmin(actor);
  const events = await fetchFeedEvents(feed.url);
  const createdUids: string[] = [];
  const updatedUids: string[] = [];

  for (const event of events) {
    const result = await upsertEventForFeed(feed, event);
    if (result === "created") createdUids.push(event.uid);
    else updatedUids.push(event.uid);
  }

  return {
    upsertedCount: createdUids.length + updatedUids.length,
    createdUids,
    updatedUids,
    seenUids: events.map((e) => e.uid),
  };
}

export async function detectCancellations(
  actor: Actor,
  feedId: string,
  seenUids: Iterable<string>,
): Promise<Reservation[]> {
  assertAdmin(actor);
  const seen = new Set([...seenUids].filter(Boolean));
  if (seen.size === 0) {
    // 空配列で active 予約を全キャンセルする事故を避ける。通知連携は Phase 3。
    return [];
  }

  const db = createServiceClient();
  const { data: activeRows, error: readError } = await db
    .from("reservations")
    .select("*")
    .eq("feed_id", feedId)
    .eq("status", "active")
    .not("external_uid", "is", null);
  if (readError) throw readError;

  const targets = ((activeRows ?? []) as Reservation[]).filter(
    (r) => r.external_uid && !seen.has(r.external_uid),
  );
  if (targets.length === 0) return [];

  const now = new Date().toISOString();
  const { data, error } = await db
    .from("reservations")
    .update({ status: "cancelled", updated_at: now })
    .in(
      "id",
      targets.map((r) => r.id),
    )
    .select("*");
  if (error) throw error;
  // TODO(P3): reservation↔cleaning_request リンク導入後、キャンセル通知を連携する。
  return (data ?? []) as Reservation[];
}

export async function setReservationGuestCount(
  actor: Actor,
  reservationId: string,
  guestCount: number,
): Promise<void> {
  assertAdmin(actor);
  if (!Number.isInteger(guestCount) || guestCount <= 0) {
    throw new Error("人数は1以上の整数で指定してください");
  }
  const db = createServiceClient();
  const { error } = await db
    .from("reservations")
    .update({ guest_count: guestCount, updated_at: new Date().toISOString() })
    .eq("id", reservationId);
  if (error) throw error;
}

export async function cancelReservationManually(
  actor: Actor,
  reservationId: string,
): Promise<Reservation> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db
    .from("reservations")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", reservationId)
    .select("*")
    .single();
  if (error) throw error;
  // TODO(P3): reservation↔cleaning_request リンク導入後、管理者/スタッフ通知を連携する。
  return data as Reservation;
}

export async function updateIcalFeedFetchStatus(
  actor: Actor,
  feedId: string,
  status: string,
): Promise<void> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { error } = await db
    .from("property_ical_feeds")
    .update({
      last_fetched_at: new Date().toISOString(),
      last_status: status.slice(0, 500),
    })
    .eq("id", feedId);
  if (error) throw error;
}
