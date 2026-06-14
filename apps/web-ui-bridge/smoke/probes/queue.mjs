import {
  assertTracked,
  expect,
  inPage,
  readQueue,
  removeQueueLinesContaining,
  withProbePage,
} from "../lib.mjs";

export const probes = [
  {
    name: "queue: multi-selection prompt builds payloads and cleans sent queue line",
    destructive: false,
    run: async ({ browser }) => {
      const marker = `wub-probe-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      try {
        return await withProbePage(browser, async ({ page }) => {
          await inPage(page, async (prompt) => {
            window.__wubProbe.clickShadow(".t-select");
            await window.__wubProbe.select("primary");
            await window.__wubProbe.select("secondary", { metaKey: true });
            window.__wubProbe.assertSelection(2);
            const sr = document.getElementById("web-ui-bridge-root").shadowRoot;
            const ask = sr.querySelector("textarea.ask");
            const add = sr.querySelector(".btn.add");
            if (!ask || !add) throw new Error("queue prompt controls not found");
            ask.value = prompt;
            ask.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
            add.click();
            await window.__wubProbe.doubleRaf();
            const pending = sr.querySelector("ul li");
            if (!pending || !pending.textContent.includes(prompt.slice(0, 36))) {
              throw new Error("pending queue item was not rendered");
            }
            const send = sr.querySelector(".btn.send");
            if (!send) throw new Error("send button not found after pending add");
            send.click();
            await window.__wubProbe.doubleRaf();
          }, marker);
          await page.waitForFunction(() => {
            const toast = document.getElementById("web-ui-bridge-root")?.shadowRoot?.querySelector(".toast");
            return toast && getComputedStyle(toast).display !== "none" && /Claude|送りました|送信失敗/.test(toast.textContent);
          }, { timeout: 5000 });
          await assertTracked(page);

          const { lines } = await readQueue();
          const hits = lines.map((line) => {
            try { return JSON.parse(line); } catch { return null; }
          }).filter((entry) => entry?.prompt === marker);
          expect(hits.length === 1, "queue line with marker was not found exactly once", { marker, hitsLength: hits.length });
          expect(Array.isArray(hits[0].payloads) && hits[0].payloads.length === 2, "queued item did not contain payloads[] for multi selection", hits[0]);
          return { id: hits[0].id, payloads: hits[0].payloads.length };
        });
      } finally {
        await removeQueueLinesContaining(marker);
      }
    },
  },
];
