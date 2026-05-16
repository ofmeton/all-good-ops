#!/usr/bin/env node
// Responsive snapshot tool — see scripts/responsive-snap.sh for the wrapper.
//
// Output per run:
//   <out>/manifest.json         meta: base, pages, viewports, started_at, finished_at
//   <out>/report.json           per page+viewport: overflow, scrollWidth, console errors
//   <out>/<page>-<viewport>.png full-page screenshots
//   stdout: summary table
//
// Conventions inherited from existing memory:
//   - fade-up は強制可視化（feedback_playwright_animation_screenshot）
//   - fonts.ready + 1s 待機
//   - reveal の中断状態を画像にしない

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const VIEWPORT_PRESETS = {
  default: [
    { name: "320", width: 320, height: 720 },   // iPhone SE 縦最小
    { name: "390", width: 390, height: 844 },   // iPhone 14
    { name: "768", width: 768, height: 1024 },  // iPad mini portrait
    { name: "1024", width: 1024, height: 768 }, // iPad landscape / 小型 laptop
    { name: "1440", width: 1440, height: 900 }, // 一般 desktop
    { name: "1920", width: 1920, height: 1080 } // 大型 desktop
  ],
  lp: [
    { name: "390", width: 390, height: 844 },
    { name: "768", width: 768, height: 1024 },
    { name: "1280", width: 1280, height: 800 },
    { name: "1440", width: 1440, height: 900 }
  ],
  mobile: [
    { name: "320", width: 320, height: 720 },
    { name: "375", width: 375, height: 812 },
    { name: "390", width: 390, height: 844 },
    { name: "430", width: 430, height: 932 }
  ]
};

function parseArgs(argv) {
  const out = { base: null, pages: ["/"], out: null, viewports: "default" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--base") out.base = argv[++i];
    else if (a === "--pages") out.pages = argv[++i].split(",").map(p => p.trim()).filter(Boolean);
    else if (a === "--out") out.out = argv[++i];
    else if (a === "--viewports") out.viewports = argv[++i];
  }
  if (!out.base) throw new Error("--base <url> is required");
  if (!out.out) throw new Error("--out <dir> is required");
  if (!VIEWPORT_PRESETS[out.viewports]) {
    throw new Error(`Unknown --viewports preset: ${out.viewports}. Choose: ${Object.keys(VIEWPORT_PRESETS).join(", ")}`);
  }
  return out;
}

function pageSlug(p) {
  const trimmed = p.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!trimmed) return "home";
  return trimmed.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

async function snapPage(browser, baseUrl, pagePath, viewport, outDir) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("pageerror", e => consoleErrors.push({ type: "pageerror", text: String(e?.message ?? e) }));
  page.on("console", msg => {
    if (msg.type() === "error") consoleErrors.push({ type: "console.error", text: msg.text() });
  });

  const url = baseUrl.replace(/\/+$/, "") + pagePath;
  const navStart = Date.now();
  let navError = null;
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  } catch (e) {
    navError = String(e?.message ?? e);
  }

  // fonts ready + animation force visible
  await page.evaluate(async () => {
    try { await document.fonts.ready; } catch {}
    document.querySelectorAll(".fade-up").forEach(el => {
      el.style.opacity = "1";
      el.style.animation = "none";
    });
  }).catch(() => {});

  // Trigger lazy-loaded images by scrolling through the page.
  // next/image and other Intersection Observer-based loaders won't fire
  // for content below the fold during fullPage screenshot otherwise.
  await page.evaluate(async () => {
    const totalHeight = document.body.scrollHeight;
    const step = Math.max(400, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y <= totalHeight + step; y += step) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
  }).catch(() => {});

  // Wait for any in-flight image decoding
  await page.evaluate(async () => {
    const imgs = Array.from(document.querySelectorAll("img"));
    await Promise.all(imgs.map(i => i.complete ? Promise.resolve() : new Promise(r => {
      i.addEventListener("load", r, { once: true });
      i.addEventListener("error", r, { once: true });
    })));
  }).catch(() => {});
  await page.waitForTimeout(500);

  // Metrics: horizontal overflow and dimensions
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const scrollWidth = doc.scrollWidth;
    const clientWidth = doc.clientWidth;
    const innerWidth = window.innerWidth;
    const overflow = scrollWidth > innerWidth + 1; // +1 px tolerance
    // Find offending elements (top 5 by right edge)
    let offenders = [];
    if (overflow) {
      const all = document.querySelectorAll("body *");
      const rights = [];
      for (const el of all) {
        const r = el.getBoundingClientRect();
        if (r.right > innerWidth + 1 && r.width > 0) {
          rights.push({
            right: Math.round(r.right),
            width: Math.round(r.width),
            tag: el.tagName.toLowerCase(),
            cls: (el.className && typeof el.className === "string"
              ? el.className.slice(0, 80)
              : "")
          });
        }
      }
      rights.sort((a, b) => b.right - a.right);
      offenders = rights.slice(0, 5);
    }
    return { scrollWidth, clientWidth, innerWidth, overflow, offenders };
  }).catch(e => ({ error: String(e?.message ?? e) }));

  const slug = pageSlug(pagePath);
  const file = `${slug}-${viewport.name}.png`;
  const filePath = resolve(outDir, file);

  let screenshotError = null;
  try {
    await page.screenshot({ path: filePath, fullPage: true });
  } catch (e) {
    screenshotError = String(e?.message ?? e);
  }

  const result = {
    page: pagePath,
    slug,
    viewport: viewport.name,
    viewport_px: { w: viewport.width, h: viewport.height },
    url,
    elapsed_ms: Date.now() - navStart,
    nav_error: navError,
    screenshot: screenshotError ? null : file,
    screenshot_error: screenshotError,
    console_errors: consoleErrors,
    ...metrics
  };

  await context.close();
  return result;
}

