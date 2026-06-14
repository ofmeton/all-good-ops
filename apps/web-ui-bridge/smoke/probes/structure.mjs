import {
  assertTracked,
  diffSnapshot,
  expect,
  inPage,
  installPageHelpers,
  mutateWithUndo,
  waitForOverlay,
  withProbePage,
} from "../lib.mjs";

async function reloadProbePage(page) {
  await page.reload({ waitUntil: "networkidle" });
  await waitForOverlay(page);
  await installPageHelpers(page);
  await inPage(page, () => window.__wubProbe.markTargets());
}

async function selectTargets(page, names) {
  await inPage(page, async (targetNames) => {
    window.__wubProbe.clickShadow(".t-select");
    for (let i = 0; i < targetNames.length; i++) {
      await window.__wubProbe.select(targetNames[i], i === 0 ? {} : { metaKey: true });
    }
    window.__wubProbe.assertSelection(targetNames.length);
  }, names);
  await assertTracked(page);
}

async function clickStructure(page, kind) {
  await inPage(page, async (k) => {
    const sr = document.getElementById("web-ui-bridge-root").shadowRoot;
    const settings = sr.querySelector('.tab[data-tab="settings"]');
    if (!settings) throw new Error("settings tab not found");
    settings.click();
    await window.__wubProbe.doubleRaf();
    const button = sr.querySelector(k === "duplicate" ? ".dup" : ".del");
    if (!button) throw new Error(`${k} button not found`);
    button.click();
    await window.__wubProbe.doubleRaf();
  }, kind);
  await page.waitForFunction(() => {
    const toast = document.getElementById("web-ui-bridge-root")?.shadowRoot?.querySelector(".toast");
    return toast && getComputedStyle(toast).display !== "none" && toast.textContent.trim();
  }, { timeout: 5000 });
}

async function assertMutation(snapshot, label) {
  const diffs = await diffSnapshot(snapshot);
  expect(diffs.length > 0, `${label} did not mutate terra source`, { diffs });
  return diffs;
}

export const probes = [
  {
    name: "structure: single duplicate/delete parse and undo",
    destructive: true,
    run: async ({ browser }) => withProbePage(browser, async ({ page }) => {
      const outcomes = [];
      for (const kind of ["duplicate", "delete"]) {
        await selectTargets(page, ["primary"]);
        const detail = await mutateWithUndo(`single ${kind}`, async (snapshot) => {
          await clickStructure(page, kind);
          const diffs = await assertMutation(snapshot, `single ${kind}`);
          await assertTracked(page);
          return { kind, diffs };
        });
        outcomes.push(detail);
        await reloadProbePage(page);
      }
      return outcomes;
    }),
  },
  {
    name: "structure: multi duplicate/delete dedups and undo",
    destructive: true,
    run: async ({ browser }) => withProbePage(browser, async ({ page }) => {
      const outcomes = [];
      for (const kind of ["duplicate", "delete"]) {
        await selectTargets(page, ["primary", "secondary"]);
        const detail = await mutateWithUndo(`multi ${kind}`, async (snapshot) => {
          await clickStructure(page, kind);
          const toast = await inPage(page, () => window.__wubProbe.overlayState().toast);
          expect(/一括|同一ソース|Claude経路|対象が見つかりません/.test(toast.text), `multi ${kind} toast missing batch/dedup detail`, toast);
          const diffs = await assertMutation(snapshot, `multi ${kind}`);
          await assertTracked(page);
          return { kind, toast, diffs };
        });
        outcomes.push(detail);
        await reloadProbePage(page);
      }
      return outcomes;
    }),
  },
];
