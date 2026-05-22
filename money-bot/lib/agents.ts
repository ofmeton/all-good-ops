import { query, type Options } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

export type AgentName =
  | "writer"
  | "visual-designer"
  | "content-reviewer"
  | "brand-publisher"
  | "sns-generator";

export interface AgentRunInput<T = unknown> {
  agent: AgentName;
  prompt: string;
  skills?: string[];
  input?: T;
  /** zod schema to parse the final result string into structured output */
  outputSchema?: z.ZodTypeAny;
  maxTurns?: number;
}

export interface AgentRunResult<T = unknown> {
  agent: AgentName;
  output: T;
  rawResult: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
    totalCostUsd?: number;
  };
}

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

function buildPrompt<T>(input: AgentRunInput<T>): string {
  const lines: string[] = [];
  lines.push(`You are the ${input.agent} subagent.`);
  lines.push("");
  lines.push("Task:");
  lines.push(input.prompt);
  if (input.skills?.length) {
    lines.push("");
    lines.push("Required skills (invoke via Skill tool):");
    for (const s of input.skills) lines.push(`- ${s}`);
  }
  if (input.input !== undefined) {
    lines.push("");
    lines.push("Input (JSON):");
    lines.push("```json");
    lines.push(JSON.stringify(input.input, null, 2));
    lines.push("```");
  }
  lines.push("");
  lines.push(
    "Respond with ONLY a single JSON object that matches the requested schema. " +
      "No prose, no markdown fences.",
  );
  return lines.join("\n");
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

function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.VERCEL_AI_GATEWAY_API_KEY);
}

function mockResult<T>(input: AgentRunInput, fallback: T): AgentRunResult<T> {
  return {
    agent: input.agent,
    output: fallback,
    rawResult: "[mock]",
  };
}

async function runQuery<T>(
  input: AgentRunInput,
  fallback: T,
): Promise<AgentRunResult<T>> {
  if (!hasAnthropicKey()) {
    return mockResult<T>(input, fallback);
  }

  const cwd = process.env.CLAUDE_PROJECT_ROOT;
  const options: Options = {
    settingSources: ["project"],
    allowedTools: ["Task", "Skill", "Read", "Glob", "Grep"],
    permissionMode: "bypassPermissions",
    maxTurns: input.maxTurns ?? 30,
    ...(cwd ? { cwd } : {}),
  };

  let resultText = "";
  let usage: AgentRunResult["usage"];

  for await (const msg of query({ prompt: buildPrompt(input), options })) {
    if (msg.type === "result") {
      if (msg.subtype === "success") {
        resultText = msg.result;
        usage = {
          inputTokens: msg.usage?.input_tokens,
          outputTokens: msg.usage?.output_tokens,
          cacheCreationInputTokens: msg.usage?.cache_creation_input_tokens,
          cacheReadInputTokens: msg.usage?.cache_read_input_tokens,
          totalCostUsd: msg.total_cost_usd,
        };
        break;
      }
      throw new Error(`agent ${input.agent} returned non-success result: ${msg.subtype}`);
    }
  }

  if (!resultText) {
    return mockResult<T>(input, fallback);
  }

  const parsed = tryParseJson(resultText);
  if (parsed && input.outputSchema) {
    const safe = input.outputSchema.safeParse(parsed);
    if (safe.success) {
      return {
        agent: input.agent,
        output: safe.data as T,
        rawResult: resultText,
        ...(usage ? { usage } : {}),
      };
    }
    console.warn(`[agent ${input.agent}] schema parse failed, using fallback`, safe.error);
  }

  return {
    agent: input.agent,
    output: (parsed as T) ?? fallback,
    rawResult: resultText,
    ...(usage ? { usage } : {}),
  };
}

export async function writerAgent(topic: {
  slug: string;
  signals: unknown[];
}): Promise<AgentRunResult<Draft>> {
  const fallback: Draft = {
    title: `[mock] ${topic.slug}`,
    body: `[mock draft for ${topic.slug}]`,
    topicSlug: topic.slug,
    references: [],
  };
  return runQuery<Draft>(
    {
      agent: "writer",
      skills: ["scqa-writing-framework", "non-engineer-translation"],
      prompt:
        "Generate a note article draft from AI industry signals. " +
        "Strictly follow SCQA + non-engineer translation rules. " +
        "Output a JSON object: { title, body, topicSlug, references[] }.",
      input: topic,
      outputSchema: schemas.draft,
    },
    fallback,
  );
}

export async function visualDesignerAgent(
  draft: Draft,
): Promise<AgentRunResult<Visuals>> {
  const fallback: Visuals = { headerImageUrl: null, figures: [] };
  return runQuery<Visuals>(
    {
      agent: "visual-designer",
      skills: ["visual-design-system"],
      prompt:
        "Plan header image and in-article figures for the given draft. " +
        "Output a JSON object: { headerImageUrl, figures[] }. " +
        "If image generation is not available, return placeholder URLs and continue.",
      input: draft,
      outputSchema: schemas.visuals,
    },
    fallback,
  );
}

export async function contentReviewerAgent(args: {
  draft: Draft;
  visuals: Visuals;
}): Promise<AgentRunResult<Reviewed>> {
  const fallback: Reviewed = {
    draft: args.draft,
    visuals: args.visuals,
    rubricScore: 0,
    rubricNotes: ["[mock] reviewer not run"],
    approved: false,
  };
  return runQuery<Reviewed>(
    {
      agent: "content-reviewer",
      skills: ["content-quality-rubric"],
      prompt:
        "Evaluate the draft using the 7-axis rubric (AI-feel zero / image-rich / " +
        "jargon density / structure / hook / target clarity / AI transparency). " +
        "Output a JSON object: { draft, visuals, rubricScore (0-100), rubricNotes[], approved (boolean) }. " +
        "Set approved=false on F grade.",
      input: args,
      outputSchema: schemas.reviewed,
    },
    fallback,
  );
}

export async function snsGeneratorAgent(
  reviewed: Reviewed,
): Promise<AgentRunResult<SnsContent>> {
  const fallback: SnsContent = {
    tweet: `[mock] ${reviewed.draft.title}`,
    tweetImageUrl: null,
    carousel: [],
  };
  return runQuery<SnsContent>(
    {
      agent: "sns-generator",
      skills: ["multi-platform-publishing", "visual-design-system"],
      prompt:
        "Generate X post (Before-After + numeric headline) and Instagram 9-slide carousel " +
        "from the reviewed note article. Output a JSON object: { tweet, tweetImageUrl, carousel[] }.",
      input: reviewed,
      outputSchema: schemas.sns,
    },
    fallback,
  );
}
