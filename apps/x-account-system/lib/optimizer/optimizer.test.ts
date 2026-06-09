/**
 * Optimizer (Thompson Sampling) tests — PR-C
 *
 * 5 fixtures:
 *   01_initial_values         — buildInitialState() が initial-values §8.1 採用初期値と一致
 *   02_30_posts_posterior     — 30 投稿で morning band posterior が上昇
 *   03_60_posts_winner        — 60 投稿で winner/loser 分離 (confidence ≥ 0.85)
 *   04_anomaly_rollback       — PCR -30% で rollback 発火
 *   05_guard_clip             — 死守 (failure_story 6→4 / first_hand 25%→30% / AI image 25%→10% / industry_sop 10%→16.6%)
 */
import fs from "node:fs";
import path from "node:path";

// Top-level jest.mock: state-store / reward-extractor を auto-mock 化
jest.mock("./state-store.ts");
jest.mock("./reward-extractor.ts");

process.env.IN_MEMORY_FALLBACK = "true";

import { applyGuards, clipFailureStoryMonthlyCount } from "./guards.ts";
import {
  SeededRng,
  confidenceOfBeta,
  sampleBeta,
  sampleDirichlet,
  sampleDiscrete,
  updateBeta,
  updateDirichlet,
} from "./thompson.ts";
import { buildInitialState } from "./state-store.ts";
import { applySignalsToState, runOptimizerUpdate } from "./update-loop.ts";
import type { OptimizerState, SuccessSignal } from "./types.ts";

const FIXTURES_DIR = path.join(__dirname, "__fixtures__");

// state-store / reward-extractor の mock を inject
const stateStoreMock = jest.requireMock("./state-store.ts") as typeof import(
  "./__mocks__/state-store.ts"
);
const rewardMock = jest.requireMock("./reward-extractor.ts") as typeof import(
  "./__mocks__/reward-extractor.ts"
);

function loadFixture(name: string): any {
  return JSON.parse(
    fs.readFileSync(path.join(FIXTURES_DIR, `${name}.json`), "utf-8"),
  );
}

function betaMean(alpha: number, beta: number): number {
  return alpha / (alpha + beta);
}

function buildSignal(overrides: Partial<SuccessSignal> = {}): SuccessSignal {
  return {
    draftId: `d_${Math.random().toString(36).slice(2, 8)}`,
    postedAt: new Date(),
    impression: 1000,
    pcr: 0.05,
    urlLinkClicks: 5,
    attribution: {
      timeBand: "morning",
      hook: "number_lead",
      contentAxisIndex: 3,
      xFormat: "short",
      visualizerIndex: 0,
      isIndustrySop: false,
      isFailureStoryVerified: false,
    },
    success: true,
    ...overrides,
  };
}

beforeEach(() => {
  stateStoreMock.__resetMockState();
  rewardMock.__resetMockSignals();
});

// ---------------------------------------------------------------------------
// Fixture 01 — 初期値
// ---------------------------------------------------------------------------

