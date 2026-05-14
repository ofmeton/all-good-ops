import { describe, it, expect, beforeEach } from "vitest";
import { listProperties, createProperty, updateProperty, archiveProperty } from "@/lib/db/properties";
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
});
