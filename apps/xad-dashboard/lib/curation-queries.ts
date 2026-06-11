import { serverSupabase } from "./supabase";
import type { CurationMaterial, SelectionStatus, CurationEventRow } from "./curation-logic";
import {
  toTemplateOptions,
  TEMPLATE_OPTIONS_FALLBACK,
  toRecommendations,
  type TemplateOption,
  type RecommendMaterialInput,
  type Recommendation,
} from "./curation-formats";

/** view から status 別に取得（overall desc、上限 limit）。 */
export async function listCurationMaterials(
  status: SelectionStatus, limit = 300,
): Promise<CurationMaterial[]> {
  const sb = serverSupabase();
  const { data } = await sb
    .from("curation_materials")
    .select("*")
    .eq("selection_status", status)
    .order("overall_score", { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data ?? []) as CurationMaterial[];
}

/** 各タブの件数。 */
export async function tabCounts(): Promise<Record<SelectionStatus, number>> {
  const sb = serverSupabase();
  const statuses: SelectionStatus[] = ["collected", "selected", "queued", "rejected"];
  const out = { collected: 0, selected: 0, queued: 0, rejected: 0 } as Record<SelectionStatus, number>;
  await Promise.all(statuses.map(async (s) => {
    const { count } = await sb
      .from("curation_materials").select("id", { count: "exact", head: true })
      .eq("selection_status", s);
    out[s] = count ?? 0;
  }));
  return out;
}

/** snapshot 用に対象素材の現在 meta を取得。 */
export async function fetchMaterialsForEvents(ids: string[]): Promise<CurationMaterial[]> {
  const sb = serverSupabase();
  const { data } = await sb.from("curation_materials").select("*").in("id", ids);
  return (data ?? []) as CurationMaterial[];
}

/** RPC で status を原子更新。更新件数を返す。
 *  desiredFmat / templateId は send_to_compose 時のみ渡す（未指定は null = 既存 meta 保持）。 */
export async function setSelectionStatus(
  ids: string[],
  status: SelectionStatus,
  desiredFmat?: string | null,
  templateId?: string | null,
): Promise<number> {
  const sb = serverSupabase();
  const { data, error } = await sb.rpc("set_selection_status", {
    p_ids: ids,
    p_status: status,
    p_desired_fmat: desiredFmat ?? null,
    p_template_id: templateId ?? null,
  });
  if (error) throw new Error(`set_selection_status failed: ${error.message}`);
  return (data as number) ?? 0;
}

/** 素材ごと割り当て（要件1）。各素材に別々の希望 fmat/template を当てる。 */
export interface SelectionItem {
  id: string;
  desiredFmat?: string | null;
  templateId?: string | null;
}

/**
 * RPC set_selection_status_items（0025）で素材ごと希望 fmat/template を一括反映。更新件数を返す。
 *   p_items=[{id, desired_fmat?, template_id?}]。desired_fmat/template_id は非 NULL のときだけ
 *   素材 meta に jsonb_set される（NULL は既存 meta 保持）。
 * 0017 の 4 引数 set_selection_status（全件同一）と異なり、素材単位で別々の希望を渡せる。
 * 空文字は「未指定」とみなし null に正規化する（UI の DEFAULT 送出と取り違えない）。
 */
export async function setSelectionStatusItems(
  items: SelectionItem[],
  status: SelectionStatus,
): Promise<number> {
  const sb = serverSupabase();
  const p_items = items.map((it) => ({
    id: it.id,
    // 空文字/undefined は null（= 既存 meta 保持）。RPC 側は null をスキップする契約。
    desired_fmat: it.desiredFmat ? it.desiredFmat : null,
    template_id: it.templateId ? it.templateId : null,
  }));
  const { data, error } = await sb.rpc("set_selection_status_items", {
    p_items,
    p_status: status,
  });
  if (error) throw new Error(`set_selection_status_items failed: ${error.message}`);
  return (data as number) ?? 0;
}

/** curation_events を一括追記。 */
export async function recordCurationEvents(
  rows: Array<CurationEventRow & { compose_run_id?: string | null }>,
): Promise<void> {
  const sb = serverSupabase();
  const { error } = await sb.from("curation_events").insert(rows);
  if (error) throw new Error(`curation_events insert failed: ${error.message}`);
}

/**
 * Worker の /admin/templates を叩いてテンプレ選択肢を取得（registry が SSOT）。
 * enqueueCompose と同じ規約（WORKER_BASE_URL + OAUTH_ADMIN_SECRET / Bearer）。
 * env 未設定・取得失敗・不正レスポンスはすべて fail-open で fallback を返す
 * （テンプレ欄が空にならない＝送信導線を止めない）。
 */
export async function fetchTemplateOptions(): Promise<TemplateOption[]> {
  const base = process.env.WORKER_BASE_URL;
  const key = process.env.OAUTH_ADMIN_SECRET;
  // fail-open（送信フローは止めない）。ただし enqueueCompose が fail-loud(throw) なのに対し
  // ここは握って fallback するため、各失敗分岐を console.error で観測可能にする
  // （無ログだと worker 障害・secret rotation で型2/型3 が UI から黙って消え drift が不可視で再発する）。
  if (!base || !key) {
    console.error(
      "[fetchTemplateOptions] WORKER_BASE_URL / OAUTH_ADMIN_SECRET 未設定 → fallback（テンプレ一覧は既定 1 件のみ表示）",
    );
    return TEMPLATE_OPTIONS_FALLBACK;
  }
  const url = `${base.replace(/\/$/, "")}/admin/templates`;
  try {
    const res = await fetch(url, { method: "GET", headers: { Authorization: `Bearer ${key}` } });
    if (!res.ok) {
      console.error(
        `[fetchTemplateOptions] GET /admin/templates HTTP ${res.status} → fallback（worker 不達 / 401 / 5xx の可能性）`,
      );
      return TEMPLATE_OPTIONS_FALLBACK;
    }
    const body = (await res.json()) as { templates?: unknown };
    return toTemplateOptions(body?.templates);
  } catch (e) {
    console.error(
      `[fetchTemplateOptions] fetch/parse 失敗 → fallback（network or 壊れ JSON）: ${String(e)}`,
    );
    return TEMPLATE_OPTIONS_FALLBACK;
  }
}

/**
 * Worker の /admin/recommend を叩き、素材ごとのテンプレ/fmat 推薦を取得（registry が SSOT）。
 * fetchTemplateOptions と同じ規約（WORKER_BASE_URL + OAUTH_ADMIN_SECRET / Bearer）。
 * env 未設定・取得失敗・不正レスポンスはすべて fail-open で [] を返す
 * （推薦は付加価値＝失敗しても送信導線/ダイアログを壊さない）。各失敗は console.error で観測可能に。
 */
export async function fetchRecommendations(
  materials: RecommendMaterialInput[],
): Promise<Recommendation[]> {
  if (materials.length === 0) return [];
  const base = process.env.WORKER_BASE_URL;
  const key = process.env.OAUTH_ADMIN_SECRET;
  if (!base || !key) {
    console.error(
      "[fetchRecommendations] WORKER_BASE_URL / OAUTH_ADMIN_SECRET 未設定 → 推薦なし（[] で fail-open）",
    );
    return [];
  }
  const url = `${base.replace(/\/$/, "")}/admin/recommend`;
  // worker hang で Next route が opaque に詰まらないよう timeout（25s）で打ち切り、
  // AbortError は下の catch で [] に合流（既存 fail-open 経路に乗せる）。
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ materials }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.error(
        `[fetchRecommendations] POST /admin/recommend HTTP ${res.status} → 推薦なし（worker 不達 / 401 / 5xx の可能性）`,
      );
      return [];
    }
    const body = (await res.json()) as { recommendations?: unknown };
    return toRecommendations(body?.recommendations);
  } catch (e) {
    const reason = (e as Error)?.name === "AbortError" ? "timeout(25s)" : "network or 壊れ JSON";
    console.error(`[fetchRecommendations] fetch/parse 失敗 → 推薦なし（${reason}）: ${String(e)}`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** Worker の /admin/enqueue を叩いて compose を起動。runId を返す（失敗時は null）。 */
export async function enqueueCompose(): Promise<string | null> {
  const base = process.env.WORKER_BASE_URL;
  const key = process.env.OAUTH_ADMIN_SECRET;
  if (!base || !key) throw new Error("WORKER_BASE_URL / OAUTH_ADMIN_SECRET 未設定");
  const url = `${base.replace(/\/$/, "")}/admin/enqueue?job=compose`;
  const res = await fetch(url, { method: "GET", headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`enqueue compose failed: HTTP ${res.status}`);
  const body = (await res.json()) as { ok?: boolean; enqueued?: { runId?: string } };
  return body.enqueued?.runId ?? null;
}
