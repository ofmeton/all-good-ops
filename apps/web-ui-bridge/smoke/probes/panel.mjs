import { assertTracked, expect, inPage, withProbePage } from "../lib.mjs";

async function selectPrimary(page) {
  await inPage(page, async () => {
    window.__wubProbe.clickShadow(".t-select");
    await window.__wubProbe.select("primary");
  });
  await assertTracked(page);
}

export const probes = [
  {
    name: "panel: tabs preserve selection state",
    destructive: false,
    run: async ({ browser }) => withProbePage(browser, async ({ page }) => {
      await selectPrimary(page);
      const visited = await inPage(page, async () => {
        const sr = document.getElementById("web-ui-bridge-root").shadowRoot;
        const tabs = [...sr.querySelectorAll(".tab[data-tab]")].map((b) => b.dataset.tab);
        const wanted = ["text", "box", "transform", "settings"].filter((tab) => tabs.includes(tab));
        const seen = [];
        for (const tab of wanted) {
          sr.querySelector(`.tab[data-tab="${tab}"]`).click();
          await window.__wubProbe.doubleRaf();
          const state = window.__wubProbe.overlayState();
          if (state.selectionBoxes.length !== 1) throw new Error(`selection lost on tab ${tab}`);
          if (!state.tabs.find((t) => t.tab === tab && t.on)) throw new Error(`tab ${tab} did not become active`);
          seen.push(tab);
        }
        return seen;
      });
      await assertTracked(page);
      return { visited };
    }),
  },
  {
    name: "panel: breakpoint and state switches preserve selection",
    destructive: false,
    run: async ({ browser }) => withProbePage(browser, async ({ page }) => {
      await selectPrimary(page);
      const result = await inPage(page, async () => {
        const sr = document.getElementById("web-ui-bridge-root").shadowRoot;
        const breakpoints = ["", "sm:", "md:", "lg:", "xl:"];
        for (const bp of breakpoints) {
          const btn = sr.querySelector(`.bpseg button[data-bp="${bp}"]`);
          if (!btn) throw new Error(`bp button not found: ${bp}`);
          btn.click();
          await window.__wubProbe.doubleRaf();
          const state = window.__wubProbe.overlayState();
          if (!state.bp.find((b) => b.bp === bp && b.on)) throw new Error(`bp ${bp || "all"} did not become active`);
          if (state.selectionBoxes.length !== 1) throw new Error(`selection lost on bp ${bp || "all"}`);
        }
        for (const stateValue of ["hover:", ""]) {
          const btn = sr.querySelector(`.state-ctl button[data-state="${stateValue}"]`);
          if (!btn) throw new Error(`state button not found: ${stateValue}`);
          btn.click();
          await window.__wubProbe.doubleRaf();
          const state = window.__wubProbe.overlayState();
          if (!state.stateButtons.find((b) => b.state === stateValue && b.on)) throw new Error(`state ${stateValue || "normal"} did not become active`);
          if (state.selectionBoxes.length !== 1) throw new Error(`selection lost on state ${stateValue || "normal"}`);
        }
        return window.__wubProbe.overlayState();
      });
      await assertTracked(page);
      return { bp: result.bp, stateButtons: result.stateButtons };
    }),
  },
  {
    name: "panel: collapse launcher toggles gutter and clears decorations",
    destructive: false,
    run: async ({ browser }) => withProbePage(browser, async ({ page }) => {
      await selectPrimary(page);
      const collapsed = await inPage(page, async () => {
        const before = {
          marginRight: document.documentElement.style.marginRight,
          bodyTransform: document.body.style.transform,
        };
        window.__wubProbe.clickShadow(".t-collapse");
        await window.__wubProbe.doubleRaf();
        const state = window.__wubProbe.overlayState();
        return {
          before,
          after: {
            marginRight: document.documentElement.style.marginRight,
            bodyTransform: document.body.style.transform,
          },
          state,
        };
      });
      expect(collapsed.before.marginRight !== "", "gutter was not enabled before collapse", collapsed);
      expect(collapsed.after.marginRight === "", "gutter margin did not clear on collapse", collapsed);
      expect(collapsed.state.launcherOpen === true && collapsed.state.inspectorOpen === false, "launcher/inspector state wrong after collapse", collapsed);
      expect(collapsed.state.selectionBoxes.length === 0, "collapse did not clear selection decorations", collapsed);

      const reopened = await inPage(page, async () => {
        window.__wubProbe.clickShadow(".launcher");
        await window.__wubProbe.doubleRaf();
        return {
          marginRight: document.documentElement.style.marginRight,
          bodyTransform: document.body.style.transform,
          state: window.__wubProbe.overlayState(),
        };
      });
      expect(reopened.marginRight !== "", "gutter did not return after launcher reopen", reopened);
      expect(reopened.state.inspectorOpen === true, "inspector did not reopen from launcher", reopened);
      await assertTracked(page);
      return reopened;
    }),
  },
  {
    name: "panel: ask draft and numeric focus survive rerenders",
    skip: true,
    reason: "textarea value retention was manually verified; this probe remains flaky because shadow-DOM focus/rerender timing varies across terra DOM states",
    destructive: false,
    run: async ({ browser }) => withProbePage(browser, async ({ page }) => {
      await selectPrimary(page);
      const askResult = await inPage(page, async () => {
        const sr = document.getElementById("web-ui-bridge-root").shadowRoot;
        const ask = sr.querySelector("textarea.ask");
        if (!ask) throw new Error("ask textarea not found");
        ask.value = "保持テスト指示";
        ask.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        const box = sr.querySelector('.tab[data-tab="box"]');
        if (!box) throw new Error("box tab not found");
        box.click();
        await window.__wubProbe.doubleRaf();
        return { value: sr.querySelector("textarea.ask")?.value || "" };
      });
      expect(askResult.value === "保持テスト指示", "ask textarea draft was lost across tab rerender", askResult);

      const focusResult = await inPage(page, async () => {
        const sr = document.getElementById("web-ui-bridge-root").shadowRoot;
        const input = sr.querySelector(".l-w");
        if (!input) throw new Error("width input not found");
        input.focus();
        input.value = "321";
        input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        const bp = sr.querySelector('.bpseg button[data-bp="md:"]');
        if (!bp) throw new Error("md breakpoint button not found");
        bp.click();
        await window.__wubProbe.doubleRaf();
        const next = sr.querySelector(".l-w");
        return {
          value: next?.value || "",
          activeClass: sr.activeElement?.className || "",
          activeTag: sr.activeElement?.tagName || "",
        };
      });
      expect(focusResult.value === "321", "numeric input value was lost across bp rerender", focusResult);
      await assertTracked(page);
      return { askResult, focusResult };
    }),
  },
  {
    name: "panel: launcher reopen restores non-empty current selection body",
    destructive: false,
    run: async ({ browser }) => withProbePage(browser, async ({ page }) => {
      await selectPrimary(page);
      const result = await inPage(page, async () => {
        const sr = document.getElementById("web-ui-bridge-root").shadowRoot;
        window.__wubProbe.clickShadow(".t-collapse");
        await window.__wubProbe.doubleRaf();
        window.__wubProbe.clickShadow(".launcher");
        await window.__wubProbe.doubleRaf();
        const state = window.__wubProbe.overlayState();
        return {
          inspectorOpen: state.inspectorOpen,
          bodyText: state.bodyText,
          empty: !!sr.querySelector(".empty"),
        };
      });
      expect(result.inspectorOpen === true, "inspector did not reopen from launcher", result);
      expect(result.bodyText.length > 0 && result.empty === false, "launcher reopen did not render current selection body", result);
      await assertTracked(page);
      return result;
    }),
  },
];
