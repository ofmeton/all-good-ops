import { chromium } from "playwright";

const BRIDGE_URL = process.env.BRIDGE_URL || "http://localhost:3001/";
const headless = !process.env.HEADED && process.env.HEADLESS !== "0" && process.env.HEADLESS !== "false";

const results = [];

function formatMismatch(mismatch) {
  return mismatch.map((m) => {
    const d = m.delta || {};
    const selector = m.selector ? ` selector=${m.selector}` : "";
    return `kind=${m.kind}${selector} delta=${JSON.stringify(d)}`;
  }).join("\n    ");
}

async function inPage(page, fn, arg) {
  return page.evaluate(fn, arg);
}

async function check(page, name, action) {
  try {
    if (action) await action();
    const mismatch = await inPage(page, async () => {
      await window.__wubSmoke.doubleRaf();
      return window.__webUiBridgeAssert();
    });
    if (mismatch.length) {
      results.push({ name, ok: false, mismatch });
      console.log(`❌ ${name}`);
      console.log(`    ${formatMismatch(mismatch)}`);
      return false;
    }
    results.push({ name, ok: true });
    console.log(`✅ ${name}`);
    return true;
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
    console.log(`❌ ${name}`);
    console.log(`    ${error.stack || error.message}`);
    return false;
  }
}

