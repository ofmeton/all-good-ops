/**
 * intent-classifier.ts
 *
 * 自由文 (ボタンでも明示プレフィックス 修正:/覚えて: でもない) の承認意図を
 * 低コストな Haiku の tool_use 1 回で判定する。
 *
 * 呼ばれる条件 (line-event.ts dispatch order):
 *   approve:/reject: (postback+text) でも 覚えて: / 修正: でも interview でもない
 *   → 自由文だけがここに来る (ボタン/明示プレフィックスは LLM を呼ばない)。
 *
 * IN_MEMORY_FALLBACK=true の場合は API を呼ばず deterministic stub を返す。
 *
 * model: claude-haiku-4-5-20251001 (小さい max_tokens)、lazy import。
 */

export type ReplyIntent =
  | "approve"
  | "reject"
  | "revise"
  | "remember"
  | "approve_and_remember"
  | "none";

export type ReplyIntentResult = {
  intent: ReplyIntent;
  /** revise の修正指示 (revise の場合に使う) */
  instruction?: string;
  /** remember / approve_and_remember で覚える内容 */
  note?: string;
};

const INTENT_TOOL = {
  name: "classify_reply_intent",
  description:
    "投稿承認チャットでのユーザーの自由文返信から意図を1つ判定する。" +
    "approve=このまま投稿してよい / reject=却下・やめる / revise=直してほしい(instructionに要望) / " +
    "remember=今後の参考にしてほしい(noteに内容) / approve_and_remember=投稿しつつ今後も覚えて(note) / " +
    "none=承認操作と無関係・判断不能。",
  input_schema: {
    type: "object",
    properties: {
      intent: {
        type: "string",
        enum: ["approve", "reject", "revise", "remember", "approve_and_remember", "none"],
      },
      instruction: { type: "string", description: "revise の修正指示 (任意)" },
      note: { type: "string", description: "remember / approve_and_remember で覚える内容 (任意)" },
    },
    required: ["intent"],
  },
} as const;

/**
 * Haiku tool_use を 1 回呼んで意図を判定する。
 * IN_MEMORY_FALLBACK=true の場合は stub。
 */
export async function classifyReplyIntent(text: string): Promise<ReplyIntentResult> {
  const trimmed = text.trim();
  if (!trimmed) return { intent: "none" };

  if (process.env.IN_MEMORY_FALLBACK === "true") {
    return stubClassify(trimmed);
  }

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    tools: [INTENT_TOOL as never],
    tool_choice: { type: "tool", name: "classify_reply_intent" },
    messages: [
      {
        role: "user",
        content:
          `投稿承認チャットでのユーザー返信です。意図を判定し classify_reply_intent tool を呼べ。\n---\n${trimmed}\n---`,
      },
    ],
  });
  const tu = res.content.find((b) => b.type === "tool_use");
  if (!tu || tu.type !== "tool_use") {
    // 判定不能時は安全側 (none)。
    return { intent: "none" };
  }
  const out = tu.input as ReplyIntentResult;
  return normalize(out);
}

function normalize(out: ReplyIntentResult): ReplyIntentResult {
  const allowed: ReplyIntent[] = [
    "approve",
    "reject",
    "revise",
    "remember",
    "approve_and_remember",
    "none",
  ];
  const intent = allowed.includes(out?.intent) ? out.intent : "none";
  return {
    intent,
    instruction: typeof out?.instruction === "string" ? out.instruction.trim() || undefined : undefined,
    note: typeof out?.note === "string" ? out.note.trim() || undefined : undefined,
  };
}

/**
 * fallback 用 deterministic stub (キーワード heuristic)。
 * 実 API を呼ばないテスト / Phase 0.5 で使う。
 */
function stubClassify(text: string): ReplyIntentResult {
  if (/(これで|そのまま|オッケー|OK|ok|👍|いいね|投稿して|公開して|承認)/.test(text)) {
    return { intent: "approve" };
  }
  if (/(やめ|却下|ボツ|なし|だめ|ダメ|キャンセル)/.test(text)) {
    return { intent: "reject" };
  }
  if (/(直して|修正|変えて|短く|長く|もっと)/.test(text)) {
    return { intent: "revise", instruction: text };
  }
  if (/(覚え|今後|次から|いつも)/.test(text)) {
    return { intent: "remember", note: text };
  }
  return { intent: "none" };
}
