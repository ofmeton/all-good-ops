import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/line", () => ({ pushLineMessage: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendMail: vi.fn().mockResolvedValue(undefined) }));

import { createRequest, getRequest } from "@/lib/db/requests";
import {
  finalize,
  finalizeDueOffers,
  submitResponse,
  tryConfirm,
  type CleaningResponse,
} from "@/lib/db/responses";
import { createServiceClient } from "@/lib/supabase-server";
import { resetDb } from "../helpers/reset-db";
import type { Actor } from "@/lib/auth";

const db = createServiceClient();
let admin: Actor;
let propertyId: string;
let staffA: string;
let staffB: string;

function dateStr(daysFromNow: number): string {
  const base = new Date();
  base.setUTCDate(base.getUTCDate() + daysFromNow);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base);
}

async function seedBase() {
  const adminEmail = "responses-test-admin@example.com";
  const { data: existingAdmin } = await db
    .from("admins").select("id").eq("email", adminEmail).maybeSingle();
  if (existingAdmin) await db.auth.admin.deleteUser(existingAdmin.id);
  const { data: createdUser, error: userError } = await db.auth.admin.createUser({
    email: adminEmail,
    password: "responses-test-admin-pw",
    email_confirm: true,
  });
  if (userError) throw userError;
  await db.from("admins").insert({
    id: createdUser.user!.id,
    email: adminEmail,
    name: "レスポンステスト管理者",
  });
  admin = { role: "admin", adminId: createdUser.user!.id, roleLevel: 1 };

  const { data: owner } = await db.from("owners").insert({ name: "オーナーR" }).select().single();
  const { data: property } = await db
    .from("properties").insert({ owner_id: owner!.id, name: "物件R" }).select().single();
  propertyId = property!.id;
  const { data: a } = await db.from("staff").insert({ name: "スタッフA" }).select().single();
  const { data: b } = await db.from("staff").insert({ name: "スタッフB" }).select().single();
  staffA = a!.id;
  staffB = b!.id;
  await db.from("staff_assignments").insert([
    { staff_id: staffA, property_id: propertyId },
    { staff_id: staffB, property_id: propertyId },
  ]);
}

async function seedRequest() {
  return createRequest(admin, {
    property_id: propertyId,
    checkin_date: dateStr(3),
    checkout_date: dateStr(5),
    guest_count: 2,
    staff_candidate_ids: [staffA, staffB],
  });
}

beforeEach(async () => {
  await resetDb();
  await seedBase();
});

describe("cleaning_responses 確定アルゴリズム", () => {
  it("offset0 は responded_at 昇順の先着を即確定する", async () => {
    const req = await seedRequest();
    await db.from("cleaning_responses").insert([
      {
        request_id: req.id,
        staff_id: staffB,
        answer: "available",
        offered_date: req.offer_date_start,
        responded_at: "2026-01-01T00:00:02.000Z",
      },
      {
        request_id: req.id,
        staff_id: staffA,
        answer: "available",
        offered_date: req.offer_date_start,
        responded_at: "2026-01-01T00:00:01.000Z",
      },
    ]);
    await tryConfirm(req.id);
    const after = await getRequest(admin, req.id);
    expect(after?.status).toBe("assigned");
    expect(after?.assigned_staff_id).toBe(staffA);
    expect(after?.scheduled_clean_date).toBe(req.offer_date_start);
  });

  it("offset>0 の available は provisional_decision_at を設定して24h待つ", async () => {
    const req = await seedRequest();
    await submitResponse(
      { role: "staff", staffId: staffA },
      req.id,
      "available",
      dateStr(6),
    );
    const after = await getRequest(admin, req.id);
    expect(after?.status).toBe("unassigned");
    expect(after?.provisional_decision_at).toBeTruthy();
  });

  it("全員不可なら管理者へ unassigned_alert を当日dedupe付きで送る", async () => {
    const req = await seedRequest();
    const { count: adminCount, error: adminCountError } = await db
      .from("admins")
      .select("id", { count: "exact", head: true });
    if (adminCountError) throw adminCountError;

    await submitResponse({ role: "staff", staffId: staffA }, req.id, "unavailable");
    await submitResponse({ role: "staff", staffId: staffB }, req.id, "unavailable");
    const { data: logsAfterFirst } = await db
      .from("notifications_log")
      .select("*")
      .eq("kind", "unassigned_alert")
      .eq("status", "sent")
      .eq("payload->>request_id", req.id);
    expect(logsAfterFirst ?? []).toHaveLength(adminCount ?? 0);

    await tryConfirm(req.id);
    const { data: logsAfterSecond } = await db
      .from("notifications_log")
      .select("*")
      .eq("kind", "unassigned_alert")
      .eq("payload->>request_id", req.id);
    expect(logsAfterSecond ?? []).toHaveLength(logsAfterFirst?.length ?? 0);
  });

  it("finalize を二重実行しても単一勝者だけが assigned になる", async () => {
    const req = await seedRequest();
    const { data: response } = await db
      .from("cleaning_responses")
      .insert({
        request_id: req.id,
        staff_id: staffA,
        answer: "available",
        offered_date: req.offer_date_start,
      })
      .select()
      .single();
    const winning = response as CleaningResponse;
    const results = await Promise.all([
      finalize(req.id, winning),
      finalize(req.id, winning),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    const after = await getRequest(admin, req.id);
    expect(after?.assigned_staff_id).toBe(staffA);
  });

  it("finalizeDueOffers は offset 昇順、同 offset は responded_at 昇順で確定する", async () => {
    const req = await seedRequest();
    await db.from("cleaning_responses").insert([
      {
        request_id: req.id,
        staff_id: staffA,
        answer: "available",
        offered_date: dateStr(7),
        responded_at: "2026-01-01T00:00:01.000Z",
      },
      {
        request_id: req.id,
        staff_id: staffB,
        answer: "available",
        offered_date: dateStr(6),
        responded_at: "2026-01-01T00:00:02.000Z",
      },
    ]);
    await db
      .from("cleaning_requests")
      .update({ provisional_decision_at: "2026-01-01T00:00:00.000Z" })
      .eq("id", req.id);
    const result = await finalizeDueOffers();
    expect(result.finalized).toBe(1);
    const after = await getRequest(admin, req.id);
    expect(after?.assigned_staff_id).toBe(staffB);
  });
});