async function main() {
  const browser = await chromium.launch({ headless });
  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1440, height: 820 });
    await page.goto(BRIDGE_URL, { waitUntil: "networkidle" });
    await page.waitForFunction(
      () => !!document.getElementById("web-ui-bridge-root")?.shadowRoot
        && typeof window.__webUiBridgeAssert === "function",
      { timeout: 15000 },
    );

    await inPage(page, () => {
      const host = () => document.getElementById("web-ui-bridge-root");
      const root = () => host()?.shadowRoot;
      const isOurs = (el) => el === host() || !!(el?.closest && el.closest("#web-ui-bridge-root"));
      const doubleRaf = () => new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
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
          && rect.height > 10
          && rect.bottom > 0
          && rect.right > 0
          && rect.top < window.innerHeight
          && rect.left < window.innerWidth;
      };
      const usable = (el) => {
        if (!(el instanceof HTMLElement) || isOurs(el)) return false;
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
      const markTargets = () => {
        document.querySelectorAll("[data-wub-smoke]").forEach((el) => el.removeAttribute("data-wub-smoke"));
        const all = candidates();
        const primary = all.find((el) => {
          const rect = el.getBoundingClientRect();
          return rect.top >= 0 && rect.bottom <= window.innerHeight && rect.width > 80 && rect.height > 16;
        }) || all[0];
        if (!primary) throw new Error("No primary smoke target found: need a classed, visible, non-fixed element in main/body.");

        const secondary = all.find((el) => el !== primary && el.parentElement === primary.parentElement)
          || all.find((el) => el !== primary);
        if (!secondary) throw new Error("No secondary smoke target found.");

        const drop = all.find((el) => el !== primary && el !== secondary && el.parentElement !== primary)
          || all.find((el) => el !== primary && el !== secondary);
        if (!drop) throw new Error("No drop smoke target found.");

        primary.dataset.wubSmoke = "primary";
        secondary.dataset.wubSmoke = "secondary";
        drop.dataset.wubSmoke = "drop";
        return {
          primary: cssPath(primary),
          secondary: cssPath(secondary),
          drop: cssPath(drop),
        };
      };
      const smokeTarget = (name) => {
        const el = document.querySelector(`[data-wub-smoke="${name}"]`);
        if (!el) throw new Error(`Smoke target not found: ${name}`);
        return el;
      };
      const point = (el) => {
        const rect = el.getBoundingClientRect();
        return {
          x: Math.max(1, Math.min(window.innerWidth - 2, rect.left + rect.width / 2)),
          y: Math.max(1, Math.min(window.innerHeight - 2, rect.top + rect.height / 2)),
        };
      };
      const mouseEvent = (type, el, init = {}) => {
        const p = init.clientX == null || init.clientY == null ? point(el) : { x: init.clientX, y: init.clientY };
        el.dispatchEvent(new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          composed: true,
          clientX: p.x,
          clientY: p.y,
          ...init,
        }));
      };
      const clickTool = (selector) => {
        const btn = root()?.querySelector(selector);
        if (!btn) throw new Error(`Overlay tool not found: ${selector}`);
        btn.click();
      };
      const select = (name, init = {}) => {
        const el = smokeTarget(name);
        mouseEvent("click", el, init);
      };
      const hover = (el) => {
        const p = point(el);
        el.dispatchEvent(new MouseEvent("mousemove", {
          bubbles: true,
          cancelable: true,
          composed: true,
          clientX: p.x,
          clientY: p.y,
        }));
      };
      const currentHoverTarget = () => {
        const selected = new Set([...document.querySelectorAll("[data-wub-smoke]")]);
        const target = candidates().find((el) => !selected.has(el));
        if (!target) throw new Error("No hover target found.");
        return target;
      };
      const replacePrimary = () => {
        const el = smokeTarget("primary");
        const clone = el.cloneNode(true);
        el.replaceWith(clone);
      };
      const dragToDropline = async () => {
        select("primary");
        await doubleRaf();
        clickTool(".t-move");
        const dragEl = smokeTarget("primary");
        dragEl.scrollIntoView({ block: "center", inline: "center" });
        await doubleRaf();
        const start = point(dragEl);
        mouseEvent("mousedown", dragEl, { clientX: start.x, clientY: start.y });

        document.dispatchEvent(new MouseEvent("mousemove", {
          bubbles: true,
          cancelable: true,
          composed: true,
          clientX: start.x + 12,
          clientY: start.y + 12,
        }));
        document.dispatchEvent(new MouseEvent("mousemove", {
          bubbles: true,
          cancelable: true,
          composed: true,
          clientX: Math.min(window.innerWidth - 20, start.x + 40),
          clientY: window.innerHeight - 8,
        }));
        await doubleRaf();

        const drop = candidates().find((el) => el !== dragEl && !el.contains(dragEl) && el.dataset.wubSmoke !== "primary")
          || smokeTarget("drop");
        const p = point(drop);
        document.dispatchEvent(new MouseEvent("mousemove", {
          bubbles: true,
          cancelable: true,
          composed: true,
          clientX: p.x,
          clientY: p.y,
        }));
        await doubleRaf();
        const dropline = root()?.querySelector(".dropline");
        if (!dropline || getComputedStyle(dropline).display === "none") {
          throw new Error("Dropline was not displayed before mouseup.");
        }
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

      window.__wubSmoke = {
        doubleRaf,
        markTargets,
        clickTool,
        select,
        scrollBy: (x, y) => window.scrollBy(x, y),
        hoverOther: () => hover(currentHoverTarget()),
        replacePrimary,
        dragToDropline,
        idleRafCount,
      };
    });

    const targets = await inPage(page, () => window.__wubSmoke.markTargets());
    console.log(`Target URL: ${BRIDGE_URL}`);
    console.log(`Targets: ${JSON.stringify(targets)}`);

    await check(page, "① select baseline", async () => {
      await inPage(page, () => {
        window.__wubSmoke.clickTool(".t-select");
        window.__wubSmoke.select("primary");
      });
    });

    await check(page, "② scrollBy(0, 400)", async () => {
      await inPage(page, () => window.__wubSmoke.scrollBy(0, 400));
    });

    await check(page, "③ scrollBy(0, 400) again", async () => {
      await inPage(page, () => window.__wubSmoke.scrollBy(0, 400));
    });

    await check(page, "④ resize width 1100 and scroll", async () => {
      await page.setViewportSize({ width: 1100, height: 820 });
      await inPage(page, () => window.__wubSmoke.scrollBy(0, 220));
    });

    await check(page, "⑤ hover another element", async () => {
      await inPage(page, () => window.__wubSmoke.hoverOther());
    });

    await check(page, "⑥ HMR-like replaceWith(cloneNode)", async () => {
      await inPage(page, () => window.__wubSmoke.replacePrimary());
    });

    await check(page, "⑦ multi-select and scroll", async () => {
      await inPage(page, () => {
        window.__wubSmoke.select("secondary", { metaKey: true });
        window.__wubSmoke.scrollBy(0, 300);
      });
    });

    await check(page, "⑧ drag dropline before mouseup", async () => {
      await inPage(page, () => window.__wubSmoke.dragToDropline());
    });

    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    const idleCount = await inPage(page, async () => {
      await window.__wubSmoke.doubleRaf();
      return window.__wubSmoke.idleRafCount();
    });
    if (idleCount === 0) {
      results.push({ name: "⑨ idle rAF stop", ok: true });
      console.log("✅ ⑨ idle rAF stop");
    } else {
      results.push({ name: "⑨ idle rAF stop", ok: false, error: `requestAnimationFrame scheduled ${idleCount} time(s) after clear` });
      console.log("❌ ⑨ idle rAF stop");
      console.log(`    requestAnimationFrame scheduled ${idleCount} time(s) after clear`);
    }
  } finally {
    await browser.close();
  }
}

await main();

if (results.some((r) => !r.ok)) {
  process.exit(1);
}
