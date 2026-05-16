import { describe, it, expect, beforeEach } from "vitest";
import { submitReport, getReportForRequest } from "@/lib/db/reports";
import { createServiceClient } from "@/lib/supabase-server";
import { resetDb } from "../helpers/reset-db";
import type { Actor } from "@/lib/auth";

const db = createServiceClient();
const admin: Actor = { role: "admin", adminId: "a1", roleLevel: 1 };

let propertyId: string;
let staffId: string;
let requestId: string;
let staffActor: Actor;

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

beforeEach(async () => {
  await resetDb();
  const { data: owner } = await db.from("owners").insert({ name: "オーナーA" }).select().single();
  const { data: property } = await db
    .from("properties").insert({ owner_id: owner!.id, name: "物件A" }).select().single();
  propertyId = property!.id;
  const { data: st } = await db.from("staff").insert({ name: "スタッフX" }).select().single();
  staffId = st!.id;
  staffActor = { role: "staff", staffId };
  await db.from("staff_assignments").insert({ staff_id: staffId, property_id: propertyId });
  // in_progress かつ自分担当の依頼を用意
  const { data: req } = await db
    .from("cleaning_requests")
    .insert({
      property_id: propertyId,
      checkin_date: dateStr(3),
      checkout_date: dateStr(5),
      guest_count: 2,
      status: "in_progress",
      assigned_staff_id: staffId,
    })
    .select()
    .single();
  requestId = req!.id;
});

describe("cleaning_reports データアクセス", () => {
  it("担当スタッフは完了報告を提出でき、依頼が reported になる", async () => {
    const report = await submitReport(
      staffActor,
      requestId,
      [{ label: "浴室清掃", checked: true }],
      [],
    );
    expect(report.request_id).toBe(requestId);
    const { data: req } = await db
      .from("cleaning_requests").select("status").eq("id", requestId).maybeSingle();
    expect(req?.status).toBe("reported");
  });

  it("写真パス付きで提出すると report_photos 行が作られる", async () => {
    const report = await submitReport(
      staffActor,
      requestId,
      [{ label: "浴室清掃", checked: true }],
      ["req/photo-1.jpg", "req/photo-2.jpg"],
    );
    const { data: photos } = await db
      .from("report_photos").select("*").eq("report_id", report.id);
    expect(photos).toHaveLength(2);
    expect(photos![0].expires_at).toBeTruthy();
  });

  it("in_progress でない依頼には提出できない", async () => {
    await db.from("cleaning_requests").update({ status: "assigned" }).eq("id", requestId);
    await expect(
      submitReport(staffActor, requestId, [], []),
    ).rejects.toThrow("から reported へは遷移できません");
  });

  it("担当外スタッフは提出できない", async () => {
    const { data: other } = await db.from("staff").insert({ name: "別人" }).select().single();
    await expect(
      submitReport({ role: "staff", staffId: other!.id }, requestId, [], []),
    ).rejects.toThrow("自分が担当する依頼ではありません");
  });

  it("getReportForRequest は管理者に報告と写真を返す", async () => {
    const report = await submitReport(
      staffActor,
      requestId,
      [{ label: "浴室清掃", checked: true }],
      ["req/photo-1.jpg"],
    );
    const result = await getReportForRequest(admin, requestId);
    expect(result?.report.id).toBe(report.id);
    expect(result?.photos).toHaveLength(1);
  });

  it("getReportForRequest は報告がなければ null", async () => {
    expect(await getReportForRequest(admin, requestId)).toBeNull();
  });
});
