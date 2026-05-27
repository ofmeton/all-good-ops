/**
 * Writer Instagram — Anthropic Sonnet 4.6 ベース IG 投稿 draft generator (PR-E)
 *
 * SSoT:
 *   - main-design-all-versions.md §6.4.5 (Instagram カルーセル 9 枚 5 テンプレ)
 *   - initial-values-design.md §4.2 (Instagram カルーセル週 2 + リール週 1 = 月 12)
 *
 * Phase 0.5 fallback:
 *   - IN_MEMORY_FALLBACK=true || !ANTHROPIC_API_KEY → deterministic stub
 *
 * 出力 2 種類:
 *   - carousel: 9 slide (title + body + image_prompt) + caption
 *   - reel    : script (5-8 行) + caption
 */

import type { CoreIdea } from "./types.ts";
import {
  buildWriterSystemPromptIg,
  CAPTION_RANGE,
  type IgPostKind,
  type IgWriterContext,
} from "./system-prompts-ig.ts";
import {
  composeCarousel,
  type CarouselComposition,
  type CarouselTemplateId,
} from "../visualizer/carousel-composer.ts";

export type IgDraftRequest = {
  idea: CoreIdea;
  kind: IgPostKind;
  carouselTemplateId?: CarouselTemplateId;
  reelDurationSec?: number;
};

export type IgDraftOutput = {
  draftId: string;
  kind: IgPostKind;
  carousel?: CarouselComposition;
  /** リール scripts (5-8 行) */
  reelScript?: string;
  caption: string;
  hashtags: string[];
  estimatedScore: number;
  llmCostUsd: number;
  generator: "stub" | "anthropic-sonnet-4.6";
};

/**
 * Phase 0.5 stub: deterministic に carousel composition + caption + hashtag を組む。
 */
function buildStubBody(req: IgDraftRequest): {
  carousel?: CarouselComposition;
  reelScript?: string;
  caption: string;
  hashtags: string[];
} {
  const { idea, kind } = req;
  const audienceLine = `${idea.audience} 向け。`;
  const firstHand = `私は ${idea.topic} を試して、現場で運用した。`;
  const conclusion = `仕組み化のコツは、判断軸を 3 つに固定して、テンプレ化して、回す手順を SOP に書き出すこと。`;
  let caption = `${audienceLine}${firstHand}${conclusion}`;
  // CAPTION_RANGE.max を超えないようにトリム
  if (caption.length > CAPTION_RANGE.max) {
    caption = `${caption.slice(0, CAPTION_RANGE.max - 1)}。`;
  }
  const hashtags: string[] = []; // note 送客なしの通常ポストは 0 個

  if (kind === "carousel") {
    const templateId = req.carouselTemplateId ?? "T1_hook_evidence";
    const carousel = composeCarousel(idea, templateId);
    return { carousel, caption, hashtags };
  }

  // reel
  const duration = req.reelDurationSec ?? 20;
  const reelScript = [
    `[0-3s] Hook: ${idea.topic} の Before-After 数字を提示`,
    `[3-8s] 問題提起: ${idea.audience} が詰まりがちなポイントを 1 文`,
    `[8-${Math.min(20, duration)}s] 解決手順: 画面録画 + 字幕で 3 ステップ`,
    `[${Math.min(20, duration)}-${duration}s] CTA: プロフから note へ送客`,
  ].join("\n");
  return { reelScript, caption, hashtags };
}

async function callAnthropicWriter(
  req: IgDraftRequest,
  systemPrompt: string,
): Promise<{
  carousel?: CarouselComposition;
  reelScript?: string;
  caption: string;
  hashtags: string[];
  costUsd: number;
}> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `topic: ${req.idea.topic}\nkind: ${req.kind}\ntemplate: ${req.carouselTemplateId ?? "(reel)"}\n\n上記要件に従って IG 投稿 draft を生成してください。`,
      },
    ],
  });
  const text =
    response.content.find((b) => b.type === "text")?.text ?? "(no text returned)";
  const inputCost = (response.usage.input_tokens / 1_000_000) * 3;
  const outputCost = (response.usage.output_tokens / 1_000_000) * 15;

  // Phase 0.5 → 1 への移行ステップでは LLM 出力 parsing が必要 (kind ごとに structured output 設定)。
  // ここでは caption のみ取り出して fallback として stub の carousel/script を併用する。
  const stub = buildStubBody(req);
  return {
    ...stub,
    caption: text.length > 0 ? text.slice(0, CAPTION_RANGE.max) : stub.caption,
    costUsd: inputCost + outputCost,
  };
}

export async function draftForIg(req: IgDraftRequest): Promise<IgDraftOutput> {
  const draftId = `draft-${req.idea.id}-ig-${req.kind}-${Date.now()}`;
  const useStub =
    process.env.IN_MEMORY_FALLBACK === "true" ||
    !process.env.ANTHROPIC_API_KEY;

  if (useStub) {
    const stub = buildStubBody(req);
    return {
      draftId,
      kind: req.kind,
      carousel: stub.carousel,
      reelScript: stub.reelScript,
      caption: stub.caption,
      hashtags: stub.hashtags,
      estimatedScore: 0.6,
      llmCostUsd: 0,
      generator: "stub",
    };
  }

  const ctx: IgWriterContext = {
    kind: req.kind,
    carouselTemplateId: req.carouselTemplateId,
    reelDurationSec: req.reelDurationSec,
  };
  const systemPrompt = buildWriterSystemPromptIg(req.idea, ctx);
  const result = await callAnthropicWriter(req, systemPrompt);
  return {
    draftId,
    kind: req.kind,
    carousel: result.carousel,
    reelScript: result.reelScript,
    caption: result.caption,
    hashtags: result.hashtags,
    estimatedScore: 0.7,
    llmCostUsd: result.costUsd,
    generator: "anthropic-sonnet-4.6",
  };
}

export { CAPTION_RANGE, type IgPostKind } from "./system-prompts-ig.ts";
