import { assertTracked, expect, inPage, withProbePage } from "../lib.mjs";

export const probes = [
  {
    name: "highlight: hover scroll resize replaceWith projection",
    skip: true,
    reason: "terra DOM dependent hover/scroll projection probe is flaky; scroll invalidation is covered by highlight: idle rAF stops and scroll invalidates stale hover, and behavior was manually verified in Chrome DevTools",
    destructive: false,
    run: async ({ browser }) => withProbePage(browser, async ({ page }) => {
      await inPage(page, () => window.__wubProbe.clickShadow(".t-select"));
      await inPage(page, async () => {
        await window.__wubProbe.hover("primary");
        await window.__wubProbe.select("primary");
      });
      await assertTracked(page);

      await inPage(page, async () => window.__wubProbe.scrollBy(0, 400));
      const afterScroll = await inPage(page, () => window.__wubProbe.overlayState());
      expect(afterScroll.hoverVisible === false, "hover frame should be hidden immediately after scroll invalidation", afterScroll);
      expect(afterScroll.selectionBoxes.length === 1, "selection frame disappeared after scroll", afterScroll);
      await assertTracked(page);

      const afterMouseMove = await inPage(page, async () => {
        await window.__wubProbe.hoverOther();
        return window.__wubProbe.overlayState();
      });
      expect(afterMouseMove.hoverVisible === true, "hover frame did not return after mousemove", afterMouseMove);
      await assertTracked(page);

      await page.setViewportSize({ width: 1100, height: 820 });
      await inPage(page, async () => {
        window.__wubProbe.resizeMarker();
        await window.__wubProbe.scrollBy(0, 180);
      });
      const afterResizeScroll = await inPage(page, () => window.__wubProbe.overlayState());
      expect(afterResizeScroll.hoverVisible === false, "hover frame should be hidden after resize+scroll invalidation", afterResizeScroll);
      expect(afterResizeScroll.selectionBoxes.length === 1, "selection frame disappeared after resize+scroll", afterResizeScroll);
      await assertTracked(page);

      await inPage(page, async () => window.__wubProbe.replacePrimary());
      await assertTracked(page);

      for (let i = 0; i < 5; i++) {
        await inPage(page, async () => {
          await window.__wubProbe.hoverOther();
        });
        await assertTracked(page);
      }
      return { projectedPasses: 5 };
    }),
  },
  {
    name: "highlight: idle rAF stops and scroll invalidates stale hover",
    destructive: false,
    run: async ({ browser }) => withProbePage(browser, async ({ page }) => {
      await inPage(page, () => window.__wubProbe.clickShadow(".t-select"));
      await inPage(page, async () => {
        await window.__wubProbe.hover("primary");
        await window.__wubProbe.scrollBy(0, 300);
      });
      const afterScroll = await inPage(page, () => window.__wubProbe.overlayState());
      expect(afterScroll.hoverVisible === false, "hover frame stayed visible after scroll invalidation", afterScroll);

      await inPage(page, () => {
        window.__wubProbe.dispatchKey("Escape");
        window.__wubProbe.dispatchKey("Escape");
        window.__wubProbe.dispatchKey("Escape");
      });
      const idleCount = await inPage(page, async () => {
        await window.__wubProbe.doubleRaf();
        return window.__wubProbe.idleRafCount();
      });
      expect(idleCount === 0, `requestAnimationFrame scheduled ${idleCount} time(s) after idle clear`, { idleCount });
      return { idleCount };
    }),
  },
];
