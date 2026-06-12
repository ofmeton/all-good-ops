/**
 * lib/optimizer-apply/tier-p.ts — runtime_params 数値レバーの適用（tier-P / AD-3）。
 *
 * tier-T(Beta posterior) とは別系統。collector の K/quota/age/enforce を bounds 内に clip して
 * runtime_params に upsert する。tier-T が optimizer_state を書くのに対し、tier-P は runtime_params を書く。
 * rollback handle = before 値（null=元々行が無かった→削除で復帰）。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { setRuntimeParam, deleteRuntimeParam, RUNTIME_PARAM_BOUNDS } from "../params/runtime-params.js";

/** tier-P 適用: before 取得→clip→upsert。{paramId, before, after} を返す（before は rollback handle）。 */
export async function applyTierP(
  sb: SupabaseClient,
  paramId: string,
  value: number,
): Promise<{ paramId: string; before: number | null; after: number }> {
  if (!(paramId in RUNTIME_PARAM_BOUNDS)) {
    throw new Error(`unknown tier-P paramId: ${paramId}`);
  }
  const { before, after } = await setRuntimeParam(sb, paramId, value, "optimizer-apply");
  return { paramId, before, after };
}

/** tier-P rollback: before 値へ書き戻す（before=null は元々行が無かった→削除）。 */
export async function rollbackTierP(
  sb: SupabaseClient,
  paramId: string,
  before: number | null,
): Promise<void> {
  if (before == null) {
    await deleteRuntimeParam(sb, paramId);
    return;
  }
  await setRuntimeParam(sb, paramId, before, "optimizer-apply-rollback");
}
