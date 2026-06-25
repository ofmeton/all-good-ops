import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

function client(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY)
      throw new Error("ANTHROPIC_API_KEY not set");
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export const HAIKU = "claude-haiku-4-5-20251001";
export const SONNET = "claude-sonnet-4-6";

export async function callJson<T>(args: {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<T> {
  const res = await client().messages.create({
    model: args.model,
    max_tokens: args.maxTokens ?? 1024,
    system: args.system,
    messages: [{ role: "user", content: args.user }],
  });

  const block = res.content[0];
  if (!block || block.type !== "text") throw new Error("expected text block");

  const text = block.text;
  // Extract JSON from text (fenced code blocks supported)
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = (match ? match[1] : text).trim();

  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    throw new Error(`JSON parse failed: ${text.slice(0, 200)}`);
  }
}
