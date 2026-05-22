/**
 * Claude Agent SDK の `query()` ラッパー。
 *
 * spec: docs/superpowers/specs/2026-05-22-money-bot-design.md §6.1
 *
 * 役割:
 *   - `settingSources: ['project']` で all-good-ops の既存 .claude/agents/ .claude/skills/ を
 *     filesystem からロードして使う
 *   - writer / visual-designer / content-reviewer / brand-publisher をそのまま再利用する
 *
 * TODO(Phase 1):
 *   - @anthropic-ai/claude-agent-sdk の最新シグネチャは context7 で再確認
 *     (本ファイル作成時点で 0.1.x 系を想定。Skill / settingSources / allowedTools の引数名は要再確認)
 *   - CLAUDE_PROJECT_ROOT を Vercel build に含める bundling 戦略を確定
 *     (Vercel 上は `.claude/` が deploy bundle に含まれていないと filesystem load が失敗するため)
 *   - cost 観測のため Vercel AI Gateway 経由に切り替える設定を追加
 */

// NOTE: 実 import は npm install 後に有効化される。Phase 1 着手前は型解決エラーになる想定。
//       下記 import は実装時にコメントアウト解除する。
// import { query } from "@anthropic-ai/claude-agent-sdk";

import { z } from "zod";

// ---------------------------------------------------------------------------
// 共通型
// ---------------------------------------------------------------------------

export type AgentName =
  | "writer"
  | "visual-designer"
  | "content-reviewer"
  | "brand-publisher"
  | "sns-generator"; // sns-generator は spec §5.1 step 6。既存にない場合は Phase 2 で新設

export interface AgentRunInput<T = unknown> {
  agent: AgentName;
  prompt: string;
  /** 既存 .claude/skills/ から invoke するスキル名 (例: 'scqa-writing-framework') */
  skills?: string[];
  /** 任意の構造化 input。agent prompt template 側で {{input.xxx}} 参照する想定 */
  input?: T;
}

export interface AgentRunResult<T = unknown> {
  agent: AgentName;
  output: T;
  /** Anthropic API 応答の usage。コスト集計 / KPI 用 */
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
  };
  raw?: unknown;
}

// ---------------------------------------------------------------------------
// ラッパー本体
// ---------------------------------------------------------------------------

/**
 * 既存 all-good-ops の subagent を一発実行する high-level wrapper。
 *
 * TODO(Phase 1): 下記は pseudo-code レベル。実 SDK shape は context7 で再確認後に書き直す。
 *   想定 shape (subject to change):
 *     const result = await query({
 *       prompt,
 *       settingSources: ['project'],
 *       allowedTools: ['Task', 'Skill', 'Read', 'Write', 'Bash'],
 *       cwd: process.env.CLAUDE_PROJECT_ROOT,
 *       agents: { default: input.agent },  // or subagent invocation 経由
 *     });
 */
export async function runAgent<TIn = unknown, TOut = unknown>(
  input: AgentRunInput<TIn>,
): Promise<AgentRunResult<TOut>> {
  // TODO(Phase 1): 実 SDK 呼び出しに差し替え
  // const result = await query({
  //   prompt: buildPrompt(input),
  //   settingSources: ['project'],
  //   allowedTools: ['Task', 'Skill', 'Read', 'Write'],
  //   cwd: process.env.CLAUDE_PROJECT_ROOT,
  // });
  // return { agent: input.agent, output: result.output as TOut, usage: result.usage };

  // Phase 1 着手前 mock: 呼び出されたら呼び出し情報を返すだけのプレースホルダ
  return {
    agent: input.agent,
    output: {
      __mock__: true,
      message: `[mock] runAgent called for ${input.agent}. Replace with real SDK call in Phase 1.`,
      input,
    } as unknown as TOut,
  };
}

// ---------------------------------------------------------------------------
// 個別エージェントの便利ラッパー (workflow から見やすくするため)
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

export async function writerAgent(topic: { slug: string; signals: unknown[] }) {
  return runAgent<typeof topic, Draft>({
    agent: "writer",
    skills: ["scqa-writing-framework", "non-engineer-translation"],
    prompt:
      "AI 動向シグナルから note 記事ドラフトを生成。SCQA + 非エンジニア翻訳ルール厳守。",
    input: topic,
  });
}

export async function visualDesignerAgent(draft: Draft) {
  return runAgent<Draft, Visuals>({
    agent: "visual-designer",
    skills: ["visual-design-system"],
    prompt:
      "draft からヘッダー画像 + 記事内図解を gpt-image-2 で生成し URL を返す。",
    input: draft,
  });
}

export async function contentReviewerAgent(args: {
  draft: Draft;
  visuals: Visuals;
}) {
  return runAgent<typeof args, Reviewed>({
    agent: "content-reviewer",
    skills: ["content-quality-rubric"],
    prompt: "7軸 rubric で評価。F評価が出たら approved=false を返す。",
    input: args,
  });
}

export async function snsGeneratorAgent(reviewed: Reviewed) {
  return runAgent<Reviewed, SnsContent>({
    agent: "sns-generator",
    skills: ["multi-platform-publishing", "visual-design-system"],
    prompt:
      "note 記事から X 投稿文 (Before-After + 数値見出し) + Instagram カルーセル 9 枚を生成。",
    input: reviewed,
  });
}
