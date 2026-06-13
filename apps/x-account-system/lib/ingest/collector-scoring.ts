/**
 * lib/ingest/collector-scoring.ts — 数値ヒント計算＋3軸バッチ scorer。
 * 数値は道具（ここで計算）、重み付け判断は脳（LLM）。
 */
import { callClaudeTraced } from "../trace/llm-trace.js";
import { buildScoringSystemPrompt } from "./collector-prompts.js";
import type { Tweet } from "./twitterapi-client.js";

export interface DiscoveryTag {
  via: "fixed" | "keyword" | "trend" | "user_search" | "following" | "bookmark";
  query: string;
}

export interface Candidate {
  tweet: Tweet;
  discovery: DiscoveryTag;
  /** スレッド非ルート（2番目以降）を拾った際に TOP へ差し替えた元の reply tweet id（provenance）。 */
  threadRootOf?: string;
}

export interface AxisScores {
  freshness: number;
  velocity: number;
  target_fit: number;
  overall: number;
}

export interface ScoredCandidate extends Candidate {
  scores: AxisScores;
  scoreReason: string;
  costJpy: number;
}

/**
 * collect 1 run のコスト内訳（成分別）。explore(MA session) / scoring / translate を
 * 個別に観測するためのデータ契約（cost_ledger に合算 1 本で入る現状の内訳を分解）。
 * totalJpy === exploreJpy + scoringJpy + translateJpy（onTrace に渡す合計と一致）。
 */
export interface CollectCostBreakdown {
  exploreJpy: number;
  scoringJpy: number;
  translateJpy: number;
  totalJpy: number;
}

/** 剪定サンプル（沈黙カット禁止＝後から監査できるよう id/handle/理由/prior を残す）。 */
export interface PrunedSample {
  tweetId: string;
  handle: string;
  reason: string;
  prior: number;
}

/** P2 prerank で剪定された候補のサマリ（件数・理由別・サンプル）。 */
export interface PrunedSummary {
  count: number;
  byReason: Record<string, number>;
  samples: PrunedSample[];
}

/**
 * shadow モードの観測指標（enforce 切替判断の材料）。shadow は全件 fine-score 済なので
 * prior 由来の選抜が「真の上澄み」をどれだけ捕捉するかを ground truth 付きで測れる。
 */
export interface ShadowReport {
  /** 最重要: fine overall 上位 N(=20) のうち prior selected に含まれる率（enforce 前提=100%）。 */
  topN_retention: number;
  /** 剪定群の fine overall 最大（高すぎると上澄みを捨てているサイン）。 */
  pruned_fine_max: number;
  pool_counts: { safeguard: number; topK: number; exploration: number };
  selected_count: number;
  pruned_count: number;
  /** prior vs fine overall の Spearman 順位相関（n<2 は null）。 */
  spearman_rho: number | null;
  /** topN_retention の母数（min(20, fine-scored 件数)）。 */
  topN_size: number;
  /** createdAt parse 不能の件数。 */
  anomalies: number;
}

/**
 * runCollect の戻り値。inserted は現行の戻り値（呼び出し側の意味を保持）。
 * 加えて funnel 件数（fetched→deduped→scored→inserted）とコスト内訳を観測用に返す。
 * P2: prerank の選抜モード・剪定サマリ・shadow 指標を付随（shadow 既定では挙動不変）。
 */
export interface CollectStats {
  /** materials_store に新規 insert した件数（= 旧 number 戻り値）。 */
  inserted: number;
  /** dedup 前に explore で集めた候補数（candidates.length）。 */
  fetched: number;
  /** early-dedup（バッチ内重複＋既存 store 重複）後の候補数。funnel: fetched→deduped→scored→inserted。 */
  deduped: number;
  /** fine-score に回した件数（shadow=全件 / enforce=selected のみ）。 */
  scored: number;
  /** コスト内訳。 */
  cost: CollectCostBreakdown;
  /** prerank の適用モード（"shadow"=挙動不変 / "enforce"=選抜のみ採点）。 */
  selectionMode?: "shadow" | "enforce";
  /** 剪定サマリ（沈黙カット禁止）。 */
  pruned?: PrunedSummary;
  /** shadow 指標（shadow モードでのみ算出。enforce は ground truth 不在のため未算出）。 */
  shadow?: ShadowReport;
}

