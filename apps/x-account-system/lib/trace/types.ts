export type RunTrigger = "cron" | "manual" | "webhook";
export type RunStatus = "running" | "ok" | "error" | "skipped";
export type TraceStatus = "ok" | "error" | "skipped";

export interface RunRow {
  id: string;
  job: string;
  trigger: RunTrigger;
  date: string;
  status: RunStatus;
  attempt: number;
}

export interface TraceMeta {
  promptText?: string;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  costJpy?: number;
}

export interface TraceRow extends TraceMeta {
  runId: string;
  stageId: string;
  attempt?: number;
  status: TraceStatus;
  outcome?: string;
  startedAt: Date;
  durationMs?: number;
  input?: unknown;
  output?: unknown;
  error?: string;
}

/** MA session イベントの種別（runMaSession drain が emit）。 */
export type SessionEventType =
  | "thinking"
  | "text"
  | "custom_tool_use"
  | "custom_tool_result"
  | "model_request_end";

/** runMaSession の onEvent が渡す 1 イベント。payload は redact 前の生データ。 */
export interface SessionEventInput {
  seq: number;
  type: SessionEventType;
  payload: unknown;
}

/** xad.run_session への 1 行（run→session ブリッジ）。 */
export interface RunSessionRow {
  runId: string;
  stageId: string;
  sessionId: string;
  agentKey?: string;
}
