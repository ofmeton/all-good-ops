/**
 * Optimizer 月次 update loop
 *
 * SSoT: initial-values-design.md §8 + main-design v10.3 §2.6
 *
 * Flow:
 *   1. loadOptimizerState
 *   2. snapshotState (rollback 用に before を残す)
 *   3. extractSuccessSignals (30 day window)
 *   4. 各 自由 param: updateBeta / updateDirichlet
 *   5. anomaly detection (PCR -30% / impression -50% in 7d) → rollback
 *   6. applyGuards (§8.3 死守 + §8.4 範囲)
 *   7. saveOptimizerState
 */

import {
  applyGuards,
} from "./guards.ts";
import {
  aggregatePerformanceWindow,
  extractSuccessSignals,
} from "./reward-extractor.ts";
import {
  loadOptimizerState,
  rollbackToSnapshot,
  saveOptimizerState,
  snapshotState,
} from "./state-store.ts";
import {
  updateBeta,
} from "./thompson.ts";
import type {
  AnomalyReason,
  OptimizerState,
  OptimizerUpdateResult,
  ParameterChange,
  SuccessSignal,
} from "./types.ts";

const DROP_PCR_THRESHOLD = 0.3; // PCR -30%
const DROP_IMPRESSION_THRESHOLD = 0.5; // impression -50%
const ANOMALY_WINDOW_DAYS = 7;

export async function runOptimizerUpdate(
  now: Date = new Date(),
): Promise<OptimizerUpdateResult> {
  const t0 = Date.now();
  const before = await loadOptimizerState(now);
  const { snapshotId } = await snapshotState(now);
  const signals = await extractSuccessSignals(30, before);
  // working copy
  let state: OptimizerState = structuredClone(before);
  state.lastSnapshotId = snapshotId;

  const changes: ParameterChange[] = [];

  // ----- 1. apply success signals to Beta posteriors -----
  for (const sig of signals) {
    if (!sig.attribution) continue;
    // posting_time band
    const band = sig.attribution.timeBand;
    if (band && state.postingTime[band]) {
      const beforeP = structuredClone(state.postingTime[band].params);
      state.postingTime[band] = updateBeta(state.postingTime[band], sig.success);
      changes.push({
        paramId: state.postingTime[band].paramId,
        distType: "beta",
        before: beforeP,
        after: structuredClone(state.postingTime[band].params),
        reason: sig.success ? "success" : "failure",
      });
    }
    // hook (verified failure_story は thompsonExempt のため updateBeta は no-op)
    const hookKey = sig.attribution.hook;
    if (hookKey && state.hookDistribution[hookKey]) {
      const p = state.hookDistribution[hookKey];
      const beforeP = structuredClone(p.params);
      state.hookDistribution[hookKey] = updateBeta(p, sig.success);
      if (
        JSON.stringify(beforeP) !==
        JSON.stringify(state.hookDistribution[hookKey].params)
      ) {
        changes.push({
          paramId: p.paramId,
          distType: "beta",
          before: beforeP,
          after: structuredClone(state.hookDistribution[hookKey].params),
          reason: sig.success ? "success" : "failure",
        });
      }
    }
    // x format
    const fmt = sig.attribution.xFormat;
    if (fmt && state.xFormatRatio[fmt]) {
      const p = state.xFormatRatio[fmt];
      const beforeP = structuredClone(p.params);
      state.xFormatRatio[fmt] = updateBeta(p, sig.success);
      changes.push({
        paramId: p.paramId,
        distType: "beta",
        before: beforeP,
        after: structuredClone(state.xFormatRatio[fmt].params),
        reason: sig.success ? "success" : "failure",
      });
    }
    // Stage 2A: content_axis / visualizer / industry_sop / publishing_lag /
    // citation は bandit 化しない（据え置き）。死守ガード＋固定値で挙動を維持し、
    // posterior は学習させない。bandit 化是非は Stage 3 (LLM-optimizer) が提案する。
  }

  // ----- 2. anomaly detection (PCR -30% / impression -50% in 7d) -----
  const anomalyReasons: AnomalyReason[] = [];
  const perf = await aggregatePerformanceWindow(
    ANOMALY_WINDOW_DAYS,
    ANOMALY_WINDOW_DAYS,
    now,
  );
  if (
    perf.prevAvgPcr > 0 &&
    perf.currentAvgPcr <= perf.prevAvgPcr * (1 - DROP_PCR_THRESHOLD)
  ) {
    anomalyReasons.push("pcr_drop_30_percent_7d");
  }
  if (
    perf.prevAvgImpression > 0 &&
    perf.currentAvgImpression <=
      perf.prevAvgImpression * (1 - DROP_IMPRESSION_THRESHOLD)
  ) {
    anomalyReasons.push("impression_drop_50_percent_7d");
  }

  let rolledBack = false;
  if (anomalyReasons.length > 0) {
    state = await rollbackToSnapshot(snapshotId);
    rolledBack = true;
    return {
      before,
      after: state,
      changes: [], // rolled back, ignore mid-flight changes
      rolledBack,
      anomalyReasons,
      signalsObserved: signals.length,
      durationMs: Date.now() - t0,
    };
  }

  // ----- 3. apply §8.3 死守 + §8.4 自由 範囲 clip -----
  const guarded = applyGuards(state);
  state = guarded.state;
  for (const a of guarded.applied) {
    changes.push({
      paramId: a.paramId,
      distType: "beta",
      before: { mean: a.before },
      after: { mean: a.after },
      reason: `guard clip (${a.rule.note})`,
    });
  }

  // ----- 4. save -----
  await saveOptimizerState(state);

  return {
    before,
    after: state,
    changes,
    rolledBack,
    anomalyReasons,
    signalsObserved: signals.length,
    durationMs: Date.now() - t0,
  };
}

