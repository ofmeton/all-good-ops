/**
 * 既存 app/e2e/request-flow.spec.ts の flow を「営業デモ用」に再演し、
 * Playwright recordVideo で 1 本の webm に録画する。
 * 並行で scene の startMs/endMs を記録 (output/recordings/timings.json)。
 *
 * 前提:
 *   - npm run seed が成功し output/seed-result.json が存在
 *   - app 側 dev server が http://localhost:3100 で起動済
 *
 * 出力:
 *   output/recordings/full.webm
 *   output/recordings/timings.json
 */

import { chromium, type Browser, type Page } from "playwright";
import { readFileSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import type { SceneId } from "./scenes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "output");
const recordingsDir = join(outDir, "recordings");
mkdirSync(recordingsDir, { recursive: true });

const seed = JSON.parse(
  readFileSync(join(outDir, "seed-result.json"), "utf-8"),
) as {
  admin: { email: string; password: string };
  property: { name: string };
  staff: { token: string };
};

const BASE_URL = process.env.DEMO_BASE_URL || "http://localhost:3100";

type SceneTiming = { startMs: number; endMs: number };
const timings: Partial<Record<SceneId, SceneTiming>> = {};
let recordingStartedAt = 0;

function nowMs(): number {
  return Date.now() - recordingStartedAt;
}

function dateStr(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

async function captureScene<T>(
  id: SceneId,
  fn: () => Promise<T>,
): Promise<T> {
  const startMs = nowMs();
  console.log(`[record] scene start: ${id} @ ${startMs}ms`);
  const result = await fn();
  // 末尾に「結果を見せる」余白を 800ms 付与（カット時に表示が切れない保険）
  await sleep(800);
  const endMs = nowMs();
  timings[id] = { startMs, endMs };
  console.log(`[record] scene end:   ${id} @ ${endMs}ms (${endMs - startMs}ms)`);
  return result;
}

async function adminCreateRequest(page: Page) {
  // 前提: 既にログイン済みの想定で /admin/requests を開く
  await page.goto(`${BASE_URL}/admin/requests`);
  await page.waitForLoadState("networkidle");
  await sleep(600);
  await page.selectOption("select", { label: seed.property.name });
  await sleep(400);
  await page.fill('input[type="date"] >> nth=0', dateStr(3));
  await sleep(300);
  await page.fill('input[type="date"] >> nth=1', dateStr(5));
  await sleep(300);
  await page.fill('input[type="number"]', "2");
  await sleep(300);
  await page.click('button:has-text("依頼を作成")');
  await page.waitForLoadState("networkidle");
  await page.locator("li", { hasText: seed.property.name }).first().waitFor();
}

async function staffAcceptAndStart(page: Page) {
  await page.goto(`${BASE_URL}/staff/${seed.staff.token}`);
  await page.waitForLoadState("networkidle");
  await sleep(800);
  await page.click('button:has-text("この依頼を承認する")');
  await page.waitForLoadState("networkidle");
  await sleep(600);
  // 詳細を開いて開始
  await page.click(`a:has-text("${seed.property.name}")`);
  await page.waitForLoadState("networkidle");
  await sleep(400);
  await page.click('button:has-text("清掃を開始する")');
  await page.waitForLoadState("networkidle");
  await page
    .locator("h2", { hasText: "チェックリスト" })
    .waitFor();
}

async function staffSubmitReport(page: Page) {
  // チェックリストの全項目を順にチェック（視覚的に進捗を見せる）
  const checkboxes = page.locator('input[type="checkbox"]');
  const count = await checkboxes.count();
  for (let i = 0; i < count; i++) {
    await checkboxes.nth(i).check();
    await sleep(220);
  }
  await sleep(400);
  await page.click('button:has-text("完了報告を提出する")');
  await page.waitForLoadState("networkidle");
  await page.locator("text=報告済み").waitFor();
}

async function adminConfirm(page: Page) {
  await page.goto(`${BASE_URL}/admin/requests`);
  await page.waitForLoadState("networkidle");
  await sleep(500);
  await page.click(`a:has-text("${seed.property.name}")`);
  await page.waitForLoadState("networkidle");
  await sleep(400);
  await page.locator("h2", { hasText: "完了報告" }).waitFor();
  await page.click('button:has-text("内容を確認済みにする")');
  await page.waitForLoadState("networkidle");
  await page.locator("text=確認済み").waitFor();
}

async function adminLogin(page: Page) {
  await page.goto(`${BASE_URL}/admin/login`);
  await page.fill('[name="email"]', seed.admin.email);
  await page.fill('[name="password"]', seed.admin.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin");
  await page.waitForLoadState("networkidle");
}

async function main() {
  console.log(`[record] start. base=${BASE_URL}`);
  const browser: Browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: recordingsDir,
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();

  // 録画は context 作成時から始まっている。基準時刻を取る
  recordingStartedAt = Date.now();

  // 0. ログイン（録画には含めるが scene 化はしない -> intro overlay で覆う）
  await adminLogin(page);

  // 2. admin-create-request
  await captureScene("admin-create-request", () => adminCreateRequest(page));

  // 4. staff-accept-start
  await captureScene("staff-accept-start", () => staffAcceptAndStart(page));

  // 5. staff-report
  await captureScene("staff-report", () => staffSubmitReport(page));

  // 6. admin-confirm
  await captureScene("admin-confirm", () => adminConfirm(page));

  // page.video() は page.close() 前に capture（参照を取るだけ）
  const video = page.video();
  await page.close();
  await context.close();
  // path() は context.close() 後に確定する
  const rawPath = video ? await video.path() : null;
  await browser.close();

  if (rawPath) {
    const finalPath = join(recordingsDir, "full.webm");
    renameSync(rawPath, finalPath);
    console.log(`[record] video saved -> ${finalPath}`);
  } else {
    console.warn("[record] video path 取得失敗。recordingsDir 内の最新 .webm を手動で full.webm にリネームしてください");
  }

  writeFileSync(
    join(recordingsDir, "timings.json"),
    JSON.stringify(timings, null, 2),
  );
  console.log(`[record] timings saved -> ${join(recordingsDir, "timings.json")}`);
}

main().catch((e) => {
  console.error("[record] failed:", e);
  process.exit(1);
});
