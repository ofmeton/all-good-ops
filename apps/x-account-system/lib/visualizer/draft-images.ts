/**
 * draft-images: writer outline から記事ブロック別画像生成の入力/出力を組み立てる純関数。
 *
 * IO（Supabase / Storage / OpenAI）は scripts/generate-draft-images.ts 側へ寄せる。
 * ここはテスト可能な契約変換だけを担う。
 */
import { USD_JPY_RATE } from "../cost/cost-of.ts";
import type { PhotoAttachment } from "../publishing/media-fetch.ts";
import {
  buildArticleBlockImagePrompt,
  imageCostUsdPerImage,
} from "./codex-image.ts";

export const GENERATED_IMAGE_BUCKET = "xad-generated";
export const GENERATED_IMAGE_COST_GATE_JPY = 500;

export interface DraftOutlineBlock {
  role?: string;
  key_message?: string;
  visual_hint?: string;
}

export interface BlockImagePrompt {
  blockIndex: number;
  role?: string;
  prompt: string;
}

export interface GeneratedBlockImage {
  blockIndex: number;
  role?: string;
  sourceUrl: string;
  promptUsed: string;
}

export type GeneratedPhotoAttachment = PhotoAttachment & {
  kind: "upload";
  mediaType: "photo";
  source: "generated";
  blockIndex: number;
  role?: string;
  sourceUrl: string;
  promptUsed: string;
};

function cleanString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

/** core_ideas.meta.outline を境界で検証し、欠損 block は捨てず安全側デフォルトで補う。 */
export function normalizeOutline(raw: unknown): DraftOutlineBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const o = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      role: cleanString(o.role),
      key_message: cleanString(o.key_message),
      visual_hint: cleanString(o.visual_hint),
    };
  });
}

/** outline 各 block から、デザイン制約込みの最終画像 prompt を作る。 */
export function buildDraftImagePrompts(outline: DraftOutlineBlock[]): BlockImagePrompt[] {
  return outline.map((block, i) => ({
    blockIndex: i,
    ...(block.role ? { role: block.role } : {}),
    prompt: buildArticleBlockImagePrompt({
      blockIndex: i,
      role: block.role,
      visualHint: block.visual_hint,
      keyMessage: block.key_message,
    }),
  }));
}

/** 画像生成の概算コスト。既定は visual-designer と同じ low 品質。 */
export function estimateDraftImageCostJpy(count: number, quality: "low" | "medium" = "low"): number {
  const usd = imageCostUsdPerImage(quality) * Math.max(0, count);
  return Math.round(usd * USD_JPY_RATE * 100) / 100;
}

/** Storage public URL と prompt を post_drafts.attachments 契約へ整形する。 */
export function buildGeneratedPhotoAttachments(images: GeneratedBlockImage[]): GeneratedPhotoAttachment[] {
  return [...images]
    .sort((a, b) => a.blockIndex - b.blockIndex)
    .map((img) => ({
      kind: "upload",
      mediaType: "photo",
      source: "generated",
      blockIndex: img.blockIndex,
      ...(img.role ? { role: img.role } : {}),
      sourceUrl: img.sourceUrl,
      promptUsed: img.promptUsed,
    }));
}
