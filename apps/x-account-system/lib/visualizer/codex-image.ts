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
 *   - OpenAI SDK 経由で gpt-image-2 を呼ぶ (本ファイル末尾の TODO 節)
 */

import type { CodexImageRequest, CodexImageResponse } from "./types.ts";

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

/**
 * Main entry point.
 * Phase 0.5: stub 強制。Phase 1+ で live OpenAI 経由に切替。
 */
export async function generateImages(
  req: CodexImageRequest,
): Promise<CodexImageResponse> {
  const useStub =
    process.env.IN_MEMORY_FALLBACK === "true" ||
    !process.env.OPENAI_API_KEY;

  if (useStub) {
    return buildStubResponse(req);
  }

  // Phase 1+: OpenAI gpt-image-2 live path
  // (依存追加・コスト発生を伴うため Phase 0.5 では未実装)
  throw new Error(
    "OpenAI Image API live path not implemented in Phase 0.5. " +
      "Set IN_MEMORY_FALLBACK=true to use stub mode.",
  );
}
