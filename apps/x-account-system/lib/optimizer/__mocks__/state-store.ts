/**
 * jest.mock("./state-store.ts") から呼ばれる mock。
 *
 * NOTE: 親 module (`../state-store.ts`) を import すると jest 自動 mock が
 * 再帰的に this module を返してしまうため、 buildInitialState は
 * `jest.requireActual` で実モジュールから取り出す。
 */
import type { OptimizerState } from "../types.ts";

const realModule = jest.requireActual<typeof import("../state-store.ts")>(
  "../state-store.ts",
);

let _state: OptimizerState | null = null;
let _snapshots = new Map<string, OptimizerState>();

export function __resetMockState() {
  _state = null;
  _snapshots = new Map();
}

export function __forceState(state: OptimizerState) {
  _state = structuredClone(state);
}

export function buildInitialState(now?: Date): OptimizerState {
  return realModule.buildInitialState(now ?? new Date());
}

export async function loadOptimizerState(
  now: Date = new Date(),
): Promise<OptimizerState> {
  if (!_state) _state = realModule.buildInitialState(now);
  return structuredClone(_state);
}

export async function saveOptimizerState(state: OptimizerState): Promise<void> {
  _state = structuredClone({
    ...state,
    generation: (state.generation ?? 0) + 1,
    updatedAt: new Date().toISOString(),
  });
}

export async function snapshotState(
  timestamp: Date = new Date(),
): Promise<{ snapshotId: string }> {
  if (!_state) _state = realModule.buildInitialState(timestamp);
  const snapshotId = `snap_mock_${timestamp.getTime()}_${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  _snapshots.set(snapshotId, structuredClone(_state));
  _state = { ..._state, lastSnapshotId: snapshotId };
  return { snapshotId };
}

export async function rollbackToSnapshot(
  snapshotId: string,
): Promise<OptimizerState> {
  const snap = _snapshots.get(snapshotId);
  if (!snap) throw new Error(`rollbackToSnapshot: not found: ${snapshotId}`);
  _state = structuredClone(snap);
  return structuredClone(snap);
}

export function __resetInMemoryStore() {
  _state = null;
  _snapshots.clear();
}

export function __setInMemoryState(state: OptimizerState) {
  _state = structuredClone(state);
}
