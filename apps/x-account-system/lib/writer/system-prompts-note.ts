/**
 * Writer note system prompt SSOT (PR-E)
 *
 * SSoT:
 *   - main-design-all-versions.md §6.4.6 (note 生成フロー詳述)
 *   - initial-values-design.md §4.3 (note 4-6 本/月)
 *   - .claude/skills/note-revenue-playbook.md
 *   - .claude/skills/non-engineer-translation.md
 *
 * 構成テンプレ 5 系統 (main-design §6.4.6.1):
 *   1. まとめ型     (how_to_summary)
 *   2. 段階型       (step_by_step)
 *   3. ツール比較型 (tool_comparison)
 *   4. 専門職×AI 型 (case_study)
 *   5. シリーズ実践記型 (series_log)
 *
 * 価格 (main-design §6.4.6.3): 500 / 980 / 1480 円
 * ティーザー (main-design §6.4.6.4): 無料部 700-1,200 字 + 有料部 1,500-6,000 字
 */

import type { CoreIdea } from "./types.ts";
import { OFMETON_PERSPECTIVE, SAFETY_GUARDRAILS } from "./system-prompts.ts";

/** note 5 構成テンプレ id (main-design §6.4.6.1) */
export type NoteTemplateId =
  | "how_to_summary"
  | "step_by_step"
  | "tool_comparison"
  | "case_study"
  | "series_log";

/** 価格段階 (main-design §6.4.6.3、L2 内訳) */
export type NotePriceTier = 0 | 500 | 980 | 1480;

/** note 文字数レンジ (main-design §6.4.6 + initial-values §4.3 SSOT) */
export type NoteLengthBand =
  | "short" // 800-1,500 字 (無料軽量)
  | "medium" // 2,000-3,500 字 (中規模)
  | "long" // 3,000-5,000 字 (有料中)
  | "long_xl"; // 8,000-12,000 字 (有料決定版)

/** 構成テンプレ別の文字数レンジ SSOT (main-design §6.4.6.1) */
export const NOTE_TEMPLATE_LENGTH_RANGES: Record<
  NoteTemplateId,
  { min: number; max: number }
> = {
  how_to_summary: { min: 2000, max: 10000 },
  step_by_step: { min: 3000, max: 5000 },
  tool_comparison: { min: 3000, max: 6000 },
  case_study: { min: 3000, max: 5000 },
  series_log: { min: 1500, max: 3000 },
};

/** ティーザー境界仕様 (main-design §6.4.6.4) */
export const TEASER_RANGE = {
  free_min: 700,
  free_max: 1200,
  paid_min: 1500,
  paid_max: 6000,
} as const;

export type NoteWriterContext = {
  templateId: NoteTemplateId;
  priceTier: NotePriceTier;
  /** 有料記事の場合のティーザー境界字数 */
  teaserBoundary?: number;
};

export function buildWriterSystemPromptNote(
  idea: CoreIdea,
  ctx: NoteWriterContext,
): string {
  const range = NOTE_TEMPLATE_LENGTH_RANGES[ctx.templateId];
  const isPaid = ctx.priceTier > 0;
  const teaser =
    isPaid && ctx.teaserBoundary
      ? `\n- 有料記事: 先頭 ${ctx.teaserBoundary} 字を無料部 (問題提起 + Why + 無料軽量版)、残りを有料部 (結論 + 再現手順 + ハマりどころ + 応用例 + CTA)`
      : "";

  return [
    "あなたは はぐりん名義の note 記事ライターです。",
    "note 公開用の記事本文を生成してください。",
    "",
    OFMETON_PERSPECTIVE,
    "",
    SAFETY_GUARDRAILS,
    "",
    `topic: ${idea.topic}`,
    `primary_hook: ${idea.primaryHook}`,
    `content_type: ${idea.contentType}`,
    `audience: ${idea.audience}`,
    `note_template: ${ctx.templateId}`,
    `price_tier: ${ctx.priceTier === 0 ? "free" : `¥${ctx.priceTier}`}`,
    `target_length: ${range.min}-${range.max} 字`,
    idea.citationSource ? `citation_source: ${idea.citationSource}` : "",
    teaser,
    "",
    "出力要件:",
    "- 本文のみを出力 (h1 タイトルは含めない、h2/h3 は使ってよい)",
    "- 読者像を冒頭リード 1 段落で明示する",
    "- 再現手順 / 数値 / 失敗談 のいずれか 1 つ以上を必ず含める",
    "- 結論は断定形で締める",
    "- 業務の仕組み化 / 自動化 / SOP 化 に繋がる視点で書く",
  ]
    .filter(Boolean)
    .join("\n");
}
