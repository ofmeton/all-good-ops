/**
 * budget-calculator: COST_MODEL_ROWS を読み、low / expected / p95 の月額予算を計算。
 *
 * v10.2 §3.3 CR-3 の 3 シナリオ予算試算を実装。
 *
 * CLI 実行: npm run budget (budget-cli.ts 経由)
 *
 * このモジュールは node:fs / dotenv を一切使わず Cloudflare Worker で import 可能。
 */
import { COST_MODEL_ROWS } from "./cost-model-data";
import type { CostRow } from "./cost-model-data";

export type { CostRow };

export type Scenario = "low" | "expected" | "p95";

/**
 * scenario multiplier:
 * - low:      retry_rate を 0.3 倍、image を low only、Opus thinking 無効、Interviewer 2/3 量
 * - expected: CSV の monthly_jpy_expected をそのまま使う
 * - p95:      retry_rate を 2.0 倍、image medium 50 枚化、Opus thinking high、Interviewer 1.3 倍
 */
export function scaleRow(row: CostRow, scenario: Scenario): number {
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

export function summarize(rows: CostRow[], scenario: Scenario) {
  const breakdown = rows.map((r) => ({
    category: r.category,
    jpy: Math.round(scaleRow(r, scenario)),
  }));
  const total = breakdown.reduce((s, b) => s + b.jpy, 0);
  return { scenario, total, breakdown };
}

/** 全シナリオ集計。Worker / CLI 両方から呼べる純粋関数。 */
export function calcBudget(scenarios: Scenario[] = ["low", "expected", "p95"]) {
  return scenarios.map((s) => summarize(COST_MODEL_ROWS, s));
}
