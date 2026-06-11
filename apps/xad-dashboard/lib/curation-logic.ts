export type SelectionStatus = "collected" | "selected" | "queued" | "rejected";
export type CurationAction = "select" | "reject" | "reset" | "send_to_compose";

export interface MediaItem { type: string; url: string }

export interface CurationMaterial {
  id: string;
  source_ref: string | null;
  raw_text: string | null;
  created_at: string;
  collected_at: string | null;
  selection_status: SelectionStatus;
  overall_score: number | null;
  freshness: number | null;
  velocity: number | null;
  target_fit: number | null;
  score_reason: string | null;
  discovery_via: string | null;
  discovery_query: string | null;
  lang: string | null;
  tweet_url: string | null;
  conversation_id: string | null;
  media: MediaItem[] | null;
  engagement: Record<string, number> | null;
  translation: string | null;
}

export const ACTION_TO_STATUS: Record<CurationAction, SelectionStatus> = {
  select: "selected",
  reject: "rejected",
  reset: "collected",
  send_to_compose: "queued",
};

export interface CurationEventRow {
  material_id: string;
  action: CurationAction;
  from_status: SelectionStatus;
  to_status: SelectionStatus;
  scores: { freshness: number | null; velocity: number | null; target_fit: number | null; overall: number | null };
  discovery: { via: string | null; query: string | null };
  source_ref: string | null;
  note: string | null;
}

/** 決定時点の snapshot 付き event 行を作る（compose_run_id は route で後付け）。 */
export function buildEventRows(
  materials: CurationMaterial[],
  action: CurationAction,
  note: string | null,
): CurationEventRow[] {
  const to = ACTION_TO_STATUS[action];
  return materials.map((m) => ({
    material_id: m.id,
    action,
    from_status: m.selection_status,
    to_status: to,
    scores: { freshness: m.freshness, velocity: m.velocity, target_fit: m.target_fit, overall: m.overall_score },
    discovery: { via: m.discovery_via, query: m.discovery_query },
    source_ref: m.source_ref,
    note,
  }));
}

export type SortKey = "overall_score" | "freshness" | "velocity" | "target_fit" | "collected_at" | "engagement";

function engagementTotal(m: CurationMaterial): number {
  const e = m.engagement;
  if (!e) return -1; // engagement 無し（既存素材）は末尾へ
  return (e.like ?? 0) + (e.retweet ?? 0) + (e.view ?? 0) + (e.bookmark ?? 0);
}

/** ISO 文字列を日単位（YYYY-MM-DD）に丸める。多軸ソートで同日を次キーに渡すため。 */
function dayKey(iso: string | null): string {
  return (iso ?? "").slice(0, 10);
}

/** 1 キー分の比較（戻り値 > 0 で b が上位＝降順）。null は末尾。 */
function compareByKey(
  a: CurationMaterial,
  b: CurationMaterial,
  key: SortKey,
  roundDay: boolean,
): number {
  if (key === "collected_at") {
    // 新しい順。後続キーがある時だけ日単位に丸め、同日内を次キーで並べ替えられるようにする
    // （完全タイムスタンプ比較だと第2キーがほぼ発動しない）。
    const av = roundDay ? dayKey(a.collected_at) : (a.collected_at ?? "");
    const bv = roundDay ? dayKey(b.collected_at) : (b.collected_at ?? "");
    return bv.localeCompare(av);
  }
  if (key === "engagement") return engagementTotal(b) - engagementTotal(a);
  return (b[key] ?? -1) - (a[key] ?? -1);
}

/**
 * 多軸ソート。keys を優先順に評価し、先頭キーが同値なら次キーで決める（例: 新着順 × 総合スコア）。
 * 単一キー（後方互換）も受ける。keys が空なら overall_score 単独。Array.sort は安定なので
 * 全キー同値の並びは入力順を保つ。
 */
export function sortMaterials(
  materials: CurationMaterial[],
  keys: SortKey | SortKey[],
): CurationMaterial[] {
  const list = (Array.isArray(keys) ? keys : [keys]).filter(Boolean) as SortKey[];
  const effective: SortKey[] = list.length > 0 ? list : ["overall_score"];
  const copy = [...materials];
  copy.sort((a, b) => {
    for (let i = 0; i < effective.length; i++) {
      const key = effective[i];
      const roundDay = key === "collected_at" && i < effective.length - 1;
      const cmp = compareByKey(a, b, key, roundDay);
      if (cmp !== 0) return cmp;
    }
    return 0;
  });
  return copy;
}

export interface FilterSpec {
  via?: string;        // discovery_via 完全一致
  hasMedia?: boolean;  // media が1件以上
  lang?: string;       // lang 完全一致
  source?: string;     // source_ref 部分一致（小文字）
  text?: string;       // raw_text 部分一致（小文字）
}

export function filterMaterials(materials: CurationMaterial[], f: FilterSpec): CurationMaterial[] {
  return materials.filter((m) => {
    if (f.via && m.discovery_via !== f.via) return false;
    if (f.hasMedia && !(m.media && m.media.length > 0)) return false;
    if (f.lang && m.lang !== f.lang) return false;
    if (f.source && !(m.source_ref ?? "").toLowerCase().includes(f.source.toLowerCase())) return false;
    if (f.text && !(m.raw_text ?? "").toLowerCase().includes(f.text.toLowerCase())) return false;
    return true;
  });
}
