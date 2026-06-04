// 観測ダッシュボードのスモークテスト。
// 実行: deploy 後に SMOKE_URL を指定（または local: npm run dev 起動後 http://localhost:3000）。
//   SMOKE_URL=<url> BASIC_AUTH_USER=<u> BASIC_AUTH_PASS=<p> npx playwright test tests/smoke.spec.ts
// 前提: @playwright/test を devDependency に追加し `npx playwright install` 済み。
import { test, expect } from "@playwright/test";

const BASE = process.env.SMOKE_URL ?? "http://localhost:3000";
const A = {
  username: process.env.BASIC_AUTH_USER ?? "admin",
  password: process.env.BASIC_AUTH_PASS ?? "admin",
};

test("トップに工程図(React Flow)が描画される", async ({ page }) => {
  await page.context().setHTTPCredentials(A);
  await page.goto(BASE);
  await expect(page.locator(".react-flow")).toBeVisible();
});

test("/runs が開ける", async ({ page }) => {
  await page.context().setHTTPCredentials(A);
  await page.goto(BASE + "/runs");
  await expect(page.getByText("Runs")).toBeVisible();
});

test("Basic 認証が無いと 401", async ({ request }) => {
  const res = await request.get(BASE, { headers: {} });
  expect(res.status()).toBe(401);
});
