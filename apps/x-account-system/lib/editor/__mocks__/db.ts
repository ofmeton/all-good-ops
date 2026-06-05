/**
 * Mock for lib/editor/db.ts
 *
 * 各テストが setMockState() で必要な振る舞いを差し込む。
 * default は「常に verified、当月 posted 0 件、recent posts なし」(全 X3/R5 pass)。
 */
import type { RecentPost } from "../db.ts";

type MockState = {
  monthlyFailureStoryCount: number;
  verifiedMaterialIdSet: Set<string> | null; // null → 全 verified
  recentPosts: RecentPost[];
};

let _state: MockState = {
  monthlyFailureStoryCount: 0,
  verifiedMaterialIdSet: null,
  recentPosts: [],
};

export function __resetMockState() {
  _state = {
    monthlyFailureStoryCount: 0,
    verifiedMaterialIdSet: null,
    recentPosts: [],
  };
}

export function __setMockState(partial: Partial<MockState>) {
  _state = { ..._state, ...partial };
}

export function getSupabase() {
  return null;
}

export async function getMonthlyFailureStoryPostCount(
  _now: Date,
): Promise<number> {
  return _state.monthlyFailureStoryCount;
}

export async function getVerifiedMaterialIds(
  materialIds: string[],
): Promise<Set<string>> {
  if (_state.verifiedMaterialIdSet === null) {
    return new Set(materialIds);
  }
  return new Set(materialIds.filter((id) => _state.verifiedMaterialIdSet!.has(id)));
}

export async function fetchRecentPostBodies(
  _daysBack = 14,
): Promise<RecentPost[]> {
  return _state.recentPosts;
}
