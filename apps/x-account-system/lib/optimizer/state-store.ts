/**
 * OptimizerState 永続化 + in-memory fallback (Phase 0.5)
 *
 * SSoT 初期値: initial-values-design.md §3 / §8.1
 * Current SSOT (v10.3 + Style Guide v1.3): X format 50/25/10/10-15 + Beta(2,8) prior
 * (v9.2 §2.5 旧設計 60/30/10 は歴史節として initial-values §3.6.2 にのみ存在、運用採用はしない)
 *
 * Phase 0.5: IN_MEMORY_FALLBACK=true で全データを process 内 in-memory map に保存。
 * Phase 1: optimizer_state テーブル (migrations/0006_optimizer_state.sql) に切替予定。
 *
 * snapshot ID は ulid 風の `snap_<ts>_<rand>` 文字列。
 */

import type {
  OptimizerState,
  ParameterPosterior,
} from "./types.ts";

const IN_MEMORY_FALLBACK = process.env.IN_MEMORY_FALLBACK === "true";

// ---------------------------------------------------------------------------
// 1. initial-values §8.1 採用初期値 (Current SSOT v10.3 + Style Guide v1.3)
// ---------------------------------------------------------------------------

/**
 * `buildInitialState(now)` がデフォルト state を構成する。
 *
 * §3 の prior は次のとおり (要約):
 *   - posting_time:     5 band Beta (empirical Bayes, §3.1)
 *   - hooks:            7 軸 Beta (empirical Bayes for N≥5, Beta(1,1) for N<5) + failure_story 月 ≤ 4 (Thompson 適用外)
 *   - publishing_lag:   4 軸 discrete dist
 *   - content_axis:     Dirichlet α=(1,2,3,4)
 *   - citation_explicit_rate: Beta(13, 7) → mean 65%
 *   - x_format_ratio:   4 区分 Beta(2,8) 弱 prior (Current SSOT v10.3)
 *   - visualizer_mode:  Dirichlet α=(7, 1.5, 1.5)
 *   - industry_sop:     Beta(4, 16) → mean 20%
 */
export function buildInitialState(now: Date = new Date()): OptimizerState {
  return {
    generation: 0,
    updatedAt: now.toISOString(),
    styleGuideVersion: "v1.3",
    postingTime: {
      morning: pBeta("posting_time_morning", 3, 7, "30% 採用 (initial-values §3.1)"),
      noon: pBeta("posting_time_noon", 1.5, 8.5, "15% 採用 (§3.1)"),
      afternoon: pBeta("posting_time_afternoon", 3, 7, "30% 採用 (§3.1)"),
      evening: pBeta("posting_time_evening", 2, 8, "20% 採用 (§3.1)"),
      midnight: pBeta("posting_time_midnight", 0.5, 9.5, "5% 採用 (§3.1)"),
    },
    hookDistribution: {
      // empirical Bayes (§3.2 (a)) — N≥5 で集計可能な 7 軸は採用率 × 20 の弱目 prior
      number_lead: pBeta("hook_number_lead", 5, 15, "ofmeton 25% / competitor 27.5% (§3.2)"),
      negation_lead: pBeta("hook_negation_lead", 1, 19, "5% (§3.2)"),
      question_lead: pBeta("hook_question_lead", 2, 18, "10% (§3.2)"),
      emotion_lead: pBeta("hook_emotion_lead", 3, 17, "15% 意図的下方 (§3.2)"),
      authority_lead: pBeta("hook_authority_lead", 2, 18, "10% 意図的下方 (§3.2)"),
      promise_lead: pBeta("hook_promise_lead", 3, 17, "15% (§3.2)"),
      other: pBeta("hook_other", 4, 16, "20% (§3.2 failure_story を除いた残り)"),
      // verified failure_story: Thompson 適用外、月 ≤ 4 上限 cap のみ (§3.2 (c))
      failure_story_verified_cap_per_month: {
        paramId: "hook_failure_story_verified_cap_per_month",
        distType: "beta",
        params: { alpha: 4, beta: 26 },
        meta: {
          thompsonExempt: true,
          guardLocked: true,
          note: "verified failure_story は月 ≤ 4 上限の cap、比率 KPI なし (initial-values §3.2 + §8.3)",
        },
      },
    },
    publishingLag: {
      paramId: "publishing_lag",
      distType: "discrete",
      // index 0=translation 1=paraphrase 2=opinion 3=first_hand
      // initial-values §3.3: translation 1-6h / paraphrase 6-12h / opinion 24-48h / first_hand 固定値なし
      // 弱 prior (=1) を 4 軸均等 → posterior は観測で更新
      params: { weights: [1, 1, 1, 1] },
      categories: ["translation", "paraphrase", "opinion", "first_hand"],
      meta: {
        note: "publishing_lag 軸別: translation 1-6h / paraphrase 6-12h / opinion 24-48h / first_hand 固定値なし (initial-values §3.3 SSOT)",
      },
    },
    contentAxis: {
      paramId: "content_axis",
      distType: "dirichlet",
      // initial-values §3.4: translation 10% / paraphrase 20% / opinion 30% / first_hand 40%
      params: { alphas: [1, 2, 3, 4] },
      categories: ["translation", "paraphrase", "opinion", "first_hand"],
      meta: {
        note: "Dirichlet α=(1,2,3,4) → expected 10/20/30/40% (initial-values §3.4)",
      },
    },
    citationExplicitRate: pBeta(
      "citation_explicit_rate",
      13,
      7,
      "65% (initial-values §3.5)",
    ),
    xFormatRatio: {
      // Current SSOT v10.3: 短文 50% / 中文 25% / 長文 10% / スレッド 10-15%
      // Beta(2, 8) 弱 prior (initial-values §3.6.1)
      short: pBeta("xfmt_short", 2, 8, "50% / Beta(2,8) 弱 prior (initial-values §3.6.1)"),
      medium: pBeta("xfmt_medium", 2, 8, "25% / Beta(2,8) 弱 prior (§3.6.1)"),
      long: pBeta("xfmt_long", 2, 8, "10% / Beta(2,8) 弱 prior (§3.6.1)"),
      thread: pBeta(
        "xfmt_thread",
        2,
        8,
        "10-15% / Beta(2,8) 弱 prior (§3.6.1) — 範囲合計 95-100% 弾性",
      ),
    },
    visualizerMode: {
      paramId: "visualizer_mode",
      distType: "dirichlet",
      // index 0=image 1=video 2=text — §3.7 採用比率 70% / 15% / 15% を α=(7, 1.5, 1.5) で表現
      params: { alphas: [7, 1.5, 1.5] },
      categories: ["image", "video", "text"],
      meta: { note: "image 70% / video 15% / text 15% (initial-values §3.7)" },
    },
    visualizerImageAiGen: pBeta(
      "visualizer_image_ai_generated",
      0.5,
      9.5,
      "AI 生成画像 ≤ 10% 死守 (initial-values §3.7 / §8.3)",
    ),
    industrySopRate: {
      paramId: "industry_sop_rate",
      distType: "beta",
      params: { alpha: 4, beta: 16 },
      meta: {
        guardLocked: true,
        note: "月 20% = 月 6 投稿、下限 5 投稿死守 (initial-values §3.8 / §8.3)",
      },
    },
  };
}

