/**
 * rollback-monitor (PR-D)
 *
 * SSoT: main-design-all-versions.md §2.12 監視ガード装置 / launch-roadmap.md §5
 *
 * 7 日窓で PCR -30% / インプレッション -50% を検出したら Optimizer posterior を
 * 1 段戻す (rollback)。
 *
 * Phase 0.5 では PR-C (Optimizer) が未着手なので、検出 + alert 生成までを実装し、
 * 実 rollback hook は stub (no-op) で返す。PR-C 完了後に hook を差し替える。
 */

export interface RollbackInput {
  /** 当 window の PCR. */
  pcr_current: number | null;
  /** 比較対象 (前 window or baseline) の PCR. */
  pcr_baseline: number | null;
  /** 当 window の平均インプ / 投稿. */
  impressions_current: number | null;
  /** baseline インプ / 投稿. */
  impressions_baseline: number | null;
  /** 観測 window (日数). default 7. */
  window_days?: number;
}

export interface RollbackDecision {
  triggered: boolean;
  reasons: string[];
  /** Optimizer に戻し step を要求した結果 (Phase 0.5 は stub). */
  rollback_steps: number;
  pcr_drop_pct?: number;
  impressions_drop_pct?: number;
}

const PCR_DROP_THRESHOLD = -0.30;       // -30%
const IMP_DROP_THRESHOLD = -0.50;       // -50%

/**
 * 7 日窓 (or 任意 window) の degradation を判定。
 *
 * 判定:
 *   pcr_drop = (current - baseline) / baseline
 *   imp_drop = 同上
 *
 *   いずれかが閾値を下回ったら triggered=true
 *
 * Phase 0.5 では実 rollback hook がないため rollback_steps=0 (stub)
 */
export function evaluateRollback(input: RollbackInput): RollbackDecision {
  const reasons: string[] = [];
  let pcr_drop: number | undefined;
  let imp_drop: number | undefined;

  if (
    input.pcr_baseline !== null &&
    input.pcr_baseline !== undefined &&
    input.pcr_baseline > 0 &&
    input.pcr_current !== null &&
    input.pcr_current !== undefined
  ) {
    pcr_drop = (input.pcr_current - input.pcr_baseline) / input.pcr_baseline;
    if (pcr_drop <= PCR_DROP_THRESHOLD) {
      reasons.push(
        `PCR drop ${(pcr_drop * 100).toFixed(1)}% (current=${input.pcr_current.toFixed(5)}, baseline=${input.pcr_baseline.toFixed(5)})`,
      );
    }
  }

  if (
    input.impressions_baseline !== null &&
    input.impressions_baseline !== undefined &&
    input.impressions_baseline > 0 &&
    input.impressions_current !== null &&
    input.impressions_current !== undefined
  ) {
    imp_drop =
      (input.impressions_current - input.impressions_baseline) / input.impressions_baseline;
    if (imp_drop <= IMP_DROP_THRESHOLD) {
      reasons.push(
        `Impressions drop ${(imp_drop * 100).toFixed(1)}% (current=${input.impressions_current.toFixed(0)}, baseline=${input.impressions_baseline.toFixed(0)})`,
      );
    }
  }

  const triggered = reasons.length > 0;

  return {
    triggered,
    reasons,
    rollback_steps: triggered ? requestRollbackStep() : 0,
    pcr_drop_pct: pcr_drop !== undefined ? Math.round(pcr_drop * 1000) / 10 : undefined,
    impressions_drop_pct: imp_drop !== undefined ? Math.round(imp_drop * 1000) / 10 : undefined,
  };
}

/**
 * Optimizer posterior を 1 段戻す stub.
 * Phase 0.5 では何もせず 0 を返す。
 * Phase 1+ で PR-C optimizer_state テーブルから前回 snapshot を読み出して書き戻す実装。
 */
function requestRollbackStep(): number {
  // TODO PR-C 完了後に hook を差し替え
  return 0;
}
