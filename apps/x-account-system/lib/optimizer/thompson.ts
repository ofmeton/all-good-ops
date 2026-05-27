/**
 * Thompson Sampling — Beta / Dirichlet / Discrete sampler + posterior 更新
 *
 * SSoT: outputs/improvements/x-account-design-consolidated/initial-values-design.md §3
 *
 * Sampler は依存なし純 JS で実装する (test 再現性のため seedable PRNG を内蔵)。
 */

import type {
  ParameterPosterior,
  DistType,
} from "./types.ts";

// ---------------------------------------------------------------------------
// 1. seedable PRNG (Mulberry32) — test 再現性のために使う
// ---------------------------------------------------------------------------

export class SeededRng {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  /** [0, 1) を返す */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

/** デフォルトは Math.random — seed を渡せば deterministic */
function rngFn(rng?: SeededRng): () => number {
  return rng ? () => rng.next() : Math.random;
}

// ---------------------------------------------------------------------------
// 2. Gamma sampler (Marsaglia–Tsang) — Beta / Dirichlet の構成要素
//    shape > 0, scale > 0 を仮定。shape < 1 の場合は補正済み。
// ---------------------------------------------------------------------------

function sampleGamma(shape: number, scale = 1, rng?: SeededRng): number {
  const r = rngFn(rng);
  if (shape < 1) {
    // Marsaglia–Tsang boost: G(shape) = G(shape+1) * U^(1/shape)
    return sampleGamma(shape + 1, scale, rng) * Math.pow(r(), 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  // Box–Muller for standard normal
  function randn(): number {
    const u1 = Math.max(r(), 1e-12);
    const u2 = r();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  for (let safety = 0; safety < 1000; safety++) {
    let x = randn();
    let v = 1 + c * x;
    while (v <= 0) {
      x = randn();
      v = 1 + c * x;
    }
    v = v * v * v;
    const u = r();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v * scale;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v * scale;
    }
  }
  // 異常時 fallback (mean = shape * scale)
  return shape * scale;
}

// ---------------------------------------------------------------------------
// 3. Beta / Dirichlet / Discrete sampler
// ---------------------------------------------------------------------------

/** Beta(alpha, beta) ~ X / (X+Y), X~Gamma(alpha), Y~Gamma(beta) */
export function sampleBeta(alpha: number, beta: number, rng?: SeededRng): number {
  if (alpha <= 0 || beta <= 0) {
    throw new Error(`sampleBeta: alpha/beta must be > 0, got (${alpha},${beta})`);
  }
  const x = sampleGamma(alpha, 1, rng);
  const y = sampleGamma(beta, 1, rng);
  const denom = x + y;
  if (denom <= 0) return 0.5;
  const v = x / denom;
  if (!Number.isFinite(v)) return alpha / (alpha + beta);
  return v;
}

/** Dirichlet(alphas) ~ (X_i / sum X_i), X_i ~ Gamma(alpha_i) */
export function sampleDirichlet(alphas: number[], rng?: SeededRng): number[] {
  if (alphas.length === 0) return [];
  for (const a of alphas) {
    if (a <= 0) {
      throw new Error(`sampleDirichlet: all alphas must be > 0, got ${a}`);
    }
  }
  const xs = alphas.map((a) => sampleGamma(a, 1, rng));
  const s = xs.reduce((acc, v) => acc + v, 0);
  if (s <= 0) return alphas.map(() => 1 / alphas.length);
  return xs.map((x) => x / s);
}

/** カテゴリカル sampler — weights は非負、和は >0 */
export function sampleDiscrete(weights: number[], rng?: SeededRng): number {
  const r = rngFn(rng);
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (total <= 0) return 0;
  let pick = r() * total;
  for (let i = 0; i < weights.length; i++) {
    pick -= Math.max(0, weights[i]);
    if (pick <= 0) return i;
  }
  return weights.length - 1;
}

// ---------------------------------------------------------------------------
// 4. Posterior の sampling 統一 entry point
// ---------------------------------------------------------------------------

/**
 * ParameterPosterior 1 件から sample を取り出す。
 *
 * - beta: number を 1 つ返す
 * - dirichlet: number[] を返す (length = alphas.length)
 * - discrete: index (number) を返す
 */
export function samplePosterior(
  posterior: ParameterPosterior,
  rng?: SeededRng,
): number | number[] {
  if (posterior.meta?.thompsonExempt) {
    // Thompson 適用外: 中心値 (alpha/(alpha+beta) または重み正規化) を返す
    return centralValue(posterior);
  }
  switch (posterior.distType) {
    case "beta": {
      const a = num(posterior.params.alpha);
      const b = num(posterior.params.beta);
      return sampleBeta(a, b, rng);
    }
    case "dirichlet": {
      const alphas = arr(posterior.params.alphas);
      return sampleDirichlet(alphas, rng);
    }
    case "discrete": {
      const weights = arr(posterior.params.weights);
      return sampleDiscrete(weights, rng);
    }
  }
}

/** Thompson 適用外時に使う中心値 */
function centralValue(posterior: ParameterPosterior): number | number[] {
  switch (posterior.distType) {
    case "beta": {
      const a = num(posterior.params.alpha);
      const b = num(posterior.params.beta);
      return a / (a + b);
    }
    case "dirichlet": {
      const alphas = arr(posterior.params.alphas);
      const s = alphas.reduce((acc, v) => acc + v, 0);
      return s > 0 ? alphas.map((x) => x / s) : alphas.map(() => 1 / alphas.length);
    }
    case "discrete": {
      const weights = arr(posterior.params.weights);
      const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
      return total > 0 ? weights.findIndex((w) => w === Math.max(...weights)) : 0;
    }
  }
}

// ---------------------------------------------------------------------------
// 5. Posterior 更新 (success/failure or observation)
// ---------------------------------------------------------------------------

/** Beta(α, β) → Beta(α + 1 if success, β + 1 if failure) */
export function updateBeta(
  posterior: ParameterPosterior,
  success: boolean,
): ParameterPosterior {
  if (posterior.distType !== "beta") {
    throw new Error(`updateBeta requires distType=beta, got ${posterior.distType}`);
  }
  if (posterior.meta?.thompsonExempt) return posterior;
  const a = num(posterior.params.alpha) + (success ? 1 : 0);
  const b = num(posterior.params.beta) + (success ? 0 : 1);
  const successCount = (posterior.meta?.successCount ?? 0) + (success ? 1 : 0);
  const failureCount = (posterior.meta?.failureCount ?? 0) + (success ? 0 : 1);
  return {
    ...posterior,
    params: { ...posterior.params, alpha: a, beta: b },
    meta: {
      ...(posterior.meta ?? {}),
      successCount,
      failureCount,
      confidence: confidenceOfBeta(a, b),
    },
  };
}

/** Dirichlet(α) → Dirichlet(α with α_i += 1 at observedIndex) */
export function updateDirichlet(
  posterior: ParameterPosterior,
  observedIndex: number,
): ParameterPosterior {
  if (posterior.distType !== "dirichlet") {
    throw new Error(
      `updateDirichlet requires distType=dirichlet, got ${posterior.distType}`,
    );
  }
  if (posterior.meta?.thompsonExempt) return posterior;
  const alphas = arr(posterior.params.alphas).slice();
  if (observedIndex < 0 || observedIndex >= alphas.length) {
    return posterior;
  }
  alphas[observedIndex] += 1;
  return {
    ...posterior,
    params: { ...posterior.params, alphas },
    meta: {
      ...(posterior.meta ?? {}),
      successCount: (posterior.meta?.successCount ?? 0) + 1,
    },
  };
}

/**
 * Discrete weights 更新 (observed index の重みに success/failure を加える)。
 */
export function updateDiscrete(
  posterior: ParameterPosterior,
  observedIndex: number,
  success: boolean,
): ParameterPosterior {
  if (posterior.distType !== "discrete") {
    throw new Error(
      `updateDiscrete requires distType=discrete, got ${posterior.distType}`,
    );
  }
  if (posterior.meta?.thompsonExempt) return posterior;
  const weights = arr(posterior.params.weights).slice();
  if (observedIndex < 0 || observedIndex >= weights.length) return posterior;
  weights[observedIndex] += success ? 1 : 0.2;
  return {
    ...posterior,
    params: { ...posterior.params, weights },
    meta: {
      ...(posterior.meta ?? {}),
      successCount: (posterior.meta?.successCount ?? 0) + (success ? 1 : 0),
      failureCount: (posterior.meta?.failureCount ?? 0) + (success ? 0 : 1),
    },
  };
}

// ---------------------------------------------------------------------------
// 6. helpers
// ---------------------------------------------------------------------------

function num(x: number | number[] | undefined): number {
  if (typeof x !== "number" || !Number.isFinite(x)) {
    throw new Error(`expected number, got ${JSON.stringify(x)}`);
  }
  return x;
}

function arr(x: number | number[] | undefined): number[] {
  if (!Array.isArray(x)) {
    throw new Error(`expected number[], got ${JSON.stringify(x)}`);
  }
  return x;
}

/**
 * Beta(a, b) の concentration からおおまかな confidence score を計算。
 * (a+b が増えるほど 1 に近づく単調関数)
 *
 * confidence ≥ 0.85 で「winner/loser 分離」と判定する用途。
 */
export function confidenceOfBeta(alpha: number, beta: number): number {
  const n = alpha + beta;
  if (n <= 0) return 0;
  // 1 - 1/(1 + log(n)/2) 形式で N に応じて飽和 (n=2→0, n=20→0.6, n=200→0.84, n=600→0.91)
  return 1 - 1 / (1 + Math.log(n) / 2);
}

/** Dirichlet alphas の concentration → 単一カテゴリ winner confidence */
export function confidenceOfDirichlet(alphas: number[]): number {
  if (alphas.length === 0) return 0;
  const n = alphas.reduce((s, a) => s + a, 0);
  return 1 - 1 / (1 + Math.log(n) / 2);
}

// re-export distType for downstream module
export type { DistType };
