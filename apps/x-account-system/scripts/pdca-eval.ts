/**
 * Writer-quality PDCA eval harness.
 *
 * Usage:
 *   npx tsx scripts/pdca-eval.ts --label "iter-001" [--fmat medium] [--template template_chaen_gold]
 *
 * Runtime only: calls Anthropic twice (writer generation + rubric judge).
 */
import { appendFileSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildComposeUserBlocks,
  buildWriterSystemPrompt,
  SUBMIT_DRAFT_TOOL,
} from "../lib/curation/compose-prompts.ts";
import { COMPOSE_CONFIG } from "../lib/curation/compose-config.ts";
import { costJpyFor } from "../lib/cost/cost-of.ts";

const ENV_FILE =
  process.env.XAD_ENV_FILE ??
  "/Users/rikukudo/Projects/private-agents/all-good-ops/apps/x-account-system/.env.local";

const APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PDCA_DIR = resolve(APP_DIR, "../../outputs/improvements/2026-06-13-chaen-quality-pdca");
const SOURCE_FILE = resolve(PDCA_DIR, "source.txt");
const STATE_FILE = resolve(PDCA_DIR, "STATE.md");
const ITERATIONS_FILE = resolve(PDCA_DIR, "ITERATIONS.md");

const JUDGE_MODEL = "claude-sonnet-4-6";

type CliArgs = {
  label: string;
  fmat: string;
  template: string;
};

type Usage = {
  input_tokens: number;
  output_tokens: number;
};

type DraftToolInput = {
  body?: unknown;
  tweets?: unknown;
  outline?: unknown;
};

type Scores = Record<"D1" | "D2" | "D3" | "D4" | "D5" | "D6" | "D7", number>;
type Reasons = Record<keyof Scores, string>;

type JudgeResult = {
  scores: Scores;
  reasons: Reasons;
  total: number;
  pass: boolean;
  top_fix: string;
  summary: string;
};

const JUDGE_TOOL = {
  name: "submit_pdca_judgement",
  description: "PDCA評価の7次元スコア、総合点、合否、最優先改善を提出する。",
  input_schema: {
    type: "object",
    properties: {
      scores: {
        type: "object",
        properties: {
          D1: { type: "number", minimum: 0, maximum: 100 },
          D2: { type: "number", minimum: 0, maximum: 100 },
          D3: { type: "number", minimum: 0, maximum: 100 },
          D4: { type: "number", minimum: 0, maximum: 100 },
          D5: { type: "number", minimum: 0, maximum: 100 },
          D6: { type: "number", minimum: 0, maximum: 100 },
          D7: { type: "number", minimum: 0, maximum: 100 },
        },
        required: ["D1", "D2", "D3", "D4", "D5", "D6", "D7"],
        additionalProperties: false,
      },
      reasons: {
        type: "object",
        properties: {
          D1: { type: "string" },
          D2: { type: "string" },
          D3: { type: "string" },
          D4: { type: "string" },
          D5: { type: "string" },
          D6: { type: "string" },
          D7: { type: "string" },
        },
        required: ["D1", "D2", "D3", "D4", "D5", "D6", "D7"],
        additionalProperties: false,
      },
      total: { type: "number" },
      pass: { type: "boolean" },
      top_fix: { type: "string" },
      summary: { type: "string" },
    },
    required: ["scores", "reasons", "total", "pass", "top_fix", "summary"],
    additionalProperties: false,
  },
} as const;

function loadEnv(): void {
  try {
    for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException)?.code !== "ENOENT") throw e;
  }
}

function parseArgs(argv: string[]): CliArgs {
  const args: Partial<CliArgs> = {
    fmat: "medium",
    template: "template_chaen_gold",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--label") {
      if (!next) throw new Error("--label requires a value");
      args.label = next;
      i += 1;
    } else if (arg === "--fmat") {
      if (!next) throw new Error("--fmat requires a value");
      args.fmat = next;
      i += 1;
    } else if (arg === "--template") {
      if (!next) throw new Error("--template requires a value");
      args.template = next;
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: npx tsx scripts/pdca-eval.ts --label \"<iteration label>\" [--fmat medium] [--template template_chaen_gold]",
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.label) throw new Error('--label "<iteration label>" is required');
  return args as CliArgs;
}

function findToolUse(response: Anthropic.Messages.Message, toolName: string): unknown | undefined {
  for (const block of response.content) {
    if (block.type === "tool_use" && block.name === toolName) {
      return (block as { input?: unknown }).input;
    }
  }
  return undefined;
}

function failWithRaw(message: string, raw: unknown): never {
  console.error(JSON.stringify({ ok: false, error: message, raw }, null, 2));
  process.exit(1);
}

function parseDraftInput(raw: unknown, response: Anthropic.Messages.Message): DraftToolInput & { body: string } {
  if (raw == null || typeof raw !== "object") {
    failWithRaw("writer submit_draft tool_use input missing or non-object", response);
  }
  const input = raw as DraftToolInput;
  if (typeof input.body !== "string" || input.body.trim() === "") {
    failWithRaw("writer submit_draft body missing or empty", response);
  }
  return { ...input, body: input.body };
}

function isScoreKey(key: string): key is keyof Scores {
  return ["D1", "D2", "D3", "D4", "D5", "D6", "D7"].includes(key);
}

