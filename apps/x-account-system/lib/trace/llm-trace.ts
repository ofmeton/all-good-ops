import type { TraceMeta } from "./types.js";

interface ClaudeLike {
  messages: { create: (args: Record<string, unknown>) => Promise<{
    content: Array<{ type: string; text?: string; input?: unknown; name?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  }> };
}

export interface CallArgs {
  /** messages.create にそのまま渡す引数（model/max_tokens/system/messages/tools/tool_choice 等） */
  params: Record<string, unknown>;
  /** trace に残す最終プロンプト文字列（system+user を結合したもの。呼び出し側が組む） */
  promptText: string;
}

export async function callClaudeTraced(
  client: ClaudeLike, args: CallArgs,
): Promise<{ text: string; toolUse?: unknown; meta: TraceMeta }> {
  const res = await client.messages.create(args.params);
  const text = res.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
  const tu = res.content.find((c) => c.type === "tool_use");
  const tokensIn = res.usage?.input_tokens;
  const tokensOut = res.usage?.output_tokens;
  const model = String(args.params.model ?? "");
  return {
    text,
    toolUse: tu?.input,
    meta: { promptText: args.promptText, model, tokensIn, tokensOut },
  };
}
