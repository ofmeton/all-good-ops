/**
 * lib/ingest/bookmark-collect.ts — 手動 X ブックマーク駆動の素材取込。
 *
 * 既存 collector の下流（dedup → scoring → translation → persist）を流用し、
 * source_type='x_inspirations' / meta.discovery.via='bookmark' で保存する。
 * 探索 MA session は起動しない。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TraceMeta } from "../trace/types.js";
import { COLLECTOR_CONFIG } from "./collector-config.js";
import { dedupByTweetId, saveScoredMaterials } from "./collector-persist.js";
import { scoreCandidates, type Candidate, type CollectStats } from "./collector-scoring.js";
import { translateCandidates } from "./collector-translate.js";
import { fetchTweetsByIds } from "./twitterapi-client.js";

interface AnthropicLike {
  messages: {
    create: (args: Record<string, unknown>) => Promise<{
      stop_reason?: string;
      content: Array<{ type: string; id?: string; name?: string; input?: unknown; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    }>;
  };
}

export interface RunBookmarkCollectDeps {
  anthropic: AnthropicLike;
  sb: SupabaseClient;
  twitterApiKey: string;
  tweetIds: string[];
  fetchImpl: typeof fetch;
  now?: number;
  onTrace?: (m: TraceMeta) => void;
  runId?: string;
}

function zeroStats(): CollectStats {
  return {
    inserted: 0,
    fetched: 0,
    deduped: 0,
    scored: 0,
    cost: { exploreJpy: 0, scoringJpy: 0, translateJpy: 0, totalJpy: 0 },
  };
}

/**
 * URL 貼付で受け取った tweet id を twitterapi.io から取得し、既存下流 pipeline に投入する。
 */
export async function runBookmarkCollect(deps: RunBookmarkCollectDeps): Promise<CollectStats> {
  void deps.runId; // runId は queue trace の相関用に deps 契約へ残す。現時点では下流保存しない。
  if (deps.tweetIds.length === 0) {
    const stats = zeroStats();
    deps.onTrace?.({ model: COLLECTOR_CONFIG.scoringModel, tokensIn: 0, tokensOut: 0, costJpy: 0 });
    return stats;
  }

  const tweets = await fetchTweetsByIds(deps.tweetIds, deps.twitterApiKey, deps.fetchImpl);
  if (tweets.length === 0) {
    const stats = zeroStats();
    deps.onTrace?.({ model: COLLECTOR_CONFIG.scoringModel, tokensIn: 0, tokensOut: 0, costJpy: 0 });
    return stats;
  }

  const candidates: Candidate[] = tweets.map((tweet) => ({
    tweet,
    discovery: { via: "bookmark", query: "url_paste" },
  }));

  let deduped: Candidate[];
  try {
    deduped = await dedupByTweetId(deps.sb, candidates);
  } catch (e) {
    console.warn(JSON.stringify({ level: "warn", msg: "[bookmark-collect] early-dedup failed (fail-open, persist backstop に委譲)", error: String(e) }));
    deduped = candidates;
  }

  if (deduped.length === 0) {
    const stats = {
      ...zeroStats(),
      fetched: tweets.length,
    };
    deps.onTrace?.({ model: COLLECTOR_CONFIG.scoringModel, tokensIn: 0, tokensOut: 0, costJpy: 0 });
    return stats;
  }

  const scored = await scoreCandidates(deps.anthropic as never, deduped, {
    now: deps.now ?? Date.now(),
    batchSize: COLLECTOR_CONFIG.scoringBatchSize,
    model: COLLECTOR_CONFIG.scoringModel,
  });
  const { translations, costJpy: translateCostJpy } = await translateCandidates(
    deps.anthropic as never,
    scored,
    { model: COLLECTOR_CONFIG.translationModel },
  );
  const inserted = await saveScoredMaterials(deps.sb, scored, translations);

  const scoringJpy = scored.reduce((s, c) => s + c.costJpy, 0);
  const totalJpy = scoringJpy + translateCostJpy;
  deps.onTrace?.({
    model: COLLECTOR_CONFIG.scoringModel,
    tokensIn: 0,
    tokensOut: 0,
    costJpy: totalJpy,
  });

  return {
    inserted,
    fetched: tweets.length,
    deduped: deduped.length,
    scored: scored.length,
    cost: {
      exploreJpy: 0,
      scoringJpy,
      translateJpy: translateCostJpy,
      totalJpy,
    },
  };
}
