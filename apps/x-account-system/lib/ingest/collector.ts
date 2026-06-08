/**
 * lib/ingest/collector.ts — Collector Agent オーケストレーション。
 * 探索＝脳（tool_use ループ）／fetch＝道具／score＝バッチ脳／persist＝配管。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TraceMeta } from "../trace/types.js";
import { COLLECTOR_CONFIG } from "./collector-config.js";
import { buildExploreSystemPrompt } from "./collector-prompts.js";
import { COLLECTOR_TOOLS, dispatchTool, type ToolApi } from "./collector-tools.js";
import { scoreCandidates, type Candidate } from "./collector-scoring.js";
import { translateCandidates } from "./collector-translate.js";
import { saveScoredMaterials } from "./collector-persist.js";
import { costUsdFor, USD_JPY_RATE } from "../cost/cost-of.js";

interface AnthropicLike {
  messages: {
    create: (args: Record<string, unknown>) => Promise<{
      stop_reason?: string;
      content: Array<{ type: string; id?: string; name?: string; input?: unknown; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    }>;
  };
}

export interface RunCollectDeps {
  anthropic: AnthropicLike;
  sb: SupabaseClient;
  twitterApiKey: string;
  fetchImpl: typeof fetch;
  api?: ToolApi; // test 注入
  now?: number;
  onTrace?: (m: TraceMeta) => void;
}

/** 探索ループを回して候補を集約し、採点・保存。inserted 件数を返す。 */
export async function runCollect(deps: RunCollectDeps): Promise<number> {
  const now = deps.now ?? Date.now();
  const system = buildExploreSystemPrompt();
  const watchHandles = COLLECTOR_CONFIG.watchlist.map((s) => s.handle).join(", ");
  const messages: Array<{ role: "user" | "assistant"; content: unknown }> = [
    {
      role: "user",
      content: `今日の収集を実行せよ。固定watchlist: ${watchHandles}。海外トレンド woeid=${COLLECTOR_CONFIG.trendWoeids.join("/")} を確認し、キーワード探索も行う。十分集まったら終了。`,
    },
  ];

  const candidates: Candidate[] = [];
  let tokensIn = 0;
  let tokensOut = 0;

  for (let i = 0; i < COLLECTOR_CONFIG.maxExploreIterations; i++) {
    if (candidates.length >= COLLECTOR_CONFIG.maxFetchPerRun) break;
    const res = await deps.anthropic.messages.create({
      model: COLLECTOR_CONFIG.scoringModel,
      max_tokens: 1024,
      system,
      tools: COLLECTOR_TOOLS as never,
      messages,
    });
    tokensIn += res.usage?.input_tokens ?? 0;
    tokensOut += res.usage?.output_tokens ?? 0;

    const toolUses = res.content.filter((c) => c.type === "tool_use");
    if (res.stop_reason !== "tool_use" || toolUses.length === 0) break;

    messages.push({ role: "assistant", content: res.content });
    const toolResults: Array<Record<string, unknown>> = [];
    for (const tu of toolUses) {
      let r;
      try {
        r = await dispatchTool(tu.name ?? "", (tu.input ?? {}) as Record<string, unknown>, {
          key: deps.twitterApiKey,
          fetchImpl: deps.fetchImpl,
          api: deps.api,
        });
      } catch (e) {
        console.warn(JSON.stringify({ level: "warn", msg: "[collect] tool dispatch failed (fail-open)", tool: tu.name, error: String(e) }));
        r = { candidates: [], toolResultText: `[error] ${String(e)}` };
      }
      candidates.push(...r.candidates);
      toolResults.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: r.toolResultText,
      });
    }
    messages.push({ role: "user", content: toolResults });
  }

  // explore で焼いた token は候補 0 でも計上する（空 explore 連発も runaway シグナル）。
  const exploreCostJpy =
    costUsdFor(COLLECTOR_CONFIG.scoringModel, tokensIn, tokensOut) * USD_JPY_RATE;
  if (candidates.length === 0) {
    deps.onTrace?.({ tokensIn, tokensOut, model: COLLECTOR_CONFIG.scoringModel, costJpy: exploreCostJpy });
    return 0;
  }

  const scored = await scoreCandidates(deps.anthropic as never, candidates, {
    now,
    batchSize: COLLECTOR_CONFIG.scoringBatchSize,
    model: COLLECTOR_CONFIG.scoringModel,
  });

  // 海外ツイート（lang≠ja）を Haiku で翻訳 → meta.translation に積む（#6 基盤）。
  const { translations, costJpy: translateCostJpy } = await translateCandidates(
    deps.anthropic as never,
    scored,
    { model: COLLECTOR_CONFIG.translationModel },
  );

  const inserted = await saveScoredMaterials(deps.sb, scored, translations);

  const scoreCostJpy = scored.reduce((s, c) => s + c.costJpy, 0);
  deps.onTrace?.({
    model: COLLECTOR_CONFIG.scoringModel,
    tokensIn,
    tokensOut,
    costJpy: scoreCostJpy + exploreCostJpy + translateCostJpy,
  });
  return inserted;
}
