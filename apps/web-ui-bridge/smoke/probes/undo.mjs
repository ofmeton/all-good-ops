import {
  assertSnapshotClean,
  assertTracked,
  diffSnapshot,
  expect,
  inPage,
  parseAllJsx,
  postDaemon,
  snapshotTerra,
  undoOnce,
  redoOnce,
  withProbePage,
} from "../lib.mjs";

async function waitToast(page) {
  return page.waitForFunction(() => {
    const el = document.getElementById("web-ui-bridge-root")?.shadowRoot?.querySelector(".toast");
    return el && getComputedStyle(el).display !== "none" ? el.textContent.trim() : "";
  }, { timeout: 5000 }).then((h) => h.jsonValue());
}

async function selectLogo(page) {
  const targets = await inPage(page, () => window.__wubProbe.markClassTargets({
    logo: {
      query: "header a[class]",
      tag: "a",
      includes: ["block", "leading-none", "fade-up"],
    },
  }));
  await inPage(page, async () => {
    window.__wubProbe.clickShadow(".t-select");
    await window.__wubProbe.select("logo");
  });
  await assertTracked(page);
  return targets.logo;
}

async function setClassAndApply(page, className) {
  await inPage(page, async (nextClass) => {
    const sr = document.getElementById("web-ui-bridge-root").shadowRoot;
    const settings = sr.querySelector('.tab[data-tab="settings"]');
    if (!settings) throw new Error("settings tab not found");
    settings.click();
    await window.__wubProbe.doubleRaf();
    const textarea = sr.querySelector("textarea.cls");
    if (!textarea) throw new Error("className textarea not found");
    textarea.value = nextClass;
    textarea.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    await window.__wubProbe.doubleRaf();
    const apply = sr.querySelector(".apply");
    if (!apply) throw new Error("apply button not found");
    apply.click();
    await window.__wubProbe.doubleRaf();
  }, className);
  return waitToast(page);
}

export const probes = [
  {
    name: "undo: chained undo/redo returns to exact original bytes",
    destructive: true,
    run: async ({ browser }) => {
      const before = await snapshotTerra();
      return withProbePage(browser, async ({ targets }) => {
        const route = "/";
        const oldClassName = String(targets.primary.classes || "");
        expect(!!oldClassName, "primary target has no className", targets.primary);
        const marker = "opacity-[0.99]";
        const newClassName = oldClassName.includes(marker) ? oldClassName.replace(marker, "opacity-[0.98]") : `${oldClassName} ${marker}`;

        const applied = await postDaemon("/apply-style", { route, oldClassName, newClassName });
        expect(applied.ok === true && applied.file, "apply-style failed during undo chain", applied);
        const duplicated = await postDaemon("/duplicate", { route, targetClass: newClassName });
        expect(duplicated.ok === true && duplicated.file, "duplicate failed during undo chain", duplicated);
        await parseAllJsx();
        expect((await diffSnapshot(before)).length > 0, "chain operations did not mutate source");

        const undoDuplicate = await undoOnce();
        const undoApply = await undoOnce();
        expect(undoDuplicate.ok && undoApply.ok, "undo chain failed", { undoDuplicate, undoApply });
        await assertSnapshotClean(before, "terra source after chained undo");

        const redoApply = await redoOnce();
        const redoDuplicate = await redoOnce();
        expect(redoApply.ok && redoDuplicate.ok, "redo chain failed", { redoApply, redoDuplicate });
        await parseAllJsx();
        expect((await diffSnapshot(before)).length > 0, "redo chain did not reapply mutations");

        const finalUndoDuplicate = await undoOnce();
        const finalUndoApply = await undoOnce();
        expect(finalUndoDuplicate.ok && finalUndoApply.ok, "final undo chain failed", { finalUndoDuplicate, finalUndoApply });
        await assertSnapshotClean(before, "terra source after final chained undo");

        return {
          applied,
          duplicated,
          undo: [undoDuplicate.label, undoApply.label],
          redo: [redoApply.label, redoDuplicate.label],
        };
      });
    },
  },
  {
    name: "undo: className edit can be reapplied after keyboard undo source resync",
    destructive: true,
    run: async ({ browser }) => {
      const before = await snapshotTerra();
      return withProbePage(browser, async ({ page }) => {
        const logo = await selectLogo(page);
        const baseClass = String(logo.classes || "");
        expect(!!baseClass, "logo target has no className", logo);
        const firstClass = `${baseClass} ring-2 ring-sky-400`;
        const secondClass = `${baseClass} ring-2 ring-emerald-400`;

        const firstToast = await setClassAndApply(page, firstClass);
        expect(/反映/.test(String(firstToast || "")) && !/ソース未特定|失敗|変更なし/.test(String(firstToast || "")), "initial className apply failed", { firstToast });
        expect((await diffSnapshot(before)).length > 0, "initial className apply did not mutate source");

        await page.keyboard.press("Meta+Z");
        await page.waitForTimeout(1500);
        await assertSnapshotClean(before, "terra source after keyboard undo");

        const secondToast = await setClassAndApply(page, secondClass);
        expect(/反映/.test(String(secondToast || "")) && !/ソース未特定|失敗|変更なし/.test(String(secondToast || "")), "className reapply after undo failed; sourceClass likely stale", { secondToast });
        expect((await diffSnapshot(before)).length > 0, "second className apply did not mutate source");
        await parseAllJsx();
        await assertTracked(page);
        const finalUndo = await undoOnce();
        expect(finalUndo.ok, "final undo after reapply failed", finalUndo);
        await assertSnapshotClean(before, "terra source after final undo");
        return { firstToast, secondToast, finalUndo };
      });
    },
  },
];
