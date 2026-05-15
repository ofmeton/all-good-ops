import { describe, it, expect, beforeEach } from "vitest";
import {
  listRequests,
  getRequest,
  createRequest,
  updateRequest,
  cancelRequest,
} from "@/lib/db/requests";
import { createServiceClient } from "@/lib/supabase-server";
import { resetDb } from "../helpers/reset-db";
import type { Actor } from "@/lib/auth";

const db = createServiceClient();
const admin: Actor = { role: "admin", adminId: "a1", roleLevel: 1 };
const staff: Actor = { role: "staff", staffId: "s1" };

let propertyId: string;

// 翌日以降の YYYY-MM-DD を返すヘルパー（当日割り当て不可の検証用）
function dateStr(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

beforeEach(async () => {
  await resetDb();
  const { data: owner } = await db.from("owners").insert({ name: "オーナーA" }).select().single();
  const { data: property } = await db
    .from("properties").insert({ owner_id: owner!.id, name: "物件A" }).select().single();
  propertyId = property!.id;
});

describe("cleaning_requests データアクセス（管理者CRUD）", () => {
  it("管理者は依頼を作成・取得できる", async () => {
    const created = await createRequest(admin, {
      property_id: propertyId,
      checkin_date: dateStr(3),
      checkout_date: dateStr(5),
      guest_count: 2,
    });
    expect(created.status).toBe("unassigned");
    expect(created.assignment_deadline).toBeTruthy();
    const list = await listRequests(admin);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);
  });

  it("管理者以外は作成できない", async () => {
    await expect(
      createRequest(staff, {
        property_id: propertyId,
        checkin_date: dateStr(3),
        checkout_date: dateStr(5),
        guest_count: 2,
      }),
    ).rejects.toThrow("管理者権限が必要です");
  });

  it("チェックイン日が当日以前なら拒否する", async () => {
    await expect(
      createRequest(admin, {
        property_id: propertyId,
        checkin_date: dateStr(0),
        checkout_date: dateStr(2),
        guest_count: 2,
      }),
    ).rejects.toThrow("チェックイン日は翌日以降");
  });

  it("チェックアウトがチェックイン以前なら拒否する", async () => {
    await expect(
      createRequest(admin, {
        property_id: propertyId,
        checkin_date: dateStr(5),
        checkout_date: dateStr(3),
        guest_count: 2,
      }),
    ).rejects.toThrow("チェックアウト日はチェックイン日より後");
  });

  it("依頼を編集できる", async () => {
    const created = await createRequest(admin, {
      property_id: propertyId,
      checkin_date: dateStr(3),
      checkout_date: dateStr(5),
      guest_count: 2,
    });
    await updateRequest(admin, created.id, { guest_count: 4 });
    const fetched = await getRequest(admin, created.id);
    expect(fetched?.guest_count).toBe(4);
  });

  it("cancelRequest は status を cancelled にする", async () => {
    const created = await createRequest(admin, {
      property_id: propertyId,
      checkin_date: dateStr(3),
      checkout_date: dateStr(5),
      guest_count: 2,
    });
    await cancelRequest(admin, created.id);
    const fetched = await getRequest(admin, created.id);
    expect(fetched?.status).toBe("cancelled");
  });
});
