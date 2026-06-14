import { assertTracked, expect, inPage, withProbePage } from "../lib.mjs";

async function enableSelect(page) {
  await inPage(page, () => window.__wubProbe.clickShadow(".t-select"));
}

async function clearWithEsc(page) {
  await inPage(page, () => {
    window.__wubProbe.dispatchKey("Escape");
    window.__wubProbe.dispatchKey("Escape");
  });
  await assertTracked(page);
}

export const probes = [
  {
    name: "selection: single/meta/shift/esc/chip invariants",
    destructive: false,
    run: async ({ browser }) => withProbePage(browser, async ({ page }) => {
      await enableSelect(page);
      await inPage(page, async () => {
        await window.__wubProbe.select("primary");
        window.__wubProbe.assertSelection(1);
      });
      await assertTracked(page);

      await inPage(page, async () => {
        await window.__wubProbe.select("secondary", { metaKey: true });
        window.__wubProbe.assertSelection(2);
      });
      await assertTracked(page);

      await inPage(page, async () => {
        await window.__wubProbe.select("tertiary", { shiftKey: true });
        const state = window.__wubProbe.assertSelection(3);
        if (state.selectionBoxes.filter((b) => b.primary).length !== 1) throw new Error("primary box is not unique");
      });
      await assertTracked(page);

      const afterChip = await inPage(page, async () => {
        const sr = document.getElementById("web-ui-bridge-root").shadowRoot;
        const chipX = sr.querySelector(".chip .sel-x");
        if (!chipX) throw new Error("chip remove button not found");
        chipX.click();
        await window.__wubProbe.doubleRaf();
        return window.__wubProbe.overlayState();
      });
      expect(afterChip.selectionBoxes.length === 2, "chip remove did not reduce selection", afterChip);
      expect(afterChip.selectionBoxes.filter((b) => b.primary).length === 1, "primary not unique after chip remove", afterChip);
      await assertTracked(page);

      await clearWithEsc(page);
      const cleared = await inPage(page, () => window.__wubProbe.overlayState());
      expect(cleared.selectionBoxes.length === 0, "Esc did not clear selection", cleared);
      return { finalSelection: cleared.selectionBoxes.length };
    }),
  },
  {
    name: "selection: mode toggle and hover/selection separation after scroll",
    destructive: false,
    run: async ({ browser }) => withProbePage(browser, async ({ page }) => {
      await enableSelect(page);
      await inPage(page, async () => {
        await window.__wubProbe.select("primary");
        await window.__wubProbe.hover("secondary");
        window.__wubProbe.assertSelection(1);
      });
      await assertTracked(page);

      await inPage(page, async () => {
        await window.__wubProbe.scrollBy(0, 420);
        await window.__wubProbe.hover("drop");
      });
      const state = await inPage(page, () => window.__wubProbe.overlayState());
      expect(state.selectionBoxes.length === 1, "selection frame disappeared after scroll", state);
      expect(state.hoverVisible === true, "hover frame did not reappear on different element after scroll", state);
      await assertTracked(page);

      await inPage(page, () => window.__wubProbe.clickShadow(".t-select"));
      const off = await inPage(page, () => window.__wubProbe.overlayState());
      expect(off.selectionBoxes.length === 1, "select-mode toggle should not clear current selection", off);
      return { hoverVisible: off.hoverVisible, selectionBoxes: off.selectionBoxes.length };
    }),
  },
];
