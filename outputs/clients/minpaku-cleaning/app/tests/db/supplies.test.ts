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

  it("他物件の request_id を紐付けた備品依頼は拒否する（IDOR 防止）", async () => {
    // 別物件 B に属する依頼を作る（担当物件 A とは無関係）
    const { data: owner2 } = await db.from("owners").insert({ name: "オーナーB" }).select().single();
    const { data: prop2 } = await db
      .from("properties").insert({ owner_id: owner2!.id, name: "物件B" }).select().single();
    const { data: foreignReq } = await db
      .from("cleaning_requests")
      .insert({
        property_id: prop2!.id,
        checkin_date: "2099-01-02",
        checkout_date: "2099-01-03",
        guest_count: 1,
        status: "unassigned",
      })
      .select()
      .single();

    // 担当物件 A の備品依頼に、他物件 B の request_id を紐付けようとする
    await expect(
      createSupplyRequest(staffActor, {
        property_id: propertyId,
        request_id: foreignReq!.id,
        items: "x",
      }),
    ).rejects.toThrow("依頼と物件が一致しません");
  });

  it("自物件の request_id を紐付けた備品依頼は作成できる", async () => {
    const { data: ownReq } = await db
      .from("cleaning_requests")
      .insert({
        property_id: propertyId,
        checkin_date: "2099-01-02",
        checkout_date: "2099-01-03",
        guest_count: 1,
        status: "unassigned",
      })
      .select()
      .single();
    const created = await createSupplyRequest(staffActor, {
      property_id: propertyId,
      request_id: ownReq!.id,
      items: "y",
    });
    expect(created.request_id).toBe(ownReq!.id);
  });
});
