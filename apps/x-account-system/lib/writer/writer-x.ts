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
import { THREAD_DELIMITER } from "../publisher/thread-format.ts";

/**
 * X はプレーンテキスト。人間は `*` `#` を投稿に使わない。
 * LLM が Markdown を混ぜてきた場合に備え、最終本文から Markdown 記法を除去する。
 *
 * 除去対象:
 *   - `**bold**` → bold （太字記号を剥がす）
 *   - `*italic*` → italic （斜体記号を剥がす）
 *   - 行頭 `# ` `## ` `### ` 見出しマーカー → 見出しテキストのみ残す
 *   - 取り残しの `**` / 行頭の裸の `#`（見出し化されていない `#`）
 *
 * 保持するもの:
 *   - 日本語・絵文字・通常の句読点
 *   - ハッシュタグ `#PR` `#広告` 等（語に直結する `#` は見出しではないので残す）
 *   - 掛け算/箇条書き以外の通常の `*` を含む文字列は basic に剥がすが、句読点は壊さない
 */
export function stripMarkdownForX(text: string): string {
  if (!text) return text;
  let out = text;

  // 1. 行頭の見出しマーカー `# ` `## ` `### ` ... を除去（テキストは残す）。
  //    行頭の `#` の後に空白が続くものだけを見出しとみなす（`#PR` 等のタグは保護）。
  out = out.replace(/^[ \t]*#{1,6}[ \t]+/gm, "");

  // 2. `**bold**` → bold（最短一致、改行をまたがない）。
  out = out.replace(/\*\*([^\n*]+?)\*\*/g, "$1");

  // 3. `*italic*` → italic（最短一致、改行をまたがない、空でない中身）。
  out = out.replace(/\*([^\n*]+?)\*/g, "$1");

  // 4. 取り残しの `**` を除去。
  out = out.replace(/\*\*/g, "");

  return out;
}

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
 * フォーマット別の出力トークン上限。スレッド/長文は複数ツイート分が必要なため大きめ。
 * (note は writer-note.ts、IG は writer-ig.ts が別途持つ)
 */
const MAX_TOKENS_BY_FORMAT: Record<string, number> = {
  short: 512,
  medium: 1024,
  long: 2560,
  thread: 4096,
  article: 4096,
};

/**
 * max_tokens 到達で打ち切られた本文の不完全な末尾を捨てる安全網。
 * thread は最後の delimiter 行までで切る (中途半端なツイートを投稿しない)。
 */
function dropTruncatedTail(text: string, fmat: string): string {
  if (fmat === "thread") {
    const re = new RegExp(`\\n\\s*${THREAD_DELIMITER}\\s*(\\n|$)`, "g");
    let lastIdx = -1;
    for (let m = re.exec(text); m; m = re.exec(text)) lastIdx = m.index;
    if (lastIdx > 0) return text.slice(0, lastIdx).trimEnd();
  }
  return text;
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
  const maxTokens = MAX_TOKENS_BY_FORMAT[idea.fmat] ?? 4096;
  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `topic: ${idea.topic}\nprimary_hook: ${idea.primaryHook}\nformat: ${idea.fmat}\n\n上記要件に従って X 投稿用の本文を生成してください。`,
      },
    ],
  });
  let text =
    response.content.find((b) => b.type === "text")?.text ??
    "(no text returned)";
  if (response.stop_reason === "max_tokens") {
    console.warn(`[writer] max_tokens(${maxTokens}) 到達で打ち切り (fmat=${idea.fmat}) — 不完全な末尾を除去`);
    text = dropTruncatedTail(text, idea.fmat);
  }
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
    body: stripMarkdownForX(body), // X はプレーンテキスト: Markdown 記法を最終本文から除去
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
  const maxTokens = MAX_TOKENS_BY_FORMAT[idea.fmat] ?? 4096;
  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: maxTokens,
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
  let text =
    response.content.find((b) => b.type === "text")?.text ?? originalBody;
  if (response.stop_reason === "max_tokens") {
    console.warn(`[writer/revise] max_tokens(${maxTokens}) 到達で打ち切り (fmat=${idea.fmat}) — 不完全な末尾を除去`);
    text = dropTruncatedTail(text, idea.fmat);
  }
  const inputCost = (response.usage.input_tokens / 1_000_000) * 3;
  const outputCost = (response.usage.output_tokens / 1_000_000) * 15;
  return {
    draftId,
    body: stripMarkdownForX(text), // X はプレーンテキスト: Markdown 記法を最終本文から除去
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