function pBeta(
  paramId: string,
  alpha: number,
  beta: number,
  note: string,
): ParameterPosterior {
  return {
    paramId,
    distType: "beta",
    params: { alpha, beta },
    meta: { note },
  };
}

// ---------------------------------------------------------------------------
// 2. In-memory store (Phase 0.5)
// ---------------------------------------------------------------------------

/** in-memory store: 現行 state + snapshot 履歴 */
type InMemoryStore = {
  current: OptimizerState | null;
  snapshots: Map<string, OptimizerState>;
};

const _store: InMemoryStore = {
  current: null,
  snapshots: new Map(),
};

/** test/spec から in-memory store を 直接リセットしたいとき用 */
export function __resetInMemoryStore() {
  _store.current = null;
  _store.snapshots.clear();
}

/** test 用に外部から in-memory state を差し込む */
export function __setInMemoryState(state: OptimizerState) {
  _store.current = state;
}

// ---------------------------------------------------------------------------
// 3. Public API
// ---------------------------------------------------------------------------

export async function loadOptimizerState(
  now: Date = new Date(),
): Promise<OptimizerState> {
  if (IN_MEMORY_FALLBACK) {
    if (!_store.current) {
      _store.current = buildInitialState(now);
    }
    return cloneState(_store.current);
  }
  // Phase 1: Supabase optimizer_state テーブル read (未実装)
  throw new Error(
    "loadOptimizerState: Supabase backend は未実装 (Phase 1)。IN_MEMORY_FALLBACK=true を設定してください。",
  );
}

export async function saveOptimizerState(
  state: OptimizerState,
): Promise<void> {
  if (IN_MEMORY_FALLBACK) {
    _store.current = cloneState({
      ...state,
      generation: (state.generation ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    });
    return;
  }
  throw new Error(
    "saveOptimizerState: Supabase backend は未実装 (Phase 1)。IN_MEMORY_FALLBACK=true を設定してください。",
  );
}

export async function snapshotState(
  timestamp: Date = new Date(),
): Promise<{ snapshotId: string }> {
  const current = await loadOptimizerState(timestamp);
  const snapshotId = `snap_${timestamp.toISOString().replace(/[^0-9]/g, "")}_${randTail()}`;
  if (IN_MEMORY_FALLBACK) {
    _store.snapshots.set(
      snapshotId,
      cloneState({ ...current, lastSnapshotId: snapshotId }),
    );
    if (_store.current) {
      _store.current = { ..._store.current, lastSnapshotId: snapshotId };
    }
    return { snapshotId };
  }
  throw new Error(
    "snapshotState: Supabase backend は未実装 (Phase 1)。IN_MEMORY_FALLBACK=true を設定してください。",
  );
}

export async function rollbackToSnapshot(
  snapshotId: string,
): Promise<OptimizerState> {
  if (IN_MEMORY_FALLBACK) {
    const snap = _store.snapshots.get(snapshotId);
    if (!snap) {
      throw new Error(`rollbackToSnapshot: snapshot not found: ${snapshotId}`);
    }
    _store.current = cloneState(snap);
    return cloneState(snap);
  }
  throw new Error(
    "rollbackToSnapshot: Supabase backend は未実装 (Phase 1)。IN_MEMORY_FALLBACK=true を設定してください。",
  );
}

// ---------------------------------------------------------------------------
// 4. helpers
// ---------------------------------------------------------------------------

function cloneState(s: OptimizerState): OptimizerState {
  // structuredClone は Node 24+ で利用可、依存なし
  return structuredClone(s);
}

function randTail(): string {
  return Math.random().toString(36).slice(2, 8);
}
