/**
 * lib/cost/cost-ledger.ts — xad.cost_ledger への計上配管（fail-open）。
 *
 * pipeline 各 stage（collector/writer/checker …）の概算コストを月次 ledger に
 * 1 行追記する。kpi-collector.ts が当月合計を読み brownout の暴走ブレーキに使う。
 * 計上スコープは cost-of.ts と同じ＝**token usage 課金のみ**。web_search 等の
 * MA サーバ費は未計上で、実支出総額は cost-report.ts（Anthropic Admin API）が別途捕捉。
 *
 * 設計上の前提:
 *   - fail-open: insert 失敗や sb 例外は console.warn のみで throw しない。cost 計上の
 *     失敗で本体 job（投稿・点検）を壊さない。
 *   - costJpy <= 0 は skip（無駄行を作らない）。
 *   - month は **UTC 'YYYY-MM'**。reader（cost-report.ts の utcMonthString 照合 /
 *     kpi-collector.ts の created_at UTC レンジ）が両方 UTC 基準のため、それに揃える
 *     （JST にすると月境界で cost-report の表示集計から漏れる）。
 *
 * Cloudflare Worker で import 可（node:* 非依存）。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { USD_JPY_RATE } from "./cost-of.js";

export interface RecordCostLedgerInput {
  category: string;
  costJpy: number;
  /** 省略時は costJpy / USD_JPY_RATE を 4 桁で補完。 */
  costUsd?: number;
  /** 課金単位数（token 合計など）。 */
  unitCount?: number;
  meta?: Record<string, unknown>;
}

/** UTC 基準の 'YYYY-MM'（cost_ledger.month 用。cost-report.ts utcMonthString と一致）。 */
function utcMonth(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * cost_ledger に 1 行計上する。失敗しても throw しない（fail-open）。
 */
export async function recordCostLedger(
  sb: SupabaseClient,
  input: RecordCostLedgerInput,
): Promise<void> {
  const { category, costJpy, costUsd, unitCount, meta } = input;
  if (!(costJpy > 0)) {
    // token を消費したのに cost<=0 は異常（上流で costJpy が欠落＝brownout 過小計上のサイン）。
    // 真にゼロな run は無音 skip、token>0 の取りこぼしだけ顕在化させる。
    if ((unitCount ?? 0) > 0) {
      console.warn(
        JSON.stringify({
          level: "warn",
          msg: "[cost-ledger] tokens spent but cost<=0 — upstream costJpy lost, row skipped",
          category,
          unitCount,
          costJpy,
        }),
      );
    }
    return; // 0 / 負 / NaN は計上 skip
  }

  try {
    const cost_usd =
      costUsd !== undefined
        ? costUsd
        : Math.round((costJpy / USD_JPY_RATE) * 10000) / 10000;
    const { error } = await sb.from("cost_ledger").insert({
      month: utcMonth(),
      category,
      cost_jpy: costJpy,
      cost_usd,
      unit_count: unitCount ?? null,
      meta: meta ?? {},
    });
    if (error) {
      console.warn(
        JSON.stringify({
          level: "warn",
          msg: "[cost-ledger] insert failed (fail-open)",
          category,
          error: error.message,
        }),
      );
    }
  } catch (e) {
    console.warn(
      JSON.stringify({
        level: "warn",
        msg: "[cost-ledger] insert threw (fail-open)",
        category,
        error: String(e),
      }),
    );
  }
}
