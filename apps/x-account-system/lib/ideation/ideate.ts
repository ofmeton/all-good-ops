/**
 * lib/ideation/ideate.ts — materials_store → core_ideas LLM 自動生成
 *
 * 役割:
 *   1. xad.materials_store から未処理素材を atomic claim (ideation_status: claimed)
 *   2. Anthropic tool_use で core_ideas を生成 (claude-sonnet-4-5、llm-judge.ts と同パターン)
 *   3. xad.core_ideas に status='draft' で bulk insert
 *   4. 素材を ideation_status: 'done' にマーク
 *
 * Atomic claim で冪等性を保証: 並列 cron / retry でも二重消費しない。
 *
 * Style Guide 参照: outputs/improvements/x-account-design-consolidated/style-guide-all-versions.md
 *   - ターゲット: 非エンジニア経営者・士業・中小事業者 (v1.4)
 *   - 素材分類比率: translation 10% / paraphrase 20% / opinion 30% / first_hand 40% (v1.4)
 *   - Hook 類型: Writer 12-hook enum (writer/types.ts の PrimaryHook に 1:1 対応)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { PrimaryHook, WriterFormat } from "../writer/types.ts";
import type { Env } from "../../src/worker.ts";
import { callClaudeTraced } from "../trace/llm-trace.ts";
import type { TraceMeta } from "../trace/types.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type IdeaCategory = "paraphrase" | "first_hand" | "industry_sop";

interface MaterialRow {
  id: string;
  source_type: string;
  raw_text: string | null;
  redacted_text: string | null;
  meta: Record<string, unknown>;
}

interface GeneratedIdea {
  topic: string;
  primary_hook: PrimaryHook;
  fmat: WriterFormat;
  category: IdeaCategory;
  audience: string;
  source_material_ids: string[];
}

// ---------------------------------------------------------------------------
// Anthropic IDEA_TOOL — enums MUST match writer/types.ts PrimaryHook + WriterFormat
// ---------------------------------------------------------------------------

const PRIMARY_HOOK_ENUM: readonly PrimaryHook[] = [
  "number",
  "question",
  "failure_story",
  "contrast",
  "tips_enum",
  "first_hand",
  "translation",
  "opinion",
  "industry_sop",
  "business_repro",
  "paraphrase",
  "critique",
] as const;

const FMAT_ENUM: readonly WriterFormat[] = [
  "short",
  "medium",
  "long",
  "thread",
  "article",
] as const;

const CATEGORY_ENUM: readonly IdeaCategory[] = [
  "paraphrase",
  "first_hand",
  "industry_sop",
] as const;

const IDEA_TOOL = {
  name: "core_ideas",
  description: "materials から X 投稿ネタを生成",
  input_schema: {
    type: "object",
    properties: {
      ideas: {
        type: "array",
        items: {
          type: "object",
          properties: {
            topic: { type: "string" },
            primary_hook: {
              type: "string",
              enum: PRIMARY_HOOK_ENUM as unknown as string[],
            },
            fmat: {
              type: "string",
              enum: FMAT_ENUM as unknown as string[],
            },
            category: {
              type: "string",
              enum: CATEGORY_ENUM as unknown as string[],
            },
            audience: { type: "string" },
            source_material_ids: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: [
            "topic",
            "primary_hook",
            "fmat",
            "category",
            "audience",
            "source_material_ids",
          ],
        },
      },
    },
    required: ["ideas"],
  },
} as const;

// ---------------------------------------------------------------------------
// System prompt (non-engineer business owner audience, AI automation focus)
// ---------------------------------------------------------------------------

function buildIdeationSystemPrompt(): string {
  return `あなたは ofmeton（AIエンジニア兼コンテンツストラテジスト）の X（旧 Twitter）投稿アイデアを生成するエージェントです。

## ターゲット読者
非エンジニア経営者・士業（税理士・社労士）・中小事業者。
AI ツールを業務改善に活用したいが、専門用語に壁を感じている人。

## 投稿の特徴（ポジション）
「エンジニアだけど、非エンジニアの言葉で翻訳する実装者」。
AI 自動化・業務仕組み化の**再現可能な実例**を中心に発信する。

## 素材分類比率（Style Guide v1.4）
- translation（海外情報の直訳）: 10%
- paraphrase（翻案・構造維持し再加工）: 20%
- opinion（ofmeton の所感 × 海外トリガー）: 30%
- first_hand（自身の一次体験・案件実例）: 40%

## Hook 類型（Writer 12-hook に対応）
primary_hook は必ず以下から 1 つ選択:
number / question / failure_story / contrast / tips_enum / first_hand /
translation / opinion / industry_sop / business_repro / paraphrase / critique

## 制約
- failure_story は月 ≤ 4 投稿上限。素材がある場合のみ採用。
- 攻撃的表現・固有名詞の無許諾引用は禁止。
- source_material_ids は提供素材の id を正確に参照すること。
- category は paraphrase / first_hand / industry_sop の 3 種。
`;
}

// ---------------------------------------------------------------------------
// Supabase client singleton
// ---------------------------------------------------------------------------

let _supabase: SupabaseClient | null = null;

function getSupabase(env: Env): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      { db: { schema: process.env.SUPABASE_SCHEMA || "xad" } },
    ) as unknown as SupabaseClient;
  }
  return _supabase;
}

// Exported for testing
export function resetSupabaseForTest(): void {
  _supabase = null;
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

/**
 * Atomic claim: UPDATE materials_store SET ideation_status = 'claimed'
 *   WHERE ideation_status IS NULL
 *   AND publication_consent = 'pending'
 *   AND source_type IN ('x_inspirations','note_inspirations')
 *   RETURNING *  (via .select() in Supabase JS)
 *
 * Uses the dedicated `ideation_status` COLUMN (migration 0009) rather than
 * stuffing the flag into the `meta` JSONB. The previous implementation did
 * `.update({ meta: { ideation_status: "claimed" } })` which REPLACED the whole
 * meta column — wiping tweet_id/url/etc. and breaking buzz-ingest dedup.
 *
 * Supabase JS returns updated rows when you chain .select() after .update().
 * The filter `.is("ideation_status", null)` claims only unclaimed rows.
 * Concurrent calls see "claimed" and skip → no double-consume. meta is untouched.
 */
