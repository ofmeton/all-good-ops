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
import { scoreCandidates, type Candidate, type CollectStats } from "./collector-scoring.js";
import { resolveThreadRoots, isNonRootReply } from "./collector-thread.js";
import { translateCandidates } from "./collector-translate.js";
import { saveScoredMaterials, dedupByTweetId } from "./collector-persist.js";
import { buildPrerankParams, selectForScoring, spearmanRho, type SelectionPool } from "./collector-prerank.js";
import { resolveRuntimeParams } from "../params/runtime-params.js";
import type { PrunedSummary, ShadowReport } from "./collector-scoring.js";
import { costUsdFor, USD_JPY_RATE } from "../cost/cost-of.js";
import { insertSessionEvents, recordRunSession } from "../trace/session-event-store.js";
import type { SessionEventInput } from "../trace/types.js";

export type { CollectStats } from "./collector-scoring.js";

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
  runId?: string;
  /** P2 prerank の exploration 層化サンプル用 rng（既定 Math.random。テストで決定化）。 */
  rng?: () => number;
  /** P2 prerank モード override（既定 COLLECTOR_CONFIG.prerankMode＝shadow）。テスト/段階移行用。 */
  prerankMode?: "shadow" | "enforce";
}

/**
 * 探索（永続 MA session）で候補を集約し、採点・保存。
 * 戻り値 CollectStats: inserted（= 旧 number 戻り値・意味不変）＋ funnel 件数＋コスト内訳。
 * 採点・保存・dedup・件数・onTrace の cost 合計は一切変えず、内訳を返すだけ（純粋な観測追加）。
 */