/** test 用: signals だけ受け取って同期的に loop を回す軽量版 */
export function applySignalsToState(
  state: OptimizerState,
  signals: SuccessSignal[],
): { state: OptimizerState; changes: ParameterChange[] } {
  let s = structuredClone(state);
  const changes: ParameterChange[] = [];
  for (const sig of signals) {
    if (!sig.attribution) continue;
    const band = sig.attribution.timeBand;
    if (band && s.postingTime[band]) {
      const beforeP = structuredClone(s.postingTime[band].params);
      s.postingTime[band] = updateBeta(s.postingTime[band], sig.success);
      changes.push({
        paramId: s.postingTime[band].paramId,
        distType: "beta",
        before: beforeP,
        after: structuredClone(s.postingTime[band].params),
        reason: sig.success ? "success" : "failure",
      });
    }
    const hookKey = sig.attribution.hook;
    if (hookKey && s.hookDistribution[hookKey]) {
      const p = s.hookDistribution[hookKey];
      const beforeP = structuredClone(p.params);
      s.hookDistribution[hookKey] = updateBeta(p, sig.success);
      changes.push({
        paramId: p.paramId,
        distType: "beta",
        before: beforeP,
        after: structuredClone(s.hookDistribution[hookKey].params),
        reason: sig.success ? "success" : "failure",
      });
    }
    const fmt = sig.attribution.xFormat;
    if (fmt && s.xFormatRatio[fmt]) {
      const p = s.xFormatRatio[fmt];
      const beforeP = structuredClone(p.params);
      s.xFormatRatio[fmt] = updateBeta(p, sig.success);
      changes.push({
        paramId: p.paramId,
        distType: "beta",
        before: beforeP,
        after: structuredClone(s.xFormatRatio[fmt].params),
        reason: sig.success ? "success" : "failure",
      });
    }
  }
  const guarded = applyGuards(s);
  s = guarded.state;
  return { state: s, changes };
}