async function fetchUnideatedMaterials(
  env: Env,
  limit = 20,
): Promise<MaterialRow[]> {
  const sb = getSupabase(env);

  // 1. claim 対象を limit 件に限定するため、まず候補 id を limit 件だけ取得する。
  //    (旧実装は全 null 行を claim してから slice していたため、未処理分が claimed のまま
  //     orphan 化し、以降の ideation が素材枯渇でスキップしていた。)
  const { data: candidates, error: selErr } = await sb
    .from("materials_store")
    .select("id")
    .eq("publication_consent", "pending")  // x_inspirations come in as pending
    .in("source_type", ["x_inspirations", "note_inspirations"])
    .is("ideation_status", null)
    .limit(limit);

  if (selErr) {
    throw new Error(`[ideation] fetchUnideatedMaterials select failed: ${(selErr as { message: string }).message}`);
  }
  const ids = ((candidates as { id: string }[] | null) ?? []).map((c) => c.id);
  if (ids.length === 0) return [];

  // 2. その id 群だけを atomic claim (still null のみ更新 → 並行 ideation でも二重 claim しない)。
  const { data, error } = await sb
    .from("materials_store")
    .update({ ideation_status: "claimed" })
    .in("id", ids)
    .is("ideation_status", null)
    .select();

  if (error) {
    throw new Error(`[ideation] fetchUnideatedMaterials claim failed: ${(error as { message: string }).message}`);
  }

  return (data as MaterialRow[] | null) ?? [];
}

/**
 * Insert generated ideas into xad.core_ideas with status='draft'.
 */
