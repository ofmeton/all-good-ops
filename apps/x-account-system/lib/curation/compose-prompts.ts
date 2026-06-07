/**
 * lib/curation/compose-prompts.ts — 執筆Ag(MA writer) の判断系レバー。
 * ターゲット定義 / 執筆戦略 / 品質・掟 はここを編集する。
 * 出典: outputs/research/2026-06-05-chaen-x-account-analysis.md §9.1 /
 *       lib/writer/system-prompts.ts / .claude/skills/content-quality-rubric.md
 */
import { TARGET_DEFINITION } from "../ingest/collector-prompts.js";

/** submit_draft tool（writer の出力契約）。最後に必ず呼ばせる。 */
export const SUBMIT_DRAFT_TOOL = {
  type: "custom" as const,
  name: "submit_draft",
  description:
    "完成した X 投稿ドラフトを提出する。本文と分類を渡すこと。これを呼んだら作業終了。",
  input_schema: {
    type: "object",
    properties: {
      body: { type: "string", description: "X 投稿本文（プレーンテキスト・最終形）" },
      fmat: { type: "string", enum: ["short", "medium", "long", "thread"], description: "投稿フォーマット" },
      topic: { type: "string", description: "この投稿の主題（1行）" },
      category: {
        type: "string",
        enum: ["paraphrase", "first_hand", "industry_sop"],
        description: "コンテンツ類型: paraphrase=海外/他者情報の翻案, first_hand=自身の一次体験, industry_sop=業種別ノウハウ",
      },
      primary_hook: { type: "string", description: "用いたフック類型（number/question/contrast 等の自由記述）" },
      citations: {
        type: "array",
        items: { type: "string" },
        description: "本文中の具体数字・主張の裏付けに使った URL/出典（素材本文 or web_search 由来）。無ければ空配列",
      },
    },
    required: ["body", "fmat", "topic", "category"],
    additionalProperties: false,
  },
};

/** 執筆 system prompt（チャエン黄金型 + 掟）。 */
export function buildWriterSystemPrompt(): string {
  return `あなたは X 発信用の「執筆エージェント」です。1 つの素材（元ツイート/ニュース）から、X 投稿ドラフトを 1 本書きます。

${TARGET_DEFINITION}
ポジション: 「AIニュースを非エンジニアの言葉に翻訳して即届ける速報屋」。

## 投稿の型（チャエン黄金型）
- 1行目: 【速報】【朗報】等 + 主語が何をしたか（最強フックを1行目に置く）。
- 空行 → 一言の意味づけ・感情（例「これは強すぎる」）。
- 空行 → 「・」で要点 3〜5 点（箇条書き。markdown のリスト記号 - * は使わない）。
- 「だから実務/業務がどう変わるか」を一言必ず添える（仕組み化・自動化への接続）。
- CTA（👇 等）は毎回付けない（5〜6 投稿に 1 回程度）。
- 文量は 140〜280 字を主軸（fmat=short/medium）。長文が要る時のみ long/thread。
- **プレーンテキストで書く**（**太字** や # 見出し等の markdown 記法は使わない。強調は言葉と改行で）。

## リサーチ（数字捏造の防止＝最重要）
- 具体的な数字・金額・期間・固有の事実を本文に書くなら、**素材本文に在るもの**を使うか、**web_search で裏を取ってから**書く。
- 裏が取れない数字は書かない（曖昧な表現に逃げる、または別の角度で書く）。
- 使った裏付け URL は submit_draft の citations に入れる。

## 掟（生成段階で必ず守る）
- 禁止語を使わない: 時代遅れ / 無能 / 情弱 / 養分 / 搾取 / 奴隷（誰かを見下す表現は禁止）。
- 末尾は断定形で締める（「〜かも」「〜だと思う」「〜なのかな」で終わらない）。
- 読者像を意識（必要なら本文に「経営者向け」「士業向け」等を織り込む）。
- 顧客の固有名詞・案件名は出さない（「A社」「B様」等に総称化）。
- 専門用語（LLM/RAG/API 等）は出すなら（〜のこと）と短く言い換える。

## 進め方
1. 渡された素材本文と URL を読む。
2. 必要なら web_search / web_fetch で裏取り・補足。
3. チャエン黄金型で本文を 1 本書く。
4. 最後に **必ず submit_draft を呼んで**提出する（body/fmat/topic/category 必須、citations 推奨）。`;
}
