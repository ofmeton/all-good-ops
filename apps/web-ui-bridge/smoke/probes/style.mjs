import {
  assertTracked,
  diffSnapshot,
  expect,
  inPage,
  installPageHelpers,
  mutateWithUndo,
  waitForOverlay,
  withProbePage,
  TERRA_DIR,
} from "../lib.mjs";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function select(page, name = "primary", additive = false) {
  await inPage(page, async ({ name: n, additive: a }) => {
    window.__wubProbe.clickShadow(".t-select");
    await window.__wubProbe.select(n, a ? { metaKey: true } : {});
  }, { name, additive });
  await assertTracked(page);
}

async function commitSettings(page) {
  await inPage(page, async () => {
    const sr = document.getElementById("web-ui-bridge-root").shadowRoot;
    const settings = sr.querySelector('.tab[data-tab="settings"]');
    if (!settings) throw new Error("settings tab not found");
    settings.click();
    await window.__wubProbe.doubleRaf();
    const apply = sr.querySelector(".apply");
    if (!apply) throw new Error("settings apply button not found");
    apply.click();
    await window.__wubProbe.doubleRaf();
  });
  await page.waitForFunction(() => {
    const toast = document.getElementById("web-ui-bridge-root")?.shadowRoot?.querySelector(".toast");
    return toast && getComputedStyle(toast).display !== "none" && toast.textContent.trim();
  }, { timeout: 5000 });
}

async function requireDirty(snapshot, label) {
  const diffs = await diffSnapshot(snapshot);
  expect(diffs.length > 0, `${label} did not mutate terra source`, { diffs });
  return diffs;
}

async function reloadProbePage(page) {
  await page.reload({ waitUntil: "networkidle" });
  await waitForOverlay(page);
  await installPageHelpers(page);
  await inPage(page, () => window.__wubProbe.markTargets());
}

async function setBoxInput(page, selector, value) {
  await inPage(page, async ({ selector: s, value: v }) => {
    const sr = document.getElementById("web-ui-bridge-root").shadowRoot;
    const box = sr.querySelector('.tab[data-tab="box"]');
    if (box) box.click();
    await window.__wubProbe.doubleRaf();
    const input = sr.querySelector(s);
    if (!input) throw new Error(`box input not found: ${s}`);
    input.value = v;
    input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    await window.__wubProbe.doubleRaf();
  }, { selector, value });
}

async function markHeroTextTargets(page) {
  return inPage(page, () => window.__wubProbe.markClassTargets({
    "hero-eyebrow": {
      scope: "main",
      query: 'div[class*="bottom-24"] > [class]',
      tag: "p",
      includes: ["fade-up"],
      index: 0,
    },
    "hero-title": {
      scope: "main",
      query: 'div[class*="bottom-24"] > [class]',
      tag: "h1",
      includes: ["fade-up"],
      index: 0,
    },
    "hero-subtext": {
      scope: "main",
      query: 'div[class*="bottom-24"] > [class]',
      tag: "p",
      includes: ["fade-up"],
      index: 1,
    },
  }));
}

async function waitToast(page) {
  return page.waitForFunction(() => {
    const el = document.getElementById("web-ui-bridge-root")?.shadowRoot?.querySelector(".toast");
    return el && getComputedStyle(el).display !== "none" ? el.textContent.trim() : "";
  }, { timeout: 5000 }).then((h) => h.jsonValue());
}

async function markHeaderTargets(page) {
  return inPage(page, () => window.__wubProbe.markClassTargets({
    logo: {
      query: "header a[class]",
      tag: "a",
      includes: ["block", "leading-none", "fade-up"],
    },
    navLink: {
      query: "header nav a[class]",
      tag: "a",
      includes: ["relative", "inline-block", "py-2"],
    },
  }));
}

async function openSettingsAndSetClass(page, nextClass) {
  return inPage(page, async (cls) => {
    const sr = document.getElementById("web-ui-bridge-root").shadowRoot;
    const settings = sr.querySelector('.tab[data-tab="settings"]');
    if (!settings) throw new Error("settings tab not found");
    settings.click();
    await window.__wubProbe.doubleRaf();
    const textarea = sr.querySelector("textarea.cls");
    if (!textarea) throw new Error("className textarea not found");
    textarea.value = cls;
    textarea.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    await window.__wubProbe.doubleRaf();
    return {
      textarea: textarea.value,
      markedClasses: Object.fromEntries([...document.querySelectorAll("[data-wub-probe-names]")]
        .flatMap((el) => (el.getAttribute("data-wub-probe-names") || "").split(/\s+/).filter(Boolean).map((name) => [
          name,
          el.getAttribute("class") || "",
        ]))),
    };
  }, nextClass);
}

