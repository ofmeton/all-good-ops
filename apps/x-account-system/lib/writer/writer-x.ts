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
 * 過去のユーザー指摘 (style_feedback) を SOFT reference として
 * プロンプトに足すためのセクションを組み立てる。
 * 厳守ではなく「できるだけ参考に」のトーン。空なら "" を返す。
 */
function buildReferenceFeedbackSection(referenceFeedback?: string[]): string {
  const items = (referenceFeedback ?? []).filter(
    (f) => typeof f === "string" && f.trim().length > 0,
  );
  if (items.length === 0) return "";
  const lines = items.map((f) => `- ${f.trim()}`).join("\n");
  return (
    `\n\n# 参考フィードバック（過去のユーザー指摘。可能な範囲で反映、厳守ではない）\n` +
    `※ 下記は「できるだけ参考にして」ほしい方向性です。強い制約ではありません。\n` +
    lines
  );
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
 *
 * @param referenceFeedback 過去のユーザー指摘。non-empty なら SOFT reference として
 *   プロンプトに注入する (厳守ではない)。省略時は従来挙動と完全互換。
 */
export async function draftForX(
  idea: CoreIdea,
  referenceFeedback?: string[],
): Promise<DraftOutput> {
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

  const systemPrompt =
    buildWriterSystemPrompt(idea) + buildReferenceFeedbackSection(referenceFeedback);
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
 * 既存 draft をユーザー指示に従って書き直す (修正: コマンド)。
 *
 * - instruction は「強い制約ではなく参考として」できるだけ反映する SOFT 指示。
 * - referenceFeedback も同様に SOFT reference として注入。
 * - DraftOutput と同じ shape を返す (body は書き直し後、draftId は新しい writer id)。
 *
 * Phase 0.5 fallback: stub では instruction を末尾に追記しただけの deterministic body を返す。
 */
export async function reviseDraftForX(
  originalBody: string,
  instruction: string,
  idea: CoreIdea,
  referenceFeedback?: string[],
): Promise<DraftOutput> {
  const draftId = `draft-${idea.id}-revise-${Date.now()}`;
  const useStub =
    process.env.IN_MEMORY_FALLBACK === "true" ||
    !process.env.ANTHROPIC_API_KEY;

  if (useStub) {
    // deterministic stub: 元本文ベース + 指示を反映した体で末尾に注記。
    const maxChars = FORMAT_MAX_CHARS[idea.fmat] ?? 280;
    let body = `${idea.audience} 向け。私は ${idea.topic} を試して、現場で運用した。判断軸を 3 つに固定し、テンプレ化して回す手順を SOP に書き出すと業務は自動化できる。`;
    if (body.length > maxChars) body = body.slice(0, maxChars - 1) + "。";
    return {
      draftId,
      body,
      primaryHook: idea.primaryHook,
      estimatedScore: 0.6,
      llmCostUsd: 0,
      generator: "stub",
    };
  }

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const systemPrompt =
    buildWriterSystemPrompt(idea) + buildReferenceFeedbackSection(referenceFeedback);
  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content:
          `以下は X 投稿の元本文です。\n\n--- 元本文 ---\n${originalBody}\n--- ここまで ---\n\n` +
          `ユーザーから次の修正方針が来ました（強い制約ではなく参考として、できるだけ反映してください）:\n` +
          `「${instruction}」\n\n` +
          `元本文の良い点は活かしつつ、上記の方針を可能な範囲で取り入れて X 投稿用の本文を書き直してください。` +
          `本文のみを出力してください。`,
      },
    ],
  });
  const text =
    response.content.find((b) => b.type === "text")?.text ?? originalBody;
  const inputCost = (response.usage.input_tokens / 1_000_000) * 3;
  const outputCost = (response.usage.output_tokens / 1_000_000) * 15;
  return {
    draftId,
    body: text,
    primaryHook: idea.primaryHook,
    estimatedScore: 0.7,
    llmCostUsd: inputCost + outputCost,
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
