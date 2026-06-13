import { describe, it, expect, beforeEach } from "vitest";
import { PATCH } from "@/app/api/staff/requests/[id]/route";
import { createServiceClient } from "@/lib/supabase-server";
import { resetDb } from "../helpers/reset-db";
import type { NextRequest } from "next/server";

const db = createServiceClient();

let token: string;

beforeEach(async () => {
  await resetDb();
  const { data: st } = await db.from("staff").insert({ name: "S" }).select().single();
  token = `tok-${st!.id}`;
  await db.from("access_tokens").insert({ token, type: "staff", staff_id: st!.id });
});

function buildReq(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

describe("PATCH /api/staff/requests/[id]（id バリデーション）", () => {
  it("UUID でない id は専用の 400 を返す（DB へ渡さない）", async () => {
    const res = await PATCH(buildReq({ token, action: "claim" }), {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(JSON.stringify(body.error)).toContain("id");
  });
});
