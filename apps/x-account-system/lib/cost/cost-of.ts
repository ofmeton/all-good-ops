/**
 * lib/cost/cost-of.ts — トークン課金の単価突合（純関数・配管なし）。
 *
 * 単価 SSOT は cost-model-data.ts の COST_MODEL_ROWS。runtime の model id
 * （"claude-haiku-4-5" / "claude-opus-4-8" / "claude-sonnet-4-6" 等）を family
 * （haiku/opus/sonnet）で COST_MODEL_ROWS に突合し、in/out の MTok 単価を引く。
 * これまで collector.ts / run-compose.ts / run-check.ts に散在した hard-coded
 * usdFor() と "* 150" を 1 本に集約する。
 *
 * 課金スコープ（握り潰さない明記）:
 *   ここで計上するのは **token usage 課金のみ**。MA built-in の web_search /
 *   web_fetch のサーバ費は Messages API の session usage に含まれず、本 util では
 *   **未計上**。実支出ベースの月次総額は lib/dashboard/cost-report.ts が Anthropic
 *   Admin API 経路（claudeCostUsd）で別途捕捉する。cost_ledger はあくまで
 *   pipeline 内の概算で、brownout の暴走ブレーキ用の早期シグナル。
 *
 * Cloudflare Worker でそのまま import 可（node:* / fs 非依存）。
 */
import { COST_MODEL_ROWS } from "./cost-model-data.js";

/** USD→JPY 換算レート（定数集約・externalize）。各所の "* 150" はここを参照する。 */
export const USD_JPY_RATE = 150;

type Rate = { input: number; output: number };

const FAMILIES = ["haiku", "opus", "sonnet"] as const;
type Family = (typeof FAMILIES)[number];

/**
 * family が COST_MODEL_ROWS に無い場合の安全側 fallback（従来 usdFor 互換）。
 * 現状 COST_MODEL_ROWS は sonnet / opus 行のみで haiku 行が無いため、haiku は
 * ここで 1/5（旧 run-check.ts usdFor と同値）を引く＝既存挙動を保持する。
 */
const FAMILY_FALLBACK: Record<Family, Rate> = {
  haiku: { input: 1, output: 5 },
  opus: { input: 15, output: 75 }, // 実 Opus 4.x 単価。COST_MODEL_ROWS opus 行と同値
  sonnet: { input: 3, output: 15 },
};

/**
 * 未突合（family token を持たない model）の既定単価。
 * brownout の暴走ブレーキ用なので **安全側（高め）= 最も高い既知 family（opus）** に倒す。
 * 未知モデルを過小計上してブレーキを見逃すより、過大計上で早めに止める方が安全。
 */
const DEFAULT_RATE: Rate = { input: 15, output: 75 }; // opus 相当（fail-high）

/** COST_MODEL_ROWS から family→単価の deduped lookup を一度だけ構築。 */
const RATE_BY_FAMILY: Map<Family, Rate> = (() => {
  const m = new Map<Family, Rate>();
  for (const row of COST_MODEL_ROWS) {
    const fam = familyOf(row.model);
    // 単価 0 の非 LLM 行（image / x-pay / ma 等）は対象外。先勝ちで dedupe。
    if (fam && row.input_usd_per_mtok > 0 && !m.has(fam)) {
      m.set(fam, { input: row.input_usd_per_mtok, output: row.output_usd_per_mtok });
    }
  }
  return m;
})();

/** model 文字列に含まれる family token を返す（無ければ undefined）。 */
function familyOf(model: string): Family | undefined {
  const lower = (model ?? "").toLowerCase();
  return FAMILIES.find((f) => lower.includes(f));
}

// 同一 model の警告スパムを防ぐ（運用ログ過多を避ける）。
const warned = new Set<string>();

function resolveRate(model: string): Rate {
  const fam = familyOf(model);
  if (fam) return RATE_BY_FAMILY.get(fam) ?? FAMILY_FALLBACK[fam];
  if (!warned.has(model)) {
    warned.add(model);
    console.warn(
      JSON.stringify({
        level: "warn",
        msg: "[cost-of] unmatched model, using opus default 15/75 (fail-high for brownout)",
        model,
      }),
    );
  }
  return DEFAULT_RATE;
}

/** token 数から概算 USD を返す（丸めなし）。 */
export function costUsdFor(model: string, tokensIn = 0, tokensOut = 0): number {
  const r = resolveRate(model);
  return (tokensIn / 1_000_000) * r.input + (tokensOut / 1_000_000) * r.output;
}

/** token 数から概算 JPY を返す（usd * USD_JPY_RATE を小数2桁に丸め）。 */
export function costJpyFor(model: string, tokensIn = 0, tokensOut = 0): number {
  return Math.round(costUsdFor(model, tokensIn, tokensOut) * USD_JPY_RATE * 100) / 100;
}
