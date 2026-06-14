import { chromium } from "playwright";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const BRIDGE_URL = process.env.BRIDGE_URL || "http://localhost:3001/";
export const DAEMON_ORIGIN = process.env.WEB_UI_BRIDGE_DAEMON || "http://localhost:7331";
export const TERRA_DIR = process.env.TERRA_DIR
  || "/Users/rikukudo/Projects/private-agents/all-good-ops/outputs/clients/terra-isshiki/site";
export const headless = !process.env.HEADED && process.env.HEADLESS !== "0" && process.env.HEADLESS !== "false";

const requireFromDaemon = createRequire(new URL("../daemon/package.json", import.meta.url));
const babelParser = requireFromDaemon("@babel/parser");

const SOURCE_EXT = new Set([".js", ".jsx", ".ts", ".tsx", ".css", ".json", ".mjs", ".cjs"]);
const JSX_EXT = new Set([".jsx", ".tsx"]);
const SKIP_DIRS = new Set([".git", ".next", "node_modules", "dist", "build", "coverage"]);
const BRIDGE_META = new Set([
  ".web-ui-bridge-token",
  ".web-ui-bridge-history.json",
  ".claude-ui-queue.jsonl",
]);
const DEV_NOISE_RE = /hydrat|hydration-mismatch|Download the React DevTools|\[Fast Refresh\]|webpack-hmr/i;
export const ignoredDevNoise = [];

export function formatFailure(detail) {
  if (!detail) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map(formatFailure).filter(Boolean).join("\n    ");
  if (detail.mismatch) return formatMismatch(detail.mismatch);
  try { return JSON.stringify(detail); } catch { return String(detail); }
}

export function formatMismatch(mismatch) {
  return mismatch.map((m) => {
    const selector = m.selector ? ` selector=${m.selector}` : "";
    const delta = m.delta ? ` delta=${JSON.stringify(m.delta)}` : "";
    const reason = m.reason ? ` reason=${m.reason}` : "";
    return `kind=${m.kind}${selector}${delta}${reason}`;
  }).join("\n    ");
}

export async function launchBrowser() {
  return chromium.launch({ headless });
}

export async function withProbePage(browser, fn, options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport || { width: 1440, height: 820 },
  });
  const page = await context.newPage();
  const errors = [];
  const recordError = (kind, text) => {
    if (DEV_NOISE_RE.test(text)) {
      ignoredDevNoise.push({ kind, text: text.slice(0, 300) });
      return;
    }
    errors.push({ kind, text });
  };
  page.on("console", (msg) => {
    if (msg.type() === "error") recordError("console.error", msg.text());
  });
  page.on("pageerror", (error) => {
    recordError("pageerror", error.stack || error.message);
  });

  try {
    await page.goto(options.url || BRIDGE_URL, { waitUntil: "networkidle" });
    await waitForOverlay(page);
    await installPageHelpers(page);
    const targets = await page.evaluate(() => window.__wubProbe.markTargets());
    const value = await fn({ page, errors, targets });
    await assertNoPageErrors(errors);
    return value;
  } finally {
    await context.close();
  }
}

export async function waitForOverlay(page) {
  await page.waitForFunction(
    () => !!document.getElementById("web-ui-bridge-root")?.shadowRoot
      && typeof window.__webUiBridgeAssert === "function",
    { timeout: 15000 },
  );
}

