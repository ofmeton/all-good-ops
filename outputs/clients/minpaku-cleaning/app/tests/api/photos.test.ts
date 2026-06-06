import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/staff/photos/route";
import { createServiceClient } from "@/lib/supabase-server";
import { resetDb } from "../helpers/reset-db";
import type { NextRequest } from "next/server";

const db = createServiceClient();

// 最小の有効 1×1 PNG（赤）
const VALID_PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63f8cfc0c000000003000100" +
    "1ae6c1830000000049454e44ae426082",
  "hex",
);

let propertyId: string;
let requestId: string;

async function seedStaffWithToken(name: string, assign: boolean) {
  const { data: st } = await db.from("staff").insert({ name }).select().single();
  if (assign) {
    await db.from("staff_assignments").insert({ staff_id: st!.id, property_id: propertyId });
  }
  const token = `tok-${name}-${st!.id}`;
  await db.from("access_tokens").insert({ token, type: "staff", staff_id: st!.id });
  return { staffId: st!.id as string, token };
}

// 実 Request を経由すると jsdom の File と undici の realm 不一致でシリアライズに
// 失敗するため、ハンドラが使う formData() のみを持つ軽量スタブを返す。
function buildReq(token: string, reqId: string): NextRequest {
  const form = new FormData();
  form.set("token", token);
  form.set("requestId", reqId);
  form.set("file", new File([VALID_PNG], "x.png", { type: "image/png" }));
  return { formData: async () => form } as unknown as NextRequest;
}

beforeEach(async () => {
  await resetDb();
  const { data: owner } = await db.from("owners").insert({ name: "O" }).select().single();
  const { data: property } = await db
    .from("properties").insert({ owner_id: owner!.id, name: "物件A" }).select().single();
  propertyId = property!.id;
  const { data: req } = await db
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
  requestId = req!.id;
});

describe("POST /api/staff/photos（IDOR 防御）", () => {
  it("担当外スタッフは他の依頼に写真をアップロードできない（403）", async () => {
    const { token } = await seedStaffWithToken("outsider", false);
    const res = await POST(buildReq(token, requestId));
    expect(res.status).toBe(403);
  });

  it("担当スタッフはアップロードできる（200）", async () => {
    const { token } = await seedStaffWithToken("assigned", true);
    const res = await POST(buildReq(token, requestId));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.storagePath).toMatch(new RegExp(`^${requestId}/`));
    // 後始末
    await db.storage.from("report-photos").remove([body.storagePath]);
  });

  it("UUID でない requestId は 400", async () => {
    const { token } = await seedStaffWithToken("assigned2", true);
    const res = await POST(buildReq(token, "../../etc/passwd"));
    expect(res.status).toBe(400);
  });
});
