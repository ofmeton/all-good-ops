import { describe, it, expect, beforeEach } from "vitest";
import { listStaff, createStaff, updateStaff, archiveStaff } from "@/lib/db/staff";
import { createServiceClient } from "@/lib/supabase-server";
import type { Actor } from "@/lib/auth";

const db = createServiceClient();
const admin: Actor = { role: "admin", adminId: "a1", roleLevel: 1 };

let propertyId: string;

beforeEach(async () => {
  await db.from("cleaning_requests").delete().neq("property_id", "00000000-0000-0000-0000-000000000000");
  await db.from("staff_assignments").delete().neq("staff_id", "00000000-0000-0000-0000-000000000000");
  await db.from("staff").delete().neq("name", "");
  await db.from("properties").delete().neq("name", "");
  await db.from("owners").delete().neq("name", "");
  const { data: owner } = await db.from("owners").insert({ name: "オーナーA" }).select().single();
  const { data: property } = await db
    .from("properties").insert({ owner_id: owner!.id, name: "物件A" }).select().single();
  propertyId = property!.id;
});

describe("staff データアクセス", () => {
  it("担当物件付きでスタッフを作成し、担当物件も取得できる", async () => {
    const created = await createStaff(admin, { name: "スタッフA" }, [propertyId]);
    const list = await listStaff(admin);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);
    expect(list[0].property_ids).toEqual([propertyId]);
  });

  it("updateStaff は担当物件を差し替える", async () => {
    const created = await createStaff(admin, { name: "スタッフA" }, [propertyId]);
    await updateStaff(admin, created.id, { name: "スタッフA改" }, []);
    const list = await listStaff(admin);
    expect(list[0].name).toBe("スタッフA改");
    expect(list[0].property_ids).toEqual([]);
  });

  it("稼働中の清掃依頼があるスタッフはアーカイブできない", async () => {
    const created = await createStaff(admin, { name: "スタッフB" }, []);
    await db.from("cleaning_requests").insert({
      property_id: propertyId,
      checkin_date: "2026-06-01",
      checkout_date: "2026-06-03",
      guest_count: 2,
      assigned_staff_id: created.id,
      status: "assigned",
    });
    await expect(archiveStaff(admin, created.id)).rejects.toThrow(
      "稼働中の清掃依頼があるスタッフはアーカイブできません",
    );
  });
});
