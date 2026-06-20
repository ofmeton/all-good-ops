import { describe, it, expect, beforeEach } from "vitest";
import {
  listStaff,
  getStaff,
  createStaff,
  updateStaff,
  updateStaffSelf,
  archiveStaff,
  StaffArchiveBlockedError,
} from "@/lib/db/staff";
import { createServiceClient } from "@/lib/supabase-server";
import type { Actor } from "@/lib/auth";
import { resetDb } from "../helpers/reset-db";

const db = createServiceClient();
const admin: Actor = { role: "admin", adminId: "a1", roleLevel: 1 };
const ownerActor: Actor = { role: "owner", ownerId: "o1", propertyId: "p1" };

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

  it("updateStaffSelf: staff 本人は自分のメールを更新できる", async () => {
    const created = await createStaff(admin, { name: "本人" }, []);

    await updateStaffSelf({ role: "staff", staffId: created.id }, { email: "me@example.com" });

    const fetched = await getStaff(admin, created.id);
    expect(fetched?.email).toBe("me@example.com");
  });

  it("updateStaffSelf: 他人の staff は更新されない", async () => {
    const mine = await createStaff(admin, { name: "本人", email: "old@example.com" }, []);
    const other = await createStaff(admin, { name: "他人", email: "other@example.com" }, []);

    await updateStaffSelf({ role: "staff", staffId: mine.id }, { email: "new@example.com" });

    expect((await getStaff(admin, mine.id))?.email).toBe("new@example.com");
    expect((await getStaff(admin, other.id))?.email).toBe("other@example.com");
  });

  it("updateStaffSelf: staff 以外は拒否する", async () => {
    await expect(updateStaffSelf(admin, { email: "admin@example.com" })).rejects.toThrow(
      "スタッフ権限が必要です",
    );
    await expect(updateStaffSelf(ownerActor, { email: "owner@example.com" })).rejects.toThrow(
      "スタッフ権限が必要です",
    );
  });

  it("createStaff はスタッフ作成時にスタッフトークンを1件発行する", async () => {
    const created = await createStaff(admin, { name: "トークン付きスタッフ" }, [propertyId]);

    const { data, error } = await db
      .from("access_tokens")
      .select("type, property_id, staff_id, revoked_at")
      .eq("staff_id", created.id);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]).toMatchObject({
      type: "staff",
      property_id: null,
      staff_id: created.id,
      revoked_at: null,
    });
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
