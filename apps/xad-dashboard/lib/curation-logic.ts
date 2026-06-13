export type SelectionStatus = "collected" | "selected" | "queued" | "rejected" | "archived";
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
  /** 表示時 time-decay 適用後の「いまの総合」（view 算出・要件3）。 */
  effective_overall: number | null;
  freshness: number | null;
  /** 半減期48h で減衰した「いまの鮮度」（view 算出）。 */
  freshness_eff: number | null;
  velocity: number | null;
  /** 時間あたりエンゲージ（バズ速度・view 算出）。PR-5 inbox セーフガード用。 */
  velocity_per_hour: number | null;
  target_fit: number | null;
  /** candidate=投稿候補 / reference=参考(JP二次流通)。view が確定（要件4）。 */
  lane: string | null;
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

export type SortKey =
  | "effective_overall"
  | "overall_score"
  | "freshness"
  | "velocity"
  | "target_fit"
  | "collected_at"
  | "engagement";

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
  lane?: string;       // lane 完全一致（candidate=投稿候補 / reference=参考(JP)）
  source?: string;     // source_ref 部分一致（小文字）
  text?: string;       // raw_text 部分一致（小文字）
}

export function filterMaterials(materials: CurationMaterial[], f: FilterSpec): CurationMaterial[] {
  return materials.filter((m) => {
    if (f.via && m.discovery_via !== f.via) return false;
    if (f.hasMedia && !(m.media && m.media.length > 0)) return false;
    if (f.lang && m.lang !== f.lang) return false;
    if (f.lane && (m.lane ?? "candidate") !== f.lane) return false;
    if (f.source && !(m.source_ref ?? "").toLowerCase().includes(f.source.toLowerCase())) return false;
    if (f.text && !(m.raw_text ?? "").toLowerCase().includes(f.text.toLowerCase())) return false;
    return true;
  });
}

/** inbox トリアージのセーフガード閾値・公式アカ。
 *  ※ collector-config.ts の category='ai_official' と同期させること（別パッケージのため手動同期）。 */
export const AI_OFFICIAL_HANDLES = new Set([
  "AnthropicAI", "OpenAI", "GoogleDeepMind",
  "GoogleAI", "GeminiApp", "xai", "AIatMeta", "MistralAI", "perplexity_ai",
  "cursor_ai", "vercel", "v0", "claudeai",
]);
export const INBOX_VELOCITY_THRESHOLD = 500; // velocity_per_hour（時間あたりエンゲージ）

/**
 * 未処理 inbox のトリアージ条件（要件2: 人間が見るのは高シグナルだけ）。
 * 実測で「queued 化された素材は 100% effective>=70」＝閾値70は実績ベース。
 * candidate は effective>=70 / trend / 高velocity / 公式アカ で必ず通す（取りこぼし防止のセーフガード）。
 * reference(JP二次流通)は通常 inbox に出さないが、trend or 高velocity の「JPバズ」だけ救う。
 */
export function passesInboxTriage(m: CurationMaterial): boolean {
  const hot =
    m.discovery_via === "trend" || (m.velocity_per_hour ?? 0) >= INBOX_VELOCITY_THRESHOLD;
  if (m.lane === "reference") return hot; // JPバズ参考のみ inbox に昇格
  // candidate（lane 未設定の旧データも candidate 扱い）
  return (
    (m.effective_overall ?? m.overall_score ?? 0) >= 70 ||
    hot ||
    AI_OFFICIAL_HANDLES.has(m.source_ref ?? "")
  );
}
