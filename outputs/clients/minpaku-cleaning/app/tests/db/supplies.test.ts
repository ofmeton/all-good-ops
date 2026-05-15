import { describe, it, expect, beforeEach } from "vitest";
import { createSupplyRequest, listSupplyRequests } from "@/lib/db/supplies";
import { createServiceClient } from "@/lib/supabase-server";
import { resetDb } from "../helpers/reset-db";
import type { Actor } from "@/lib/auth";

const db = createServiceClient();
const admin: Actor = { role: "admin", adminId: "a1", roleLevel: 1 };

let propertyId: string;
let staffId: string;
let staffActor: Actor;

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
});

describe("supply_requests データアクセス", () => {
  it("担当スタッフは備品補充依頼を作成できる", async () => {
    const created = await createSupplyRequest(staffActor, {
      property_id: propertyId,
      items: "トイレットペーパー 6ロール、ハンドソープ 2本",
    });
    expect(created.items).toContain("トイレットペーパー");
    expect(created.staff_id).toBe(staffId);
  });

  it("担当外物件には備品補充依頼を作成できない", async () => {
    const { data: owner2 } = await db.from("owners").insert({ name: "オーナーB" }).select().single();
    const { data: prop2 } = await db
      .from("properties").insert({ owner_id: owner2!.id, name: "物件B" }).select().single();
    await expect(
      createSupplyRequest(staffActor, { property_id: prop2!.id, items: "x" }),
    ).rejects.toThrow("この物件の担当ではありません");
  });

  it("管理者以外は一覧を取得できない", async () => {
    await expect(listSupplyRequests(staffActor)).rejects.toThrow(
      "管理者権限が必要です",
    );
  });

  it("管理者は全備品補充依頼を新しい順に取得できる", async () => {
    await createSupplyRequest(staffActor, { property_id: propertyId, items: "A" });
    await createSupplyRequest(staffActor, { property_id: propertyId, items: "B" });
    const list = await listSupplyRequests(admin);
    expect(list).toHaveLength(2);
  });
});
