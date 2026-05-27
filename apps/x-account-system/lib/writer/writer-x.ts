/**
 * Writer X — Anthropic Sonnet 4.6 ベース draft generator
 *
 * SSoT:
 *   - main-design-all-versions.md §6.4
 *   - initial-values-design.md §3 / §4.1 / §5.10
 *
 * Flow:
 *   1. CoreIdea から system prompt を構築 (system-prompts.ts)
 *   2. Anthropic Sonnet 4.6 で draft 生成
 *   3. Phase 0.5 (IN_MEMORY_FALLBACK=true || ANTHROPIC_API_KEY 未設定) は stub body を返す
 *
 * stub body は fixture から照合可能な deterministic 形式で組み立てる。
 */

import type { CoreIdea, DraftOutput, DraftRequest } from "./types.ts";
import { buildWriterSystemPrompt, FORMAT_MAX_CHARS } from "./system-prompts.ts";

/**
 * Phase 0.5 stub body 生成。
 * - 必ず R1 (仕組み化 / 自動化) / R2 (実体験 1 行) / X4 (audience 明示) を含む
 * - hedge 表現を末尾に置かない (R6 pass)
 * - 攻撃語を含まない (R3 / R4 pass)
 * - 280 文字以内 (short の場合)
 */
function buildStubBody(idea: CoreIdea): string {
  const maxChars = FORMAT_MAX_CHARS[idea.fmat] ?? 280;
  // 構造: 読者像 → 一次体験 → 仕組み化結論
  const audienceLine = `${idea.audience} 向け。`;
  const firstHand = `私は ${idea.topic} を試して、現場で運用した。`;
  const conclusion = `仕組み化のコツは、判断軸を 3 つに固定して、テンプレ化して、回す手順を SOP に書き出すこと。これで業務は自動化できる。`;
  let body = `${audienceLine}${firstHand}${conclusion}`;
  if (body.length > maxChars) {
    body = body.slice(0, maxChars - 1) + "。";
  }
  return body;
}

/**
 * Live Anthropic SDK call (Phase 1+ で有効化)。
 * Phase 0.5 では呼ばれない。
 */
async function callAnthropicWriter(
  idea: CoreIdea,
  systemPrompt: string,
): Promise<{ body: string; costUsd: number }> {
  // Anthropic SDK lazy import (Phase 0.5 では import すらしない)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `topic: ${idea.topic}\nprimary_hook: ${idea.primaryHook}\nformat: ${idea.fmat}\n\n上記要件に従って X 投稿用の本文を生成してください。`,
      },
    ],
  });
  const text =
    response.content.find((b) => b.type === "text")?.text ??
    "(no text returned)";
  // 概算 cost (Sonnet 4.5 USD: input $3/M tok, output $15/M tok)
  const inputCost = (response.usage.input_tokens / 1_000_000) * 3;
  const outputCost = (response.usage.output_tokens / 1_000_000) * 15;
  return { body: text, costUsd: inputCost + outputCost };
}

/**
 * Main entry point.
 * Phase 0.5 fallback: ANTHROPIC_API_KEY 未設定 or IN_MEMORY_FALLBACK=true なら stub。
 */
export async function draftForX(idea: CoreIdea): Promise<DraftOutput> {
  const draftId = `draft-${idea.id}-${Date.now()}`;
  const useStub =
    process.env.IN_MEMORY_FALLBACK === "true" ||
    !process.env.ANTHROPIC_API_KEY;

  if (useStub) {
    const body = buildStubBody(idea);
    return {
      draftId,
      body,
      primaryHook: idea.primaryHook,
      estimatedScore: 0.6, // stub: 中間値
      llmCostUsd: 0,
      generator: "stub",
    };
  }

  const systemPrompt = buildWriterSystemPrompt(idea);
  const { body, costUsd } = await callAnthropicWriter(idea, systemPrompt);
  return {
    draftId,
    body,
    primaryHook: idea.primaryHook,
    estimatedScore: 0.7, // live でも初期値、後段の Editor / Analyst で更新
    llmCostUsd: costUsd,
    generator: "anthropic-sonnet-4.6",
  };
}

/**
 * DraftRequest ラッパー (CLI / pipeline で使いやすくするため)
 */
export async function draftForXWithRequest(
  req: DraftRequest,
): Promise<DraftOutput> {
  return draftForX(req.idea);
}
