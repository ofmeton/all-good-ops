/**
 * Factuality / source-grounding judge (X6)
 *
 * draft 本文が、出典素材 (materials_store) に裏付けの「ない」具体的事実主張
 * (数字 / 期間 / 価格 / プロセス) をしていないかを LLM (cheap haiku) で判定する。
 *
 * - 出典に見当たらない具体主張があれば status='fail' + 列挙 reason。
 * - 出典が空/未指定なら呼び出し側で skip (この関数は呼ばれない想定だが、
 *   空配列を渡された場合も deterministic に pass を返す)。
 * - IN_MEMORY_FALLBACK=true または ANTHROPIC_API_KEY 未設定 なら LLM を呼ばず
 *   deterministic に pass (skip 相当) を返す → 既存テストを壊さない。
 *
 * SOFT ルール: pipeline.ts の HARD set には入れない。warning として人間に提示するのみ。
 */
import type { RuleStatus } from "./types.ts";

export type FactualityJudgeInput = {
  body: string;
  sourceTexts: string[];
};

export type FactualityJudgeResult = {
  status: RuleStatus;
  reason: string;
  /** 出典に見当たらない具体主張のリスト (status='fail' のときのみ非空) */
  unsupportedClaims: string[];
  costUsd: number;
};

const FACTUALITY_MODEL = "claude-haiku-4-5-20251001";

const FACTUALITY_TOOL = {
  name: "factuality",
  description:
    "draft が出典素材に裏付けのない具体的事実主張 (数字/期間/価格/プロセス) をしているか判定",
  input_schema: {
    type: "object",
    properties: {
      has_unsupported_claims: {
        type: "boolean",
        description: "出典に見当たらない具体的事実主張があれば true",
      },
      unsupported_claims: {
        type: "array",
        items: { type: "string" },
        description:
          "出典に裏付けが見当たらない具体主張 (数字/期間/価格/プロセス) を抜き出して列挙",
      },
    },
    required: ["has_unsupported_claims", "unsupported_claims"],
  },
} as const;

function isFallback(): boolean {
  return (
    process.env.IN_MEMORY_FALLBACK === "true" || !process.env.ANTHROPIC_API_KEY
  );
}

/**
 * deterministic skip-pass (LLM を呼ばない)。
 */
function passThrough(reason: string): FactualityJudgeResult {
  return { status: "pass", reason, unsupportedClaims: [], costUsd: 0 };
}

async function callAnthropicFactuality(
  input: FactualityJudgeInput,
): Promise<FactualityJudgeResult> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const sources = input.sourceTexts
    .map((t, i) => `[出典${i + 1}]\n${t}`)
    .join("\n\n");
  const res = await client.messages.create({
    model: FACTUALITY_MODEL,
    max_tokens: 512,
    tools: [FACTUALITY_TOOL as never],
    tool_choice: { type: "tool", name: "factuality" },
    messages: [
      {
        role: "user",
        content:
          `次の X 投稿 draft が、出典素材に裏付けの「ない」具体的事実主張 ` +
          `(数字・期間・価格・割合・処理プロセス等) をしていないか判定してください。\n` +
          `出典に書かれている / 一般常識 / 自分の体験談として自然な表現は問題ありません。\n` +
          `出典に存在しない具体的な数値・期間・価格・プロセスを断定している場合のみ unsupported とします。\n\n` +
          `--- draft ---\n${input.body}\n--- draft ここまで ---\n\n` +
          `--- 出典素材 ---\n${sources}\n--- 出典ここまで ---\n\n` +
          `factuality tool を呼んで結果を返してください。`,
      },
    ],
  });
  const tu = res.content.find((b) => b.type === "tool_use");
  if (!tu || tu.type !== "tool_use") {
    throw new Error("factuality: no tool_use in response");
  }
  const out = tu.input as {
    has_unsupported_claims?: boolean;
    unsupported_claims?: unknown;
  };
  const claims = Array.isArray(out.unsupported_claims)
    ? out.unsupported_claims.filter(
        (c): c is string => typeof c === "string" && c.trim().length > 0,
      )
    : [];
  // Haiku 4.5 USD: input $1/M, output $5/M (概算)
  const costUsd =
    (res.usage.input_tokens / 1_000_000) * 1 +
    (res.usage.output_tokens / 1_000_000) * 5;

  const hasUnsupported = out.has_unsupported_claims === true && claims.length > 0;
  if (hasUnsupported) {
    return {
      status: "fail",
      reason: `出典に見当たらない主張: ${claims.join(" / ")}`,
      unsupportedClaims: claims,
      costUsd,
    };
  }
  return {
    status: "pass",
    reason: "出典に矛盾する具体主張は検出されなかった",
    unsupportedClaims: [],
    costUsd,
  };
}

/**
 * X6 出典グラウンディング判定の entry point。
 *
 * - 出典テキストが空 → skip (LLM を呼ばない)。
 * - IN_MEMORY_FALLBACK / API key 未設定 → deterministic pass (LLM を呼ばない)。
 * - それ以外 → cheap haiku で tool_use 判定。
 */
export async function runFactualityJudge(
  input: FactualityJudgeInput,
): Promise<FactualityJudgeResult> {
  const sources = (input.sourceTexts ?? []).filter(
    (t) => typeof t === "string" && t.trim().length > 0,
  );
  if (sources.length === 0) {
    return {
      status: "skip",
      reason: "出典素材なし → 事実チェック skip",
      unsupportedClaims: [],
      costUsd: 0,
    };
  }
  if (isFallback()) {
    return passThrough("stub: 事実チェック skip-pass (IN_MEMORY_FALLBACK)");
  }
  return callAnthropicFactuality({ body: input.body, sourceTexts: sources });
}
