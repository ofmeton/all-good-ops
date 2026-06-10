process.env.IN_MEMORY_FALLBACK = "true";

import { resolvePosterior, clipToGuard, setBetaMean, applyTierT } from "./tier-t.ts";
import type { OptimizerState, ParameterPosterior } from "../optimizer/types.ts";

function beta(paramId: string, alpha: number, b: number): ParameterPosterior {
  return { paramId, distType: "beta", params: { alpha, beta: b } };
}

function fakeState(): OptimizerState {
  return {
    generation: 0, updatedAt: "2026-06-10T00:00:00Z", styleGuideVersion: "v10.3",
    postingTime: {
      morning: beta("posting_time_morning", 2, 8), noon: beta("posting_time_noon", 2, 8),
      afternoon: beta("posting_time_afternoon", 2, 8), evening: beta("posting_time_evening", 2, 8),
      midnight: beta("posting_time_midnight", 2, 8),
    },
    hookDistribution: {
      number_lead: beta("hook_number_lead", 1, 9), negation_lead: beta("hook_negation_lead", 1, 9),
      question_lead: beta("hook_question_lead", 1, 9), emotion_lead: beta("hook_emotion_lead", 1, 9),
      authority_lead: beta("hook_authority_lead", 1, 9), promise_lead: beta("hook_promise_lead", 1, 9),
      other: beta("hook_other", 1, 9),
      failure_story_verified_cap_per_month: beta("hook_failure_story_verified_cap_per_month", 1, 9),
    },
    publishingLag: beta("publishing_lag", 1, 1),
    contentAxis: { paramId: "content_axis", distType: "dirichlet", params: { alphas: [1, 2, 3, 4] } },
    citationExplicitRate: beta("citation_explicit_rate", 13, 7),
    xFormatRatio: {
      short: beta("xfmt_short", 5, 5), medium: beta("xfmt_medium", 2, 8),
      long: beta("xfmt_long", 1, 9), thread: beta("xfmt_thread", 1, 9),
    },
    visualizerMode: { paramId: "visualizer_mode", distType: "dirichlet", params: { alphas: [7, 1.5, 1.5] } },
    visualizerImageAiGen: beta("visualizer_image_ai_generated", 0.5, 9.5),
    industrySopRate: beta("industry_sop_rate", 4, 16),
  };
}

describe("resolvePosterior", () => {
  it("posting_time/hook/xfmt の paramId を解決", () => {
    const s = fakeState();
    expect(resolvePosterior(s, "posting_time_evening")).toBe(s.postingTime.evening);
    expect(resolvePosterior(s, "hook_other")).toBe(s.hookDistribution.other);
    expect(resolvePosterior(s, "hook_number_lead")).toBe(s.hookDistribution.number_lead);
    expect(resolvePosterior(s, "xfmt_thread")).toBe(s.xFormatRatio.thread);
  });
  it("未知 paramId は null", () => {
    expect(resolvePosterior(fakeState(), "nope")).toBeNull();
  });
});

describe("clipToGuard", () => {
  it("posting_time は 0.05〜0.40 に clip", () => {
    expect(clipToGuard("posting_time_evening", 0.9)).toBe(0.4);
    expect(clipToGuard("posting_time_evening", 0.01)).toBe(0.05);
    expect(clipToGuard("posting_time_evening", 0.28)).toBe(0.28);
  });
  it("xfmt_short は 0.30〜0.60 に clip", () => {
    expect(clipToGuard("xfmt_short", 0.9)).toBe(0.6);
  });
});

describe("setBetaMean", () => {
  it("strength(alpha+beta) を保ったまま target mean に再パラメータ化", () => {
    const post = beta("posting_time_evening", 2, 8); // strength 10, mean 0.2
    const { before, after } = setBetaMean(post, 0.3);
    expect(before).toEqual({ alpha: 2, beta: 8 });
    expect(post.params.alpha).toBeCloseTo(3, 5);
    expect(post.params.beta).toBeCloseTo(7, 5);
    expect(after).toEqual({ alpha: post.params.alpha, beta: post.params.beta });
  });
});

describe("applyTierT", () => {
  it("snapshot→guard clip→Beta mean 適用、snapshotId を返す", async () => {
    let saved: OptimizerState | null = null;
    const deps = {
      loadOptimizerState: async () => fakeState(),
      saveOptimizerState: async (s: OptimizerState) => { saved = s; },
      snapshotState: async () => ({ snapshotId: "snap_test_1" }),
    };
    const r = await applyTierT({ paramId: "posting_time_evening", value: 0.9 }, deps);
    expect(r.snapshotId).toBe("snap_test_1");
    expect(r.paramId).toBe("posting_time_evening");
    // 0.9 → clip 0.40。strength 10 → alpha 4 / beta 6
    expect((saved!.postingTime.evening.params.alpha as number)).toBeCloseTo(4, 5);
    expect((saved!.postingTime.evening.params.beta as number)).toBeCloseTo(6, 5);
  });
  it("未知 paramId は throw", async () => {
    const deps = { loadOptimizerState: async () => fakeState(), saveOptimizerState: async () => {}, snapshotState: async () => ({ snapshotId: "x" }) };
    await expect(applyTierT({ paramId: "nope", value: 0.2 }, deps)).rejects.toThrow(/unknown tier-T paramId/);
  });
});
