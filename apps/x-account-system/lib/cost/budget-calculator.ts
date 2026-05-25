/**
 * budget-calculator: cost-model.csv を読み、low / expected / p95 の月額予算を計算。
 *
 * v10.2 §3.3 CR-3 の 3 シナリオ予算試算を実装。
 *
 * 使い方:
 *   npm run budget               # expected
 *   npm run budget -- --scenario p95
 *   npm run budget -- --json     # JSON 出力
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MONTHLY_LIMIT = Number(process.env.BUDGET_MONTHLY_LIMIT_JPY ?? 10000);
const BROWNOUT = Number(process.env.BUDGET_BROWNOUT_THRESHOLD_JPY ?? 11500);

type Row = {
  category: string;
  runs_per_month: number;
  input_tok_per_run: number;
  output_tok_per_run: number;
  retry_rate: number;
  model: string;
  input_usd_per_mtok: number;
  output_usd_per_mtok: number;
  monthly_jpy_expected: number;
  notes: string;
};

type Scenario = "low" | "expected" | "p95";

function parseCsv(text: string): Row[] {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    // 簡易 CSV parser (notes に , が含まれることを考慮、quote 対応)
    const cols: string[] = [];
    let cur = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        cols.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    cols.push(cur);

    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = (cols[i] ?? "").trim()));
    return {
      category: row.category,
      runs_per_month: Number(row.runs_per_month || 0),
      input_tok_per_run: Number(row.input_tok_per_run || 0),
      output_tok_per_run: Number(row.output_tok_per_run || 0),
      retry_rate: Number(row.retry_rate || 0),
      model: row.model,
      input_usd_per_mtok: Number(row.input_usd_per_mtok || 0),
      output_usd_per_mtok: Number(row.output_usd_per_mtok || 0),
      monthly_jpy_expected: Number(row.monthly_jpy_expected || 0),
      notes: row.notes ?? "",
    };
  });
}

/**
 * scenario multiplier:
 * - low:      retry_rate を 0.3 倍、image を low only、Opus thinking 無効、Interviewer 2/3 量
 * - expected: CSV の monthly_jpy_expected をそのまま使う
 * - p95:      retry_rate を 2.0 倍、image medium 50 枚化、Opus thinking high、Interviewer 1.3 倍
 */
function scaleRow(row: Row, scenario: Scenario): number {
  if (scenario === "expected") return row.monthly_jpy_expected;

  const cat = row.category;
  const expected = row.monthly_jpy_expected;

  if (scenario === "low") {
    if (cat === "writer") return expected * 0.62; // retry 30% → 10%
    if (cat === "editor") return expected * 0.95;
    if (cat === "interviewer") return expected * 0.67;
    if (cat === "image_low") return expected * 1.3;
    if (cat === "image_medium") return 0;
    if (cat === "optimizer_phase2") return expected * 0.45; // Opus thinking 無効
    if (cat === "x_api_url_post") return expected * 0.6;
    return expected;
  }

  // p95
  if (cat === "writer") return expected * 1.6;
  if (cat === "editor") return expected * 1.4;
  if (cat === "interviewer") return expected * 1.4;
  if (cat === "image_low") return expected * 0.8;
  if (cat === "image_medium") return expected * 2.5;
  if (cat === "image_high") return 1200;
  if (cat === "optimizer_phase2") return expected * 2.5;
  if (cat === "x_api_url_post") return expected * 1.3;
  if (cat === "x_api_metrics_read") return expected * 1.8;
  return expected * 1.05;
}

function summarize(rows: Row[], scenario: Scenario) {
  const breakdown = rows.map((r) => ({
    category: r.category,
    jpy: Math.round(scaleRow(r, scenario)),
  }));
  const total = breakdown.reduce((s, b) => s + b.jpy, 0);
  return { scenario, total, breakdown };
}

function main() {
  const csvPath = join(__dirname, "cost-model.csv");
  const csv = readFileSync(csvPath, "utf-8");
  const rows = parseCsv(csv);

  const argv = process.argv.slice(2);
  const isJson = argv.includes("--json");
  const scenarioArg = argv.find((a) => a.startsWith("--scenario="));
  const explicitScenario = scenarioArg
    ? (scenarioArg.split("=")[1] as Scenario)
    : null;

  const scenarios: Scenario[] = explicitScenario ? [explicitScenario] : ["low", "expected", "p95"];
  const reports = scenarios.map((s) => summarize(rows, s));

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
