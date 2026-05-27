/**
 * Visualizer entry point (PR-E)
 *
 * SSoT: main-design-all-versions.md §2.6 / §6.4.5 / §6.6, initial-values §3.7
 *
 * Mode 別の出力を組み立てる:
 *   - image    : codex-image.generateImages を呼ぶ (Phase 0.5 stub)
 *   - video    : Phase 0.5 では撮影 SOP storyboard を返す (動画自動生成は範囲外)
 *   - text_only: visual asset なし
 */

import { generateImages } from "./codex-image.ts";
import { composeCarousel } from "./carousel-composer.ts";
import type {
  ImageOutput,
  ImageSize,
  TextOnlyOutput,
  VideoOutput,
  VisualizerOutput,
  VisualizerRequest,
} from "./types.ts";

const SIZE_BY_PLATFORM: Record<"x" | "instagram" | "note", ImageSize> = {
  x: "1024x1024",
  instagram: "1080x1080",
  note: "1080x1350",
};

export async function visualize(
  req: VisualizerRequest,
): Promise<VisualizerOutput> {
  switch (req.mode) {
    case "image":
      return visualizeImage(req);
    case "video":
      return visualizeVideo(req);
    case "text_only":
      return visualizeTextOnly(req);
    default: {
      const _exhaustive: never = req.mode;
      throw new Error(`Unknown visualizer mode: ${String(_exhaustive)}`);
    }
  }
}

async function visualizeImage(
  req: VisualizerRequest,
): Promise<ImageOutput> {
  const size = req.platform === "instagram" && req.carouselTemplateId
    ? "1080x1350"
    : SIZE_BY_PLATFORM[req.platform];
  const useStub =
    process.env.IN_MEMORY_FALLBACK === "true" ||
    !process.env.OPENAI_API_KEY;

  // Carousel の場合は composer から 9 件の prompt を取り出して 1 リクエストにまとめる
  if (req.carouselTemplateId) {
    const composition = composeCarousel(req.idea, req.carouselTemplateId);
    const prompts = composition.slides.map((s) => s.image_prompt);
    const response = await generateImages({
      prompt: prompts[0] ?? "",
      prompts,
      size: "1080x1350",
      count: 9,
      brand: "ofmeton",
    });
    return {
      kind: "image",
      draftId: req.draftId,
      images: response.images,
      costUsd: response.costUsd,
      carousel: composition,
      generator: useStub ? "stub" : "codex-gpt-image-2",
    };
  }

  // 単発画像 (X / note)
  const count = req.imageCount ?? 1;
  const promptBase = `[ofmeton brand single image] topic: ${req.idea.topic} / audience: ${req.idea.audience} / Noto Sans Heavy / 4-color limited palette / minimum font 24pt`;
  const response = await generateImages({
    prompt: promptBase,
    size,
    count,
    brand: "ofmeton",
  });
  return {
    kind: "image",
    draftId: req.draftId,
    images: response.images,
    costUsd: response.costUsd,
    generator: useStub ? "stub" : "codex-gpt-image-2",
  };
}

async function visualizeVideo(
  req: VisualizerRequest,
): Promise<VideoOutput> {
  // Phase 0.5: 動画自動生成は範囲外。撮影 SOP storyboard を返す
  const storyboard = [
    `[video storyboard for ${req.platform} / topic: ${req.idea.topic}]`,
    "1. 0-3s: Hook (number / failure_story)",
    "2. 3-8s: 問題提起 (実体験 1 行)",
    "3. 8-20s: 解決手順 (画面録画 + 字幕)",
    "4. 20-30s: 結果数値 (Before / After)",
    "5. 30s+: CTA (note / プロフ送客)",
  ].join("\n");
  return {
    kind: "video",
    draftId: req.draftId,
    storyboard,
    costUsd: 0,
    generator: "manual_capture_required",
  };
}

function visualizeTextOnly(
  req: VisualizerRequest,
): TextOnlyOutput {
  return {
    kind: "text_only",
    draftId: req.draftId,
    rationale:
      "失敗談・主観意見など truth-trust 系では画像なしの真摯トーンが効果的 (initial-values §3.7 SSOT)",
    costUsd: 0,
  };
}

export { generateImages } from "./codex-image.ts";
export {
  selectModeBySwitchback,
  selectVisualizerMode,
  MODE_WEIGHTS,
} from "./mode-selector.ts";
export { CAROUSEL_TEMPLATE_IDS, composeCarousel } from "./carousel-composer.ts";
export type {
  CarouselComposition,
  CarouselSlide,
  CarouselTemplateId,
  CodexImageRequest,
  CodexImageResponse,
  ImageOutput,
  TextOnlyOutput,
  VideoOutput,
  VisualizerMode,
  VisualizerOutput,
  VisualizerRequest,
} from "./types.ts";
