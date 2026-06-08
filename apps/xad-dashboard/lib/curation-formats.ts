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
