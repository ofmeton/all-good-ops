import { describe, it, expect, beforeEach, vi } from "vitest";
import { PATCH } from "@/app/api/admin/properties/route";
import { createServiceClient } from "@/lib/supabase-server";
import { resetDb } from "../helpers/reset-db";
import type { NextRequest } from "next/server";

const { admin } = vi.hoisted(() => ({
  admin: { role: "admin" as const, adminId: "a1", roleLevel: 1 },
}));

vi.mock("@/lib/supabase-auth", () => ({
  resolveAdminActor: vi.fn(async () => admin),
}));

const db = createServiceClient();

beforeEach(async () => {
  await resetDb();
});

function buildReq(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

describe("PATCH /api/admin/properties", () => {
  it("owner_id を含む更新を受け付け、物件のオーナー変更を保存する", async () => {
    const { data: ownerA } = await db.from("owners").insert({ name: "オーナーA" }).select().single();
    const { data: ownerB } = await db.from("owners").insert({ name: "オーナーB" }).select().single();
    const { data: property } = await db
      .from("properties")
      .insert({ owner_id: ownerA!.id, name: "物件A" })
      .select()
      .single();

    const res = await PATCH(
      buildReq({ id: property!.id, owner_id: ownerB!.id }),
    );

    expect(res.status).toBe(200);
    const { data: updated } = await db
      .from("properties")
      .select("owner_id")
      .eq("id", property!.id)
      .single();
    expect(updated?.owner_id).toBe(ownerB!.id);
  });
});
