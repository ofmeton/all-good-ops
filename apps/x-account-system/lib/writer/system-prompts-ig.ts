/**
 * Writer Instagram system prompt SSOT (PR-E)
 *
 * SSoT:
 *   - main-design-all-versions.md §6.4.5 (Instagram カルーセル 9 枚 5 テンプレ)
 *   - initial-values-design.md §4.2 (Instagram カルーセル週 2 + リール週 1 = 月 12)
 *   - .claude/skills/visual-design-system.md (Noto Sans Heavy / 4 色)
 *
 * IG 投稿は 2 種類:
 *   - carousel: 9 枚スライド + キャプション 100-200 字
 *   - reel: 15-30 秒動画 + キャプション 100-200 字 (script + caption text)
 *
 * 月 12 本構成 (initial-values §4.2 SSOT):
 *   - カルーセル 8 (= 月 2/週 × 4 週)
 *   - リール 4 (= 月 1/週)
 */

import type { CoreIdea } from "./types.ts";
import type { CarouselTemplateId } from "../visualizer/types.ts";
import { OFMETON_PERSPECTIVE, SAFETY_GUARDRAILS } from "./system-prompts.ts";

export type IgPostKind = "carousel" | "reel";

/** Caption 文字数 SSOT (visual-design-system + competitor 観察) */
export const CAPTION_RANGE = {
  min: 100,
  max: 200,
} as const;

export type IgWriterContext = {
  kind: IgPostKind;
  carouselTemplateId?: CarouselTemplateId; // kind="carousel" のみ
  /** リール秒数 (15-30秒) */
  reelDurationSec?: number;
};

export function buildWriterSystemPromptIg(
  idea: CoreIdea,
  ctx: IgWriterContext,
): string {
  const carouselSpec =
    ctx.kind === "carousel"
      ? [
          `carousel_template: ${ctx.carouselTemplateId ?? "T1_hook_evidence"}`,
          "出力要件 (カルーセル 9 枚):",
          "- 9 枚分の title + body を順番に出力 (各 slide ≤ 50 字 body / ≤ 12 字 title)",
          "- 続いてキャプション 100-200 字を出力",
          "- 最後にハッシュタグ 0-3 個 (note 送客時のみ ≤3)",
        ].join("\n")
      : [
          `reel_duration_sec: ${ctx.reelDurationSec ?? 20}`,
          "出力要件 (リール):",
          "- 動画 script (発話 / カット / 字幕タイミング) を 5-8 行で構成",
          "- 続いてキャプション 100-200 字を出力",
          "- 最後にハッシュタグ 0-3 個",
        ].join("\n");

  return [
    "あなたは はぐりん名義の Instagram 投稿ライターです。",
    "Instagram (カルーセル / リール) 投稿の draft を生成してください。",
    "",
    OFMETON_PERSPECTIVE,
    "",
    SAFETY_GUARDRAILS,
    "",
    `topic: ${idea.topic}`,
    `primary_hook: ${idea.primaryHook}`,
    `content_type: ${idea.contentType}`,
    `audience: ${idea.audience}`,
    `kind: ${ctx.kind}`,
    "",
    carouselSpec,
    "",
    "デザインシステム遵守:",
    "- Noto Sans Heavy / 4 色限定 / 文字最小 24pt (visual-design-system.md SSOT)",
    "- 各 slide / 字幕は読者像 1 行明示を含む (Editor X4)",
    "- 結論を hedge しない (Editor R6)",
  ]
    .filter(Boolean)
    .join("\n");
}
