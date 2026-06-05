/**
 * Visualizer mode selector (PR-E)
 *
 * SSoT:
 *   - initial-values-design.md §3.7 (Visualizer モード比率)
 *
 * Phase 1 ofmeton 採用比率 (initial-values §3.7 SSOT、grouped):
 *   - image    : 70% (screenshot 50% + text overlay 20%)
 *   - video    : 15% (15-30秒 10% + ≥30秒/hybrid 5%)
 *   - text_only: 15% (失敗談・主観意見)
 *
 * v10.3 §2.6: PSM 廃止 → ランダム + 週単位 switchback。selectVisualizerMode は
 * 各 core idea ごとに重み付きランダム割当を実行する関数。
 */

import type { VisualizerMode } from "./types.ts";

/**
 * initial-values §3.7 Phase 1 採用比率 (合計 1.0)
 *
 * SSOT 保護:
 *   - image    : 0.70 (50% screenshot + 20% text overlay)
 *   - video    : 0.15 (10% 15-30s + 5% ≥30s/hybrid)
 *   - text_only: 0.15
 */
export const MODE_WEIGHTS: Record<VisualizerMode, number> = {
  image: 0.7,
  video: 0.15,
  text_only: 0.15,
};

/**
 * 重み付き乱択でモードを 1 つ選ぶ。
 *
 * @param rand 0..1 の uniform 乱数生成関数。test では injectable。
 *             デフォルトは Math.random。
 */
export function selectVisualizerMode(
  rand: () => number = Math.random,
): VisualizerMode {
  const r = rand();
  // 区分: [0, 0.70) → image, [0.70, 0.85) → video, [0.85, 1.0) → text_only
  let cumulative = 0;
  // 順序は固定 (image → video → text_only) で安定 (test reproducibility)
  const order: VisualizerMode[] = ["image", "video", "text_only"];
  for (const mode of order) {
    cumulative += MODE_WEIGHTS[mode];
    if (r < cumulative) return mode;
  }
  // edge case (rand() === 1.0): 最後に倒す
  return "text_only";
}

/**
 * Switchback (週単位) のためのモード割当を返す。
 *
 * v10.3 §2.6: 「週単位 switchback (1 週目 ai-only、2 週目 self-only、...)」
 * Phase 0.5 では簡易実装として ISO 週番号 mod 3 で switchback する。
 *
 * @param date ISO 日付 (default = 今日)
 */
export function selectModeBySwitchback(date: Date = new Date()): VisualizerMode {
  // ISO 週番号 (近似): year start からの日数 / 7
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor(
    (date.getTime() - yearStart.getTime()) / (24 * 60 * 60 * 1000),
  );
  const week = Math.floor(dayOfYear / 7);
  const order: VisualizerMode[] = ["image", "video", "text_only"];
  return order[week % order.length]!;
}
