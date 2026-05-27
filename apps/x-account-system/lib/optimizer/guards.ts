/**
 * §8.3 死守 ガード + §8.4 自由パラメータ範囲 clip
 *
 * SSoT: outputs/improvements/x-account-design-consolidated/initial-values-design.md §8.3 / §8.4
 *
 * §8.3 死守 (Optimizer が動かしてはいけない):
 *   - verified failure_story 月 ≤ 4 上限 (cap)
 *   - first_hand (primary_info) ≥ 30%
 *   - industry_sop 月 ≥ 5 投稿 (target 6 = 月 20%)
 *   - hashtag 0 個/投稿 (完全固定)
 *   - AI 生成画像 ≤ 10%
 *
 * §8.4 自由 (Optimizer が optimize する) のレンジ:
 *   - 時間帯比率: 各 band 5-40%, 合計 100%
 *   - Hook 配分 (failure_story 除外): 各 5-30%, 合計 100%
 *   - format 比率: 短文 30-60%, 中文 15-35%, 長文 5-20%, スレッド 5-20%, 合計 95-100% (スレッド 5% 弾性)
 *   - Visualizer 比率: image 50-80%, video 5-25%, text 10-20%, 合計 100%
 *
 * applyGuards は state.* を sample 後 hard-clip する形ではなく、
 * 「current state の posterior が範囲外に逸脱したら hard-clip する」設計。
 * (posterior が更新で範囲外に出るのは数十回観測後にあり得る)
 *
 * sample 値 (Sampler が返す具体的な ratio) を範囲内に閉じ込めるユーティリティとして
 * clipSampledRatios も export する。
 */

import type {
  GuardRule,
  OptimizerState,
  ParameterPosterior,
} from "./types.ts";

// ---------------------------------------------------------------------------
// 1. §8.3 死守 + §8.4 自由 ルール表
// ---------------------------------------------------------------------------

export const GUARD_RULES: GuardRule[] = [
  // §8.3 死守
  {
    paramId: "hook_failure_story_verified_cap_per_month",
    monthlyCap: 4,
    upperBound: 4 / 30,
    note: "verified failure_story 月 ≤ 4 投稿 cap (initial-values §8.3)",
  },
  {
    paramId: "content_axis.first_hand",
    lowerBound: 0.3,
    note: "first_hand (primary_info) ≥ 30% (initial-values §8.3)",
  },
  {
    paramId: "industry_sop_rate",
    lowerBound: 5 / 30, // 月 5 投稿 (lower bound) 〜 月 6 投稿 (target)
    note: "industry_sop 月 ≥ 5 投稿 (target 6 = 月 20%) (initial-values §8.3)",
  },
  {
    paramId: "hashtag_count",
    fixedValue: 0,
    note: "hashtag 0 個/投稿 完全固定 (initial-values §8.3)",
  },
  {
    paramId: "visualizer_image_ai_generated",
    upperBound: 0.1,
    note: "AI 生成画像 ≤ 10% (initial-values §8.3)",
  },
  // §8.4 自由パラメータ範囲
  {
    paramId: "posting_time_morning",
    lowerBound: 0.05,
    upperBound: 0.4,
    note: "時間帯比率 各 5-40% (initial-values §8.4)",
  },
  {
    paramId: "posting_time_noon",
    lowerBound: 0.05,
    upperBound: 0.4,
    note: "時間帯比率 各 5-40% (initial-values §8.4)",
  },
  {
    paramId: "posting_time_afternoon",
    lowerBound: 0.05,
    upperBound: 0.4,
    note: "時間帯比率 各 5-40% (initial-values §8.4)",
  },
  {
    paramId: "posting_time_evening",
    lowerBound: 0.05,
    upperBound: 0.4,
    note: "時間帯比率 各 5-40% (initial-values §8.4)",
  },
  {
    paramId: "posting_time_midnight",
    lowerBound: 0.05,
    upperBound: 0.4,
    note: "時間帯比率 各 5-40% (initial-values §8.4)",
  },
  // Hook 配分 (failure_story 除外、§8.4 5-30%)
  {
    paramId: "hook_number_lead",
    lowerBound: 0.05,
    upperBound: 0.3,
    note: "Hook 5-30% (initial-values §8.4)",
  },
  {
    paramId: "hook_negation_lead",
    lowerBound: 0.05,
    upperBound: 0.3,
    note: "Hook 5-30% (initial-values §8.4)",
  },
  {
    paramId: "hook_question_lead",
    lowerBound: 0.05,
    upperBound: 0.3,
    note: "Hook 5-30% (initial-values §8.4)",
  },
  {
    paramId: "hook_emotion_lead",
    lowerBound: 0.05,
    upperBound: 0.3,
    note: "Hook 5-30% (initial-values §8.4)",
  },
  {
    paramId: "hook_authority_lead",
    lowerBound: 0.05,
    upperBound: 0.3,
    note: "Hook 5-30% (initial-values §8.4)",
  },
  {
    paramId: "hook_promise_lead",
    lowerBound: 0.05,
    upperBound: 0.3,
    note: "Hook 5-30% (initial-values §8.4)",
  },
  {
    paramId: "hook_other",
    lowerBound: 0.05,
    upperBound: 0.3,
    note: "Hook 5-30% (initial-values §8.4)",
  },
  // X format 比率 (§8.4)
  {
    paramId: "xfmt_short",
    lowerBound: 0.3,
    upperBound: 0.6,
    note: "短文 30-60% (initial-values §8.4)",
  },
  {
    paramId: "xfmt_medium",
    lowerBound: 0.15,
    upperBound: 0.35,
    note: "中文 15-35% (initial-values §8.4)",
  },
  {
    paramId: "xfmt_long",
    lowerBound: 0.05,
    upperBound: 0.2,
    note: "長文 5-20% (initial-values §8.4)",
  },
  {
    paramId: "xfmt_thread",
    lowerBound: 0.05,
    upperBound: 0.2,
    note: "スレッド 5-20%、合計 95-100% 弾性 (initial-values §8.4)",
  },
];

