import { describe, it, expect, beforeEach } from "vitest";
import { listOwners, createOwner, updateOwner } from "@/lib/db/owners";
import { createServiceClient } from "@/lib/supabase-server";
import type { Actor } from "@/lib/auth";
import { resetDb } from "../helpers/reset-db";

const db = createServiceClient();
const admin: Actor = { role: "admin", adminId: "a1", roleLevel: 1 };
const staff: Actor = { role: "staff", staffId: "s1" };

beforeEach(async () => {
  await resetDb();
});

describe("owners データアクセス", () => {
  it("管理者はオーナーを作成・取得できる", async () => {
    await createOwner(admin, { name: "オーナーA", email: "a@example.com" });
    const list = await listOwners(admin);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("オーナーA");
  });

  it("管理者以外は作成できない", async () => {
    await expect(createOwner(staff, { name: "X" })).rejects.toThrow("管理者権限が必要です");
  });

  it("オーナーを更新できる", async () => {
    const created = await createOwner(admin, { name: "旧名" });
    await updateOwner(admin, created.id, { name: "新名" });
    expect((await listOwners(admin))[0].name).toBe("新名");
  });
});
