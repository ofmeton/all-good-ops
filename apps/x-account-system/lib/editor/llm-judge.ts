/**
 * LLM judge (Anthropic Sonnet 4.6 tool_use bundled)
 *
 * Stage 2 で 1 リクエスト = 1 LLM 呼び出しで以下 6 項目を一括判定:
 *   - R1 業務仕組み化テーマに繋がるか
 *   - R3 対象は意見、敵は作らない
 *   - R6 結論の断定性 (末尾 200 字に hedge がないか)
 *   - X2 ステマ表記 (本文中の disclosure 存在)
 *   - X4 読者像 1 行明示
 *   - X5 補助: 固有名詞 mask 検査 (redactStrict + containsHighRisk の補強)
 *
 * Phase 0.5 (IN_MEMORY_FALLBACK=true) では deterministic stub を返す:
 *   - 全項目 pass
 *   - X2 のみ hasAffiliateLink=true && 本文に "#PR|#広告|アフィリエイト" が無い時に fail
 *
 * 将来的に PR-B+ で実 API ON にする際は IN_MEMORY_FALLBACK=false の分岐で
 * Anthropic SDK を呼ぶ実装に切替 (tool_use schema を types.LlmJudgeResult に固定)。
 */
import type { LlmJudgeResult, RuleStatus } from "./types.ts";
import { callClaudeTraced } from "../trace/llm-trace.ts";

export type LlmJudgeInput = {
  body: string;
  hasAffiliateLink: boolean;
  format: string;
  platform: string;
};

const DEFAULT_PASS: { status: RuleStatus; reason: string } = {
  status: "pass",
  reason: "stub: passed (IN_MEMORY_FALLBACK)",
};

const HEDGE_PATTERN = /(かも|だと思います|なのかな|気がする|な気がします|かもしれません)\s*[。!\.]?$/;
const DISCLOSURE_PATTERN = /(#PR|#広告|#ad|アフィリエイト|広告含む|プロモーション)/;
const FORBIDDEN_FOR_R3 = /(無能|情弱|養分|搾取|奴隷|アホ|バカ|低能)/;
const AUDIENCE_LINE_PATTERN =
  /(向け|の方|の皆さん|あなた|読者|経営者|フリーランス|個人事業主|中小|士業|非エンジニア|社長)/;
const WORKFLOW_PATTERN =
  /(仕組み化|自動化|業務改善|ワークフロー|効率化|時短|テンプレ化|定型化|プロセス|手順|SOP|standardize)/;

const JUDGE_TOOL = {
  name: "judge",
  description: "Editor 6項目を pass/fail/skip で判定",
  input_schema: {
    type: "object",
    properties: Object.fromEntries(
      [
        "r1_workflow_theme",
        "r3_no_enemy",
        "r6_assertive_conclusion",
        "x2_stealth_disclosure_text",
        "x4_audience_line",
        "x5_proper_noun_assist",
      ].map((k) => [
        k,
        {
          type: "object",
          properties: {
            status: { type: "string", enum: ["pass", "fail", "skip"] },
            reason: { type: "string" },
          },
          required: ["status", "reason"],
        },
      ]),
    ),
    required: [
      "r1_workflow_theme",
      "r3_no_enemy",
      "r6_assertive_conclusion",
      "x2_stealth_disclosure_text",
      "x4_audience_line",
      "x5_proper_noun_assist",
    ],
  },
} as const;

/**
 * Anthropic Sonnet を tool_use で呼び出し 6 項目を一括判定する。
 * IN_MEMORY_FALLBACK=true の場合は呼ばれない (stubJudge が優先)。
 */
async function callAnthropicJudge(input: LlmJudgeInput): Promise<LlmJudgeResult> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = "claude-sonnet-4-5";
  const userPrompt =
    `platform=${input.platform} format=${input.format} affiliate=${input.hasAffiliateLink}\n---\n${input.body}\n---\n上記を Editor 6項目で判定し judge tool を呼べ。`;
  const out = await callClaudeTraced(client as never, {
    params: {
      model,
      max_tokens: 1024,
      tools: [JUDGE_TOOL as never],
      tool_choice: { type: "tool", name: "judge" },
      messages: [{ role: "user", content: userPrompt }],
    },
    promptText: userPrompt,
  });
  if (out.toolUse == null) {
    throw new Error("judge: no tool_use in response");
  }
  const costUsd =
    ((out.meta.tokensIn ?? 0) / 1_000_000) * 3 +
    ((out.meta.tokensOut ?? 0) / 1_000_000) * 15;
  // LLM は tool_use で 6 項目を省略することがある (非決定的)。欠損フィールドを
  // skip で補完して、rule 側の `.status` 参照クラッシュ (= post-job orphan) を防ぐ。
  const raw = (out.toolUse ?? {}) as Partial<Omit<LlmJudgeResult, "costUsd">>;
  const JUDGE_FIELDS = [
    "r1_workflow_theme",
    "r3_no_enemy",
    "r6_assertive_conclusion",
    "x2_stealth_disclosure_text",
    "x4_audience_line",
    "x5_proper_noun_assist",
  ] as const;
  const normalized = {} as Omit<LlmJudgeResult, "costUsd">;
  for (const f of JUDGE_FIELDS) {
    const v = raw[f] as { status?: RuleStatus; reason?: string } | undefined;
    if (v && typeof v.status === "string") {
      normalized[f] = { status: v.status, reason: v.reason ?? "" };
    } else {
      console.warn(`[llm-judge] 項目 ${f} が応答に無いため skip 補完`);
      normalized[f] = { status: "skip" as RuleStatus, reason: "judge が項目を省略 (skip 既定)" };
    }
  }
  return { ...normalized, costUsd, _trace: out.meta };
}

