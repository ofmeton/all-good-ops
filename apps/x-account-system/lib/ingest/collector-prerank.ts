/**
 * lib/ingest/collector-prerank.ts — 二段採点の prior（決定的・無料・解釈可能）+ 選抜（safeguard∪topK∪exploration）。
 *
 * prior は judge でなく **guard**: 落とすのは provably-zero（floor）と prior tail のみ。上澄み温存が最優先。
 * 純関数・LLM 非依存・rng 注入で決定的（テスト容易）。collector.ts が resolveThreadRoots 後・scoreCandidates 前に呼ぶ。
 */
import { computeHints, type Candidate, type NumericHints } from "./collector-scoring.js";
import type { CollectorConfig } from "./collector-config.js";
import type { Tweet } from "./twitterapi-client.js";

export interface PrerankWeights {
  w_f: number;
  w_v: number;
  w_e: number;
}

/** prerank の確定パラメータ（config から buildPrerankParams で導出）。 */
export interface PrerankParams {
  weights: PrerankWeights;
  tau: number;
  viaBoost: Record<string, number>;
  shortlistTopK: number;
  explorationQuota: number;
  maxAgeHours: number;
  freshnessProtectHours: number;
  /** category="ai_official" の watchlist handle（小文字）。safeguard / floor 免除に使う。 */
  aiOfficialHandles: Set<string>;
}

export type SelectionPool = "safeguard" | "topK" | "exploration";

export interface SelectedItem {
  candidate: Candidate;
  pool: SelectionPool;
  prior: number;
}

export interface PrunedItem {
  candidate: Candidate;
  /** 剪定理由コード: empty_text / stale_low_velocity / below_shortlist。 */
  reason: string;
  prior: number;
}

export interface SelectResult {
  selected: SelectedItem[];
  pruned: PrunedItem[];
  /** createdAt parse 不能の件数（保守温存しつつ異常として可視化）。 */
  anomalies: number;
  poolCounts: Record<SelectionPool, number>;
}

/** config → prerank パラメータ。ai_official handle 集合を 1 度だけ構築。 */
export function buildPrerankParams(config: CollectorConfig): PrerankParams {
  return {
    weights: config.prerankWeights,
    tau: config.prerankTau,
    viaBoost: config.viaBoost,
    shortlistTopK: config.shortlistTopK,
    explorationQuota: config.explorationQuota,
    maxAgeHours: config.prerankMaxAgeHours,
    freshnessProtectHours: config.freshnessProtectHours,
    aiOfficialHandles: new Set(
      config.watchlist
        .filter((w) => w.category === "ai_official")
        .map((w) => w.handle.toLowerCase()),
    ),
  };
}

/**
 * decay 付き prior（0..~1.0 + viaBoost）。w_f·freshness + w_v·velocityNorm + w_e·engagementNorm + viaBoost。
 *  - freshness = exp(-age_hours/τ)
 *  - velocityNorm = log1p(velocity_per_hour)/log1p(100)（velocity 100/h で ~1）
 *  - engagementNorm = min(engagement_rate/0.05, 1)（5% で飽和）
 */
export function computePrior(
  hints: NumericHints,
  via: string,
  params: Pick<PrerankParams, "weights" | "tau" | "viaBoost">,
): number {
  const freshness = Math.exp(-hints.age_hours / params.tau);
  const velocityNorm = Math.log1p(Math.max(hints.velocity_per_hour, 0)) / Math.log1p(100);
  const engagementNorm = Math.min(Math.max(hints.engagement_rate, 0) / 0.05, 1);
  const w = params.weights;
  const boost = params.viaBoost[via] ?? 0;
  return w.w_f * freshness + w.w_v * velocityNorm + w.w_e * engagementNorm + boost;
}

/**
 * 候補が ai_official 由来か（safeguard 中核の判定）。保守側＝取りこぼし回避を優先。
 *  1. 実著者 handle が ai_official watchlist にある（最も確実な一次ソース判定）
 *  2. fixed 経路の query が from:<ai_official handle> / @<handle> を含む
 * いずれかで true（union）。曖昧なら selected 寄せ（上澄み温存 ≫ 削減量）。
 */
export function isAiOfficialSource(candidate: Candidate, aiOfficialHandles: Set<string>): boolean {
  const author = candidate.tweet.author?.userName?.toLowerCase();
  if (author && aiOfficialHandles.has(author)) return true;
  if (candidate.discovery.via === "fixed") {
    const q = candidate.discovery.query.toLowerCase();
    for (const h of aiOfficialHandles) {
      if (q.includes(`from:${h}`) || q.includes(`@${h}`)) return true;
    }
  }
  return false;
}

/**
 * floor 判定（provably-zero のみ・理由コードを返す。落とすのは tail だけ）。null=floor しない。
 *  - empty_text: 本文空（age 無関係に無価値）
 *  - stale_low_velocity: createdAt有効 ∧ age>maxAgeHours ∧ velocity<1 ∧ 非 ai_official
 * 免除: createdAt parse 不能（温存）/ age<freshnessProtectHours（fresh-protect・遅咲き保護）。
 */
