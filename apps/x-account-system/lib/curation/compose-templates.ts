/**
 * lib/curation/compose-templates.ts — 投稿テンプレ registry。
 * テンプレ = 執筆 system prompt への patch（投稿の型を規定する追記文面）。
 * 複数テンプレを切替できるようレジストリ化（2 つ目以降は後日 COMPOSE_TEMPLATES に追加）。
 *
 * 注意: id はフロント apps/xad-dashboard/lib/curation-formats.ts の TEMPLATE_OPTIONS と
 *       一致させること（ドリフト注意）。
 */
/** フック類型（投稿冒頭で読者の注意を掴む型）。 */
export type HookType = "速報" | "逆張り" | "数字" | "共感" | "問い" | "権威";

/** フック強度（踏み込みの強さ）。 */
export type HookStrength = "strong" | "medium" | "soft";

export interface ComposeTemplate {
  id: string;
  name: string;
  description: string;
  /** 文体（語り口・トーン）。例「速報屋らしく短文・断定・テンポ重視」。 */
  tone: string;
  /** 構成（本文の流れ）。例 `["速報フック","意味づけ","箇条書き","実務接続"]`。 */
  structure: string[];
  /** フック類型（冒頭の掴み方）。 */
  hookType: HookType;
  /** フック強度（踏み込みの強さ）。 */
  hookStrength: HookStrength;
  /** 由来メモ（参考アカウント等から型化した場合の出典・任意）。 */
  referenceNote?: string;
  /** 構造化フィールドだけでは表せない固有の掟・補足を差し込む文面。 */
  systemPromptPatch: string;
  /** このテンプレが想定する fmat（任意・将来の自動 fmat ヒント用）。 */
  preferredFmats?: string[];
}

/** フック強度 → 執筆指示ラベル。 */
export const HOOK_STRENGTH_LABEL: Record<HookStrength, string> = {
  strong: "強（1行目で断定・踏み込んで掴む）",
  medium: "中（過度に煽らずバランス良く掴む）",
  soft: "弱（穏当・丁寧に入る）",
};

/** 既定テンプレ ID（未指定・無効 id 時のフォールバック先）。 */
export const DEFAULT_TEMPLATE_ID = "template_chaen_gold";

export const COMPOSE_TEMPLATES: Record<string, ComposeTemplate> = {
  template_chaen_gold: {
    id: "template_chaen_gold",
    name: "チャエン型1（黄金）",
    description:
      "速報フック→意味づけ→箇条書き要点→実務接続。AIニュースを非エンジニアに翻訳する速報の黄金型。",
    tone: "速報屋らしく短文・断定・テンポ重視。熱量はあるが煽りすぎない。",
    structure: ["速報フック", "意味づけ・感情", "箇条書き要点", "実務接続"],
    hookType: "速報",
    hookStrength: "strong",
    referenceNote: "チャエン氏 X アカウント分析（outputs/research/2026-06-05-chaen-x-account-analysis.md §9.1）",
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

  template_chaen_contrarian: {
    id: "template_chaen_contrarian",
    name: "チャエン型2（逆張り問題提起）",
    description:
      "世間の通説に逆張りで切り込み→理由→読者の不安を言語化→実務の打ち手。立ち止まって考えさせる型。",
    tone: "落ち着いた断定。煽らず、しかし通説に正面から疑問を投げる硬めのトーン。",
    structure: ["逆張りの一言", "なぜそう言えるか", "読者の不安の言語化", "実務の打ち手"],
    hookType: "逆張り",
    hookStrength: "medium",
    referenceNote: "チャエン氏 X アカウント分析（逆張り問題提起パターン）",
    preferredFmats: ["medium", "long"],
    systemPromptPatch: `## 投稿の型（逆張り問題提起型）
- 1行目: 世間の通説・流行に逆張りする一言（例「AIで仕事は無くならない。無くなるのは"作業"だけ」）。決めつけで人を見下さない。
- 空行 → なぜそう言えるかの根拠を 1〜2 文（具体・事実ベース）。
- 空行 → 読者が薄々感じている不安を言語化して寄り添う（「焦るのはわかる」）。
- 最後に「では何をすべきか」の実務の打ち手を 1 つ示す（行動に落とす）。
- 禁止語（時代遅れ/情弱 等）は使わない。逆張りでも相手を見下さない。
- **プレーンテキストで書く**（markdown 記法は使わない。強調は言葉と改行で）。`,
  },

  template_chaen_howto: {
    id: "template_chaen_howto",
    name: "チャエン型3（数字ハウツー）",
    description:
      "具体数字フック→手順を箇条書き→再現性の担保→実務接続。やればできる感を数字で出す実用型。",
    tone: "実用書のように親切で具体的。数字と手順で「自分にもできる」と思わせるトーン。",
    structure: ["数字フック", "手順の箇条書き", "再現性の担保", "実務接続"],
    hookType: "数字",
    hookStrength: "medium",
    referenceNote: "チャエン氏 X アカウント分析（数字ハウツーパターン）",
    preferredFmats: ["medium", "long", "thread"],
    systemPromptPatch: `## 投稿の型（数字ハウツー型）
- 1行目: 具体数字を含むフック（例「3ステップで議事録作成が10分→1分になる」）。数字は素材本文 or web_search で裏が取れたものだけ。
- 空行 → 手順を「・」で箇条書き（順番が分かるように。markdown のリスト記号 - * は使わない）。
- 空行 → 「これは誰でも再現できる」根拠を一言（特別なスキル不要であることを担保）。
- 最後に「だから実務がどう楽になるか」を一言添える。
- 数字を盛らない・捏造しない（裏が取れない数字は書かない）。
- **プレーンテキストで書く**（markdown 記法は使わない。強調は言葉と改行で）。`,
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

/**
 * 構造化フィールドから「投稿の型（骨子）」ブロックを合成し、
 * 固有の掟（systemPromptPatch）を併用した執筆指示文を返す。
 * buildWriterSystemPrompt が base prompt に差し込む。
 */
export function renderTemplatePrompt(tpl: ComposeTemplate): string {
  const lines = [
    "## この投稿の型（骨子）",
    `- 文体: ${tpl.tone}`,
    `- 構成: ${tpl.structure.join(" → ")}`,
    `- フック類型: ${tpl.hookType}`,
    `- フック強度: ${HOOK_STRENGTH_LABEL[tpl.hookStrength]}`,
  ];
  if (tpl.referenceNote) {
    lines.push(`- 由来: ${tpl.referenceNote}`);
  }
  return `${lines.join("\n")}\n\n${tpl.systemPromptPatch}`;
}
