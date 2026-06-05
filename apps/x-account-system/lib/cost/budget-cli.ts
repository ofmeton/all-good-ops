/**
 * budget-cli.ts — CLI エントリポイント (Node.js 専用)
 *
 * 使い方:
 *   npm run budget               # expected / low / p95 まとめて表示
 *   npm run budget -- --scenario=p95
 *   npm run budget -- --json     # JSON 出力
 */
import { calcBudget, summarize } from "./budget-calculator";
import { COST_MODEL_ROWS } from "./cost-model-data";
import type { Scenario } from "./budget-calculator";

const MONTHLY_LIMIT = Number(process.env.BUDGET_MONTHLY_LIMIT_JPY ?? 10000);
const BROWNOUT = Number(process.env.BUDGET_BROWNOUT_THRESHOLD_JPY ?? 11500);

function main() {
  const argv = process.argv.slice(2);
  const isJson = argv.includes("--json");
  const scenarioArg = argv.find((a) => a.startsWith("--scenario="));
  const explicitScenario = scenarioArg
    ? (scenarioArg.split("=")[1] as Scenario)
    : null;

  const scenarios: Scenario[] = explicitScenario ? [explicitScenario] : ["low", "expected", "p95"];
  const reports = scenarios.map((s) => summarize(COST_MODEL_ROWS, s));

  if (isJson) {
    const out = reports.map((r) => ({
      ...r,
      monthly_limit_jpy: MONTHLY_LIMIT,
      brownout_threshold_jpy: BROWNOUT,
      over_limit: r.total > MONTHLY_LIMIT,
      over_brownout: r.total > BROWNOUT,
    }));
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  console.log(`Budget scenarios (BUDGET_MONTHLY_LIMIT=¥${MONTHLY_LIMIT}, BROWNOUT=¥${BROWNOUT}):\n`);
  for (const rep of reports) {
    const flag = rep.total > BROWNOUT ? "❌ BROWNOUT" : rep.total > MONTHLY_LIMIT ? "⚠️ OVER" : "✅ OK";
    console.log(`[${rep.scenario.padEnd(8)}] total = ¥${rep.total.toLocaleString()}  ${flag}`);
    if (scenarios.length === 1) {
      console.log("  breakdown:");
      for (const b of rep.breakdown) {
        if (b.jpy === 0) continue;
        console.log(`    ${b.category.padEnd(28)} ¥${b.jpy.toLocaleString()}`);
      }
    }
  }
}

main();