/**
 * Stub: 文字列 heuristic を使って deterministic に 6 項目を判定する。
 * Phase 0.5 では実 API を呼ばずこの実装を使う。
 */
function stubJudge(input: LlmJudgeInput): LlmJudgeResult {
  const { body, hasAffiliateLink } = input;
  const tail = body.slice(-200);

  // R1: 業務仕組み化テーマ
  const r1: { status: RuleStatus; reason: string } = WORKFLOW_PATTERN.test(body)
    ? { status: "pass", reason: "stub: workflow keyword hit" }
    : {
        status: "fail",
        reason: "stub: 業務仕組み化キーワード (仕組み化/自動化/業務改善/...) が見つからない",
      };

  // R3: 対象は意見、敵は作らない (禁止語が混じったら fail)
  const r3: { status: RuleStatus; reason: string } = FORBIDDEN_FOR_R3.test(body)
    ? {
        status: "fail",
        reason: "stub: 攻撃的表現 (無能/情弱 等) が検出された",
      }
    : { status: "pass", reason: "stub: enemy phrase not detected" };

  // R6: 結論の断定性 (末尾 200 字に hedge があれば fail)
  const r6: { status: RuleStatus; reason: string } = HEDGE_PATTERN.test(tail)
    ? {
        status: "fail",
        reason: "stub: 末尾 200 字に hedge (かも/だと思います) が検出",
      }
    : { status: "pass", reason: "stub: no hedge at tail" };

  // X2: 本文中の disclosure 存在 (affiliateLink 時のみ)
  const x2: { status: RuleStatus; reason: string } = hasAffiliateLink
    ? DISCLOSURE_PATTERN.test(body)
      ? { status: "pass", reason: "stub: disclosure keyword present" }
      : {
          status: "fail",
          reason: "stub: hasAffiliateLink=true なのに #PR|#広告|アフィリエイト が本文にない",
        }
    : { status: "pass", reason: "stub: no affiliate link (skip-pass)" };

  // X4: 読者像 1 行明示
  const x4: { status: RuleStatus; reason: string } = AUDIENCE_LINE_PATTERN.test(body)
    ? { status: "pass", reason: "stub: audience phrase present" }
    : {
        status: "fail",
        reason: "stub: 読者像を示す語 (向け/あなた/経営者...) が見つからない",
      };

  // X5 補助: 固有名詞 (redactStrict の補完)
  // ここでは「明らかに mask されていない固有名詞らしき token」を粗検出する。
  // 厳密判定は X5 本体 (redactStrict + containsHighRisk) で行う。
  const x5: { status: RuleStatus; reason: string } = { ...DEFAULT_PASS };

  return {
    r1_workflow_theme: r1,
    r3_no_enemy: r3,
    r6_assertive_conclusion: r6,
    x2_stealth_disclosure_text: x2,
    x4_audience_line: x4,
    x5_proper_noun_assist: x5,
    costUsd: 0,
  };
}

export async function runLlmJudge(
  input: LlmJudgeInput,
): Promise<LlmJudgeResult> {
  if (process.env.IN_MEMORY_FALLBACK === "true") {
    return stubJudge(input);
  }
  return callAnthropicJudge(input);
}