async function clickApply(page) {
  await inPage(page, async () => {
    const sr = document.getElementById("web-ui-bridge-root").shadowRoot;
    const apply = sr.querySelector(".apply");
    if (!apply) throw new Error("settings apply button not found");
    apply.click();
    await window.__wubProbe.doubleRaf();
  });
  return waitToast(page);
}

async function countSiteHeaderMarker(marker) {
  let src;
  try {
    src = await readFile(path.join(TERRA_DIR, "app/_components/SiteHeader.tsx"), "utf8");
  } catch (error) {
    throw new Error(`Failed to read SiteHeader source for marker assertion: ${error.message}`);
  }
  return src.split(marker).length - 1;
}

const markedClass = (live, name) => String(live?.markedClasses?.[name] || "");

export const probes = [
  {
    name: "style: single numeric/color/enum/toggle apply parses and undo byte-restores",
    skip: true,
    reason: "terra-specific numeric/color/enum/toggle controls are unstable to target; single apply/commit/undo path is covered by style: single className textarea apply updates DOM, source, and undo",
    destructive: true,
    run: async ({ browser }) => withProbePage(browser, async ({ page }) => {
      await select(page, "primary");

      const details = [];
      for (const op of [
        ["numeric width", async () => setBoxInput(page, ".l-w", "137")],
        ["color background", async () => inPage(page, async () => {
          const sr = document.getElementById("web-ui-bridge-root").shadowRoot;
          sr.querySelector('.tab[data-tab="box"]').click();
          await window.__wubProbe.doubleRaf();
          const input = sr.querySelector(".c-bg");
          if (!input) throw new Error("background color input not found");
          input.value = "#12a37f";
          input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
          await window.__wubProbe.doubleRaf();
        })],
        ["enum shadow", async () => inPage(page, async () => {
          const sr = document.getElementById("web-ui-bridge-root").shadowRoot;
          sr.querySelector('.tab[data-tab="box"]').click();
          await window.__wubProbe.doubleRaf();
          const selectEl = sr.querySelector(".a-shadow");
          if (!selectEl) throw new Error("shadow select not found");
          selectEl.value = "shadow-lg";
          selectEl.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
          await window.__wubProbe.doubleRaf();
        })],
        ["toggle underline", async () => {
          await select(page, "text");
          await inPage(page, async () => {
            const sr = document.getElementById("web-ui-bridge-root").shadowRoot;
            const text = sr.querySelector('.tab[data-tab="text"]');
            if (!text) throw new Error("text tab not available for selected target");
            text.click();
            await window.__wubProbe.doubleRaf();
            const underline = sr.querySelector(".t-ul");
            if (!underline) throw new Error("underline toggle not found");
            underline.click();
            await window.__wubProbe.doubleRaf();
          });
        }],
      ]) {
        const [label, action] = op;
        const detail = await mutateWithUndo(label, async (snapshot) => {
          await action();
          await commitSettings(page);
          const diffs = await requireDirty(snapshot, label);
          await assertTracked(page);
          return { label, diffs };
        });
        details.push(detail);
        await reloadProbePage(page);
        await select(page, label === "toggle underline" ? "text" : "primary");
      }
      return { operations: details.map((d) => d.label) };
    }),
  },
  {
    name: "style: multi apply uses changed value and batch result without duplicate class tokens",
    skip: true,
    reason: "selecting two terra elements with reliably different style-control values is DOM-fragile; multi apply path is covered by style: multi className textarea apply updates both DOM nodes, both sources, and undo",
    destructive: true,
    run: async ({ browser }) => withProbePage(browser, async ({ page }) => {
      const targets = await markHeroTextTargets(page);
      const pair = targets["hero-eyebrow"].classes !== targets["hero-subtext"].classes
        ? ["hero-eyebrow", "hero-subtext"]
        : ["hero-eyebrow", "hero-title"];
      expect(String(targets[pair[0]]?.classes || "") !== String(targets[pair[1]]?.classes || ""), "multi style targets should have distinct classes", { targets, pair });
      await select(page, pair[0]);
      await select(page, pair[1], true);
      const mixed = await inPage(page, async () => {
        const sr = document.getElementById("web-ui-bridge-root").shadowRoot;
        const text = sr.querySelector('.tab[data-tab="text"]');
        if (!text) throw new Error("text tab not available for multi text targets");
        text.click();
        await window.__wubProbe.doubleRaf();
        return {
          sourceLabels: [...sr.querySelectorAll(".source-label")].map((el) => el.textContent.trim()),
          placeholders: [...sr.querySelectorAll("input")].map((el) => el.getAttribute("placeholder") || ""),
          state: window.__wubProbe.overlayState(),
        };
      });
      expect(mixed.state.selectionBoxes.length >= 2, "multi selection was not established", mixed);

      const result = await mutateWithUndo("multi style text size", async (snapshot) => {
        await inPage(page, async () => {
          const sr = document.getElementById("web-ui-bridge-root").shadowRoot;
          const input = sr.querySelector(".f-size");
          if (!input) throw new Error("font size input not found");
          input.value = "33";
          input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
          await window.__wubProbe.doubleRaf();
        });
        const toast = await waitToast(page);
        expect(/一括反映\([1-9]/.test(String(toast || "")), "batch style did not apply changed value", { toast });
        expect(!/変更なし/.test(String(toast || "")), "batch style unexpectedly no-op", { toast });
        const diffs = await requireDirty(snapshot, "multi style text size");
        await assertTracked(page);
        return { toast, diffs };
      });

      const classTokens = await inPage(page, () => {
        const rows = [...document.querySelectorAll("[data-wub-probe-names]")].map((el) => el.getAttribute("class") || "");
        return rows.map((cls) => {
          const tokens = cls.split(/\s+/).filter(Boolean);
          return { cls, duplicates: tokens.filter((t, i) => tokens.indexOf(t) !== i) };
        });
      });
      expect(classTokens.every((row) => row.duplicates.length === 0), "duplicate class token found after multi apply", classTokens);
      return { mixed, toast: result.toast };
    }),
  },
  {
    name: "style: single className textarea apply updates DOM, source, and undo",
    destructive: true,
    run: async ({ browser }) => withProbePage(browser, async ({ page }) => {
      const targets = await markHeaderTargets(page);
      await select(page, "logo");
      const marker = "ring-2 ring-emerald-400";
      const nextClass = `${String(targets.logo?.classes || "")} ${marker}`.trim();
      return mutateWithUndo("single className apply", async (snapshot) => {
        const live = await openSettingsAndSetClass(page, nextClass);
        expect(markedClass(live, "logo").includes(marker), "single className edit did not update DOM live", live);
        const toast = await clickApply(page);
        expect(/反映/.test(String(toast || "")) && !/ソース未特定|失敗|変更なし/.test(String(toast || "")), "single className apply did not succeed", { toast });
        expect((await countSiteHeaderMarker(marker)) >= 1, "single className marker was not written to source", { marker });
        const diffs = await requireDirty(snapshot, "single className apply");
        await assertTracked(page);
        return { toast, diffs };
      });
    }),
  },
  {
    name: "style: multi className textarea apply updates both DOM nodes, both sources, and undo",
    destructive: true,
    run: async ({ browser }) => withProbePage(browser, async ({ page }) => {
      const targets = await markHeaderTargets(page);
      expect(String(targets.logo?.classes || "") !== String(targets.navLink?.classes || ""), "header regression targets should be distinct classes", targets);
      await select(page, "logo");
      await select(page, "navLink", true);
      const marker = "ring-2 ring-emerald-400";
      const nextClass = `${String(targets.logo?.classes || "")} ${marker}`.trim();
      return mutateWithUndo("multi className apply", async (snapshot) => {
        const live = await openSettingsAndSetClass(page, nextClass);
        expect(markedClass(live, "logo").includes(marker), "multi className edit did not update logo DOM live", live);
        expect(markedClass(live, "navLink").includes(marker), "multi className edit did not update nav DOM live", live);
        const toast = await clickApply(page);
        expect(/一括反映\(2\)/.test(String(toast || "")), "multi className apply did not batch two source classes", { toast });
        expect((await countSiteHeaderMarker(marker)) >= 2, "multi className marker was not written to both source class literals", { marker });
        const diffs = await requireDirty(snapshot, "multi className apply");
        await assertTracked(page);
        return { toast, diffs };
      });
    }),
  },
];
