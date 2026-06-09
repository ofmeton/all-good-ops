/**
 * lib/curation/compose-prompts.ts — 執筆Ag(MA writer) の判断系レバー。
 * ターゲット定義 / 執筆戦略 / 品質・掟 はここを編集する。
 * 投稿の型（テンプレ）は lib/curation/compose-templates.ts に一本化（ここでは patch を結合するのみ）。
 * 出典: outputs/research/2026-06-05-chaen-x-account-analysis.md §9.1 /
 *       lib/writer/system-prompts.ts / .claude/skills/content-quality-rubric.md
 */
import { TARGET_DEFINITION } from "../ingest/collector-prompts.js";
import { resolveTemplate, renderTemplatePrompt } from "./compose-templates.js";

/** 許可フォーマット集合（SUBMIT_DRAFT_TOOL enum・run-compose validation・RPC と一致させる）。 */
export const COMPOSE_FMATS = ["short", "medium", "long", "article", "thread"] as const;

/** fmat の日本語ラベル（writer への希望フォーマット指示で使用）。 */
export const FMAT_LABELS: Record<string, string> = {
  short: "短め",
  medium: "普通",
  long: "長め",
  article: "記事（X 長文単発）",
  thread: "スレッド",
};

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
      fmat: { type: "string", enum: ["short", "medium", "long", "article", "thread"], description: "投稿フォーマット（article=X 長文単発・thread のように分割しない）" },
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

/**
 * 内蔵 agent toolset（web_search/web_fetch のみ有効。bash/file/code 無効）。
 * 永続 agent（bootstrap-ma-agents）が agent に焼く tool。run-compose は session で
 * tool を渡さない（agent 側固定）ため、SSOT はここに置く（compose 系の tool 正本）。
 */
export const WEB_TOOLSET = {
  type: "agent_toolset_20260401",
  default_config: { enabled: false },
  configs: [
    { name: "web_search", enabled: true },
    { name: "web_fetch", enabled: true },
  ],
};

/**
 * compose 系 tool の種別キー → 定義。agent.agent.yaml の `tools`（種別キー）と
 * bootstrap が突合して agent に焼く。run-compose は handler のみ host 側で注入する。
 */
export const COMPOSE_TOOL_REGISTRY: Record<string, unknown> = {
  submit_draft: SUBMIT_DRAFT_TOOL,
  web_toolset: WEB_TOOLSET,
};

/**
 * 執筆 system prompt（**テンプレ非依存の base**）。
 * target / リサーチ / 掟 / 進め方 のみ。投稿の型（テンプレ patch）は system に焼かず
 * buildComposeUserBlocks で userMessage 側に渡す（永続 agent の system を固定にするため）。
 * bootstrap-ma-agents の system_builder=`buildWriterSystemPrompt` から呼ばれて agent に焼かれる。
 */
export function buildWriterSystemPrompt(): string {
  return `あなたは X 発信用の「執筆エージェント」です。1 つの素材（元ツイート/ニュース）から、X 投稿ドラフトを 1 本書きます。

${TARGET_DEFINITION}
ポジション: 「AIニュースを非エンジニアの言葉に翻訳して即届ける速報屋」。

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
3. **userMessage で指定された投稿の型**に沿って本文を 1 本書く。
4. 最後に **必ず submit_draft を呼んで**提出する（body/fmat/topic/category 必須、citations 推奨）。`;
}

/**
 * テンプレ patch + 希望フォーマット + 再生成フラグを userMessage 用ブロックに組む。
 * テンプレ本文の出所は compose-templates.ts（renderTemplatePrompt）。
 *   - templateId 未指定/無効は既定テンプレに解決（現行挙動維持・drift は呼び出し側で warn）。
 *   - fmat 指定時のみ希望フォーマット指示を付す（label 欠落でも raw 値で出す＝黙って無指示にしない）。
 *   - redoFlags 非空時のみ「前回の指摘」を付す（差し戻し再生成）。
 */
export function buildComposeUserBlocks(
  templateId?: string | null,
  fmat?: string | null,
  redoFlags?: string[],
): string {
  const tpl = resolveTemplate(templateId);
  const templateBlock = `# 投稿の型（この型に沿って書く）\n${renderTemplatePrompt(tpl)}\n\n`;

  const fmatLabel = fmat ? (FMAT_LABELS[fmat] ?? fmat) : null;
  const fmatBlock = fmatLabel
    ? `# 希望フォーマット\n指定フォーマット=${fmatLabel}。` +
      `記事は X 長文単発（thread のように分割しない）。素材が薄ければ無理に伸ばさない。\n\n`
    : "";

  const flags = redoFlags ?? [];
  const redoBlock =
    flags.length > 0
      ? `# 前回の指摘（必ず避けて書き直す）\n` + flags.map((f) => `- ${f}`).join("\n") + `\n\n`
      : "";

  return templateBlock + fmatBlock + redoBlock;
}
