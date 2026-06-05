/**
 * StayClean デモ動画 録画用スクリプト（ローカル Supabase 専用）
 * 実行: npx playwright test --config playwright.demo.config.ts
 *
 * 本番DBは一切触らない。架空のきれいなデモデータで6ステップを操作録画する。
 * シナリオ: 管理者ログイン → 清掃依頼作成 → スタッフ承認 → 清掃報告
 *           → 備品連絡 → 管理者が報告確認 →（おまけ）オーナー閲覧
 *
 * 操作要素の座標＋時刻を ../demo-video/src/zoom-track.json に出力し、
 * Remotion 側でその領域へスムーズにオートズームする。
 */
import { test, expect, type Locator } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { writeFileSync } from "fs";
import { join } from "path";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const ADMIN_EMAIL = "demo@stayclean.app";
const ADMIN_PASSWORD = "Demo-Pass-123";
const OWNER_NAME = "鈴木 一郎";
const PROPERTY_NAME = "サンプル民泊 代々木テラス";
const STAFF_NAME = "田中 花子";
const CHECKLIST = [
  { label: "浴室・トイレ清掃" },
  { label: "ベッドメイク" },
  { label: "ゴミ回収・分別" },
  { label: "床の掃除機がけ" },
];

function dateStr(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

const beat = (ms = 1200) => new Promise((r) => setTimeout(r, ms));

test("StayClean デモ操作フロー", async ({ page }) => {
  test.setTimeout(240_000);

  // ---- ローカルDBをクリーンに（本番とは別DB。ここはローカルのみ）----
  await db.from("report_photos").delete().not("id", "is", null);
  await db.from("cleaning_reports").delete().not("id", "is", null);
  await db.from("supply_requests").delete().not("id", "is", null);
  await db.from("cleaning_requests").delete().not("id", "is", null);
  await db.from("access_tokens").delete().not("id", "is", null);
  await db.from("staff_assignments").delete().not("staff_id", "is", null);
  await db.from("staff").delete().not("id", "is", null);
  await db.from("properties").delete().not("id", "is", null);
  await db.from("owners").delete().not("id", "is", null);

  // ---- デモデータを投入 ----
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
      .insert({ id: created.user!.id, email: ADMIN_EMAIL, name: "管理者（デモ）" });
  }

  const { data: owner } = await db.from("owners").insert({ name: OWNER_NAME }).select().single();
  const { data: property } = await db
    .from("properties")
    .insert({
      owner_id: owner!.id,
      name: PROPERTY_NAME,
      address: "東京都渋谷区代々木1-2-3",
      access_info_note: "チェックイン15:00 / チェックアウト11:00",
      checklist_template: CHECKLIST,
    })
    .select()
    .single();
  const { data: staff } = await db.from("staff").insert({ name: STAFF_NAME }).select().single();
  await db.from("staff_assignments").insert({ staff_id: staff!.id, property_id: property!.id });
  const staffToken = randomBytes(32).toString("base64url");
  await db.from("access_tokens").insert({ token: staffToken, type: "staff", staff_id: staff!.id });
  const ownerToken = randomBytes(32).toString("base64url");
  await db
    .from("access_tokens")
    .insert({ token: ownerToken, type: "owner", property_id: property!.id });

  // ---- オートズーム用トラッキング ----
  const VIEW_W = 1280;
  const VIEW_H = 800;
  const track: { t: number; label: string; cx: number; cy: number; w: number; h: number }[] = [];
  let t0 = 0;
  // 操作する要素までスクロールし、viewport 内の中心座標(正規化)とサイズを記録
  async function rec(loc: Locator, label: string) {
    const el = loc.first();
    try {
      await el.scrollIntoViewIfNeeded();
    } catch {
      /* noop */
    }
    await beat(300);
    const b = await el.boundingBox();
    if (b) {
      track.push({
        t: Date.now() - t0,
        label,
        cx: (b.x + b.width / 2) / VIEW_W,
        cy: (b.y + b.height / 2) / VIEW_H,
        w: b.width / VIEW_W,
        h: b.height / VIEW_H,
      });
    }
  }

  // ============ シーン1: 管理者ログイン ============
  t0 = Date.now(); // video の実質開始基準
  await page.goto("/admin/login");
  await page.waitForLoadState("networkidle");
  await beat();
  await page.fill('[name="email"]', ADMIN_EMAIL);
  await beat(500);
  await page.fill('[name="password"]', ADMIN_PASSWORD);
  await beat(500);
  await rec(page.locator('button[type="submit"]'), "login");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin");
  await page.waitForLoadState("networkidle");
  await beat(1600);

  // ============ シーン2: 清掃依頼を作成 ============
  await page.goto("/admin/requests");
  await page.waitForLoadState("networkidle");
  await beat();
  await rec(page.locator("select:visible"), "form-select");
  await page.locator("select:visible").first().selectOption({ label: PROPERTY_NAME });
  await beat(500);
  await page.fill('input[type="date"] >> nth=0', dateStr(3));
  await beat(350);
  await page.fill('input[type="date"] >> nth=1', dateStr(5));
  await beat(350);
  await page.fill('input[type="number"]', "2");
  await beat(500);
  await rec(page.locator('button:has-text("依頼を作成")'), "create-btn");
  await page.click('button:has-text("依頼を作成")');
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("cell", { name: PROPERTY_NAME })).toBeVisible();
  await beat(1600);

  // ============ シーン3: スタッフがトークンURLで承認 ============
  await page.goto(`/staff/${staffToken}`);
  await page.waitForLoadState("networkidle");
  await beat(1200);
  await rec(page.getByRole("button", { name: "承認する" }).first(), "approve");
  await page.getByRole("button", { name: "承認する" }).first().click();
  await page.waitForLoadState("networkidle");
  await beat(1400);

  // 依頼詳細へ
  await page.locator('a[href*="/requests/"]').first().click();
  await page.waitForLoadState("networkidle");
  await beat();

  // ============ シーン4: 清掃を開始 → チェックリスト ============
  await rec(page.locator('button:has-text("清掃を開始する")'), "start");
  await page.click('button:has-text("清掃を開始する")');
  await page.waitForLoadState("networkidle");
  await expect(page.locator("h3", { hasText: "作業チェックリスト" })).toBeVisible();
  await beat(1000);
  await rec(page.locator("h3", { hasText: "作業チェックリスト" }), "checklist");
  for (const item of CHECKLIST) {
    await page.getByRole("button", { name: item.label }).click();
    await beat(650);
  }

  // ============ シーン5: 備品連絡 ============
  await rec(page.locator("textarea"), "supply");
  await page.fill("textarea", "トイレットペーパー 6ロール、ハンドソープ 2本、ゴミ袋 1束");
  await beat(800);
  await page.click('button:has-text("備品補充を依頼する")');
  await expect(page.locator("text=送信しました")).toBeVisible();
  await beat(1400);

  // 完了報告を送信
  await rec(page.locator('button:has-text("報告を送信する")'), "report");
  await page.click('button:has-text("報告を送信する")');
  await page.waitForLoadState("networkidle");
  await expect(page.locator("text=完了報告を送信しました")).toBeVisible();
  await beat(1600);

  // ============ シーン6: 管理者が報告を確認 ============
  await page.goto("/admin/requests");
  await page.waitForLoadState("networkidle");
  await beat();
  await page.getByRole("link", { name: "詳細 →" }).first().click();
  await page.waitForLoadState("networkidle");
  await beat(1000);
  await rec(page.locator('button:has-text("内容を確認済みにする")'), "confirm");
  await page.click('button:has-text("内容を確認済みにする")');
  await page.waitForLoadState("networkidle");
  await expect(page.locator("text=確認済み").first()).toBeVisible();
  await beat(1800);

  // ============ おまけ: オーナーがトークンURLで履歴閲覧（引きで全体）============
  await page.goto(`/property/${ownerToken}`);
  await page.waitForLoadState("networkidle");
  await beat(2400);

  // ---- トラックを出力（Remotion が読む）----
  const totalMs = Date.now() - t0;
  writeFileSync(
    join(process.cwd(), "..", "demo-video", "src", "zoom-track.json"),
    JSON.stringify({ playback: 1.5, totalMs, events: track }, null, 2),
  );
});
