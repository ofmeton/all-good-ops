/**
 * lib/curation/compose-templates.ts — 投稿テンプレ registry。
 * テンプレ = 執筆 system prompt への patch（投稿の型を規定する追記文面）。
 * 複数テンプレを切替できるようレジストリ化（2 つ目以降は後日 COMPOSE_TEMPLATES に追加）。
 *
 * 注意: id はフロント apps/xad-dashboard/lib/curation-formats.ts の TEMPLATE_OPTIONS と
 *       一致させること（ドリフト注意）。
 */
export interface ComposeTemplate {
  id: string;
  name: string;
  description: string;
  /** 執筆 system prompt の「投稿の型」セクションに差し込む文面。 */
  systemPromptPatch: string;
  /** このテンプレが想定する fmat（任意・将来の自動 fmat ヒント用）。 */
  preferredFmats?: string[];
}

/** 既定テンプレ ID（未指定・無効 id 時のフォールバック先）。 */
export const DEFAULT_TEMPLATE_ID = "template_chaen_gold";

export const COMPOSE_TEMPLATES: Record<string, ComposeTemplate> = {
  template_chaen_gold: {
    id: "template_chaen_gold",
    name: "チャエン型1（黄金）",
    description:
      "速報フック→意味づけ→箇条書き要点→実務接続。AIニュースを非エンジニアに翻訳する速報の黄金型。",
    preferredFmats: ["short", "medium"],
    systemPromptPatch: `## 投稿の型（チャエン黄金型）
- 1行目: 【速報】【朗報】等 + 主語が何をしたか（最強フックを1行目に置く）。
- 空行 → 一言の意味づけ・感情（例「これは強すぎる」）。
- 空行 → 「・」で要点 3〜5 点（箇条書き。markdown のリスト記号 - * は使わない）。
- 「だから実務/業務がどう変わるか」を一言必ず添える（仕組み化・自動化への接続）。
- CTA（👇 等）は毎回付けない（5〜6 投稿に 1 回程度）。
- 文量は 140〜280 字を主軸（fmat=short/medium）。長文が要る時のみ long/article/thread。
- **プレーンテキストで書く**（**太字** や # 見出し等の markdown 記法は使わない。強調は言葉と改行で）。`,
  },
};

/** id が registry に存在するか（drift 検知用。null/未知は false）。 */
export function isKnownTemplate(id?: string | null): boolean {
  return !!id && Object.prototype.hasOwnProperty.call(COMPOSE_TEMPLATES, id);
}

/** id からテンプレを解決。無効/未指定は既定テンプレを返す（必ず ComposeTemplate を返す）。 */
export function resolveTemplate(id?: string | null): ComposeTemplate {
  if (isKnownTemplate(id)) {
    return COMPOSE_TEMPLATES[id as string];
  }
  return COMPOSE_TEMPLATES[DEFAULT_TEMPLATE_ID];
}
