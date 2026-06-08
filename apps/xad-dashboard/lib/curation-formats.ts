/**
 * lib/curation-formats.ts — 執筆送信ダイアログのフォーマット/テンプレ選択肢。
 *
 * テンプレ一覧は worker `GET /admin/templates`（registry が SSOT）から動的取得する。
 * ここには手書きの id 一覧を持たない（ドリフト解消）。取得失敗時のみ
 * TEMPLATE_OPTIONS_FALLBACK（既定 1 件）に fail-open する。
 * FMAT_OPTIONS の value は compose-prompts.ts COMPOSE_FMATS と一致させること。
 */
export const FMAT_OPTIONS = [
  { value: "short", label: "短め" },
  { value: "medium", label: "普通" },
  { value: "long", label: "長め" },
  { value: "article", label: "記事" },
  { value: "thread", label: "スレッド" },
] as const;

export type FmatValue = (typeof FMAT_OPTIONS)[number]["value"];

/** 執筆送信ダイアログのテンプレ選択肢（worker registry 由来）。 */
export interface TemplateOption {
  id: string;
  label: string;
}

/** ダイアログの既定 fmat。 */
export const DEFAULT_FMAT: FmatValue = "medium";
/** 既定テンプレ id（worker DEFAULT_TEMPLATE_ID と一致）。 */
export const DEFAULT_TEMPLATE_ID = "template_chaen_gold";

/** endpoint 取得失敗時の fail-open fallback（既定テンプレ 1 件のみ）。 */
export const TEMPLATE_OPTIONS_FALLBACK: TemplateOption[] = [
  { id: DEFAULT_TEMPLATE_ID, label: "チャエン型1（黄金）" },
];

/**
 * worker `/admin/templates` の templates 配列を選択肢に変換する。
 * 外部入力なので境界で検証し、有効 row（id/name が非空文字列）だけ拾う。
 * 有効 row が無ければ fallback を返す（ダイアログのテンプレ欄が空にならない）。
 */
export function toTemplateOptions(rows: unknown): TemplateOption[] {
  if (!Array.isArray(rows)) return TEMPLATE_OPTIONS_FALLBACK;
  const out: TemplateOption[] = [];
  for (const row of rows) {
    if (row && typeof row === "object") {
      const r = row as Record<string, unknown>;
      const id = r.id;
      const name = r.name;
      if (typeof id === "string" && id.length > 0 && typeof name === "string" && name.length > 0) {
        out.push({ id, label: name });
      }
    }
  }
  if (out.length > 0) return out;
  // 非空配列なのに 1 件も拾えない = worker↔dashboard の field 名 drift の疑い
  // （「worker 不達でそもそも空」とは区別してログを残す）。
  if (rows.length > 0) {
    console.warn(
      `[toTemplateOptions] worker から ${rows.length} 件受領したが id/name を満たす row が 0 件（契約 drift の疑い）→ fallback`,
    );
  }
  return TEMPLATE_OPTIONS_FALLBACK;
}

/** worker `/admin/recommend` に渡す素材の最小特徴。 */
export interface RecommendMaterialInput {
  id: string;
  text: string;
  lang?: string | null;
  hasMedia?: boolean;
  engagement?: Record<string, number> | null;
}

/** worker から返る 1 素材あたりの推薦（境界検証済の形）。 */
export interface Recommendation {
  materialId: string;
  templateId: string;
  fmat: string;
  reason: string;
  confidence: number;
}

const FMAT_VALUES: readonly string[] = FMAT_OPTIONS.map((o) => o.value);

/**
 * worker `/admin/recommend` の recommendations 配列を境界検証して整える。
 * 外部入力（LLM 経由）なので各フィールドを検証し、不正な行は破棄する。
 * - materialId/templateId は非空文字列必須。
 * - fmat が未知なら medium に補正（UI の fmat 選択肢と必ず一致させる）。
 * - confidence は数値かつ [0,1]、それ以外は 0.5。reason 欠落は ""。
 */
export function toRecommendations(rows: unknown): Recommendation[] {
  if (!Array.isArray(rows)) return [];
  const out: Recommendation[] = [];
  let fmatFallbacks = 0; // 未知 fmat→既定 への黙った補正を可視化（worker↔UI の fmat drift サイン）。
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const materialId = r.materialId;
    const templateId = r.templateId;
    if (typeof materialId !== "string" || materialId.length === 0) continue;
    if (typeof templateId !== "string" || templateId.length === 0) continue;
    const fmatKnown = typeof r.fmat === "string" && FMAT_VALUES.includes(r.fmat);
    const fmat = fmatKnown ? (r.fmat as string) : DEFAULT_FMAT;
    if (!fmatKnown) fmatFallbacks++;
    const reason = typeof r.reason === "string" ? r.reason : "";
    let confidence = typeof r.confidence === "number" && Number.isFinite(r.confidence) ? r.confidence : 0.5;
    if (confidence < 0) confidence = 0;
    if (confidence > 1) confidence = 1;
    out.push({ materialId, templateId, fmat, reason, confidence });
  }
  // worker は templateId を registry 検証済（既定にフォールバック）で返すため、UI 層で残る
  // 黙った補正は fmat の drift のみ。発生件数を 1 行 warn（silent 劣化を防ぐ）。
  if (fmatFallbacks > 0) {
    console.warn(
      `[toRecommendations] ${fmatFallbacks} 件の推薦で未知 fmat を既定(${DEFAULT_FMAT})に補正（worker↔UI の fmat drift の疑い）`,
    );
  }
  return out;
}

/** 推薦群から最頻 templateId / fmat（ダイアログの既定 pre-fill 用）。空なら既定値。 */
export function modeOf(recs: Recommendation[]): { templateId: string; fmat: string } {
  if (recs.length === 0) return { templateId: DEFAULT_TEMPLATE_ID, fmat: DEFAULT_FMAT };
  const count = (pick: (r: Recommendation) => string): string => {
    const m = new Map<string, number>();
    for (const r of recs) m.set(pick(r), (m.get(pick(r)) ?? 0) + 1);
    // 同数は最初に最大到達したキー（挿入順＝推薦順）を採る。
    let best = "";
    let bestN = -1;
    for (const [k, n] of m) {
      if (n > bestN) {
        best = k;
        bestN = n;
      }
    }
    return best;
  };
  return { templateId: count((r) => r.templateId), fmat: count((r) => r.fmat) };
}
