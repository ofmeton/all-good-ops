/**
 * Codex / OpenAI gpt-image-2 経由の画像生成 (PR-E)
 *
 * SSoT:
 *   - main-design-all-versions.md §6.6 (Visualizer 3 モード)
 *   - reference_codex_mcp.md (Codex MCP 導入済、ChatGPT サブスク枠で gpt-image-2 呼び出し)
 *
 * Phase 0.5 fallback:
 *   - IN_MEMORY_FALLBACK=true || !OPENAI_API_KEY → stub URL を返す (deterministic)
 *
 * Phase 1+:
 *   - OpenAI Images API を fetch で呼ぶ (Workers 互換・依存追加なし)
 */

import type { CodexImageRequest, CodexImageResponse } from "./types.ts";
import { COST_MODEL_ROWS } from "../cost/cost-model-data.ts";

/**
 * Phase 0.5 stub: deterministic placeholder URL を返す。
 * carousel など `prompts` が指定された場合はその個別 prompt を使う。
 */
function buildStubResponse(req: CodexImageRequest): CodexImageResponse {
  const prompts = req.prompts ?? Array.from({ length: req.count }, () => req.prompt);
  const used = prompts.slice(0, req.count);
  // 不足分は req.prompt で埋める (count > prompts.length のケース対策)
  while (used.length < req.count) used.push(req.prompt);

  const images = used.map((p, i) => ({
    url: `https://stub.images/${req.brand}-${req.size}-${i}.png`,
    promptUsed: p,
  }));
  return { images, costUsd: 0 };
}

export type OpenAIImageSize = "1024x1024" | "1536x1024" | "1024x1536" | "auto";
export type OpenAIImageQuality = "low" | "medium" | "high" | "auto";

export const OPENAI_IMAGES_ENDPOINT = "https://api.openai.com/v1/images/generations";
export const DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-2";
export const FALLBACK_OPENAI_IMAGE_MODEL = "gpt-image-1";

const KNOWN_OPENAI_IMAGE_MODELS = new Set([
  DEFAULT_OPENAI_IMAGE_MODEL,
  FALLBACK_OPENAI_IMAGE_MODEL,
]);

export const ARTICLE_BLOCK_IMAGE_DESIGN_CONSTRAINTS = [
  "一目で伝わる infographic",
  "Noto Sans Heavy",
  "4-color palette only: #0A0A0A, #0B1B3A, #C23A2C, #FFFFFF; accent #FFD400",
  "載せる文字は短く、数字やキーワード中心",
  "長い日本語文、細かい文章、架空ロゴ、UIの細部再現は避ける",
  "Xのタイムラインで縮小表示されても理解できる大きな構図",
].join(" / ");

/**
 * outline の visual_hint / key_message から、画像生成エンジンへ渡す最終 prompt を作る。
 * 文字載せは gpt-image 側に任せるため、長文コピーではなく数字・短い語に寄せる。
 */
export function buildArticleBlockImagePrompt(input: {
  role?: string;
  visualHint?: string | null;
  keyMessage?: string | null;
  blockIndex?: number;
}): string {
  const role = input.role?.trim();
  const seed = (input.visualHint?.trim() || input.keyMessage?.trim() || "AI活用の要点").trim();
  const block = input.blockIndex != null ? `Block ${input.blockIndex + 1}` : "Article block";
  return [
    `${block}: ${role ? `role=${role}; ` : ""}main visual idea=${seed}`,
    "Create one square social image that communicates the idea at a glance.",
    ARTICLE_BLOCK_IMAGE_DESIGN_CONSTRAINTS,
  ].join("\n");
}

/** GPT image API が受ける size へ寄せる。既存媒体サイズは互換入力として残す。 */
export function mapToOpenAIImageSize(size: CodexImageRequest["size"]): OpenAIImageSize {
  if (size === "1024x1024" || size === "1536x1024" || size === "1024x1536" || size === "auto") {
    return size;
  }
  if (size === "1080x1350") return "1024x1536";
  return "1024x1024";
}

/**
 * 環境のモデル指定を正規化する。gpt-image-2 は公式 model list で確認済み。
 * 未知値は安全に gpt-image-1 へ倒し、呼び出し失敗を避ける。
 */
export function resolveOpenAIImageModel(raw = process.env.OPENAI_IMAGE_MODEL): string {
  const model = (raw || DEFAULT_OPENAI_IMAGE_MODEL).trim();
  return KNOWN_OPENAI_IMAGE_MODELS.has(model) ? model : FALLBACK_OPENAI_IMAGE_MODEL;
}

/** cost-model-data.ts の image_low / image_medium 行から 1 枚あたり USD を引く。 */
export function imageCostUsdPerImage(quality: Exclude<OpenAIImageQuality, "high" | "auto"> = "low"): number {
  const row = COST_MODEL_ROWS.find((r) => r.category === `image_${quality}`);
  if (!row) return 0;
  const fromNotes = row.notes.match(/\$(\d+(?:\.\d+)?)\/枚/);
  if (fromNotes) return Number(fromNotes[1]);
  if (row.runs_per_month > 0) return row.monthly_jpy_expected / row.runs_per_month / 150;
  return 0;
}

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>;
};

export interface GenerateImagesDeps {
  fetch?: typeof fetch;
  apiKey?: string;
  model?: string;
  quality?: Exclude<OpenAIImageQuality, "high" | "auto">;
}

function assertImageResponse(raw: unknown): OpenAIImageResponse {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as OpenAIImageResponse).data)) {
    throw new Error("[codex-image] OpenAI Images API response missing data[]");
  }
  return raw as OpenAIImageResponse;
}

/**
 * Main entry point.
 * IN_MEMORY_FALLBACK=true / API key 欠落時は stub、それ以外は live OpenAI Images API。
 */
export async function generateImages(
  req: CodexImageRequest,
  deps: GenerateImagesDeps = {},
): Promise<CodexImageResponse> {
  const apiKey = deps.apiKey ?? process.env.OPENAI_API_KEY;
  const useStub =
    process.env.IN_MEMORY_FALLBACK === "true" ||
    !apiKey;

  if (useStub) {
    return buildStubResponse(req);
  }

  const prompts = req.prompts ?? Array.from({ length: req.count }, () => req.prompt);
  const used = prompts.slice(0, req.count);
  while (used.length < req.count) used.push(req.prompt);

  const f = deps.fetch ?? fetch;
  const model = resolveOpenAIImageModel(deps.model);
  const size = mapToOpenAIImageSize(req.size);
  const quality = deps.quality ?? "low";
  const images: CodexImageResponse["images"] = [];

  for (const prompt of used) {
    const res = await f(OPENAI_IMAGES_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        size,
        quality,
        output_format: "png",
        n: 1,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        JSON.stringify({
          level: "error",
          msg: "[codex-image] OpenAI Images API failed",
          status: res.status,
          body: text.slice(0, 500),
        }),
      );
    }
    const raw = assertImageResponse(await res.json());
    const first = raw.data?.[0];
    if (!first?.b64_json && !first?.url) {
      throw new Error("[codex-image] OpenAI Images API returned neither b64_json nor url");
    }
    images.push({
      ...(first.b64_json ? { b64: first.b64_json } : {}),
      ...(first.url ? { url: first.url } : {}),
      promptUsed: prompt,
    });
  }

  return {
    images,
    costUsd: imageCostUsdPerImage(quality) * used.length,
  };
}