async function insertCoreIdeas(
  env: Env,
  ideas: GeneratedIdea[],
): Promise<void> {
  const sb = getSupabase(env);
  const rows = ideas.map((idea) => ({
    topic: idea.topic,
    primary_hook: idea.primary_hook,
    fmat: idea.fmat,
    category: idea.category,
    audience: idea.audience,
    source_material_ids: idea.source_material_ids,
    status: "draft" as const,
  }));

  const { error } = await sb.from("core_ideas").insert(rows);
  if (error) {
    throw new Error(`[ideation] insertCoreIdeas failed: ${error.message}`);
  }
}

/**
 * Mark consumed materials as ideation_status='done'.
 * Uses the dedicated `ideation_status` column (migration 0009) — leaves meta intact.
 */
async function markMaterialsIdeated(env: Env, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const sb = getSupabase(env);
  const { error } = await sb
    .from("materials_store")
    .update({ ideation_status: "done" })
    .in("id", ids)
    .select();

  if (error) {
    // Non-fatal: log and continue. Worst case: ideation re-runs on next cron
    // but claimed → done transition ensures no double-insert.
    console.error(
      JSON.stringify({
        level: "error",
        msg: "[ideation] markMaterialsIdeated failed",
        ids,
        error: error.message,
      }),
    );
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * runIdeation — main entry point.
 *
 * @param env   Cloudflare Worker Env
 * @param count Max ideas to request from LLM (default 5)
 * @param onTrace optional: LLM trace meta (prompt/tokens) を受け取るコールバック。
 *   戻り値型は number のまま (後方互換)。観測ダッシュボード計装の queue.ts から渡す。
 * @returns Number of core_ideas inserted
 */
export async function runIdeation(
  env: Env,
  count = 5,
  onTrace?: (meta: TraceMeta) => void,
): Promise<number> {
  // Step 1: Atomic claim of unconsumed materials
  const materials = await fetchUnideatedMaterials(env, 20);

  if (materials.length === 0) {
    console.log(
      JSON.stringify({
        level: "info",
        msg: "[ideation] no unconsumed materials — skip",
      }),
    );
    return 0;
  }

  // Step 2: Build material context for LLM
  const materialContext = materials
    .map(
      (m) =>
        `[id:${m.id}] [type:${m.source_type}]\n${m.redacted_text ?? m.raw_text ?? ""}`,
    )
    .join("\n\n---\n\n");

  // Step 3: Anthropic tool_use call (lazy import — Workers-compatible)
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const systemPrompt = buildIdeationSystemPrompt();
  const userPrompt =
    `以下の素材 ${materials.length} 件から X 投稿ネタを最大 ${count} 件生成してください。\n` +
    `各ネタに topic / primary_hook / fmat / category / audience / source_material_ids を付与してください。\n\n` +
    `## 素材\n\n${materialContext}`;

  const out = await callClaudeTraced(client as never, {
    params: {
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      system: systemPrompt,
      tools: [IDEA_TOOL as never],
      tool_choice: { type: "tool", name: "core_ideas" },
      messages: [{ role: "user", content: userPrompt }],
    },
    promptText: `${systemPrompt}\n\n---\n\n${userPrompt}`,
  });

  if (out.toolUse == null) {
    throw new Error("[ideation] no tool_use in Anthropic response");
  }
  onTrace?.(out.meta);

  const ideas = (out.toolUse as { ideas: GeneratedIdea[] }).ideas;

  const costUsd =
    ((out.meta.tokensIn ?? 0) / 1_000_000) * 3 +
    ((out.meta.tokensOut ?? 0) / 1_000_000) * 15;

  console.log(
    JSON.stringify({
      level: "info",
      msg: "[ideation] Anthropic tool_use complete",
      ideaCount: ideas.length,
      materialCount: materials.length,
      costUsd: costUsd.toFixed(6),
    }),
  );

  if (ideas.length === 0) {
    // Mark materials done even if no ideas generated (avoid re-processing)
    await markMaterialsIdeated(
      env,
      materials.map((m) => m.id),
    );
    return 0;
  }

  // Step 4: Insert core_ideas
  await insertCoreIdeas(env, ideas);

  // Step 5: Mark materials as done
  await markMaterialsIdeated(
    env,
    materials.map((m) => m.id),
  );

  return ideas.length;
}
