/**
 * Reward extractor — posts_performance から success 信号を抽出
 *
 * SSoT: initial-values-design.md §3 (success 定義) + main-design v10.3 §7.2 (PCR/url_link_clicks 採用)
 *
 * Success 判定:
 *   - PCR が 母集団 (daysBack 内) の top 30 percentile に入る OR
 *   - url_link_clicks が 母集団 median 超え
 *
 * Phase 0.5 (IN_MEMORY_FALLBACK=true): fixture 配列を返す。
 * Phase 1: posts_performance / post_attribution テーブルから join。
 */

import type { OptimizerState, SuccessSignal } from "./types.ts";

const IN_MEMORY_FALLBACK = process.env.IN_MEMORY_FALLBACK === "true";

// ---------------------------------------------------------------------------
// 1. in-memory test fixture (Phase 0.5)
// ---------------------------------------------------------------------------

type RawObservation = {
  draftId: string;
  postedAt: string; // ISO
  impression: number;
  pcr: number;
  urlLinkClicks: number;
  attribution: SuccessSignal["attribution"];
};

let _inMemoryObservations: RawObservation[] = [];

export function __setInMemoryObservations(rows: RawObservation[]) {
  _inMemoryObservations = rows.slice();
}

export function __resetInMemoryObservations() {
  _inMemoryObservations = [];
}

// ---------------------------------------------------------------------------
// 2. Public API
// ---------------------------------------------------------------------------

export async function extractSuccessSignals(
  daysBack = 30,
  _state?: OptimizerState,
): Promise<SuccessSignal[]> {
  if (!IN_MEMORY_FALLBACK) {
    throw new Error(
      "extractSuccessSignals: Supabase backend は未実装 (Phase 1)。IN_MEMORY_FALLBACK=true を設定してください。",
    );
  }
  const cutoff = Date.now() - daysBack * 24 * 3600 * 1000;
  const rows = _inMemoryObservations.filter(
    (r) => new Date(r.postedAt).getTime() >= cutoff,
  );
  if (rows.length === 0) return [];

  const pcrs = rows.map((r) => r.pcr).sort((a, b) => b - a); // desc
  const top30Cut = pcrs[Math.max(0, Math.floor(pcrs.length * 0.3) - 1)];
  const urls = rows.map((r) => r.urlLinkClicks).sort((a, b) => a - b);
  const median = urls[Math.floor(urls.length / 2)] ?? 0;

  return rows.map((r) => {
    const success = r.pcr >= top30Cut || r.urlLinkClicks > median;
    return {
      draftId: r.draftId,
      postedAt: new Date(r.postedAt),
      impression: r.impression,
      pcr: r.pcr,
      urlLinkClicks: r.urlLinkClicks,
      attribution: r.attribution,
      success,
    };
  });
}

/**
 * 直近 daysBack 日と更にその前期間とで PCR / impression の比較が必要なときに使う集計関数。
 * anomaly 検出 (PCR -30% / impression -50% in 7d) で利用。
 */
export async function aggregatePerformanceWindow(
  windowDays: number,
  prevWindowDays: number,
  now: Date = new Date(),
): Promise<{
  currentAvgPcr: number;
  prevAvgPcr: number;
  currentAvgImpression: number;
  prevAvgImpression: number;
}> {
  if (!IN_MEMORY_FALLBACK) {
    throw new Error(
      "aggregatePerformanceWindow: Supabase backend は未実装 (Phase 1)。",
    );
  }
  const cutoffCurrent = now.getTime() - windowDays * 24 * 3600 * 1000;
  const cutoffPrev = cutoffCurrent - prevWindowDays * 24 * 3600 * 1000;
  const current = _inMemoryObservations.filter(
    (r) => new Date(r.postedAt).getTime() >= cutoffCurrent,
  );
  const prev = _inMemoryObservations.filter((r) => {
    const t = new Date(r.postedAt).getTime();
    return t >= cutoffPrev && t < cutoffCurrent;
  });
  return {
    currentAvgPcr: avg(current.map((r) => r.pcr)),
    prevAvgPcr: avg(prev.map((r) => r.pcr)),
    currentAvgImpression: avg(current.map((r) => r.impression)),
    prevAvgImpression: avg(prev.map((r) => r.impression)),
  };
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, v) => s + v, 0) / xs.length;
}
