/**
 * jest.mock("./reward-extractor.ts") から呼ばれる mock。
 *
 * `__setMockSignals` で SuccessSignal 配列を差し込み、
 * `__setMockWindowPerf` で aggregatePerformanceWindow の出力を直接 override する。
 */
import type { OptimizerState, SuccessSignal } from "../types.ts";

let _signals: SuccessSignal[] = [];
let _windowPerf = {
  currentAvgPcr: 0.05,
  prevAvgPcr: 0.05,
  currentAvgImpression: 1000,
  prevAvgImpression: 1000,
};

export function __resetMockSignals() {
  _signals = [];
  _windowPerf = {
    currentAvgPcr: 0.05,
    prevAvgPcr: 0.05,
    currentAvgImpression: 1000,
    prevAvgImpression: 1000,
  };
}

export function __setMockSignals(signals: SuccessSignal[]) {
  _signals = signals.slice();
}

export function __setMockWindowPerf(perf: typeof _windowPerf) {
  _windowPerf = { ...perf };
}

export async function extractSuccessSignals(
  _daysBack = 30,
  _state?: OptimizerState,
): Promise<SuccessSignal[]> {
  return _signals.map((s) => ({ ...s, postedAt: new Date(s.postedAt) }));
}

export async function aggregatePerformanceWindow(
  _windowDays: number,
  _prevWindowDays: number,
  _now: Date = new Date(),
): Promise<typeof _windowPerf> {
  return { ..._windowPerf };
}

export function __setInMemoryObservations(_rows: unknown[]) {
  // unused in mock
}

export function __resetInMemoryObservations() {
  // unused in mock
}
