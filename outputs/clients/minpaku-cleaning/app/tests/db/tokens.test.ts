import { describe, it, expect, beforeEach } from "vitest";
import { issueToken, revokeToken, getActiveToken, reissueToken } from "@/lib/db/tokens";
import { createServiceClient } from "@/lib/supabase-server";
import { resetDb } from "../helpers/reset-db";
import type { Actor } from "@/lib/auth";

const db = createServiceClient();
const admin: Actor = { role: "admin", adminId: "a1", roleLevel: 1 };
const staff: Actor = { role: "staff", staffId: "s1" };

let propertyId: string;
let staffId: string;

beforeEach(async () => {
  await resetDb();
  const { data: owner } = await db.from("owners").insert({ name: "オーナーA" }).select().single();
  const { data: property } = await db
    .from("properties").insert({ owner_id: owner!.id, name: "物件A" }).select().single();
  const { data: st } = await db.from("staff").insert({ name: "スタッフA" }).select().single();
  propertyId = property!.id;
  staffId = st!.id;
});

describe("access_tokens データアクセス", () => {
  it("物件のオーナートークンを発行できる", async () => {
    const token = await issueToken(admin, { type: "owner", propertyId });
    expect(token.token).toMatch(/^[A-Za-z0-9_-]+$/);
    const active = await getActiveToken(admin, { type: "owner", propertyId });
    expect(active?.token).toBe(token.token);
  });

  it("管理者以外はトークンを発行できない", async () => {
    await expect(
      issueToken(staff, { type: "staff", staffId }),
    ).rejects.toThrow("管理者権限が必要です");
  });

  it("revokeToken 後は getActiveToken が null を返す", async () => {
    const token = await issueToken(admin, { type: "staff", staffId });
    await revokeToken(admin, token.id);
    expect(await getActiveToken(admin, { type: "staff", staffId })).toBeNull();
  });

  it("reissueToken は旧トークンを revoke し新トークンを返す", async () => {
    const first = await issueToken(admin, { type: "owner", propertyId });
    const second = await reissueToken(admin, { type: "owner", propertyId });
    expect(second.token).not.toBe(first.token);
    const active = await getActiveToken(admin, { type: "owner", propertyId });
    expect(active?.token).toBe(second.token);
  });

  it("既に有効なトークンがある対象に issueToken すると例外", async () => {
    await issueToken(admin, { type: "owner", propertyId });
    await expect(
      issueToken(admin, { type: "owner", propertyId }),
    ).rejects.toThrow("既に有効なトークンが存在します");
  });
});
