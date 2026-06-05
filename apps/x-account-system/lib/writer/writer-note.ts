/**
 * Writer note — Anthropic Sonnet 4.6 ベース note 記事 draft generator (PR-E)
 *
 * SSoT:
 *   - main-design-all-versions.md §6.4.6 (note 生成フロー詳述)
 *   - initial-values-design.md §4.3 (note 4-6 本/月)
 *
 * Phase 0.5 fallback:
 *   - IN_MEMORY_FALLBACK=true || !ANTHROPIC_API_KEY → deterministic stub body
 *
 * silent reduction 厳禁 (cs:s2-78 / cs:s2-68): 月 4-6 本の SSOT は initial-values §4.3。
 * 本ファイルでは「1 記事分の draft」を生成するだけだが、Optimizer / Writer 共に下限 4 を守る。
 */

import type { CoreIdea } from "./types.ts";
import {
  buildWriterSystemPromptNote,
  NOTE_TEMPLATE_LENGTH_RANGES,
  TEASER_RANGE,
  type NotePriceTier,
  type NoteTemplateId,
  type NoteWriterContext,
} from "./system-prompts-note.ts";

export type NoteDraftRequest = {
  idea: CoreIdea;
  templateId: NoteTemplateId;
  priceTier: NotePriceTier;
  /** ティーザー境界字数 (有料記事のみ。default = 1000) */
  teaserBoundary?: number;
};

export type NoteDraftOutput = {
  draftId: string;
  templateId: NoteTemplateId;
  priceTier: NotePriceTier;
  /** 無料部本文 (note 公開時の表示部分) */
  freeBody: string;
  /** 有料部本文 (priceTier > 0 のみ) */
  paidBody?: string;
  totalChars: number;
  estimatedScore: number;
  llmCostUsd: number;
  generator: "stub" | "anthropic-sonnet-4.6";
};

/**
 * Phase 0.5 stub: deterministic な無料部 + 有料部を組み立てる。
 * - 無料部に audience / 問題提起 / 無料軽量版 / 期待値 を含む (main-design §6.4.6.4)
 * - 有料部に 結論 / 再現手順 / ハマりどころ / CTA を含む
 * - 文字数レンジは templateId に応じて 800-1500 (short) / 2000-3500 (medium) / 3000-5000 (long) / 8000-12000 (long_xl)
 */
function buildStubBody(req: NoteDraftRequest): {
  freeBody: string;
  paidBody?: string;
} {
  const { idea, templateId, priceTier, teaserBoundary } = req;
  const teaser = teaserBoundary ?? 1000;

  const audience = `${idea.audience} に向けた note 記事です。`;
  const problem = `業務で ${idea.topic} を扱う場面で詰まりがちなポイントを整理します。`;
  const lightVersion = `無料軽量版: 5 分で試せる入門編として、Claude に「${idea.topic}」を指示する最小プロンプトを提示します。`;
  const expectation = `有料部では、はぐりんが現場で運用した数値・失敗・再現手順を開示します。`;

  const freeBody = [audience, problem, lightVersion, expectation].join("\n\n");

  if (priceTier === 0) {
    // 無料記事の場合、stub では同じ枠の中で結論まで書く
    const conclusion = `結論: ${idea.topic} は判断軸を 3 つに固定して SOP に書き出せば、業務として仕組み化できます。`;
    return { freeBody: `${freeBody}\n\n${conclusion}` };
  }

  // 有料記事: free 部はティーザーで切り、paid 部に結論を入れる
  const conclusion = `結論: ${idea.topic} の自動化は、判断軸 3 つに固定 → SOP テンプレ化 → 月次でレビュー の 3 ステップで仕組み化できます。`;
  const reproduction = `再現手順: (1) ${idea.topic} のインプット項目を 5 つに絞る (2) Claude プロンプトを 1 行で書く (3) 出力を SOP に変換する。`;
  const pitfall = `ハマりどころ: プロンプトを毎回書き直すと再現性が落ちる。テンプレ化して固定する。`;
  const cta = `CTA: 個別相談 / メンバーシップで継続支援を提供します。`;

  const paidBody = [conclusion, reproduction, pitfall, cta].join("\n\n");

  // teaser 字数 cap: free 部が teaserBoundary 程度に収まるよう少しだけトリム
  const trimmedFree =
    freeBody.length > teaser ? `${freeBody.slice(0, teaser - 1)}…` : freeBody;
  return { freeBody: trimmedFree, paidBody };
}

async function callAnthropicWriter(
  req: NoteDraftRequest,
  systemPrompt: string,
): Promise<{ freeBody: string; paidBody?: string; costUsd: number }> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8192, // note 記事は長文。余裕を持たせる (実生成分のみ課金)
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `topic: ${req.idea.topic}\ntemplate: ${req.templateId}\nprice: ${req.priceTier}\n\n上記要件に従って note 記事本文を生成してください。priceTier > 0 の場合、無料部と有料部を "---PAID---" 区切りで返してください。`,
      },
    ],
  });
  const text =
    response.content.find((b) => b.type === "text")?.text ??
    "(no text returned)";
  const inputCost = (response.usage.input_tokens / 1_000_000) * 3;
  const outputCost = (response.usage.output_tokens / 1_000_000) * 15;
  if (req.priceTier > 0 && text.includes("---PAID---")) {
    const [freeBody, paidBody] = text.split("---PAID---").map((s) => s.trim());
    return { freeBody: freeBody!, paidBody, costUsd: inputCost + outputCost };
  }
  return { freeBody: text, costUsd: inputCost + outputCost };
}

export async function draftForNote(
  req: NoteDraftRequest,
): Promise<NoteDraftOutput> {
  const draftId = `draft-${req.idea.id}-note-${req.templateId}-${Date.now()}`;
  const useStub =
    process.env.IN_MEMORY_FALLBACK === "true" ||
    !process.env.ANTHROPIC_API_KEY;

  if (useStub) {
    const { freeBody, paidBody } = buildStubBody(req);
    return {
      draftId,
      templateId: req.templateId,
      priceTier: req.priceTier,
      freeBody,
      paidBody,
      totalChars: freeBody.length + (paidBody?.length ?? 0),
      estimatedScore: 0.6,
      llmCostUsd: 0,
      generator: "stub",
    };
  }

  const ctx: NoteWriterContext = {
    templateId: req.templateId,
    priceTier: req.priceTier,
    teaserBoundary: req.teaserBoundary,
  };
  const systemPrompt = buildWriterSystemPromptNote(req.idea, ctx);
  const { freeBody, paidBody, costUsd } = await callAnthropicWriter(
    req,
    systemPrompt,
  );
  return {
    draftId,
    templateId: req.templateId,
    priceTier: req.priceTier,
    freeBody,
    paidBody,
    totalChars: freeBody.length + (paidBody?.length ?? 0),
    estimatedScore: 0.7,
    llmCostUsd: costUsd,
    generator: "anthropic-sonnet-4.6",
  };
}

export {
  NOTE_TEMPLATE_LENGTH_RANGES,
  TEASER_RANGE,
  type NotePriceTier,
  type NoteTemplateId,
} from "./system-prompts-note.ts";