export async function runCollect(deps: RunCollectDeps): Promise<CollectStats> {
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
    return { inserted: 0, fetched: 0, deduped: 0, scored: 0, cost: { exploreJpy: 0, scoringJpy: 0, translateJpy: 0, totalJpy: 0 } };
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

  const sessionEvents: SessionEventInput[] = [];
  let res: Awaited<ReturnType<typeof runMaSession>> | undefined;
  try {
    res = await runSession({
      apiKey: deps.apiKey,
      // 永続経路: system/tools は agent 側に焼かれているため session 起動時は渡さない。
      agentRef: { id: agentRef.agentId, version: agentRef.version },
      environmentId: agentRef.environmentId,
      userMessage,
      customToolHandler,
      onEvent: (e) => sessionEvents.push(e),
    });
  } catch (e) {
    console.warn(JSON.stringify({ level: "error", msg: "[collect] explore session failed", error: String(e) }));
  }
  if (res) {
    collectorSessionId = res.ids?.session;
    tokensIn = (res.sessionUsage as { input_tokens?: number } | undefined)?.input_tokens ?? 0;
    tokensOut = (res.sessionUsage as { output_tokens?: number } | undefined)?.output_tokens ?? 0;
    if (collectorSessionId) {
      // 1B 観測: collector explore session を永続化（fail-open）。
      await insertSessionEvents(collectorSessionId, "collector", sessionEvents);
      await recordRunSession({ runId: deps.runId ?? "", stageId: "collect", sessionId: collectorSessionId, agentKey: "collector" });
    }
  }

  // explore で焼いた token は候補 0 でも計上する（空 explore 連発も runaway シグナル）。
  const exploreCostJpy =
    costUsdFor(COLLECTOR_CONFIG.scoringModel, tokensIn, tokensOut) * USD_JPY_RATE;
  if (candidates.length === 0) {
    deps.onTrace?.({ tokensIn, tokensOut, model: COLLECTOR_CONFIG.scoringModel, costJpy: exploreCostJpy });
    return {
      inserted: 0,
      fetched: 0,
      deduped: 0,
      scored: 0,
      cost: { exploreJpy: exploreCostJpy, scoringJpy: 0, translateJpy: 0, totalJpy: exploreCostJpy },
    };
  }

  // P1 early-dedup: 採点・翻訳の前に重複を畳む（重複ツイートの sonnet 採点＋haiku 翻訳を削減）。
  //  - バッチ内重複（複数経路で同一 tweet を拾う）は常に安全に畳む。
  //  - 既存 store 重複（前日までの既出）は **resolveThreadRoots で id が変わらない候補のみ** DB 除去する。
  //    非ルート reply は後段で thread-root へ差し替わり id が変化しうるため早期 DB 除去から除外し、
  //    persist backstop に委ねる ⇒ inserted 集合は従来と完全同一（早期に落とすのは persist でも必ず落ちる候補のみ）。
  //  - fail-open: dedup が throw したら early-dedup をスキップし従来経路（persist backstop）に委ねる。
  let deduped: Candidate[];
  try {
    deduped = await dedupByTweetId(deps.sb, candidates, (c) => !isNonRootReply(c.tweet));
  } catch (e) {
    console.warn(JSON.stringify({ level: "warn", msg: "[collect] early-dedup failed (fail-open, persist backstop に委譲)", error: String(e) }));
    deduped = candidates;
  }

  // スレッド非ルート（2番目以降）の候補は TOP へ差し替える（断片でなくスレッド起点を採点・保存）。
  // コード側で決定的に行う（MA の get_thread 判断に依存しない）。fail-open。
  const normalized = await resolveThreadRoots(deduped, {
    key: deps.twitterApiKey,
    fetchImpl: deps.fetchImpl,
    getThread: deps.api?.getThread,
  });

  // P2 二段採点（prerank）: prior（決定的・無料）で三層選抜 = safeguard ∪ topK ∪ exploration。
  // selection の計算自体は純関数・無課金。挙動が変わるのは enforce のみ。
  //
  // P3 閉ループ: runtime_params を 1 度だけ解決し、レバー（K/quota/age/enforce）の上書きに使う。
  //   resolveRuntimeParams は overlay+clip 済の確定値を返す。DB 不達/壊れ値/未投入は fail-open で
  //   COLLECTOR_CONFIG default＝挙動完全不変。これで optimizer が tier-P で書いた値を翌 collect が反映する。
  const rp = await resolveRuntimeParams(deps.sb);

  // P2-enforce-flip: prerankMode は runtime_param collector_prerank_enforce で決定する。
  //   param=1 → enforce / 0 or 行なし / DB 不達 → shadow。deps.prerankMode はテスト/手動 override（優先）。
  const prerankMode: "shadow" | "enforce" =
    deps.prerankMode ?? (rp.collector_prerank_enforce >= 1 ? "enforce" : "shadow");

  // K/quota/age の runtime レバーを buildPrerankParams に overlay（enforce は上で消費済＝二重にしない）。
  //   未投入なら resolveRuntimeParams が default（=config 値）を返すため上書きしても挙動不変。
  const prerankParams = buildPrerankParams(COLLECTOR_CONFIG, {
    shortlistTopK: rp.collector_shortlist_top_k,
    explorationQuota: rp.collector_exploration_quota,
    maxAgeHours: rp.collector_prerank_max_age_hours,
  });
  const selection = selectForScoring(normalized, prerankParams, deps.rng ?? Math.random, now);

  // shadow（既定・挙動不変）: fine-score は normalized 全件。enforce: selected のみ。
  const scoreTargets: Candidate[] =
    prerankMode === "enforce" ? selection.selected.map((s) => s.candidate) : normalized;

  const scored = await scoreCandidates(deps.anthropic as never, scoreTargets, {
    now,
    batchSize: COLLECTOR_CONFIG.scoringBatchSize,
    model: COLLECTOR_CONFIG.scoringModel,
  });

  // 海外ツイート（lang≠ja）を Haiku で翻訳 → meta.translation に積む（#6 基盤）。
  // enforce では scored 自体が selected のみなので、翻訳も自動で selected の非ja に限られる。
  const { translations, costJpy: translateCostJpy } = await translateCandidates(
    deps.anthropic as never,
    scored,
    { model: COLLECTOR_CONFIG.translationModel },
  );

  // enforce のみ selection_pool/prior_score を meta に刻む（shadow は meta 不変＝挙動不変）。
  const selectionMeta =
    prerankMode === "enforce"
      ? new Map(selection.selected.map((s) => [s.candidate.tweet.id, { pool: s.pool, prior: s.prior }]))
      : undefined;
  const inserted = await saveScoredMaterials(deps.sb, scored, translations, collectorSessionId, selectionMeta);

  const scoreCostJpy = scored.reduce((s, c) => s + c.costJpy, 0);
  const totalCostJpy = scoreCostJpy + exploreCostJpy + translateCostJpy;
  // onTrace の cost 合計は現状と同額（合算 1 本）。内訳は CollectStats で別途返す。
  deps.onTrace?.({
    model: COLLECTOR_CONFIG.scoringModel,
    tokensIn,
    tokensOut,
    costJpy: totalCostJpy,
  });

  // 剪定サマリ（沈黙カット禁止・両モードで記録）。
  const prunedSummary: PrunedSummary = {
    count: selection.pruned.length,
    byReason: selection.pruned.reduce<Record<string, number>>((acc, p) => {
      acc[p.reason] = (acc[p.reason] ?? 0) + 1;
      return acc;
    }, {}),
    samples: selection.pruned.slice(0, 10).map((p) => ({
      tweetId: p.candidate.tweet.id,
      handle: p.candidate.tweet.author?.userName ?? "",
      reason: p.reason,
      prior: p.prior,
    })),
  };

  // shadow 指標（shadow モードのみ＝全件 fine-score を ground truth に retention 等を算出）。
  let shadow: ShadowReport | undefined;
  if (prerankMode === "shadow") {
    shadow = buildShadowReport(scored, selection.selected, selection.pruned, selection.poolCounts, selection.anomalies);
  }

  return {
    inserted,
    fetched: candidates.length,
    deduped: deduped.length,
    scored: scoreTargets.length,
    cost: {
      exploreJpy: exploreCostJpy,
      scoringJpy: scoreCostJpy,
      translateJpy: translateCostJpy,
      totalJpy: totalCostJpy,
    },
    selectionMode: prerankMode,
    pruned: prunedSummary,
    shadow,
  };
}