export async function installPageHelpers(page) {
  await page.evaluate(() => {
    const host = () => document.getElementById("web-ui-bridge-root");
    const root = () => host()?.shadowRoot;
    const ours = (el) => el === host() || !!(el?.closest && el.closest("#web-ui-bridge-root"));
    const doubleRaf = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();

    const cssPath = (el) => {
      const parts = [];
      let node = el;
      while (node && node.nodeType === 1 && node !== document.body && parts.length < 8) {
        let sel = node.tagName.toLowerCase();
        const parent = node.parentElement;
        if (parent) {
          const sameTag = [...parent.children].filter((c) => c.tagName === node.tagName);
          if (sameTag.length > 1) sel += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
        }
        parts.unshift(sel);
        node = parent;
      }
      return parts.join(" > ");
    };
    const visibleRect = (el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 40
        && rect.height > 20
        && rect.bottom > 0
        && rect.right > 0
        && rect.top < window.innerHeight
        && rect.left < window.innerWidth;
    };
    const usable = (el) => {
      if (!(el instanceof HTMLElement) || ours(el)) return false;
      if (!el.getAttribute("class")) return false;
      if (["SCRIPT", "STYLE", "META", "LINK", "HTML", "BODY"].includes(el.tagName)) return false;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.position === "fixed") return false;
      return visibleRect(el);
    };
    const candidates = () => {
      const scope = document.querySelector("main") || document.body;
      return [...scope.querySelectorAll("*")].filter(usable);
    };
    const point = (el) => {
      const rect = el.getBoundingClientRect();
      return {
        x: Math.max(1, Math.min(window.innerWidth - 2, rect.left + rect.width / 2)),
        y: Math.max(1, Math.min(window.innerHeight - 2, rect.top + rect.height / 2)),
      };
    };
    const dispatchMouse = (type, target, init = {}) => {
      const el = typeof target === "string" ? document.querySelector(target) : target;
      if (!el) throw new Error(`Mouse target not found: ${target}`);
      const p = init.clientX == null || init.clientY == null ? point(el) : { x: init.clientX, y: init.clientY };
      el.dispatchEvent(new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: p.x,
        clientY: p.y,
        metaKey: !!init.metaKey,
        ctrlKey: !!init.ctrlKey,
        shiftKey: !!init.shiftKey,
        altKey: !!init.altKey,
        button: init.button ?? 0,
        buttons: init.buttons ?? (type === "mousedown" || type === "mousemove" ? 1 : 0),
        ...init,
      }));
    };
    const dispatchKey = (key, init = {}) => {
      document.dispatchEvent(new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        composed: true,
        key,
        code: init.code || key,
        metaKey: !!init.metaKey,
        ctrlKey: !!init.ctrlKey,
        shiftKey: !!init.shiftKey,
        altKey: !!init.altKey,
      }));
    };
    const clickShadow = (selector) => {
      const el = root()?.querySelector(selector);
      if (!el) throw new Error(`Overlay control not found: ${selector}`);
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, composed: true }));
      return el.textContent || el.getAttribute("title") || selector;
    };
    const ensureSelectMode = () => {
      const btn = root()?.querySelector(".t-select");
      if (!btn) throw new Error("Overlay select tool not found");
      if (!btn.classList.contains("on")) btn.click();
    };
    const shadowValue = (selector, value, eventType = "input") => {
      const el = root()?.querySelector(selector);
      if (!el) throw new Error(`Overlay input not found: ${selector}`);
      el.value = value;
      el.dispatchEvent(new Event(eventType, { bubbles: true, composed: true }));
    };
    const target = (name) => {
      const el = [...document.querySelectorAll("[data-wub-probe-names]")]
        .find((node) => (node.getAttribute("data-wub-probe-names") || "").split(/\s+/).includes(name));
      if (!el) throw new Error(`Probe target not found: ${name}`);
      return el;
    };
    const classify = (el, name) => ({
      name,
      selector: cssPath(el),
      tag: el.tagName.toLowerCase(),
      classes: el.getAttribute("class") || "",
      text: norm(el.textContent).slice(0, 120),
      parent: el.parentElement ? cssPath(el.parentElement) : null,
      rect: (() => {
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, width: r.width, height: r.height };
      })(),
    });
    const firstInViewport = (all) => all.find((el) => {
      const rect = el.getBoundingClientRect();
      return rect.top > 120 && rect.top < 480 && rect.width > 40 && rect.height > 20;
    }) || all.find((el) => {
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight && rect.width > 80 && rect.height > 20;
    }) || all[0];
    const addName = (el, name) => {
      const names = new Set((el.getAttribute("data-wub-probe-names") || "").split(/\s+/).filter(Boolean));
      names.add(name);
      el.setAttribute("data-wub-probe-names", [...names].join(" "));
      if (!el.getAttribute("data-wub-probe")) el.setAttribute("data-wub-probe", name);
    };
    const markTargets = () => {
      window.scrollTo(0, 0);
      document.querySelectorAll("[data-wub-probe], [data-wub-probe-names]").forEach((el) => {
        el.removeAttribute("data-wub-probe");
        el.removeAttribute("data-wub-probe-names");
      });
      const all = candidates();
      const primary = firstInViewport(all);
      if (!primary) throw new Error("No primary target found: need a classed, visible, non-fixed element in main/body.");
      const siblings = all.filter((el) => el !== primary && el.parentElement === primary.parentElement);
      const secondary = siblings[0] || all.find((el) => el !== primary);
      if (!secondary) throw new Error("No secondary target found.");
      const tertiary = siblings.find((el) => el !== secondary) || all.find((el) => el !== primary && el !== secondary);
      if (!tertiary) throw new Error("No tertiary target found.");
      const text = all.find((el) => el !== primary && /^(p|span|a|button|h[1-6])$/i.test(el.tagName) && norm(el.textContent).length >= 2)
        || all.find((el) => /^(p|span|a|button|h[1-6])$/i.test(el.tagName) && norm(el.textContent).length >= 2)
        || primary;
      const nav = [...document.querySelectorAll("nav a, header a, main a")].find((el) => usable(el) && el !== primary)
        || [...document.querySelectorAll("nav a, header a, main a")].find(usable)
        || text;
      const drop = all.find((el) => el !== primary && el !== secondary && !primary.contains(el) && !el.contains(primary))
        || tertiary;

      addName(primary, "primary");
      addName(secondary, "secondary");
      addName(tertiary, "tertiary");
      addName(text, "text");
      addName(nav, "nav");
      addName(drop, "drop");
      return {
        primary: classify(primary, "primary"),
        secondary: classify(secondary, "secondary"),
        tertiary: classify(tertiary, "tertiary"),
        text: classify(text, "text"),
        nav: classify(nav, "nav"),
        drop: classify(drop, "drop"),
      };
    };
    const classMatches = (el, spec) => {
      if (!(el instanceof HTMLElement) || ours(el)) return false;
      const cls = el.getAttribute("class") || "";
      if (spec.exact != null && cls !== spec.exact) return false;
      if (spec.includes && !spec.includes.every((part) => cls.includes(part))) return false;
      if (spec.tag && el.tagName.toLowerCase() !== spec.tag) return false;
      if (spec.text && !norm(el.textContent).includes(spec.text)) return false;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      return visibleRect(el);
    };
    const markClassTargets = (mapping) => {
      for (const [name, spec] of Object.entries(mapping)) {
        const scope = spec.scope ? document.querySelector(spec.scope) : document;
        if (!scope) throw new Error(`Target scope not found for ${name}: ${spec.scope}`);
        const raw = [...scope.querySelectorAll(spec.query || "*")];
        const all = raw.filter((el) => classMatches(el, spec));
        const el = all[spec.index || 0];
        if (!el) {
          const samples = raw.slice(0, 8).map((node) => ({
            tag: node.tagName?.toLowerCase(),
            className: node.getAttribute?.("class") || "",
            text: norm(node.textContent).slice(0, 60),
          }));
          throw new Error(`Class target not found: ${name} ${JSON.stringify({
            spec,
            rawCount: raw.length,
            matchedCount: all.length,
            samples,
          })}`);
        }
        addName(el, name);
      }
      return Object.fromEntries(Object.keys(mapping).map((name) => [name, classify(target(name), name)]));
    };
    const select = async (name, init = {}) => {
      ensureSelectMode();
      const el = target(name);
      dispatchMouse("click", el, init);
      await doubleRaf();
      const state = overlayState();
      const primary = state.selectionBoxes.find((box) => box.primary);
      if (!primary) throw new Error(`Selection failed for ${name}: .hl2.primary did not appear`);
      if (state.selectionBoxes.length < 1) throw new Error(`Selection failed for ${name}: no .hl2 selection box`);
      return state;
    };
    const hover = async (name) => {
      dispatchMouse("mousemove", target(name));
      await doubleRaf();
    };
    const hoverOther = async () => {
      const marked = new Set([...document.querySelectorAll("[data-wub-probe-names]")]);
      const el = candidates().find((c) => !marked.has(c));
      if (!el) throw new Error("No unselected hover target found.");
      dispatchMouse("mousemove", el);
      await doubleRaf();
      return classify(el, "hover-other");
    };
    const replacePrimary = async () => {
      const el = target("primary");
      const clone = el.cloneNode(true);
      el.replaceWith(clone);
      await doubleRaf();
    };
    const overlayState = () => {
      const sr = root();
      const visible = (el) => !!el && getComputedStyle(el).display !== "none";
      const rectOf = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, width: r.width, height: r.height, display: getComputedStyle(el).display };
      };
      return {
        selectionBoxes: [...sr.querySelectorAll(".hl2")].filter(visible).map((el) => ({
          primary: el.classList.contains("primary"),
          rect: rectOf(el),
        })),
        chips: [...sr.querySelectorAll(".chip")].map((el) => ({
          primary: el.classList.contains("primary"),
          text: norm(el.textContent),
        })),
        tabs: [...sr.querySelectorAll(".tab[data-tab]")].map((el) => ({
          tab: el.dataset.tab,
          on: el.classList.contains("on"),
          text: norm(el.textContent),
        })),
        bp: [...sr.querySelectorAll(".bpseg button")].map((el) => ({ bp: el.dataset.bp, on: el.classList.contains("on") })),
        stateButtons: [...sr.querySelectorAll(".state-ctl button[data-state]")].map((el) => ({ state: el.dataset.state, on: el.classList.contains("on") })),
        inspectorOpen: sr.querySelector(".inspector")?.classList.contains("show") || false,
        launcherOpen: sr.querySelector(".launcher")?.classList.contains("show") || false,
        moveDisabled: !!sr.querySelector(".t-move")?.disabled,
        hoverVisible: visible(sr.querySelector(".hl")),
        droplineVisible: visible(sr.querySelector(".dropline")),
        toast: (() => {
          const el = sr.querySelector(".toast");
          return { text: norm(el?.textContent), display: el ? getComputedStyle(el).display : "none", className: el?.className || "" };
        })(),
        bodyText: norm(sr.querySelector(".body")?.textContent).slice(0, 800),
      };
    };
    const assertSelection = (expected) => {
      const s = overlayState();
      const boxes = s.selectionBoxes.length;
      const chips = s.chips.length;
      if (boxes !== expected) throw new Error(`selection box count ${boxes}, expected ${expected}`);
      if (expected >= 2 && chips !== expected) throw new Error(`selection chip count ${chips}, expected ${expected}`);
      const primaries = s.selectionBoxes.filter((b) => b.primary).length;
      if (expected > 0 && primaries !== 1) throw new Error(`primary selection count ${primaries}, expected 1`);
      return s;
    };
    const dragTo = async (fromName, toName, { mouseup = false, offsetY = 0 } = {}) => {
      const from = target(fromName);
      const to = target(toName);
      from.scrollIntoView({ block: "center", inline: "center" });
      to.scrollIntoView({ block: "center", inline: "center" });
      await doubleRaf();
      const start = point(from);
      dispatchMouse("mousedown", from, { clientX: start.x, clientY: start.y });
      document.dispatchEvent(new MouseEvent("mousemove", {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: start.x + 12,
        clientY: start.y + 12,
        buttons: 1,
      }));
      const p = point(to);
      document.dispatchEvent(new MouseEvent("mousemove", {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: p.x,
        clientY: p.y + offsetY,
        buttons: 1,
      }));
      await doubleRaf();
      if (mouseup) {
        document.dispatchEvent(new MouseEvent("mouseup", {
          bubbles: true,
          cancelable: true,
          composed: true,
          clientX: p.x,
          clientY: p.y + offsetY,
        }));
        await doubleRaf();
      }
      return overlayState();
    };
    const idleRafCount = async () => {
      const original = window.requestAnimationFrame;
      let count = 0;
      window.requestAnimationFrame = function wrappedRequestAnimationFrame(callback) {
        count += 1;
        return original.call(this, callback);
      };
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return count;
      } finally {
        window.requestAnimationFrame = original;
      }
    };

    window.__wubProbe = {
      doubleRaf,
      markTargets,
      markClassTargets,
      select,
      hover,
      hoverOther,
      replacePrimary,
      clickShadow,
      shadowValue,
      dispatchKey,
      dispatchMouse,
      overlayState,
      assertSelection,
      dragTo,
      idleRafCount,
      scrollBy: async (x, y) => { window.scrollBy(x, y); await doubleRaf(); },
      resizeMarker: () => markTargets(),
    };
  });
}