describe("01_initial_values", () => {
  const f = loadFixture("01_initial_values");

  test("buildInitialState produces SSOT-conformant priors (§8.1)", () => {
    const s = buildInitialState(new Date("2026-06-01"));
    expect(s.styleGuideVersion).toBe(f.expected.styleGuideVersion);

    // posting_time band Beta means in range
    expect(
      betaMean(
        s.postingTime.morning.params.alpha as number,
        s.postingTime.morning.params.beta as number,
      ),
    ).toBeGreaterThanOrEqual(f.expected.postingTime.morning_mean[0]);
    expect(
      betaMean(
        s.postingTime.morning.params.alpha as number,
        s.postingTime.morning.params.beta as number,
      ),
    ).toBeLessThanOrEqual(f.expected.postingTime.morning_mean[1]);

    // verified failure_story は Thompson 適用外
    expect(
      s.hookDistribution.failure_story_verified_cap_per_month.meta?.thompsonExempt,
    ).toBe(true);
    const fsAlpha =
      s.hookDistribution.failure_story_verified_cap_per_month.params.alpha;
    const fsBeta =
      s.hookDistribution.failure_story_verified_cap_per_month.params.beta;
    expect(fsAlpha).toBe(f.expected.hookDistribution.failure_story_cap_alpha_beta[0]);
    expect(fsBeta).toBe(f.expected.hookDistribution.failure_story_cap_alpha_beta[1]);

    // content axis Dirichlet alphas
    expect(s.contentAxis.params.alphas).toEqual(
      f.expected.contentAxis_dirichlet_alphas,
    );

    // citation_explicit_rate mean ~ 65%
    const citMean = betaMean(
      s.citationExplicitRate.params.alpha as number,
      s.citationExplicitRate.params.beta as number,
    );
    expect(citMean).toBeGreaterThanOrEqual(f.expected.citationExplicitRate_mean[0]);
    expect(citMean).toBeLessThanOrEqual(f.expected.citationExplicitRate_mean[1]);

    // X format Beta(2,8) 弱 prior
    expect(s.xFormatRatio.short.params.alpha).toBe(2);
    expect(s.xFormatRatio.short.params.beta).toBe(8);
    expect(s.xFormatRatio.thread.params.alpha).toBe(2);
    expect(s.xFormatRatio.thread.params.beta).toBe(8);

    // visualizer Dirichlet alphas = (7, 1.5, 1.5)
    expect(s.visualizerMode.params.alphas).toEqual(
      f.expected.visualizerMode_alphas,
    );
    // AI 生成画像 (Beta(0.5, 9.5)) mean ≤ 10%
    const aiMean = betaMean(
      s.visualizerImageAiGen.params.alpha as number,
      s.visualizerImageAiGen.params.beta as number,
    );
    expect(aiMean).toBeLessThanOrEqual(f.expected.visualizerImageAiGen_mean[1]);

    // industry_sop Beta(4, 16) → mean 20%
    const sopMean = betaMean(
      s.industrySopRate.params.alpha as number,
      s.industrySopRate.params.beta as number,
    );
    expect(sopMean).toBeGreaterThanOrEqual(f.expected.industrySopRate_mean[0]);
    expect(sopMean).toBeLessThanOrEqual(f.expected.industrySopRate_mean[1]);
  });
});

// ---------------------------------------------------------------------------
// Fixture 02 — 30 投稿 posterior 更新
// ---------------------------------------------------------------------------

describe("02_30_posts_posterior", () => {
  const f = loadFixture("02_30_posts_posterior");

  test("30 success signals lift morning band Beta posterior", () => {
    const state = buildInitialState(new Date("2026-06-01"));
    const morningBeforeMean = betaMean(
      state.postingTime.morning.params.alpha as number,
      state.postingTime.morning.params.beta as number,
    );

    const signals: SuccessSignal[] = [];
    for (let i = 0; i < f.totalSignals; i++) {
      const isMorning = i < f.signalsTemplate.successCount;
      signals.push(
        buildSignal({
          attribution: {
            timeBand: isMorning ? "morning" : "afternoon",
            hook: "number_lead",
            contentAxisIndex: 3,
            xFormat: "short",
            visualizerIndex: 0,
            isIndustrySop: false,
            isFailureStoryVerified: false,
          },
          success: isMorning,
        }),
      );
    }

    const { state: after } = applySignalsToState(state, signals);
    const morningAfterMean = betaMean(
      after.postingTime.morning.params.alpha as number,
      after.postingTime.morning.params.beta as number,
    );

    expect(morningAfterMean).toBeGreaterThan(morningBeforeMean);
    expect(after.postingTime.morning.params.alpha).toBeGreaterThanOrEqual(
      f.expected.morning_alpha_at_least,
    );
    // number_lead は 30 件中 success 9 / failure 21 で alpha も増える
    expect(after.hookDistribution.number_lead.params.alpha).toBeGreaterThanOrEqual(
      f.expected.number_lead_alpha_at_least,
    );
  });
});

// ---------------------------------------------------------------------------
// Fixture 03 — 60 投稿で winner 分離
// ---------------------------------------------------------------------------

describe("03_60_posts_winner", () => {
  const f = loadFixture("03_60_posts_winner");

  test("60 signals separates number_lead winner from emotion_lead loser", () => {
    let state = buildInitialState(new Date("2026-06-01"));

    // number_lead: 40 success / 5 failure
    for (let i = 0; i < 40; i++) {
      state.hookDistribution.number_lead = updateBeta(
        state.hookDistribution.number_lead,
        true,
      );
    }
    for (let i = 0; i < 5; i++) {
      state.hookDistribution.number_lead = updateBeta(
        state.hookDistribution.number_lead,
        false,
      );
    }
    // emotion_lead: 5 success / 10 failure
    for (let i = 0; i < 5; i++) {
      state.hookDistribution.emotion_lead = updateBeta(
        state.hookDistribution.emotion_lead,
        true,
      );
    }
    for (let i = 0; i < 10; i++) {
      state.hookDistribution.emotion_lead = updateBeta(
        state.hookDistribution.emotion_lead,
        false,
      );
    }

    const numA = state.hookDistribution.number_lead.params.alpha as number;
    const numB = state.hookDistribution.number_lead.params.beta as number;
    const emoA = state.hookDistribution.emotion_lead.params.alpha as number;
    const emoB = state.hookDistribution.emotion_lead.params.beta as number;

    expect(confidenceOfBeta(numA, numB)).toBeGreaterThanOrEqual(
      f.expected.number_lead_confidence_at_least,
    );
    expect(betaMean(numA, numB)).toBeGreaterThanOrEqual(
      f.expected.number_lead_mean_at_least,
    );
    expect(betaMean(emoA, emoB)).toBeLessThanOrEqual(
      f.expected.emotion_lead_mean_at_most,
    );
  });
});

