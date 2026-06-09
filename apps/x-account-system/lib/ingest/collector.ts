/**
 * lib/ingest/collector.ts — Collector Agent オーケストレーション。
 * 探索＝脳（永続 MA session）／fetch＝道具／score＝バッチ脳／persist＝配管。
 *
 * P3: explore は永続 collector agent（registry key="x-collector"）の MA session で駆動する。
 * scoring / translation の batch（messages.create）は agentic でないため MA 化せず据置。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TraceMeta } from "../trace/types.js";
import { runMaSession } from "../ma/run-session.js";
import { getAgentRef as getAgentRefDefault, type AgentRef } from "../ma/agent-registry.js";
import { COLLECTOR_CONFIG } from "./collector-config.js";
import { dispatchTool, type ToolApi } from "./collector-tools.js";
import { scoreCandidates, type Candidate } from "./collector-scoring.js";
import { translateCandidates } from "./collector-translate.js";
import { saveScoredMaterials } from "./collector-persist.js";
import { costUsdFor, USD_JPY_RATE } from "../cost/cost-of.js";

/** 永続 collector agent の registry key（ma_agents.agent_key / x-collector.agent.yaml と一致）。 */
const COLLECTOR_AGENT_KEY = "x-collector";

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
  /** scoring / translation の batch 用（messages.create）。explore は MA session で別駆動。 */
  anthropic: AnthropicLike;
  sb: SupabaseClient;
  twitterApiKey: string;
  fetchImpl: typeof fetch;
  /** explore MA session 用 ANTHROPIC_API_KEY（runMaSession に渡す）。 */
  apiKey?: string;
  api?: ToolApi; // test 注入
  now?: number;
  onTrace?: (m: TraceMeta) => void;
  /** テスト注入用（既定 runMaSession）。実 API を叩かずに explore wiring を検証する。 */
  runSession?: typeof runMaSession;
  /** テスト注入用（既定 agent-registry.getAgentRef）。実 DB を叩かずに永続参照を解決する。 */
  getAgentRef?: (sb: SupabaseClient, key: string) => Promise<AgentRef>;
}

/** 探索（永続 MA session）で候補を集約し、採点・保存。inserted 件数を返す。 */
export async function runCollect(deps: RunCollectDeps): Promise<number> {
  const now = deps.now ?? Date.now();
  const runSession = deps.runSession ?? runMaSession;
  const resolveAgentRef = deps.getAgentRef ?? getAgentRefDefault;
  const watchHandles = COLLECTOR_CONFIG.watchlist.map((s) => s.handle).join(", ");
  const userMessage =
    `今日の収集を実行せよ。固定watchlist: ${watchHandles}。海外トレンド woeid=${COLLECTOR_CONFIG.trendWoeids.join("/")} を確認し、キーワード探索も行う。十分集まったら終了。`;

  const candidates: Candidate[] = [];
  let tokensIn = 0;
  let tokensOut = 0;
  let collectorSessionId: string | undefined;

  // 永続 collector agent 参照を解決（miss=未 bootstrap は throw）。誤収集防止: 解決不能なら
  // 収集を中止し 0 件で返す（bootstrap 後に再走可）。
  let agentRef: AgentRef;
  try {
    agentRef = await resolveAgentRef(deps.sb, COLLECTOR_AGENT_KEY);
  } catch (e) {
    console.warn(JSON.stringify({ level: "error", msg: "[collect] agent ref unresolved (未bootstrap?)", error: String(e) }));
    return 0;
  }

  // explore: 永続 session の drain ループが tool_use 往復を回す。candidate は handler の
  // 副作用で蓄積する。fetch 失敗は fail-open（探索全体を殺さない）。maxFetchPerRun に達したら
  // それ以上 fetch せず終了を促す（旧 hard cap の soft 化。wall-clock は timeoutMs で bound）。
  const customToolHandler = async (name: string, input: unknown): Promise<string> => {
    if (candidates.length >= COLLECTOR_CONFIG.maxFetchPerRun) {
      return `十分な件数（${candidates.length}件）が集まりました。これ以上探索せず終了してください。`;
    }
    try {
      const r = await dispatchTool(name, (input ?? {}) as Record<string, unknown>, {
        key: deps.twitterApiKey,
        fetchImpl: deps.fetchImpl,
        api: deps.api,
      });
      candidates.push(...r.candidates);
      return r.toolResultText;
    } catch (e) {
      console.warn(JSON.stringify({ level: "warn", msg: "[collect] tool dispatch failed (fail-open)", tool: name, error: String(e) }));
      return `[error] ${String(e)}`;
    }
  };

  let res: Awaited<ReturnType<typeof runMaSession>> | undefined;
  try {
    res = await runSession({
      apiKey: deps.apiKey,
      // 永続経路: system/tools は agent 側に焼かれているため session 起動時は渡さない。
      agentRef: { id: agentRef.agentId, version: agentRef.version },
      environmentId: agentRef.environmentId,
      userMessage,
      customToolHandler,
    });
  } catch (e) {
    console.warn(JSON.stringify({ level: "error", msg: "[collect] explore session failed", error: String(e) }));
  }
  if (res) {
    collectorSessionId = res.ids?.session;
    tokensIn = (res.sessionUsage as { input_tokens?: number } | undefined)?.input_tokens ?? 0;
    tokensOut = (res.sessionUsage as { output_tokens?: number } | undefined)?.output_tokens ?? 0;
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

  const inserted = await saveScoredMaterials(deps.sb, scored, translations, collectorSessionId);

  const scoreCostJpy = scored.reduce((s, c) => s + c.costJpy, 0);
  deps.onTrace?.({
    model: COLLECTOR_CONFIG.scoringModel,
    tokensIn,
    tokensOut,
    costJpy: scoreCostJpy + exploreCostJpy + translateCostJpy,
  });
  return inserted;
}