export async function inPage(page, fn, arg) {
  return page.evaluate(fn, arg);
}

export async function doubleRaf(page) {
  await page.evaluate(() => window.__wubProbe.doubleRaf());
}

export async function assertTracked(page) {
  const mismatch = await page.evaluate(async () => {
    await window.__wubProbe.doubleRaf();
    return window.__webUiBridgeAssert();
  });
  if (mismatch.length) {
    const error = new Error(formatMismatch(mismatch));
    error.detail = { mismatch };
    throw error;
  }
  return [];
}

export async function assertNoPageErrors(errors) {
  if (!errors.length) return;
  const error = new Error(errors.map((e) => `${e.kind}: ${e.text}`).join("\n"));
  error.detail = { errors };
  throw error;
}

export async function runProbe(name, fn) {
  try {
    const detail = await fn();
    return { name, ok: true, detail };
  } catch (error) {
    return {
      name,
      ok: false,
      detail: error.detail || { message: error.message, stack: error.stack },
    };
  }
}

export async function listFiles(rootDir = TERRA_DIR, predicate = () => true) {
  const out = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") && !BRIDGE_META.has(entry.name)) {
        if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
      }
      const full = path.join(dir, entry.name);
      const rel = path.relative(rootDir, full);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        await walk(full);
      } else if (predicate(full, rel)) {
        out.push(full);
      }
    }
  }
  if (!existsSync(rootDir)) throw new Error(`TERRA_DIR does not exist: ${rootDir}`);
  await walk(rootDir);
  return out.sort();
}