// ---------------------------------------------------------------------------
// 2. applyGuards — state の posterior が逸脱したら hard clip
// ---------------------------------------------------------------------------

/**
 * Posterior 自体の mean が clip 範囲外に出た場合に α/β を再調整する。
 *
 * Note: posterior が範囲外でも sample 値は確率的に範囲内になる場合があるが、
 *       長期的に mean が range 外だと sample も range 外に偏るため最終的に clip 必須。
 */
export function applyGuards(state: OptimizerState): {
  state: OptimizerState;
  applied: { paramId: string; before: number; after: number; rule: GuardRule }[];
} {
  const applied: {
    paramId: string;
    before: number;
    after: number;
    rule: GuardRule;
  }[] = [];

  // posting_time 5 band — §8.4
  for (const band of ["morning", "noon", "afternoon", "evening", "midnight"] as const) {
    const p = state.postingTime[band];
    const rule = findRule(`posting_time_${band}`);
    if (rule) {
      const before = betaMean(p);
      const after = clipBetaPosterior(p, rule);
      if (after !== p) {
        state.postingTime[band] = after;
        applied.push({ paramId: p.paramId, before, after: betaMean(after), rule });
      }
    }
  }

  // hook 6 + other — §8.4 (failure_story は除外)
  for (const hk of [
    "number_lead",
    "negation_lead",
    "question_lead",
    "emotion_lead",
    "authority_lead",
    "promise_lead",
    "other",
  ] as const) {
    const p = state.hookDistribution[hk];
    const rule = findRule(`hook_${hk}`);
    if (rule) {
      const before = betaMean(p);
      const after = clipBetaPosterior(p, rule);
      if (after !== p) {
        state.hookDistribution[hk] = after;
        applied.push({ paramId: p.paramId, before, after: betaMean(after), rule });
      }
    }
  }

  // verified failure_story cap (§8.3): mean ≤ 4/30 (= 0.133)
  {
    const p = state.hookDistribution.failure_story_verified_cap_per_month;
    const rule = findRule(p.paramId);
    if (rule) {
      const before = betaMean(p);
      const after = clipBetaPosterior(p, rule);
      if (after !== p) {
        state.hookDistribution.failure_story_verified_cap_per_month = after;
        applied.push({ paramId: p.paramId, before, after: betaMean(after), rule });
      }
    }
  }

  // X format 4 区分 — §8.4
  for (const fmt of ["short", "medium", "long", "thread"] as const) {
    const p = state.xFormatRatio[fmt];
    const rule = findRule(`xfmt_${fmt}`);
    if (rule) {
      const before = betaMean(p);
      const after = clipBetaPosterior(p, rule);
      if (after !== p) {
        state.xFormatRatio[fmt] = after;
        applied.push({ paramId: p.paramId, before, after: betaMean(after), rule });
      }
    }
  }

  // industry_sop §8.3 (≥ 5/30 = 16.6%)
  {
    const p = state.industrySopRate;
    const rule = findRule(p.paramId);
    if (rule) {
      const before = betaMean(p);
      const after = clipBetaPosterior(p, rule);
      if (after !== p) {
        state.industrySopRate = after;
        applied.push({ paramId: p.paramId, before, after: betaMean(after), rule });
      }
    }
  }

  // AI 生成画像 §8.3 (≤ 10%)
  {
    const p = state.visualizerImageAiGen;
    const rule = findRule(p.paramId);
    if (rule) {
      const before = betaMean(p);
      const after = clipBetaPosterior(p, rule);
      if (after !== p) {
        state.visualizerImageAiGen = after;
        applied.push({ paramId: p.paramId, before, after: betaMean(after), rule });
      }
    }
  }

  // content_axis Dirichlet — first_hand ≥ 30% §8.3
  {
    const p = state.contentAxis;
    const alphas = (p.params.alphas as number[]).slice();
    const sum = alphas.reduce((s, v) => s + v, 0);
    if (sum > 0) {
      const ratios = alphas.map((a) => a / sum);
      const firstHandIndex = (p.categories ?? []).indexOf("first_hand");
      const before = firstHandIndex >= 0 ? ratios[firstHandIndex] : 0;
      if (firstHandIndex >= 0 && ratios[firstHandIndex] < 0.3) {
        // pull other alphas down so first_hand ≥ 30%
        const target = 0.3;
        const otherCurrent = 1 - ratios[firstHandIndex];
        const otherTarget = 1 - target;
        // 比率を維持しつつ合計を otherTarget に再正規化
        for (let i = 0; i < alphas.length; i++) {
          if (i === firstHandIndex) continue;
          alphas[i] *= otherTarget / Math.max(otherCurrent, 1e-9);
        }
        // first_hand 側を target に合わせる
        const otherSum = alphas.reduce(
          (s, v, i) => (i === firstHandIndex ? s : s + v),
          0,
        );
        alphas[firstHandIndex] = (otherSum / otherTarget) * target;
        const clipped: ParameterPosterior = {
          ...p,
          params: { ...p.params, alphas },
        };
        state.contentAxis = clipped;
        const rule = findRule("content_axis.first_hand");
        applied.push({
          paramId: "content_axis.first_hand",
          before,
          after: 0.3,
          rule: rule!,
        });
      }
    }
  }

  return { state, applied };
}

