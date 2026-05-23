/**
 * Agent wrappers backed by Anthropic Managed Agents.
 *
 * Phase 1.5: writer / note 生成は一旦停止。SNS (X / IG) 集中。
 * 入力は x-buzz-radar の BuzzSignal、出力は SnsContent + Reviewed。
 * 過去 5 件の人間フィードバックを各 agent prompt に inject。
 */

import { z } from "zod";

import {
  getAgentId,
  getEnvironmentId,
  hasManagedAgentsConfig,
  runManagedAgent,
} from "./managed-agents";
import { fetchRecentFeedback, feedbackContextString } from "./feedback-history";
import type { BuzzSignal } from "./buzz-source";

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
    .array(z.object({ caption: z.string(), url: z.string() }))
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

async function callAgent<T>(args: {
  role: "writer" | "visual" | "reviewer" | "sns";
  userMessage: string;
  schema: z.ZodType<T>;
  fallback: T;
}): Promise<AgentRunResult<T>> {
  if (!hasManagedAgentsConfig()) {
    console.warn(`[agents.${args.role}] managed agents config missing — MOCK`);
    return { output: args.fallback, rawText: "[mock]" };
  }

  const result = await runManagedAgent({
    agentId: getAgentId(args.role),
    environmentId: getEnvironmentId(),
    userMessage: args.userMessage,
  });

  const parsed = tryParseJson(result.text);
  if (parsed) {
    const safe = args.schema.safeParse(parsed);
    if (safe.success) {
      return { output: safe.data, rawText: result.text, sessionId: result.sessionId };
    }
    console.warn(`[agents.${args.role}] schema parse failed — using raw parsed`, safe.error);
    return { output: parsed as T, rawText: result.text, sessionId: result.sessionId };
  }
  console.warn(`[agents.${args.role}] JSON parse failed`, result.text.slice(0, 200));
  return { output: args.fallback, rawText: result.text, sessionId: result.sessionId };
}

export async function buzzToDraft(buzz: BuzzSignal): Promise<AgentRunResult<Draft>> {
  "use step";
  const fb = await fetchRecentFeedback({ channel: "sns" });
  const fbCtx = feedbackContextString(fb);

  const fallback: Draft = {
    title: `[buzz] @${buzz.author}`,
    body: buzz.body,
    topicSlug: `buzz-${buzz.tweetId}`,
    references: [`https://x.com/${buzz.author}/status/${buzz.tweetId}`],
  };
  const msg =
    `海外 X バズツイートを日本語要約してください。\n` +
    `tweet by @${buzz.author} (likes: ${buzz.likes}, RT: ${buzz.retweets}):\n` +
    `"""\n${buzz.body}\n"""\n\n` +
    (fbCtx ? `${fbCtx}\n\n` : "") +
    `JSON で {"title":"日本語の核 30字以内","body":"日本適用ヒント 100-200字","topicSlug":"kebab-case","references":["x URL"]} のみ返してください。`;
  return callAgent({ role: "sns", userMessage: msg, schema: schemas.draft, fallback });
}

export async function visualDesignerAgent(
  draft: Draft,
): Promise<AgentRunResult<Visuals>> {
  "use step";
  const fb = await fetchRecentFeedback({ channel: "visual" });
  const fbCtx = feedbackContextString(fb);

  const fallback: Visuals = { headerImageUrl: null, figures: [] };
  const msg =
    `buzz を視覚化するための画像プランを返してください。\n\n` +
    JSON.stringify(draft, null, 2) + `\n\n` +
    (fbCtx ? `${fbCtx}\n\n` : "") +
    `JSON で {"headerImageUrl":"placeholder","figures":[]} のみ返してください。Phase 1.5 は imageUrl placeholder で OK。`;
  return callAgent({ role: "visual", userMessage: msg, schema: schemas.visuals, fallback });
}

export async function contentReviewerAgent(args: {
  draft: Draft;
  visuals: Visuals;
  sns: SnsContent;
}): Promise<AgentRunResult<Reviewed>> {
  "use step";
  const fb = await fetchRecentFeedback({ channel: "reviewer" });
  const fbCtx = feedbackContextString(fb);

  const fallback: Reviewed = {
    draft: args.draft,
    visuals: args.visuals,
    rubricScore: 0,
    rubricNotes: ["[mock] reviewer not run"],
    approved: false,
  };
  const msg =
    `次の X 投稿 + Instagram カルーセル を 7 軸 rubric でレビュー。\n\n` +
    JSON.stringify({ draft: args.draft, visuals: args.visuals, sns: args.sns }, null, 2) + `\n\n` +
    (fbCtx ? `${fbCtx}\n\n` : "") +
    `JSON で {"draft":<copy>,"visuals":<copy>,"rubricScore":0-100,"rubricNotes":[...],"approved":bool} のみ返してください。`;
  return callAgent({ role: "reviewer", userMessage: msg, schema: schemas.reviewed, fallback });
}

export async function snsGeneratorAgent(args: {
  buzz: BuzzSignal;
  draft: Draft;
}): Promise<AgentRunResult<SnsContent>> {
  "use step";
  const fb = await fetchRecentFeedback({ channel: "sns" });
  const fbCtx = feedbackContextString(fb);

  const fallback: SnsContent = {
    tweet: `[mock] ${args.draft.title}`,
    tweetImageUrl: null,
    carousel: [],
  };
  const msg =
    `海外 X バズを元に、ofmeton 名義の SNS 投稿を生成してください。\n` +
    `元 tweet by @${args.buzz.author} (likes: ${args.buzz.likes}):\n"""\n${args.buzz.body}\n"""\n\n` +
    `日本語要約 draft:\n` + JSON.stringify(args.draft, null, 2) + `\n\n` +
    (fbCtx ? `${fbCtx}\n\n` : "") +
    `JSON で {"tweet":"140字以内、末尾に {NOTE_URL}","tweetImageUrl":"placeholder","carousel":[{slideIndex 1-9, imageUrl, caption}]} のみ返してください。carousel は必ず 9 枚。`;
  return callAgent({ role: "sns", userMessage: msg, schema: schemas.sns, fallback });
}