export interface NumericHints {
  age_hours: number;
  velocity_per_hour: number;
  engagement_rate: number;
}

/** 数値ヒント（LLM に添える参考値）。velocity/freshness の素 */
export function computeHints(tweet: Tweet, now: number): NumericHints {
  const created = new Date(tweet.createdAt).getTime();
  const ageHours = Number.isFinite(created)
    ? Math.max((now - created) / 3600_000, 0.1)
    : 9999;
  const engagement =
    (tweet.likeCount ?? 0) + (tweet.retweetCount ?? 0) + (tweet.bookmarkCount ?? 0);
  const views = tweet.viewCount ?? 0;
  return {
    age_hours: Math.round(ageHours * 10) / 10,
    velocity_per_hour: Math.round((engagement / ageHours) * 10) / 10,
    engagement_rate: views > 0 ? Math.round((engagement / views) * 1000) / 1000 : 0,
  };
}

const SCORE_TOOL = {
  name: "score_materials",
  description: "収集ツイートを3軸で採点",
  input_schema: {
    type: "object",
    properties: {
      scores: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            freshness: { type: "number" },
            velocity: { type: "number" },
            target_fit: { type: "number" },
            overall: { type: "number" },
            reason: { type: "string" },
          },
          required: ["id", "freshness", "velocity", "target_fit", "overall", "reason"],
        },
      },
    },
    required: ["scores"],
  },
} as const;

interface RawScore {
  id: string;
  freshness: number;
  velocity: number;
  target_fit: number;
  overall: number;
  reason: string;
}

/** LLM 出力の数値フィールドを安全に number へ変換。NaN/null/文字列は 0 */
function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export interface ScoreOpts {
  now: number;
  batchSize: number;
  model: string;
}

/** 候補を batchSize ごとに採点。欠落は zeros にして全件返す（除外しない）。 */
export async function scoreCandidates(
  client: Parameters<typeof callClaudeTraced>[0],
  candidates: Candidate[],
  opts: ScoreOpts,
): Promise<ScoredCandidate[]> {
  const system = buildScoringSystemPrompt();
  const result: ScoredCandidate[] = [];

  for (const batch of chunk(candidates, opts.batchSize)) {
    const lines = batch.map((c) => {
      const h = computeHints(c.tweet, opts.now);
      return JSON.stringify({
        id: c.tweet.id,
        text: c.tweet.text,
        lang: c.tweet.lang,
        is_reply: c.tweet.isReply ?? false,
        has_media: (c.tweet.media?.length ?? 0) > 0,
        age_hours: h.age_hours,
        velocity_per_hour: h.velocity_per_hour,
        engagement_rate: h.engagement_rate,
      });
    });
    const userPrompt = `次の候補を score_materials で採点せよ。\n${lines.join("\n")}`;

    const out = await callClaudeTraced(client, {
      params: {
        model: opts.model,
        max_tokens: 4096,
        system,
        tools: [SCORE_TOOL as never],
        tool_choice: { type: "tool", name: "score_materials" },
        messages: [{ role: "user", content: userPrompt }],
      },
      promptText: `${system}\n\n---\n\n${userPrompt}`,
    });

    const rawRaw = (out.toolUse as { scores?: unknown })?.scores;
    const rawScores: RawScore[] = Array.isArray(rawRaw) ? (rawRaw as RawScore[]) : [];
    const byId = new Map(rawScores.map((s) => [s.id, s]));
    const costJpy =
      (((out.meta.tokensIn ?? 0) / 1_000_000) * 3 +
        ((out.meta.tokensOut ?? 0) / 1_000_000) * 15) *
      150; // USD→JPY 固定

    for (const c of batch) {
      const s = byId.get(c.tweet.id);
      result.push({
        ...c,
        scores: s
          ? {
              freshness: toNum(s.freshness),
              velocity: toNum(s.velocity),
              target_fit: toNum(s.target_fit),
              overall: toNum(s.overall),
            }
          : { freshness: 0, velocity: 0, target_fit: 0, overall: 0 },
        scoreReason: s ? s.reason : "スコア欠落（未採点・全保存方針で保持）",
        costJpy: costJpy / batch.length,
      });
    }
  }
  return result;
}
