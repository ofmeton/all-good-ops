/**
 * Visualizer types (PR-E)
 *
 * SSoT:
 *   - main-design-all-versions.md §2.6 (Visualizer PSM 廃止 → ランダム + switchback)
 *   - main-design-all-versions.md §6.4.5 (Instagram カルーセル 9 枚 5 テンプレ)
 *   - main-design-all-versions.md §6.6 (Visualizer 3 モード)
 *   - initial-values-design.md §3.7 (visual mode 比率)
 *
 * Mode 比率 (initial-values §3.7 SSOT、Phase 1 ofmeton 採用初期値):
 *   - 画像 (screenshot + text overlay) = 70%
 *   - 動画 (15-30秒 + ≥30秒/hybrid)    = 15%
 *   - テキストのみ                       = 15%
 *
 * Phase 0.5 fallback:
 *   - IN_MEMORY_FALLBACK=true || OPENAI_API_KEY 未設定 → stub URL を返す
 */

import type { CoreIdea } from "../writer/types.ts";

/** Visualizer モード (initial-values §3.7 → grouped) */
export type VisualizerMode = "image" | "video" | "text_only";

/** Codex MCP / OpenAI Image API 経由の画像サイズ。媒体ごと固定 */
export type ImageSize =
  | "1024x1024" // X (square)
  | "1080x1080" // Instagram square
  | "1080x1350"; // Instagram portrait / note

/** Phase 0.5 では Codex API は呼ばず stub URL を返す */
export type CodexImageRequest = {
  prompt: string;
  size: ImageSize;
  count: number;
  brand: "ofmeton";
  /**
   * 複数枚を 1 リクエストで生成する場合に各枚プロンプトを別個に指定したい場合に使う。
   * 指定された場合は prompt より優先される (carousel composer 用)。
   */
  prompts?: string[];
};

export type CodexImageResponse = {
  images: { url: string; promptUsed: string }[];
  costUsd: number;
};

/** Carousel composer の入力 (Instagram カルーセル 9 枚) */
export type CarouselTemplateId =
  | "T1_hook_evidence"
  | "T2_number_breakdown"
  | "T3_failure_chronicle"
  | "T4_how_to_steps"
  | "T5_hot_take_data";

export type CarouselSlide = {
  index: number; // 1..9
  title: string;
  body: string;
  image_prompt: string;
};

export type CarouselComposition = {
  templateId: CarouselTemplateId;
  slides: CarouselSlide[];
};

/** Visualizer request: mode 決定済みの上で呼ばれる */
export type VisualizerRequest = {
  draftId: string;
  idea: CoreIdea;
  mode: VisualizerMode;
  platform: "x" | "instagram" | "note";
  /** instagram carousel 用 */
  carouselTemplateId?: CarouselTemplateId;
  /** 画像枚数 (image: 1 / carousel: 9) */
  imageCount?: number;
};

export type ImageOutput = {
  kind: "image";
  draftId: string;
  images: { url: string; promptUsed: string }[];
  costUsd: number;
  carousel?: CarouselComposition;
  generator: "stub" | "codex-gpt-image-2";
};

export type VideoOutput = {
  kind: "video";
  draftId: string;
  /** Phase 0.5 では実動画生成しない → 撮影 SOP の placeholder を返す */
  storyboard: string;
  costUsd: number;
  generator: "stub" | "manual_capture_required";
};

export type TextOnlyOutput = {
  kind: "text_only";
  draftId: string;
  /** No visual asset (truth-trust 系: 失敗談 / 主観意見) */
  rationale: string;
  costUsd: number;
};

export type VisualizerOutput = ImageOutput | VideoOutput | TextOnlyOutput;