// ---------------------------------------------------------------------------
// Fixture 04 — anomaly rollback
// ---------------------------------------------------------------------------

describe("04_anomaly_rollback", () => {
  const f = loadFixture("04_anomaly_rollback");

  test("PCR -30% in 7d triggers rollback", async () => {
    const now = new Date("2026-08-01");
    // mock 化された state-store + reward-extractor を使う
    rewardMock.__setMockWindowPerf(f.windowPerf);
    rewardMock.__setMockSignals([
      buildSignal({ postedAt: new Date("2026-07-25") }),
    ]);
    stateStoreMock.__forceState(buildInitialState(now));

    const result = await runOptimizerUpdate(now);

    expect(result.rolledBack).toBe(true);
    expect(result.anomalyReasons).toContain(
      f.expected.anomalyReasonsContains[0],
    );
  });
});

// ---------------------------------------------------------------------------
// Fixture 05 — 死守 ガード clip
// ---------------------------------------------------------------------------

describe("05_guard_clip", () => {
  const f = loadFixture("05_guard_clip");

  test("failure_story monthly cap clips 6→4", () => {
    expect(clipFailureStoryMonthlyCount(6)).toBe(
      f.expected.failureStoryClippedCount,
    );
    expect(clipFailureStoryMonthlyCount(2)).toBe(2);
  });

  test("first_hand < 30% → clip to 30%", () => {
    const state = buildInitialState(new Date("2026-06-01"));
    // content axis を first_hand 比率 25% 相当に上書き
    state.contentAxis.params = {
      alphas: f.preState_overrides.contentAxis_alphas,
    };
    const { state: clipped, applied } = applyGuards(state);
    const alphas = clipped.contentAxis.params.alphas as number[];
    const sum = alphas.reduce((s, v) => s + v, 0);
    const firstHandIdx =
      (clipped.contentAxis.categories ?? []).indexOf("first_hand");
    const firstHandRatio = alphas[firstHandIdx] / sum;

    expect(firstHandRatio).toBeGreaterThanOrEqual(f.expected.first_hand_mean_at_least);
    expect(applied.find((a) => a.paramId === "content_axis.first_hand")).toBeDefined();
  });

  test("AI generated image > 10% → clip to ≤ 10%", () => {
    const state = buildInitialState(new Date("2026-06-01"));
    state.visualizerImageAiGen.params = {
      alpha: f.preState_overrides.visualizerImageAiGen_alpha_beta[0],
      beta: f.preState_overrides.visualizerImageAiGen_alpha_beta[1],
    };
    const { state: clipped } = applyGuards(state);
    const a = clipped.visualizerImageAiGen.params.alpha as number;
    const b = clipped.visualizerImageAiGen.params.beta as number;
    expect(betaMean(a, b)).toBeLessThanOrEqual(
      f.expected.visualizerImageAiGen_mean_at_most + 1e-6,
    );
  });

  test("industry_sop < 16.6% → clip up to 5/30", () => {
    const state = buildInitialState(new Date("2026-06-01"));
    state.industrySopRate.params = {
      alpha: f.preState_overrides.industrySopRate_alpha_beta[0],
      beta: f.preState_overrides.industrySopRate_alpha_beta[1],
    };
    const { state: clipped } = applyGuards(state);
    const a = clipped.industrySopRate.params.alpha as number;
    const b = clipped.industrySopRate.params.beta as number;
    expect(betaMean(a, b)).toBeGreaterThanOrEqual(
      f.expected.industrySopRate_mean_at_least - 1e-6,
    );
  });
});

// ---------------------------------------------------------------------------
// Stage 2A — 本質3レバーのみ学習 / 残り5本は凍結
// ---------------------------------------------------------------------------

