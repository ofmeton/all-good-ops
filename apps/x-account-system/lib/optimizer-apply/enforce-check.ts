/**
 * lib/optimizer-apply/enforce-check.ts — collector prerank enforce 自動切替。
 *
 * maybeAutoEnforce: cost_ledger(category='collector') の直近 shadow run を評価し
 * 安全基準を全て満たしたら collector_prerank_enforce を 0→1 に flip して LINE 通知する。
 *
 * 安全基準（全て満たす時のみ flip）:
 *   1. shadow run が 7 件以上（直近 14 行から meta.shadow を持つ行のみ抽出）
 *   2. 直近 7 件すべて topN_retention === 1.0
 *   3. 直近 7 件すべて pruned_fine_max < 70
 *
 * 疑わしきは flip しない（上澄み温存優先）: meta.shadow 欠損・型不正・DB 不達はすべて no-op。
 * 既に enforce=1 の場合は no-op（冪等）。
 * dryRun=true の場合: 基準評価のみ行い flip と通知は行わない。
 *
 * Cloudflare Worker で import 可（node:* 非依存）。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveRuntimeParams, setRuntimeParam } from "../params/runtime-params.js";

const REQUIRED_SHADOW_RUNS = 7;
/** 取得する cost_ledger 行数の上限。meta.shadow 欠損行が混在するため余裕を持たせる。 */
const QUERY_LIMIT = 14;

export interface EnforceCheckDeps {
  sb: SupabaseClient;
  /** flip 成功時の通知。テストでは mock 関数。 */
  notify: (text: string) => Promise<void>;
}

export interface AutoEnforceResult {
  flipped: boolean;
  /** 判断根拠（flip しない理由 / "safety criteria met"）。ログ用。 */
  reason: string;
  /** meta.shadow を持っていた shadow run 件数（基準チェックの入力数）。 */
  runsEvaluated: number;
}

/** meta.shadow から抽出した最低限の安全基準フィールド。 */
interface ShadowMetrics {
  topN_retention: number;
  pruned_fine_max: number;
}

/**
 * cost_ledger 行の meta から meta.shadow を取り出して型検証する。
 * 欠損・型不正・非有限値はすべて null を返す（疑わしきは flip しない）。
 */
function extractShadow(meta: unknown): ShadowMetrics | null {
  if (meta == null || typeof meta !== "object") return null;
  const s = (meta as Record<string, unknown>)["shadow"];
  if (s == null || typeof s !== "object") return null;
  const sr = s as Record<string, unknown>;
  const r = sr["topN_retention"];
  const p = sr["pruned_fine_max"];
  if (typeof r !== "number" || !Number.isFinite(r)) return null;
  if (typeof p !== "number" || !Number.isFinite(p)) return null;
  return { topN_retention: r, pruned_fine_max: p };
}

/**
 * collector prerank enforce 自動切替チェック。
 *
 * 安全基準を満たす場合に collector_prerank_enforce を 1 に flip し LINE 通知する。
 * dryRun=true 時は評価のみ（flip・通知なし）。nightly の dry-run 連動に使う。
 */
export async function maybeAutoEnforce(
  deps: EnforceCheckDeps,
  opts: { dryRun?: boolean } = {},
): Promise<AutoEnforceResult> {
  const { dryRun = false } = opts;

  // 1. 冪等: 既に enforce=1 → no-op
  let rp: Record<string, number>;
  try {
    rp = await resolveRuntimeParams(deps.sb);
  } catch (e) {
    return { flipped: false, reason: `resolveRuntimeParams failed (fail-open): ${String(e)}`, runsEvaluated: 0 };
  }
  if (rp.collector_prerank_enforce >= 1) {
    return { flipped: false, reason: "already enforced", runsEvaluated: 0 };
  }

  // 2. cost_ledger から直近 QUERY_LIMIT 行を新しい順で取得
  let rawRows: Array<{ meta: unknown }>;
  try {
    const { data, error } = await deps.sb
      .from("cost_ledger")
      .select("meta")
      .eq("category", "collector")
      .order("created_at", { ascending: false })
      .limit(QUERY_LIMIT);
    if (error || !Array.isArray(data)) {
      return { flipped: false, reason: "cost_ledger query failed (fail-open)", runsEvaluated: 0 };
    }
    rawRows = data as Array<{ meta: unknown }>;
  } catch (e) {
    return { flipped: false, reason: `cost_ledger query threw (fail-open): ${String(e)}`, runsEvaluated: 0 };
  }

  // meta.shadow を持つ行のみを shadow run として抽出（新しい順を維持）
  const shadowRuns = rawRows
    .map((r) => extractShadow(r.meta))
    .filter((s): s is ShadowMetrics => s !== null);

  const runsEvaluated = shadowRuns.length;

  // 3. 安全基準チェック
  if (shadowRuns.length < REQUIRED_SHADOW_RUNS) {
    return {
      flipped: false,
      reason: `insufficient shadow runs: ${shadowRuns.length}/${REQUIRED_SHADOW_RUNS}`,
      runsEvaluated,
    };
  }

  const latest7 = shadowRuns.slice(0, REQUIRED_SHADOW_RUNS);

  const retentionMin = Math.min(...latest7.map((r) => r.topN_retention));
  if (retentionMin < 1.0) {
    return {
      flipped: false,
      reason: `topN_retention < 1.0 in latest ${REQUIRED_SHADOW_RUNS} (min=${retentionMin.toFixed(3)})`,
      runsEvaluated,
    };
  }

  const prunedMax = Math.max(...latest7.map((r) => r.pruned_fine_max));
  if (prunedMax >= 70) {
    return {
      flipped: false,
      reason: `pruned_fine_max >= 70 in latest ${REQUIRED_SHADOW_RUNS} (max=${prunedMax.toFixed(3)})`,
      runsEvaluated,
    };
  }

  // 4. dry-run: 評価のみ（flip・通知なし）
  if (dryRun) {
    return {
      flipped: false,
      reason: "dry-run: safety criteria met (would flip in non-dry-run)",
      runsEvaluated,
    };
  }

  // 5. 安全基準 OK → flip
  try {
    await setRuntimeParam(deps.sb, "collector_prerank_enforce", 1, "auto-enforce");
  } catch (e) {
    return { flipped: false, reason: `setRuntimeParam failed: ${String(e)}`, runsEvaluated };
  }

  const msg =
    "✅ collector enforce 自動切替: 直近7run retention=100%・pruned_fine_max<70 達成。" +
    "scoring/translate 削減発動。revert=collector_prerank_enforce=0";

  // 通知失敗は fail-open（flip は成功済なので握りつぶさない）
  await deps.notify(msg).catch((e) =>
    console.warn("[enforce-check] LINE notify failed (fail-open):", String(e)),
  );

  return { flipped: true, reason: "safety criteria met", runsEvaluated };
}