export function computeFloorReason(
  tweet: Tweet,
  hints: NumericHints,
  isAiOfficial: boolean,
  params: Pick<PrerankParams, "maxAgeHours" | "freshnessProtectHours">,
): string | null {
  const text = tweet.text;
  if (!text || text.trim().length === 0) return "empty_text";
  const createdValid = Number.isFinite(new Date(tweet.createdAt).getTime());
  if (!createdValid) return null; // parse 不能は温存（anomaly は呼び出し側で計上）
  if (hints.age_hours < params.freshnessProtectHours) return null; // fresh-protect
  if (hints.age_hours > params.maxAgeHours && hints.velocity_per_hour < 1 && !isAiOfficial) {
    return "stale_low_velocity";
  }
  return null;
}

/** rng で in-place Fisher–Yates シャッフル（決定的・rng 注入）。 */
function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

interface PriorCandidate {
  candidate: Candidate;
  prior: number;
}

/** discovery.via 層化ランダムで E 件サンプル（via をラウンドロビン、群内は rng シャッフル）。 */
function stratifiedSample(pool: PriorCandidate[], quota: number, rng: () => number): PriorCandidate[] {
  if (quota <= 0 || pool.length === 0) return [];
  const groups = new Map<string, PriorCandidate[]>();
  for (const p of pool) {
    const via = p.candidate.discovery.via;
    const g = groups.get(via);
    if (g) g.push(p);
    else groups.set(via, [p]);
  }
  const keys = [...groups.keys()].sort(); // 決定的な via 順
  for (const k of keys) shuffleInPlace(groups.get(k)!, rng);

  const out: PriorCandidate[] = [];
  let progressed = true;
  while (out.length < quota && progressed) {
    progressed = false;
    for (const k of keys) {
      if (out.length >= quota) break;
      const g = groups.get(k)!;
      const next = g.shift();
      if (next) {
        out.push(next);
        progressed = true;
      }
    }
  }
  return out;
}

/**
 * 三層選抜 = safeguard ∪ topK ∪ exploration。残りは pruned（理由コード付き）。
 * 重複なし（safeguard を floorPassing から除外、exploration は topK 残余から）。
 */
export function selectForScoring(
  candidates: Candidate[],
  params: PrerankParams,
  rng: () => number = Math.random,
  now: number = Date.now(),
): SelectResult {
  const safeguard: SelectedItem[] = [];
  const floorPassing: PriorCandidate[] = [];
  const pruned: PrunedItem[] = [];
  let anomalies = 0;

  for (const candidate of candidates) {
    const hints = computeHints(candidate.tweet, now);
    const isAiOfficial = isAiOfficialSource(candidate, params.aiOfficialHandles);
    const prior = computePrior(hints, candidate.discovery.via, params);
    if (!Number.isFinite(new Date(candidate.tweet.createdAt).getTime())) anomalies += 1;

    if (isAiOfficial) {
      // safeguard: 速報一次＝上澄み中核を無条件 fine-score（floor も評価しない）。
      safeguard.push({ candidate, pool: "safeguard", prior });
      continue;
    }
    const floorReason = computeFloorReason(candidate.tweet, hints, isAiOfficial, params);
    if (floorReason) {
      pruned.push({ candidate, reason: floorReason, prior });
      continue;
    }
    floorPassing.push({ candidate, prior });
  }

  // topK: floor 通過・非 safeguard を prior 降順で上位 K。
  const sorted = [...floorPassing].sort((a, b) => b.prior - a.prior);
  const topK = sorted.slice(0, Math.max(params.shortlistTopK, 0));
  const topKIds = new Set(topK.map((t) => t.candidate.tweet.id));
  const remaining = sorted.filter((t) => !topKIds.has(t.candidate.tweet.id));

  // exploration: 残余から via 層化ランダム E 件。
  const exploration = stratifiedSample(remaining, params.explorationQuota, rng);
  const exploreIds = new Set(exploration.map((e) => e.candidate.tweet.id));

  // 残余で exploration に選ばれなかったものは pruned（below_shortlist）。
  for (const r of remaining) {
    if (!exploreIds.has(r.candidate.tweet.id)) {
      pruned.push({ candidate: r.candidate, reason: "below_shortlist", prior: r.prior });
    }
  }

  const selected: SelectedItem[] = [
    ...safeguard,
    ...topK.map((t) => ({ candidate: t.candidate, pool: "topK" as const, prior: t.prior })),
    ...exploration.map((e) => ({ candidate: e.candidate, pool: "exploration" as const, prior: e.prior })),
  ];

  return {
    selected,
    pruned,
    anomalies,
    poolCounts: {
      safeguard: safeguard.length,
      topK: topK.length,
      exploration: exploration.length,
    },
  };
}

/** 同順位は平均ランク（ties 対応）。 */
function averageRanks(values: number[]): number[] {
  const idx = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(values.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1].v === idx[i].v) j += 1;
    const avg = (i + j) / 2 + 1; // 1-indexed 平均ランク
    for (let k = i; k <= j; k++) ranks[idx[k].i] = avg;
    i = j + 1;
  }
  return ranks;
}

/** Spearman 順位相関（prior vs fine overall の単調一致。n<2 は null）。 */
export function spearmanRho(pairs: Array<{ a: number; b: number }>): number | null {
  const n = pairs.length;
  if (n < 2) return null;
  const ra = averageRanks(pairs.map((p) => p.a));
  const rb = averageRanks(pairs.map((p) => p.b));
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    const d = ra[i] - rb[i];
    sumSq += d * d;
  }
  return 1 - (6 * sumSq) / (n * (n * n - 1));
}