describe("stage2a_frozen_levers", () => {
  test("runOptimizerUpdate learns time/hook/format, freezes content_axis/visualizer/industry_sop", async () => {
    const now = new Date("2026-06-15");
    const before = buildInitialState(now);
    stateStoreMock.__forceState(buildInitialState(now));
    // benign window (no anomaly rollback)
    rewardMock.__setMockWindowPerf({
      currentAvgPcr: 0.05,
      prevAvgPcr: 0.05,
      currentAvgImpression: 1000,
      prevAvgImpression: 1000,
    });
    // 5 success signals: morning / number_lead / short / first_hand(3) / visualizer video(1) / industry_sop
    rewardMock.__setMockSignals(
      Array.from({ length: 5 }, () =>
        buildSignal({
          attribution: {
            timeBand: "morning",
            hook: "number_lead",
            contentAxisIndex: 3,
            xFormat: "short",
            visualizerIndex: 1,
            isIndustrySop: true,
            isFailureStoryVerified: false,
          },
          success: true,
        }),
      ),
    );

    const { after } = await runOptimizerUpdate(now);

    // 握る3本: posterior が動く
    expect(after.postingTime.morning.params.alpha).toBeGreaterThan(
      before.postingTime.morning.params.alpha as number,
    );
    expect(after.hookDistribution.number_lead.params.alpha).toBeGreaterThan(
      before.hookDistribution.number_lead.params.alpha as number,
    );
    expect(after.xFormatRatio.short.params.alpha).toBeGreaterThan(
      before.xFormatRatio.short.params.alpha as number,
    );

    // 据え置き5本: 初期値のまま凍結（学習しない）
    expect(after.contentAxis.params.alphas).toEqual(before.contentAxis.params.alphas);
    expect(after.visualizerMode.params.alphas).toEqual(
      before.visualizerMode.params.alphas,
    );
    expect(after.industrySopRate.params).toEqual(before.industrySopRate.params);
  });
});

// ---------------------------------------------------------------------------
// Sampler 単体テスト (seedable PRNG で deterministic)
// ---------------------------------------------------------------------------

describe("sampler primitives", () => {
  test("sampleBeta in [0, 1] for many trials", () => {
    const rng = new SeededRng(42);
    for (let i = 0; i < 500; i++) {
      const v = sampleBeta(2, 8, rng);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  test("sampleDirichlet sums to ~1", () => {
    const rng = new SeededRng(7);
    for (let i = 0; i < 100; i++) {
      const xs = sampleDirichlet([1, 2, 3, 4], rng);
      const s = xs.reduce((acc, v) => acc + v, 0);
      expect(Math.abs(s - 1)).toBeLessThan(1e-6);
      expect(xs.length).toBe(4);
    }
  });

  test("sampleDiscrete returns valid index", () => {
    const rng = new SeededRng(13);
    const counts = [0, 0, 0];
    for (let i = 0; i < 600; i++) {
      const idx = sampleDiscrete([7, 1.5, 1.5], rng);
      counts[idx] += 1;
    }
    // image (idx 0) が最多になるはず
    expect(counts[0]).toBeGreaterThan(counts[1]);
    expect(counts[0]).toBeGreaterThan(counts[2]);
  });

  test("updateBeta increments alpha on success / beta on failure", () => {
    const initial = {
      paramId: "test",
      distType: "beta" as const,
      params: { alpha: 5, beta: 5 },
    };
    const s = updateBeta(initial, true);
    expect(s.params.alpha).toBe(6);
    expect(s.params.beta).toBe(5);
    const f = updateBeta(initial, false);
    expect(f.params.alpha).toBe(5);
    expect(f.params.beta).toBe(6);
  });

  test("updateBeta is a no-op for thompsonExempt posteriors", () => {
    const exempt = {
      paramId: "test_exempt",
      distType: "beta" as const,
      params: { alpha: 4, beta: 26 },
      meta: { thompsonExempt: true },
    };
    const after = updateBeta(exempt, true);
    expect(after.params.alpha).toBe(4);
    expect(after.params.beta).toBe(26);
  });

  test("updateDirichlet increments observed index", () => {
    const initial = {
      paramId: "axis",
      distType: "dirichlet" as const,
      params: { alphas: [1, 2, 3, 4] },
    };
    const s = updateDirichlet(initial, 3);
    const alphas = s.params.alphas as number[];
    expect(alphas).toEqual([1, 2, 3, 5]);
  });
});