function summaryTable(results) {
  const rows = [];
  // Group by page; columns = viewports
  const pages = [...new Set(results.map(r => r.slug))];
  const viewports = [...new Set(results.map(r => r.viewport))];

  const header = ["page", ...viewports].join(" | ");
  rows.push(header);
  rows.push(header.replace(/[^|]/g, "-"));

  for (const pg of pages) {
    const cells = [pg];
    for (const vp of viewports) {
      const r = results.find(x => x.slug === pg && x.viewport === vp);
      if (!r) cells.push("--");
      else if (r.nav_error) cells.push("ERR");
      else if (r.overflow) cells.push(`OF+${r.scrollWidth - r.innerWidth}`);
      else if (r.console_errors?.length) cells.push(`!${r.console_errors.length}`);
      else cells.push("ok");
    }
    rows.push(cells.join(" | "));
  }
  return rows.join("\n");
}

async function main() {
  const { base, pages, out, viewports } = parseArgs(process.argv.slice(2));
  const viewportList = VIEWPORT_PRESETS[viewports];

  mkdirSync(out, { recursive: true });

  const startedAt = new Date().toISOString();
  const browser = await chromium.launch();

  const results = [];
  for (const p of pages) {
    for (const vp of viewportList) {
      process.stderr.write(`  snap ${p} @ ${vp.name}...`);
      const t0 = Date.now();
      const r = await snapPage(browser, base, p, vp, out);
      const dt = Date.now() - t0;
      process.stderr.write(` ${r.overflow ? `OVERFLOW(+${r.scrollWidth - r.innerWidth}px)` : "ok"} (${dt}ms)\n`);
      results.push(r);
    }
  }

  await browser.close();
  const finishedAt = new Date().toISOString();

  const manifest = {
    base,
    pages,
    viewports: viewportList.map(v => v.name),
    preset: viewports,
    started_at: startedAt,
    finished_at: finishedAt,
    total_snapshots: results.length
  };
  writeFileSync(resolve(out, "manifest.json"), JSON.stringify(manifest, null, 2));
  writeFileSync(resolve(out, "report.json"), JSON.stringify(results, null, 2));

  // Print summary
  const overflowCount = results.filter(r => r.overflow).length;
  const errCount = results.filter(r => r.nav_error).length;
  const consoleErrTotal = results.reduce((s, r) => s + (r.console_errors?.length || 0), 0);

  const summary = summaryTable(results);
  process.stdout.write("\n" + summary + "\n\n");
  process.stdout.write(`Snapshots: ${results.length}  Overflow: ${overflowCount}  NavErrors: ${errCount}  ConsoleErrors: ${consoleErrTotal}\n`);
  process.stdout.write(`Output:    ${out}\n`);

  // Exit code: non-zero if any overflow / nav error / console error
  if (overflowCount > 0 || errCount > 0) process.exit(2);
  if (consoleErrTotal > 0) process.exit(1);
}

main().catch(e => {
  console.error("snap.mjs failed:", e);
  process.exit(99);
});