export async function snapshotTerra(rootDir = TERRA_DIR) {
  const files = await listFiles(rootDir, (full, rel) => {
    if (BRIDGE_META.has(path.basename(rel))) return false;
    return SOURCE_EXT.has(path.extname(full));
  });
  const entries = new Map();
  for (const file of files) {
    entries.set(path.relative(rootDir, file), await readFile(file));
  }
  return { rootDir, entries };
}

export async function diffSnapshot(snapshot) {
  const files = await listFiles(snapshot.rootDir, (full, rel) => {
    if (BRIDGE_META.has(path.basename(rel))) return false;
    return SOURCE_EXT.has(path.extname(full));
  });
  const now = new Map();
  for (const file of files) now.set(path.relative(snapshot.rootDir, file), await readFile(file));

  const diffs = [];
  for (const [rel, before] of snapshot.entries) {
    const after = now.get(rel);
    if (!after) diffs.push({ path: rel, kind: "deleted", beforeBytes: before.length, afterBytes: 0 });
    else if (!before.equals(after)) diffs.push({ path: rel, kind: "changed", beforeBytes: before.length, afterBytes: after.length });
  }
  for (const [rel, after] of now) {
    if (!snapshot.entries.has(rel)) diffs.push({ path: rel, kind: "added", beforeBytes: 0, afterBytes: after.length });
  }
  return diffs;
}

