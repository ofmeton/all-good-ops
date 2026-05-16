import { describe, it, expect, beforeEach } from "vitest";
import { listProperties, getProperty, createProperty, updateProperty, archiveProperty } from "@/lib/db/properties";
import type { Actor } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase-server";
import { resetDb } from "../helpers/reset-db";

const db = createServiceClient();
const admin: Actor = { role: "admin", adminId: "a1", roleLevel: 1 };
const staff: Actor = { role: "staff", staffId: "s1" };

let ownerId: string;

beforeEach(async () => {
  await resetDb();
  const { data } = await db.from("owners").insert({ name: "オーナーA" }).select().single();
  ownerId = data!.id;
});

describe("properties データアクセス", () => {
  it("管理者は物件を作成・取得できる", async () => {
    await createProperty(admin, { owner_id: ownerId, name: "物件A", address: "東京" });
    const list = await listProperties(admin);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("物件A");
  });

  it("管理者以外は作成できない", async () => {
    await expect(
      createProperty(staff, { owner_id: ownerId, name: "物件X" }),
    ).rejects.toThrow("管理者権限が必要です");
  });

  it("物件を更新できる", async () => {
    const created = await createProperty(admin, { owner_id: ownerId, name: "旧名" });
    await updateProperty(admin, created.id, { name: "新名" });
    const list = await listProperties(admin);
    expect(list[0].name).toBe("新名");
  });

  it("archiveProperty は archived_at をセットし一覧から除外する", async () => {
    const created = await createProperty(admin, { owner_id: ownerId, name: "物件A" });
    await archiveProperty(admin, created.id);
    expect(await listProperties(admin)).toHaveLength(0);
  });

  it("getProperty: 既存物件を返す", async () => {
    const created = await createProperty(admin, {
      owner_id: ownerId, name: "詳細テスト", address: "横浜",
    });
    const fetched = await getProperty(admin, created.id);
    expect(fetched?.id).toBe(created.id);
    expect(fetched?.name).toBe("詳細テスト");
    expect(fetched?.address).toBe("横浜");
  });

  it("getProperty: 存在しないIDは null", async () => {
    const fetched = await getProperty(admin, "00000000-0000-0000-0000-000000000000");
    expect(fetched).toBeNull();
  });

  it("getProperty: archived な物件は null", async () => {
    const created = await createProperty(admin, { owner_id: ownerId, name: "削除対象" });
    await archiveProperty(admin, created.id);
    const fetched = await getProperty(admin, created.id);
    expect(fetched).toBeNull();
  });

  it("updateProperty: owner_id を変更できる（オーナー再割当）", async () => {
    const { data: o2 } = await db.from("owners").insert({ name: "オーナーB" }).select().single();
    const created = await createProperty(admin, { owner_id: ownerId, name: "物件A" });
    await updateProperty(admin, created.id, { owner_id: o2!.id });
    const fetched = await getProperty(admin, created.id);
    expect(fetched?.owner_id).toBe(o2!.id);
  });
});
