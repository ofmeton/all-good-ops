import { describe, it, expect, beforeEach } from "vitest";
import { createServiceClient } from "@/lib/supabase-server";
import {
  bindLineUser,
  consumeNonce,
  issueNonce,
  type LineLinkTarget,
} from "@/lib/db/line-link";
import { resetDb } from "../helpers/reset-db";

const db = createServiceClient();

let staffId: string;
let ownerId: string;

beforeEach(async () => {
  await resetDb();
  const { data: owner } = await db.from("owners").insert({ name: "オーナーA" }).select().single();
  const { data: staff } = await db.from("staff").insert({ name: "スタッフA" }).select().single();
  ownerId = owner!.id as string;
  staffId = staff!.id as string;
});

describe("LINE link nonce データアクセス", () => {
  it("nonce を発行して一度だけ consume できる", async () => {
    const target: LineLinkTarget = { type: "staff", staffId };
    const nonce = await issueNonce(target);

    await expect(consumeNonce(nonce)).resolves.toEqual(target);
    await expect(consumeNonce(nonce)).resolves.toBeNull();
  });

  it("期限切れ nonce は consume できない", async () => {
    const nonce = await issueNonce({ type: "owner", ownerId });
    await db
      .from("line_link_nonces")
      .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
      .eq("nonce", nonce);

    await expect(consumeNonce(nonce)).resolves.toBeNull();
  });

  it("bindLineUser は staff の line_user_id を更新する", async () => {
    await bindLineUser({ type: "staff", staffId }, "Ustaff123");

    const { data } = await db
      .from("staff")
      .select("line_user_id")
      .eq("id", staffId)
      .maybeSingle();
    expect(data?.line_user_id).toBe("Ustaff123");
  });

  it("bindLineUser は owner の line_user_id を更新する", async () => {
    await bindLineUser({ type: "owner", ownerId }, "Uowner123");

    const { data } = await db
      .from("owners")
      .select("line_user_id")
      .eq("id", ownerId)
      .maybeSingle();
    expect(data?.line_user_id).toBe("Uowner123");
  });
});