export async function assertSnapshotClean(snapshot, label = "terra source") {
  const diffs = await diffSnapshot(snapshot);
  if (diffs.length) {
    const error = new Error(`${label} differs from initial snapshot`);
    error.detail = { diffs };
    throw error;
  }
}

export async function parseAllJsx(rootDir = TERRA_DIR) {
  const files = await listFiles(rootDir, (full) => JSX_EXT.has(path.extname(full)));
  const errors = [];
  for (const file of files) {
    try {
      babelParser.parse(await readFile(file, "utf8"), {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
        errorRecovery: false,
      });
    } catch (error) {
      errors.push({ file: path.relative(rootDir, file), message: error.message });
    }
  }
  if (errors.length) {
    const err = new Error("JSX parse validation failed");
    err.detail = { errors };
    throw err;
  }
  return { checked: files.length };
}

export async function readDaemonToken(rootDir = TERRA_DIR) {
  const tokenFile = path.join(rootDir, ".web-ui-bridge-token");
  const token = (await readFile(tokenFile, "utf8")).trim();
  if (!/^[0-9a-f-]{36}$/.test(token)) throw new Error(`Invalid daemon token in ${tokenFile}`);
  return token;
}

export async function postDaemon(endpoint, body = undefined) {
  const token = await readDaemonToken();
  const res = await fetch(`${DAEMON_ORIGIN}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": new URL(BRIDGE_URL).origin,
      "X-Bridge-Token": token,
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(`daemon ${endpoint} returned ${res.status}`);
    error.detail = { status: res.status, body: json };
    throw error;
  }
  return json;
}

export async function undoOnce() {
  return postDaemon("/undo");
}

export async function redoOnce() {
  return postDaemon("/redo");
}

export async function undoUntilSnapshot(snapshot, max = 8) {
  const attempts = [];
  for (let i = 0; i < max; i++) {
    const diffs = await diffSnapshot(snapshot);
    if (!diffs.length) return { attempts, clean: true };
    const result = await undoOnce();
    attempts.push(result);
    if (!result.ok && result.reason === "nothing") break;
  }
  await assertSnapshotClean(snapshot, "terra source after undo");
  return { attempts, clean: true };
}

export async function mutateWithUndo(label, action, options = {}) {
  const before = await snapshotTerra();
  try {
    const detail = await action(before);
    await parseAllJsx();
    await undoUntilSnapshot(before, options.maxUndo || 8);
    return detail;
  } catch (error) {
    try {
      await undoUntilSnapshot(before, options.maxUndo || 8);
    } catch (undoError) {
      error.detail = {
        ...(error.detail || { message: error.message }),
        undoFailure: undoError.detail || undoError.message,
        label,
      };
    }
    throw error;
  }
}

export async function readQueue(rootDir = TERRA_DIR) {
  const file = path.join(rootDir, ".claude-ui-queue.jsonl");
  if (!existsSync(file)) return { file, lines: [] };
  const text = await readFile(file, "utf8");
  return { file, lines: text.split(/\n/).filter(Boolean) };
}

export async function removeQueueLinesContaining(marker, rootDir = TERRA_DIR) {
  const { file, lines } = await readQueue(rootDir);
  if (!existsSync(file)) return { removed: 0 };
  const kept = lines.filter((line) => !line.includes(marker));
  if (kept.length !== lines.length) await writeFile(file, kept.length ? `${kept.join("\n")}\n` : "", "utf8");
  return { removed: lines.length - kept.length };
}

export function fail(message, detail = undefined) {
  const error = new Error(message);
  if (detail) error.detail = detail;
  throw error;
}

export function expect(condition, message, detail = undefined) {
  if (!condition) fail(message, detail);
}
