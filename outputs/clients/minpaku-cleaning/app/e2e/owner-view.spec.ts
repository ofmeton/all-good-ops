import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function dateStr(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

test("オーナーはトークンURLで物件情報と履歴を閲覧できる", async ({ page }) => {
  // クリーンアップ
  await db.from("report_photos").delete().not("id", "is", null);
  await db.from("cleaning_reports").delete().not("id", "is", null);
  await db.from("cleaning_requests").delete().not("id", "is", null);
  await db.from("access_tokens").delete().not("id", "is", null);
  await db.from("properties").delete().not("id", "is", null);
  await db.from("owners").delete().not("id", "is", null);

  // オーナー・物件・履歴データを投入
  const { data: owner } = await db
    .from("owners")
    .insert({ name: "オーナー閲覧テスト" })
    .select()
    .single();
  const { data: property } = await db
    .from("properties")
    .insert({ owner_id: owner!.id, name: "閲覧物件" })
    .select()
    .single();
  await db.from("cleaning_requests").insert({
    property_id: property!.id,
    checkin_date: dateStr(-30),
    checkout_date: dateStr(-28),
    guest_count: 2,
    status: "confirmed",
  });
  const ownerToken = randomBytes(32).toString("base64url");
  await db.from("access_tokens").insert({
    token: ownerToken,
    type: "owner",
    property_id: property!.id,
  });

  // オーナー画面アクセス
  await page.goto(`/property/${ownerToken}`);
  await page.waitForLoadState("networkidle");
  await expect(page.locator("h1", { hasText: "閲覧物件" })).toBeVisible();
  await expect(page.locator("text=清掃履歴").first()).toBeVisible();
  await expect(page.locator("text=確認済み").first()).toBeVisible();
});

test("無効なトークンには専用エラーが表示される", async ({ page }) => {
  await page.goto(`/property/${"invalid-token-string"}`);
  await page.waitForLoadState("networkidle");
  await expect(
    page.locator("h1", { hasText: "このURLは無効です" }),
  ).toBeVisible();
});
