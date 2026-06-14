#!/usr/bin/env node
import {
  assertSnapshotClean,
  formatFailure,
  launchBrowser,
  runProbe,
  snapshotTerra,
  TERRA_DIR,
  BRIDGE_URL,
  DAEMON_ORIGIN,
  ignoredDevNoise,
} from "./lib.mjs";
import { probes as selection } from "./probes/selection.mjs";
import { probes as highlight } from "./probes/highlight.mjs";
import { probes as panel } from "./probes/panel.mjs";
import { probes as style } from "./probes/style.mjs";
import { probes as structure } from "./probes/structure.mjs";
import { probes as dnd } from "./probes/dnd.mjs";
import { probes as undo } from "./probes/undo.mjs";
import { probes as queue } from "./probes/queue.mjs";

const clusters = {
  selection,
  highlight,
  panel,
  style,
  structure,
  dnd,
  undo,
  queue,
};

function parseArgs(argv) {
  const args = { only: null, list: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--list") args.list = true;
    else if (a === "--only") args.only = argv[++i];
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

function selectedProbes(only) {
  if (!only) return Object.entries(clusters).flatMap(([cluster, probes]) => probes.map((probe) => ({ cluster, ...probe })));
  if (!clusters[only]) {
    const names = Object.keys(clusters).join(", ");
    throw new Error(`Unknown cluster "${only}". Available: ${names}`);
  }
  return clusters[only].map((probe) => ({ cluster: only, ...probe }));
}

function printResult(result) {
  if (result.skip) {
    console.log(`Info: skipped: ${result.name}${result.reason ? ` — ${result.reason}` : ""}`);
  } else if (result.ok) {
    console.log(`✅ ${result.name}`);
    if (process.env.VERBOSE_PROBE && result.detail) console.log(`    ${formatFailure(result.detail)}`);
  } else {
    console.log(`❌ ${result.name}`);
    const detail = formatFailure(result.detail);
    if (detail) console.log(`    ${detail.split("\n").join("\n    ")}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const probes = selectedProbes(args.only);

  if (args.list) {
    for (const probe of probes) {
      console.log(`${probe.cluster}\t${probe.destructive ? "destructive" : "safe"}\t${probe.name}`);
    }
    return [];
  }

  console.log(`Target URL: ${BRIDGE_URL}`);
  console.log(`Daemon: ${DAEMON_ORIGIN}`);
  console.log(`TERRA_DIR: ${TERRA_DIR}`);

  const nonDestructive = probes.filter((probe) => !probe.destructive);
  const destructive = probes.filter((probe) => probe.destructive);
  const runnableNonDestructive = nonDestructive.filter((probe) => !probe.skip);
  const runnableDestructive = destructive.filter((probe) => !probe.skip);
  const results = [];
  for (const probe of probes.filter((probe) => probe.skip)) {
    const skipped = { name: probe.name, ok: true, skip: true, reason: probe.reason || probe.skipReason || "marked skip" };
    printResult(skipped);
    results.push(skipped);
  }
  if (!runnableNonDestructive.length && !runnableDestructive.length) return results;
  const browser = await launchBrowser();
  try {
    if (runnableNonDestructive.length) {
      console.log(`\nNon-destructive probes: ${runnableNonDestructive.length} parallel`);
      const batch = await Promise.all(runnableNonDestructive.map((probe) => runProbe(probe.name, () => probe.run({ browser }))));
      for (const result of batch) {
        printResult(result);
        results.push(result);
      }
    }

    if (runnableDestructive.length) {
      console.log(`\nDestructive probes: ${runnableDestructive.length} serial`);
      const phaseSnapshot = await snapshotTerra();
      for (const probe of runnableDestructive) {
        const result = await runProbe(probe.name, () => probe.run({ browser }));
        if (result.ok) {
          try {
            await assertSnapshotClean(phaseSnapshot, `terra source after ${probe.name}`);
          } catch (error) {
            result.ok = false;
            result.detail = error.detail || { message: error.message };
          }
        }
        printResult(result);
        results.push(result);
      }
      const finalClean = await runProbe("destructive phase: final terra source snapshot clean", () => assertSnapshotClean(phaseSnapshot));
      printResult(finalClean);
      results.push(finalClean);
    }
  } finally {
    await browser.close();
  }

  if (ignoredDevNoise.length) {
    const hydration = ignoredDevNoise.filter((entry) => /hydrat|hydration-mismatch/i.test(entry.text)).length;
    const other = ignoredDevNoise.length - hydration;
    console.log(`\nInfo: ignored ${ignoredDevNoise.length} known dev console noise item(s)${hydration ? `, including ${hydration} hydration/body-gutter warning(s)` : ""}${other ? ` and ${other} Fast Refresh/DevTools/HMR item(s)` : ""}.`);
  }

  return results;
}

try {
  const results = await main();
  process.exitCode = results.some((result) => !result.ok) ? 1 : 0;
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
