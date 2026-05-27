/**
 * MA session teardown (PR-D)
 *
 * SSoT: feedback_ma_session_teardown — race condition / 課金リーク防止のため
 * 固定 order を強制:
 *   1. send (最終 send が flush 済か確認)
 *   2. running → idle (status が idle に落ちるまで wait)
 *   3. retrieve final artifacts
 *   4. archive session (course 終了マーク)
 *
 * Phase 0.5 fallback (IN_MEMORY_FALLBACK=true) では Anthropic SDK を呼ばず
 * mock state machine で順序を検証する。
 */

export type MaPhase =
  | "init"
  | "sending"
  | "running"
  | "idle"
  | "retrieved"
  | "archived";

export interface MaSessionState {
  session_id: string;
  phase: MaPhase;
  /** 各 phase 完了時刻 (ISO). */
  phase_timestamps: Partial<Record<MaPhase, string>>;
  /** retrieve したアーティファクト (Phase 0.5 では dummy). */
  artifacts?: {
    messages: number;
    output_text_chars: number;
  };
  /** 累積 phase の order 検証用. */
  transitions: MaPhase[];
}

/**
 * Phase 0.5: in-memory state machine.
 * 実環境では @anthropic-ai/sdk の beta.agents.sessions に置換する。
 */
const stateStore = new Map<string, MaSessionState>();

export function initSessionState(session_id: string): MaSessionState {
  const state: MaSessionState = {
    session_id,
    phase: "init",
    phase_timestamps: { init: new Date().toISOString() },
    transitions: ["init"],
  };
  stateStore.set(session_id, state);
  return state;
}

export function getSessionState(session_id: string): MaSessionState | undefined {
  return stateStore.get(session_id);
}

/**
 * Phase 0.5 sim: phase を遷移させる helper (実環境では SDK が変える).
 */
export function __advancePhase(session_id: string, next: MaPhase): void {
  const s = stateStore.get(session_id);
  if (!s) throw new Error(`no session ${session_id}`);
  s.phase = next;
  s.phase_timestamps[next] = new Date().toISOString();
  s.transitions.push(next);
}

// ---------------------------------------------------------------------------
// teardown order: send → running → idle → retrieve → archive
// ---------------------------------------------------------------------------

export async function waitForSendCompletion(session_id: string, _timeoutMs = 5000): Promise<void> {
  const s = stateStore.get(session_id);
  if (!s) throw new Error(`no session ${session_id}`);
  // Phase 0.5 sim: init → sending を即進行 (実環境では SDK の send flush ack を polling)
  if (s.phase === "init") {
    __advancePhase(session_id, "sending");
  }
  // sending/running/idle 以降なら何もしない (idempotent)
}

export async function waitForRunningToIdle(session_id: string, _timeoutMs = 30000): Promise<void> {
  const s = stateStore.get(session_id);
  if (!s) throw new Error(`no session ${session_id}`);
  // Phase 0.5 sim: sending → running → idle を即進行
  if (s.phase === "sending") {
    __advancePhase(session_id, "running");
    __advancePhase(session_id, "idle");
  } else if (s.phase === "running") {
    __advancePhase(session_id, "idle");
  }
}

export async function retrieveFinalArtifacts(session_id: string): Promise<MaSessionState["artifacts"]> {
  const s = stateStore.get(session_id);
  if (!s) throw new Error(`no session ${session_id}`);
  if (s.phase !== "idle") {
    throw new Error(
      `[teardown] retrieve called in phase=${s.phase}, expected 'idle'. Order violation.`,
    );
  }
  // Phase 0.5 dummy artifacts
  s.artifacts = { messages: 5, output_text_chars: 1234 };
  __advancePhase(session_id, "retrieved");
  return s.artifacts;
}

export async function archiveSession(session_id: string): Promise<void> {
  const s = stateStore.get(session_id);
  if (!s) throw new Error(`no session ${session_id}`);
  if (s.phase !== "retrieved") {
    throw new Error(
      `[teardown] archive called in phase=${s.phase}, expected 'retrieved'. Order violation.`,
    );
  }
  __advancePhase(session_id, "archived");
}

/**
 * 固定 order で teardown を実行。順序違反は throw する。
 */
export async function teardownMaSession(session_id: string): Promise<{
  artifacts: MaSessionState["artifacts"];
  transitions: MaPhase[];
}> {
  await waitForSendCompletion(session_id);
  await waitForRunningToIdle(session_id);
  const artifacts = await retrieveFinalArtifacts(session_id);
  await archiveSession(session_id);
  const s = stateStore.get(session_id)!;
  return { artifacts, transitions: [...s.transitions] };
}

/** test 用 reset */
export function __resetMaState(): void {
  stateStore.clear();
}

// ---------------------------------------------------------------------------
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
