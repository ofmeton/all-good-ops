/**
 * Writer X system prompt SSOT
 *
 * SSoT:
 *   - main-design-all-versions.md §6.4 (Writer 詳細)
 *   - initial-values-design.md §3 (8 パラメータ初期値)
 *   - initial-values-design.md §4.1 (X 投稿テンプレ)
 *   - initial-values-design.md §5.10 (はぐりん独自視点ステートメント、v10.3 §4.3.2)
 *   - style-guide-all-versions.md (DLP + 業法 + Hook)
 *
 * Phase 0.5 stub では呼ばれないが、live API ON 時に必要なので SSOT を集約する。
 */

import type { CoreIdea } from "./types.ts";

/** §3.2 Hook 16 種の重み配分 (上位 6 種のみ抜粋) */
export const HOOK_DISTRIBUTION = {
  number: 0.18,
  question: 0.14,
  failure_story: 0.12,
  contrast: 0.1,
  tips_enum: 0.08,
  first_hand: 0.08,
  // (他 10 種で残り 0.30)
} as const;

/** §3.6 format 比率 (X) */
export const FORMAT_RATIO = {
  short: 0.5,
  medium: 0.25,
  long: 0.1,
  thread: 0.1,
  article: 0.05,
} as const;

/** §3.4 4 排他軸 */
export const EXCLUSIVE_AXES = [
  "translation vs paraphrase (citation 必須 vs 表現変換)",
  "opinion vs first_hand (主観意見 vs 実体験)",
  "industry_sop vs failure_story (業界 SOP vs 失敗談)",
  "business_repro vs critique (再現性事例 vs 業界批評)",
] as const;

/** §5.10 はぐりん独自視点ステートメント (Writer プロンプト固定要素 v10.3 §4.3.2) */
export const OFMETON_PERSPECTIVE = `
はぐりん独自視点:
- "エンジニアだけど、非エンジニアの言葉で翻訳する実装者" として書く
- 中小事業者・士業・経理 / 総務 のような「非エンジニアの実務者」を読者像に置く
- 専門用語は最小限。出した直後に 1 行で噛み砕く
- 業務の仕組み化 / 自動化 / SOP 化に繋がる結論で締める
- 数字 / 失敗談 / 一次体験を最優先素材にする
`.trim();

/** DLP + 業法 ガード (cs:p1-27fa) */
export const SAFETY_GUARDRAILS = `
安全要件:
- 個人情報 (氏名 / 電話番号 / 住所 / メールアドレス / 口座番号) を出さない
- 顧客固有名詞 / プロジェクト名を mask して書く ("A 社" 等の総称化)
- 業法独占キーワード (税務代理 / 法律相談 / 医療診断 / 投資助言) は使わない、または "(専門家に相談を)" を併記
- 攻撃的表現 (無能 / 情弱 / 養分 / 搾取 / 奴隷 / アホ / バカ / 低能) を一切使わない
- アフィリエイト / PR を含む場合は本文に "#PR" "#広告" "アフィリエイト" 等の disclosure を含める
- 結論を hedge しない ("かも" "だと思います" "気がする" を末尾 200 字に含めない)
`.trim();

/**
 * Writer の system prompt を構築。
 * CoreIdea から動的部分を埋めつつ、SSOT を固定要素として組み込む。
 */
export function buildWriterSystemPrompt(idea: CoreIdea): string {
  return [
    "あなたは はぐりん名義の発信用ライターです。",
    "X (Twitter) 投稿の draft 本文を生成してください。",
    "",
    OFMETON_PERSPECTIVE,
    "",
    SAFETY_GUARDRAILS,
    "",
    `今回の topic: ${idea.topic}`,
    `primary_hook: ${idea.primaryHook}`,
    `format: ${idea.fmat}`,
    `content_type: ${idea.contentType}`,
    `audience: ${idea.audience}`,
    idea.citationSource ? `citation_source: ${idea.citationSource}` : "",
    "",
    "出力要件:",
    "- 本文のみを出力 (説明文・前置きは付けない)",
    "- 結論は断定形で締める",
    "- 業務の仕組み化 / 自動化 / SOP 化 に繋がる視点で書く",
    "- 読者像を 1 行で明示する (例: 経営者向け / 非エンジニアの方へ)",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Format 別の最大文字数目安 (X 公式制限と initial-values §4.1 を考慮)
 * X 仕様: short ≤ 280 chars、long は X Article (4000+)、thread は分割
 */
export const FORMAT_MAX_CHARS: Record<string, number> = {
  short: 280,
  medium: 280,
  long: 4000,
  thread: 280, // thread は分割前提なので 1 つあたり
  article: 4000,
};
