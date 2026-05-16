import { describe, it, expect, beforeEach } from "vitest";
import { listStaff, getStaff, createStaff, updateStaff, archiveStaff, StaffArchiveBlockedError } from "@/lib/db/staff";
import { createServiceClient } from "@/lib/supabase-server";
import type { Actor } from "@/lib/auth";
import { resetDb } from "../helpers/reset-db";

const db = createServiceClient();
const admin: Actor = { role: "admin", adminId: "a1", roleLevel: 1 };

let propertyId: string;

beforeEach(async () => {
  await resetDb();
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

  it("getStaff: 既存スタッフを property_ids 込みで返す", async () => {
    const created = await createStaff(admin, { name: "詳細テスト", email: "test@example.com" }, [propertyId]);
    const fetched = await getStaff(admin, created.id);
    expect(fetched?.id).toBe(created.id);
    expect(fetched?.name).toBe("詳細テスト");
    expect(fetched?.email).toBe("test@example.com");
    expect(fetched?.property_ids).toEqual([propertyId]);
  });

  it("getStaff: 存在しない ID は null", async () => {
    const fetched = await getStaff(admin, "00000000-0000-0000-0000-000000000000");
    expect(fetched).toBeNull();
  });

  it("getStaff: archived は null", async () => {
    const created = await createStaff(admin, { name: "削除対象" }, []);
    await archiveStaff(admin, created.id);
    const fetched = await getStaff(admin, created.id);
    expect(fetched).toBeNull();
  });

  it("updateStaff: LINE ID と property_ids を一括更新", async () => {
    const { data: p2 } = await db
      .from("properties").insert({ owner_id: (await db.from("owners").select("id").limit(1).single()).data!.id, name: "物件B" })
      .select().single();
    const created = await createStaff(admin, { name: "佐藤" }, [propertyId]);
    await updateStaff(admin, created.id, { line_user_id: "Uabc123" }, [p2!.id]);
    const fetched = await getStaff(admin, created.id);
    expect(fetched?.line_user_id).toBe("Uabc123");
    expect(fetched?.property_ids).toEqual([p2!.id]);
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
    await expect(archiveStaff(admin, created.id)).rejects.toThrow(StaffArchiveBlockedError);
    await expect(archiveStaff(admin, created.id)).rejects.toThrow(
      "稼働中の清掃依頼があるスタッフはアーカイブできません",
    );
  });
});