/**
 * shadow 指標を構築（全件 fine-score 済を ground truth に使う）。
 *  - topN_retention: fine overall 上位20が prior selected に含まれる率（enforce 前提=100%）
 *  - pruned_fine_max: 剪定群の fine overall 最大
 *  - spearman_rho: prior vs fine overall の順位相関
 */
function buildShadowReport(
  scored: Array<{ tweet: { id: string }; scores: { overall: number } }>,
  selected: Array<{ candidate: { tweet: { id: string } }; prior: number }>,
  pruned: Array<{ candidate: { tweet: { id: string } }; prior: number }>,
  poolCounts: Record<SelectionPool, number>,
  anomalies: number,
): ShadowReport {
  const selectedIds = new Set(selected.map((s) => s.candidate.tweet.id));
  const prunedIds = new Set(pruned.map((p) => p.candidate.tweet.id));

  // top-N retention（N=20）。
  const byOverall = [...scored].sort((a, b) => b.scores.overall - a.scores.overall);
  const topN = byOverall.slice(0, Math.min(20, byOverall.length));
  const retained = topN.filter((c) => selectedIds.has(c.tweet.id)).length;
  const topN_retention = topN.length > 0 ? retained / topN.length : 1;

  // 剪定群の fine overall 最大。
  const pruned_fine_max = scored
    .filter((c) => prunedIds.has(c.tweet.id))
    .reduce((m, c) => Math.max(m, c.scores.overall), 0);

  // Spearman: prior vs fine overall（selected∪pruned で prior が引ける全件）。
  const priorById = new Map<string, number>();
  for (const s of selected) priorById.set(s.candidate.tweet.id, s.prior);
  for (const p of pruned) priorById.set(p.candidate.tweet.id, p.prior);
  const pairs = scored
    .filter((c) => priorById.has(c.tweet.id))
    .map((c) => ({ a: priorById.get(c.tweet.id)!, b: c.scores.overall }));

  return {
    topN_retention,
    pruned_fine_max,
    pool_counts: poolCounts,
    selected_count: selected.length,
    pruned_count: pruned.length,
    spearman_rho: spearmanRho(pairs),
    topN_size: topN.length,
    anomalies,
  };
}
