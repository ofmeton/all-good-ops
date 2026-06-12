/**
 * lib/params/runtime-params.ts — collector レバーの runtime 可変パラメータ（P3 / AD-3）。
 *
 * optimizer 閉ループの数値レバーを deploy 不要・即 revert 可能にする外出し層。
 *   - bounds はここ（RUNTIME_PARAM_BOUNDS）がコード側で死守する SSOT。DB 値は必ず clip。
 *   - default は COLLECTOR_CONFIG（行が無いレバーは default のまま＝挙動不変）。enforce は 0=shadow。
 *   - resolveRuntimeParams は DB 不達・壊れ値・未知 paramId で fail-open（default を返す/維持）。
 *
 * Cloudflare Worker で import 可（node:* 非依存・supabase-js のみ）。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { COLLECTOR_CONFIG } from "../ingest/collector-config.js";

export interface RuntimeParamBound {
  min: number;
  max: number;
}

/** コード側が死守する bounds。DB に何が入っても必ずこの範囲に clip する。 */
export const RUNTIME_PARAM_BOUNDS: Record<string, RuntimeParamBound> = {
  collector_shortlist_top_k: { min: 20, max: 120 },
  collector_exploration_quota: { min: 5, max: 30 }, // 下限>0＝計測ループ不滅（AD-3）
  collector_prerank_max_age_hours: { min: 48, max: 168 },
  collector_prerank_enforce: { min: 0, max: 1 }, // 0=shadow / 1=enforce
};

export const RUNTIME_PARAM_IDS = Object.keys(RUNTIME_PARAM_BOUNDS);

/**
 * default（runtime_params に行が無いときの値）。
 * 数値レバーは COLLECTOR_CONFIG が SSOT（drift 防止）。enforce は 0=shadow（既定で挙動不変）。
 */
export const RUNTIME_PARAM_DEFAULTS: Record<string, number> = {
  collector_shortlist_top_k: COLLECTOR_CONFIG.shortlistTopK,
  collector_exploration_quota: COLLECTOR_CONFIG.explorationQuota,
  collector_prerank_max_age_hours: COLLECTOR_CONFIG.prerankMaxAgeHours,
  collector_prerank_enforce: 0,
};

export type ResolvedRuntimeParams = Record<string, number>;

/** paramId の bounds で clip（未知 paramId は素通し）。 */
export function clipRuntimeParam(paramId: string, value: number): number {
  const b = RUNTIME_PARAM_BOUNDS[paramId];
  if (!b) return value;
  return Math.min(Math.max(value, b.min), b.max);
}

/**
 * runtime_params を読み default に overlay→clip した確定値を返す。
 * DB 不達/エラー/壊れ値（非有限数）/未知 paramId は無視し default を維持（fail-open）。
 */
export async function resolveRuntimeParams(sb: SupabaseClient): Promise<ResolvedRuntimeParams> {
  const out: ResolvedRuntimeParams = { ...RUNTIME_PARAM_DEFAULTS };
  try {
    const { data, error } = await sb.from("runtime_params").select("param_id, value");
    if (error || !data || !Array.isArray(data)) return out;
    for (const row of data as Array<{ param_id?: unknown; value?: unknown }>) {
      const id = row?.param_id;
      if (typeof id !== "string" || !(id in RUNTIME_PARAM_BOUNDS)) continue; // 未知 paramId は無視
      if (row.value == null) continue; // null/undefined は壊れ値扱い（Number(null)=0 への誤 coerce を防ぐ）
      const v = Number(row.value);
      if (!Number.isFinite(v)) continue; // 壊れ値は default 維持
      out[id] = clipRuntimeParam(id, v);
    }
    return out;
  } catch {
    return { ...RUNTIME_PARAM_DEFAULTS }; // 例外でも default で fail-open
  }
}

/**
 * runtime_params に 1 レバーを clip して upsert。変更前の値（無ければ null）を返す（tier-P rollback handle）。
 * 未知 paramId / 非有限値は throw（bounds の無い任意レバー・壊れ値を書かせない）。
 */
export async function setRuntimeParam(
  sb: SupabaseClient,
  paramId: string,
  value: number,
  updatedBy?: string,
): Promise<{ before: number | null; after: number }> {
  if (!(paramId in RUNTIME_PARAM_BOUNDS)) {
    throw new Error(`unknown runtime param: ${paramId}`);
  }
  if (!Number.isFinite(value)) {
    throw new Error(`runtime param value must be finite: ${paramId}=${String(value)}`);
  }
  const after = clipRuntimeParam(paramId, value);

  // before（現在値）を取得。無ければ null（= 元々行が無い）。
  const { data: cur, error: readErr } = await sb
    .from("runtime_params")
    .select("value")
    .eq("param_id", paramId)
    .maybeSingle();
  if (readErr) throw new Error(`setRuntimeParam read failed: ${readErr.message}`);
  const beforeRaw = cur ? Number((cur as { value?: unknown }).value) : NaN;
  const before = Number.isFinite(beforeRaw) ? beforeRaw : null;

  const { error: upErr } = await sb.from("runtime_params").upsert(
    {
      param_id: paramId,
      value: after,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy ?? null,
    },
    { onConflict: "param_id" },
  );
  if (upErr) throw new Error(`setRuntimeParam upsert failed: ${upErr.message}`);
  return { before, after };
}

/**
 * runtime_params から 1 レバーを削除（tier-P rollback で before=null＝元々行が無かった場合の復帰）。
 */
export async function deleteRuntimeParam(sb: SupabaseClient, paramId: string): Promise<void> {
  const { error } = await sb.from("runtime_params").delete().eq("param_id", paramId);
  if (error) throw new Error(`deleteRuntimeParam failed: ${error.message}`);
}
