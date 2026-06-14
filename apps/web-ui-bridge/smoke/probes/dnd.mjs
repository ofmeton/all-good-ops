import {
  assertSnapshotClean,
  assertTracked,
  diffSnapshot,
  expect,
  inPage,
  mutateWithUndo,
  postDaemon,
  snapshotTerra,
  withProbePage,
} from "../lib.mjs";

async function selectTargets(page, names) {
  await inPage(page, async (targetNames) => {
    window.__wubProbe.clickShadow(".t-select");
    for (let i = 0; i < targetNames.length; i++) {
      await window.__wubProbe.select(targetNames[i], i === 0 ? {} : { metaKey: true });
    }
  }, names);
  await assertTracked(page);
}

export const probes = [
  {
    name: "dnd: dropline displays without mouseup and Esc exits cleanly",
    destructive: false,
    run: async ({ browser }) => {
      const before = await snapshotTerra();
      const detail = await withProbePage(browser, async ({ page }) => {
        await selectTargets(page, ["primary"]);
        const state = await inPage(page, async () => {
          window.__wubProbe.clickShadow(".t-move");
          return window.__wubProbe.dragTo("primary", "tertiary", { mouseup: false });
        });
        expect(state.droplineVisible === true, "dropline was not visible before mouseup", state);
        await assertTracked(page);
        await inPage(page, async () => {
          window.__wubProbe.dispatchKey("Escape");
          await window.__wubProbe.doubleRaf();
        });
        const after = await inPage(page, () => window.__wubProbe.overlayState());
        expect(after.droplineVisible === false, "dropline stayed visible after Escape", after);
        await assertTracked(page);
        return { beforeDrop: state, afterEsc: after };
      });
      await assertSnapshotClean(before, "terra source after non-destructive dropline probe");
      return detail;
    },
  },
  {
    name: "dnd: same-parent group move parses and undo restores",
    skip: true,
    reason: "terra hero sibling selection/drop target is DOM-fragile; moveGroupInSource determinism is covered by daemon reorder.test.mjs and the live group move behavior was manually verified",
    destructive: true,
    run: async ({ browser }) => withProbePage(browser, async ({ page }) => {
      const heroTargets = await inPage(page, () => window.__wubProbe.markClassTargets({
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
      expect(heroTargets["hero-eyebrow"].parent === heroTargets["hero-title"].parent
        && heroTargets["hero-title"].parent === heroTargets["hero-subtext"].parent, "hero DnD targets are not same-parent siblings", heroTargets);
      await selectTargets(page, ["hero-eyebrow", "hero-title"]);
      return mutateWithUndo("same-parent group move", async (snapshot) => {
        const state = await inPage(page, async () => {
          window.__wubProbe.clickShadow(".t-move");
          return window.__wubProbe.dragTo("hero-eyebrow", "hero-subtext", { mouseup: true });
        });
        const toast = await page.waitForFunction(() => {
          const el = document.getElementById("web-ui-bridge-root")?.shadowRoot?.querySelector(".toast");
          return el && getComputedStyle(el).display !== "none" ? el.textContent.trim() : "";
        }, { timeout: 5000 }).then((h) => h.jsonValue());
        expect(/グループ移動/.test(String(toast || "")), "group move did not succeed through direct reorder-group path", { toast, state, heroTargets });
        const diffs = await diffSnapshot(snapshot);
        expect(diffs.length > 0, "same-parent group move did not mutate source", { toast, diffs });
        await assertTracked(page);
        return { toast, diffs };
      });
    }),
  },
  {
    name: "dnd: unsafe overlap/same-target reorder is rejected without source change",
    destructive: false,
    run: async () => {
      const before = await snapshotTerra();
      const result = await postDaemon("/reorder", {
        route: "/",
        dragClass: "web-ui-bridge-probe-noop",
        targetClass: "web-ui-bridge-probe-noop",
        position: "before",
      });
      expect(result.ok === false && ["same-class", "not-found"].includes(result.reason), "unsafe reorder was not rejected", result);
      await assertSnapshotClean(before, "terra source after rejected reorder");
      return result;
    },
  },
  {
    name: "dnd: different-parent multi selection disables direct move tool",
    destructive: false,
    run: async ({ browser }) => withProbePage(browser, async ({ page, targets }) => {
      await selectTargets(page, ["primary", "drop"]);
      const state = await inPage(page, () => window.__wubProbe.overlayState());
      const sameParent = targets.primary.parent === targets.drop.parent;
      expect(sameParent || state.moveDisabled === true, "move tool was not disabled for different-parent multi selection", { state, targets });
      await assertTracked(page);
      return { moveDisabled: state.moveDisabled, sameParentFallback: sameParent };
    }),
  },
];
