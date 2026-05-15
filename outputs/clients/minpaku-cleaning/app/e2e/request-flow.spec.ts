import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

// service role クライアント（テスト前提データの投入用）
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const ADMIN_EMAIL = "e2e-admin@example.com";
const ADMIN_PASSWORD = "e2e-password-123";

// 翌日以降の YYYY-MM-DD
function dateStr(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

test("依頼作成→承認→開始→完了報告→確認の主要フロー", async ({ page }) => {
  // ---- 前提データを投入 ----
  // 既存の E2E データを掃除（FK順）
  await db.from("report_photos").delete().not("id", "is", null);
  await db.from("cleaning_reports").delete().not("id", "is", null);
  await db.from("supply_requests").delete().not("id", "is", null);
  await db.from("cleaning_requests").delete().not("id", "is", null);
  await db.from("access_tokens").delete().not("id", "is", null);
  await db.from("staff_assignments").delete().not("staff_id", "is", null);
  await db.from("staff").delete().not("id", "is", null);
  await db.from("properties").delete().not("id", "is", null);
  await db.from("owners").delete().not("id", "is", null);

  // 管理者（auth.users + admins）。既存があれば使い回す。
  const { data: existing } = await db
    .from("admins")
    .select("id")
    .eq("email", ADMIN_EMAIL)
    .maybeSingle();
  if (!existing) {
    const { data: created, error } = await db.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    await db
      .from("admins")
      .insert({ id: created.user!.id, email: ADMIN_EMAIL, name: "E2E管理者" });
  }

  // オーナー・物件（チェックリストテンプレ付き）・スタッフ・担当割当・スタッフトークン
  const { data: owner } = await db
    .from("owners")
    .insert({ name: "E2Eオーナー" })
    .select()
    .single();
  const { data: property } = await db
    .from("properties")
    .insert({
      owner_id: owner!.id,
      name: "E2E物件",
      checklist_template: [{ label: "浴室清掃" }, { label: "ベッドメイク" }],
    })
    .select()
    .single();
  const { data: staff } = await db
    .from("staff")
    .insert({ name: "E2Eスタッフ" })
    .select()
    .single();
  await db
    .from("staff_assignments")
    .insert({ staff_id: staff!.id, property_id: property!.id });
  const staffToken = randomBytes(32).toString("base64url");
  await db
    .from("access_tokens")
    .insert({ token: staffToken, type: "staff", staff_id: staff!.id });

  // ---- 管理者ログイン ----
  await page.goto("/admin/login");
  await page.fill('[name="email"]', ADMIN_EMAIL);
  await page.fill('[name="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin");

  // ---- 依頼を作成 ----
  await page.goto("/admin/requests");
  await page.waitForLoadState("networkidle");
  await page.selectOption("select", { label: "E2E物件" });
  await page.fill('input[type="date"] >> nth=0', dateStr(3));
  await page.fill('input[type="date"] >> nth=1', dateStr(5));
  await page.fill('input[type="number"]', "2");
  await page.click('button:has-text("依頼を作成")');
  await page.waitForLoadState("networkidle");
  await expect(page.locator("li", { hasText: "E2E物件" })).toBeVisible();

  // ---- スタッフがトークンURLで承認 ----
  await page.goto(`/staff/${staffToken}`);
  await page.waitForLoadState("networkidle");
  await expect(page.locator("h1", { hasText: "担当の清掃依頼" })).toBeVisible();
  await page.click('button:has-text("この依頼を承認する")');
  await page.waitForLoadState("networkidle");
  await expect(page.locator("span", { hasText: "割当済み" })).toBeVisible();

  // ---- スタッフが詳細を開いて開始→完了報告 ----
  await page.click('a:has-text("E2E物件")');
  await page.waitForLoadState("networkidle");
  await page.click('button:has-text("清掃を開始する")');
  await page.waitForLoadState("networkidle");
  await expect(page.locator("h2", { hasText: "チェックリスト" })).toBeVisible();
  await page.check('input[type="checkbox"] >> nth=0');
  await page.check('input[type="checkbox"] >> nth=1');
  await page.click('button:has-text("完了報告を提出する")');
  await page.waitForLoadState("networkidle");
  // 提出後は server re-render で「ステータス: 報告済み」が dl > div に表示される
  await expect(page.locator("text=報告済み")).toBeVisible();

  // ---- 管理者が依頼詳細で確認 ----
  await page.goto("/admin/requests");
  await page.waitForLoadState("networkidle");
  await page.click('a:has-text("E2E物件")');
  await page.waitForLoadState("networkidle");
  await expect(page.locator("h2", { hasText: "完了報告" })).toBeVisible();
  await page.click('button:has-text("内容を確認済みにする")');
  await page.waitForLoadState("networkidle");
  await expect(page.locator("text=確認済み")).toBeVisible();
});
