import { describe, it, expect, beforeEach } from "vitest";
import { resolveActorByToken } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase-server";

const db = createServiceClient();

async function seed() {
  await db.from("access_tokens").delete().neq("token", "");
  await db.from("staff").delete().neq("name", "");
  await db.from("properties").delete().neq("name", "");
  await db.from("owners").delete().neq("name", "");

  const { data: owner } = await db
    .from("owners").insert({ name: "オーナーA" }).select().single();
  const { data: property } = await db
    .from("properties").insert({ owner_id: owner!.id, name: "物件A" }).select().single();
  const { data: staff } = await db
    .from("staff").insert({ name: "スタッフA" }).select().single();

  await db.from("access_tokens").insert([
    { token: "owner-token", type: "owner", property_id: property!.id },
    { token: "staff-token", type: "staff", staff_id: staff!.id },
    { token: "revoked-token", type: "staff", staff_id: staff!.id, revoked_at: new Date().toISOString() },
  ]);
  return { property, staff };
}

describe("resolveActorByToken", () => {
  beforeEach(async () => {
    await seed();
  });

  it("有効なオーナートークンを解決する", async () => {
    const actor = await resolveActorByToken("owner-token");
    expect(actor?.role).toBe("owner");
    expect(actor?.role === "owner" && actor.propertyId).toBeTruthy();
  });

  it("有効なスタッフトークンを解決する", async () => {
    const actor = await resolveActorByToken("staff-token");
    expect(actor?.role).toBe("staff");
    expect(actor?.role === "staff" && actor.staffId).toBeTruthy();
  });

  it("revoke済みトークンは null を返す", async () => {
    expect(await resolveActorByToken("revoked-token")).toBeNull();
  });

  it("存在しないトークンは null を返す", async () => {
    expect(await resolveActorByToken("no-such-token")).toBeNull();
  });
});
