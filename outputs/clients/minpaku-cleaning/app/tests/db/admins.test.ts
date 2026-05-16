import { describe, it, expect, beforeEach } from "vitest";
import {
  listAdmins,
  createAdmin,
  updateAdminRoleLevel,
  deleteAdmin,
} from "@/lib/db/admins";
import { createServiceClient } from "@/lib/supabase-server";
import { resetDb } from "../helpers/reset-db";
import type { Actor } from "@/lib/auth";

const db = createServiceClient();
const admin: Actor = { role: "admin", adminId: "a1", roleLevel: 1 };
const staff: Actor = { role: "staff", staffId: "s1" };

// テスト用の email をユニーク化
const SUFFIX = "admin-test";

beforeEach(async () => {
  await resetDb();
  // テスト admin/auth users を掃除
  const { data: existing } = await db
    .from("admins")
    .select("id, email")
    .like("email", `%${SUFFIX}%`);
  for (const a of existing ?? []) {
    await db.auth.admin.deleteUser(a.id);
  }
});

describe("admins データアクセス", () => {
  it("管理者は新規管理者を追加できる", async () => {
    const created = await createAdmin(admin, {
      email: `new-${SUFFIX}@example.com`,
      name: "新規管理者",
      role_level: 1,
      password: "TestPass1234!",
    });
    expect(created.email).toBe(`new-${SUFFIX}@example.com`);
    expect(created.role_level).toBe(1);
  });

  it("管理者以外は追加できない", async () => {
    await expect(
      createAdmin(staff, {
        email: `x-${SUFFIX}@example.com`,
        name: "X",
        role_level: 1,
        password: "TestPass1234!",
      }),
    ).rejects.toThrow("管理者権限が必要です");
  });

  it("一覧と権限レベル変更ができる", async () => {
    const created = await createAdmin(admin, {
      email: `lvl-${SUFFIX}@example.com`,
      name: "Level Admin",
      role_level: 1,
      password: "TestPass1234!",
    });
    await updateAdminRoleLevel(admin, created.id, 2);
    const list = await listAdmins(admin);
    const found = list.find((a) => a.id === created.id);
    expect(found?.role_level).toBe(2);
  });

  it("削除すると admins と auth.users から消える", async () => {
    const created = await createAdmin(admin, {
      email: `del-${SUFFIX}@example.com`,
      name: "Del",
      role_level: 1,
      password: "TestPass1234!",
    });
    await deleteAdmin(admin, created.id);
    const list = await listAdmins(admin);
    expect(list.find((a) => a.id === created.id)).toBeUndefined();
  });
});
