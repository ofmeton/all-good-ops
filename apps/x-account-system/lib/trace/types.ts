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
