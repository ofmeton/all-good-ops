/**
 * lib/curation-formats.ts — 執筆送信ダイアログのフォーマット/テンプレ選択肢。
 *
 * 注意: TEMPLATE_OPTIONS の id はバックエンド
 *   apps/x-account-system/lib/curation/compose-templates.ts の COMPOSE_TEMPLATES registry と
 *   一致させること（ドリフト注意）。FMAT_OPTIONS の value は同 compose-prompts.ts COMPOSE_FMATS と一致。
 */
export const FMAT_OPTIONS = [
  { value: "short", label: "短め" },
  { value: "medium", label: "普通" },
  { value: "long", label: "長め" },
  { value: "article", label: "記事" },
  { value: "thread", label: "スレッド" },
] as const;

export const TEMPLATE_OPTIONS = [
  { id: "template_chaen_gold", label: "チャエン型1（黄金）" },
] as const;

export type FmatValue = (typeof FMAT_OPTIONS)[number]["value"];
export type TemplateId = (typeof TEMPLATE_OPTIONS)[number]["id"];

/** ダイアログの既定値。 */
export const DEFAULT_FMAT: FmatValue = "medium";
export const DEFAULT_TEMPLATE_ID: TemplateId = "template_chaen_gold";
