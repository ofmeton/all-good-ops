/**
 * Agent wrappers backed by Anthropic Managed Agents (E 案).
 *
 * spec: docs/superpowers/specs/2026-05-22-money-bot-design.md §6.1
 *
 * 構造化出力: Managed Agents の agent.message は string なので、prompt 内で
 * "ONLY a single JSON object" を強制し、tryParseJson + zod schema で validate。
 */

import { z } from "zod";

import {
  getAgentId,
  getEnvironmentId,
  hasManagedAgentsConfig,
  runManagedAgent,
} from "./managed-agents";

// ---------------------------------------------------------------------------
// Schemas (same shape as Phase 0 mocks, kept compatible)
// ---------------------------------------------------------------------------

const draftSchema = z.object({
  title: z.string(),
  body: z.string(),
  topicSlug: z.string(),
  references: z.array(z.string()).default([]),
});
export type Draft = z.infer<typeof draftSchema>;

const visualsSchema = z.object({
  headerImageUrl: z.string().nullable(),
  figures: z
    .array(
      z.object({
        caption: z.string(),
        url: z.string(),
      }),
    )
    .default([]),
});
export type Visuals = z.infer<typeof visualsSchema>;

const reviewedSchema = z.object({
  draft: draftSchema,
  visuals: visualsSchema,
  rubricScore: z.number().min(0).max(100),
  rubricNotes: z.array(z.string()).default([]),
  approved: z.boolean(),
});
export type Reviewed = z.infer<typeof reviewedSchema>;

const snsSchema = z.object({
  tweet: z.string(),
  tweetImageUrl: z.string().nullable(),
  carousel: z.array(
    z.object({ slideIndex: z.number(), imageUrl: z.string(), caption: z.string() }),
  ),
});
export type SnsContent = z.infer<typeof snsSchema>;

export const schemas = {
  draft: draftSchema,
  visuals: visualsSchema,
  reviewed: reviewedSchema,
  sns: snsSchema,
};

export interface AgentRunResult<T = unknown> {
  output: T;
  rawText: string;
  sessionId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tryParseJson(text: string): unknown | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced?.[1] ?? trimmed;
  try {
    return JSON.parse(body);
  } catch {
    const objStart = body.indexOf("{");
    const objEnd = body.lastIndexOf("}");
    if (objStart >= 0 && objEnd > objStart) {
      try {
        return JSON.parse(body.slice(objStart, objEnd + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function callAgent<T>(
  role: "writer" | "visual" | "reviewer" | "sns",
  userMessage: string,
  schema: z.ZodType<T>,
  fallback: T,
): Promise<AgentRunResult<T>> {
  if (!hasManagedAgentsConfig()) {
    console.warn(`[agents.${role}] Managed Agents config missing — returning mock`);
    return { output: fallback, rawText: "[mock]" };
  }

  const result = await runManagedAgent({
    agentId: getAgentId(role),
    environmentId: getEnvironmentId(),
    userMessage,
  });

  const parsed = tryParseJson(result.text);
  if (parsed) {
    const safe = schema.safeParse(parsed);
    if (safe.success) {
      return {
        output: safe.data,
        rawText: result.text,
        sessionId: result.sessionId,
      };
    }
    console.warn(
      `[agents.${role}] schema parse failed, using raw parsed object`,
      safe.error,
    );
    return {
      output: parsed as T,
      rawText: result.text,
      sessionId: result.sessionId,
    };
  }

  console.warn(`[agents.${role}] JSON parse failed, returning fallback`, result.text.slice(0, 200));
  return { output: fallback, rawText: result.text, sessionId: result.sessionId };
}

// ---------------------------------------------------------------------------
// Individual agent wrappers (called as workflow steps)
// ---------------------------------------------------------------------------

export async function writerAgent(topic: {
  slug: string;
  signals: unknown[];
}): Promise<AgentRunResult<Draft>> {
  "use step";
  const fallback: Draft = {
    title: `[mock] ${topic.slug}`,
    body: `[mock draft for ${topic.slug}]`,
    topicSlug: topic.slug,
    references: [],
  };
  const msg =
    `今日のトピック (slug: ${topic.slug})。\n\n` +
    `AI 動向シグナル:\n` +
    JSON.stringify(topic.signals, null, 2) +
    `\n\n` +
    `note 記事ドラフトを生成してください。出力は ONLY a single JSON object。`;
  return callAgent("writer", msg, schemas.draft, fallback);
}

export async function visualDesignerAgent(
  draft: Draft,
): Promise<AgentRunResult<Visuals>> {
  "use step";
  const fallback: Visuals = { headerImageUrl: null, figures: [] };
  const msg =
    `次の note 記事ドラフトに対する図解プランを返してください。\n\n` +
    JSON.stringify(draft, null, 2) +
    `\n\n出力は ONLY a single JSON object。Phase 1 は imageUrl placeholder で OK。`;
  return callAgent("visual", msg, schemas.visuals, fallback);
}

export async function contentReviewerAgent(args: {
  draft: Draft;
  visuals: Visuals;
}): Promise<AgentRunResult<Reviewed>> {
  "use step";
  const fallback: Reviewed = {
    draft: args.draft,
    visuals: args.visuals,
    rubricScore: 0,
    rubricNotes: ["[mock] reviewer not run"],
    approved: false,
  };
  const msg =
    `次の記事 + 図解プランを 7 軸 rubric でレビューしてください。\n\n` +
    JSON.stringify(args, null, 2) +
    `\n\n出力は ONLY a single JSON object。draft / visuals は入力をそのまま含めてください。`;
  return callAgent("reviewer", msg, schemas.reviewed, fallback);
}

export async function snsGeneratorAgent(
  reviewed: Reviewed,
): Promise<AgentRunResult<SnsContent>> {
  "use step";
  const fallback: SnsContent = {
    tweet: `[mock] ${reviewed.draft.title}`,
    tweetImageUrl: null,
    carousel: [],
  };
  const msg =
    `次のレビュー済み note 記事から X 投稿 + Instagram カルーセル 9 枚を生成してください。\n\n` +
    JSON.stringify(reviewed, null, 2) +
    `\n\n出力は ONLY a single JSON object。carousel は必ず 9 枚 (slideIndex 1-9)。imageUrl は placeholder で OK。`;
  return callAgent("sns", msg, schemas.sns, fallback);
}