// ---------------------------------------------------------------------------
// 3. clipSampledRatios — sample 値 (具体的な比率) を範囲内に閉じ込める
// ---------------------------------------------------------------------------

/**
 * Sample で出た raw ratios を §8.4 範囲内に閉じ込めて再正規化する。
 *
 * @param raw   { paramId: ratio } の組
 * @param sumTarget 1.0 (合計を 1 に丸める) or [0.95, 1.0] (xfmt のスレッド側 5% 弾性)
 */
export function clipSampledRatios(
  raw: Record<string, number>,
  rules: GuardRule[],
  sumTarget = 1.0,
): Record<string, number> {
  const clipped: Record<string, number> = {};
  for (const [paramId, ratio] of Object.entries(raw)) {
    const rule = rules.find((r) => r.paramId === paramId);
    if (!rule) {
      clipped[paramId] = ratio;
      continue;
    }
    let v = ratio;
    if (rule.fixedValue !== undefined) v = rule.fixedValue;
    if (rule.lowerBound !== undefined && v < rule.lowerBound) v = rule.lowerBound;
    if (rule.upperBound !== undefined && v > rule.upperBound) v = rule.upperBound;
    clipped[paramId] = v;
  }
  // 合計再正規化
  const total = Object.values(clipped).reduce((s, v) => s + v, 0);
  if (total > 0 && Math.abs(total - sumTarget) > 1e-6) {
    const scale = sumTarget / total;
    for (const k of Object.keys(clipped)) clipped[k] *= scale;
    // scale 後に再 clip して上限を超えないようにする
    for (const k of Object.keys(clipped)) {
      const r = rules.find((rr) => rr.paramId === k);
      if (r?.upperBound !== undefined && clipped[k] > r.upperBound) {
        clipped[k] = r.upperBound;
      }
      if (r?.lowerBound !== undefined && clipped[k] < r.lowerBound) {
        clipped[k] = r.lowerBound;
      }
    }
  }
  return clipped;
}

/**
 * verified failure_story の月間カウントを 4 で clip。
 * 死守: §8.3 failure_story 月 ≤ 4
 */
export function clipFailureStoryMonthlyCount(observed: number): number {
  return Math.min(observed, 4);
}

// ---------------------------------------------------------------------------
// 4. helpers
// ---------------------------------------------------------------------------

function findRule(paramId: string): GuardRule | undefined {
  return GUARD_RULES.find((r) => r.paramId === paramId);
}

function betaMean(p: ParameterPosterior): number {
  if (p.distType !== "beta") return 0;
  const a = p.params.alpha as number;
  const b = p.params.beta as number;
  if (a + b <= 0) return 0;
  return a / (a + b);
}

function clipBetaPosterior(
  p: ParameterPosterior,
  rule: GuardRule,
): ParameterPosterior {
  const a = p.params.alpha as number;
  const b = p.params.beta as number;
  const total = a + b;
  if (total <= 0) return p;
  let mean = a / total;
  let changed = false;
  if (rule.fixedValue !== undefined) {
    mean = rule.fixedValue;
    changed = true;
  }
  if (rule.lowerBound !== undefined && mean < rule.lowerBound) {
    mean = rule.lowerBound;
    changed = true;
  }
  if (rule.upperBound !== undefined && mean > rule.upperBound) {
    mean = rule.upperBound;
    changed = true;
  }
  if (!changed) return p;
  // 同じ concentration (a+b) を保ったまま mean を mean' に変える
  // a' = mean' * total, b' = (1-mean') * total
  const newAlpha = Math.max(mean * total, 0.01);
  const newBeta = Math.max((1 - mean) * total, 0.01);
  return {
    ...p,
    params: { ...p.params, alpha: newAlpha, beta: newBeta },
    meta: {
      ...(p.meta ?? {}),
      guardLocked: true,
      note: `${p.meta?.note ?? ""} | clipped by guard (${rule.note})`.trim(),
    },
  };
}