function validateJudge(raw: unknown, response: Anthropic.Messages.Message): JudgeResult {
  if (raw == null || typeof raw !== "object") {
    failWithRaw("judge tool_use input missing or non-object", response);
  }

  const obj = raw as Partial<JudgeResult>;
  const scores = obj.scores;
  const reasons = obj.reasons;
  if (scores == null || typeof scores !== "object" || reasons == null || typeof reasons !== "object") {
    failWithRaw("judge scores/reasons missing", response);
  }

  for (const key of ["D1", "D2", "D3", "D4", "D5", "D6", "D7"]) {
    if (!isScoreKey(key)) continue;
    if (typeof scores[key] !== "number" || scores[key] < 0 || scores[key] > 100) {
      failWithRaw(`judge score ${key} invalid`, response);
    }
    if (typeof reasons[key] !== "string" || reasons[key].trim() === "") {
      failWithRaw(`judge reason ${key} invalid`, response);
    }
  }

  if (typeof obj.total !== "number") failWithRaw("judge total invalid", response);
  if (typeof obj.pass !== "boolean") failWithRaw("judge pass invalid", response);
  if (typeof obj.top_fix !== "string" || obj.top_fix.trim() === "") {
    failWithRaw("judge top_fix invalid", response);
  }
  if (typeof obj.summary !== "string") failWithRaw("judge summary invalid", response);

  return obj as JudgeResult;
}

function buildJudgePrompt(state: string, candidateBody: string): string {
  return `あなたはX投稿品質の厳格な採点者です。

以下の STATE.md には、ロールモデル投稿（=100%基準）、7次元の重み付き採点ルーブリック、95%バーが含まれます。STATE.md に書かれた基準を正として、候補投稿を採点してください。

# STATE.md（ルーブリックとロールモデル。 verbatim）
${state}

# OUR CANDIDATE body
\`\`\`
${candidateBody}
\`\`\`

# 採点指示
- D1..D7 を各0-100で採点し、それぞれ1行理由を書く。
- 総合は STATE.md の式どおり: D1*.22 + D2*.20 + D3*.10 + D4*.18 + D5*.15 + D6*.10 + D7*.05。
- 合否は 95%バー: total>=78 かつ D1>=72 かつ D4>=68。
- top_fix は、次の1回のプロンプト/テンプレ修正で最優先に直すべき具体策を1つだけ書く。
- 必ず submit_pdca_judgement tool を呼び、JSON schema に従って提出する。`;
}

function scoreRows(scores: Scores, reasons: Reasons): string {
  return ["D1", "D2", "D3", "D4", "D5", "D6", "D7"]
    .map((key) => {
      const k = key as keyof Scores;
      return `| ${k} | ${scores[k]} | ${reasons[k].replace(/\n/g, " ")} |`;
    })
    .join("\n");
}

function appendIteration(args: CliArgs, candidateBody: string, judge: JudgeResult, costJpy: number): void {
  const block = `
## ${args.label} (${new Date().toISOString()})

### Candidate
\`\`\`
${candidateBody}
\`\`\`

### Scores
| Dim | Score | Reason |
| --- | ---: | --- |
${scoreRows(judge.scores, judge.reasons)}

Total: ${judge.total}
Pass: ${judge.pass}
Rough cost: ¥${costJpy.toFixed(2)}

Top fix: ${judge.top_fix}

Summary: ${judge.summary}
`;
  appendFileSync(ITERATIONS_FILE, block, "utf8");
}

function roughCostJpy(
  writerModel: string,
  writerUsage: Usage,
  judgeModel: string,
  judgeUsage: Usage,
): number {
  return (
    costJpyFor(writerModel, writerUsage.input_tokens, writerUsage.output_tokens) +
    costJpyFor(judgeModel, judgeUsage.input_tokens, judgeUsage.output_tokens)
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  loadEnv();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error(`ANTHROPIC_API_KEY is not set (${ENV_FILE})`);

  const source = readFileSync(SOURCE_FILE, "utf8");
  const state = readFileSync(STATE_FILE, "utf8");
  const anthropic = new Anthropic({ apiKey });

  const system = buildWriterSystemPrompt();
  const userMessage =
    `# 元ネタ（この素材から1本書く）\n${source}\n\n` +
    buildComposeUserBlocks(args.template, args.fmat, []) +
    "\n最後に必ず submit_draft を呼んで提出してください。";

  const writerResponse = await anthropic.messages.create({
    model: COMPOSE_CONFIG.writerModel,
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content: userMessage }],
    tools: [SUBMIT_DRAFT_TOOL as never],
    tool_choice: { type: "tool", name: "submit_draft" },
  });

  const draftInput = parseDraftInput(findToolUse(writerResponse, "submit_draft"), writerResponse);
  const candidateBody = draftInput.body;

  const judgeResponse = await anthropic.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 2500,
    messages: [{ role: "user", content: buildJudgePrompt(state, candidateBody) }],
    tools: [JUDGE_TOOL as never],
    tool_choice: { type: "tool", name: "submit_pdca_judgement" },
  });

  const judge = validateJudge(findToolUse(judgeResponse, "submit_pdca_judgement"), judgeResponse);
  const costJpy = roughCostJpy(COMPOSE_CONFIG.writerModel, writerResponse.usage, JUDGE_MODEL, judgeResponse.usage);

  appendIteration(args, candidateBody, judge, costJpy);

  console.log(
    JSON.stringify({
      label: args.label,
      fmat: args.fmat,
      template: args.template,
      candidate_body: candidateBody,
      total: judge.total,
      pass: judge.pass,
      scores: judge.scores,
      top_fix: judge.top_fix,
    }),
  );
  console.error(
    `[pdca-eval] rough_cost_jpy=¥${costJpy.toFixed(2)} ` +
      `(writer ${COMPOSE_CONFIG.writerModel}: ${writerResponse.usage.input_tokens}/${writerResponse.usage.output_tokens} tok, ` +
      `judge ${JUDGE_MODEL}: ${judgeResponse.usage.input_tokens}/${judgeResponse.usage.output_tokens} tok)`,
  );
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exit(1);
});
