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

/** 既定 overall desc。collected_at は新しい順、engagement は合算 desc。null は末尾。 */
export function sortMaterials(materials: CurationMaterial[], key: SortKey): CurationMaterial[] {
  const copy = [...materials];
  if (key === "collected_at") {
    return copy.sort((a, b) => (b.collected_at ?? "").localeCompare(a.collected_at ?? ""));
  }
  if (key === "engagement") {
    return copy.sort((a, b) => engagementTotal(b) - engagementTotal(a));
  }
  return copy.sort((a, b) => (b[key] ?? -1) - (a[key] ?? -1));
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
