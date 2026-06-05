import { insertTrace } from "./trace-store.js";
import { redactForTrace } from "./redact-io.js";
import type { TraceMeta, TraceStatus } from "./types.js";

function schedule(ctx: ExecutionContext | undefined, p: Promise<void>): void {
  if (ctx) ctx.waitUntil(p);
  else void p; // テスト/非Queue経路。insertTrace 自体が fail-open
}

export interface WithTraceCtx {
  runId: string; stageId: string; attempt?: number; input?: unknown;
}
export interface WithTraceResult<T> {
  result: T; output?: unknown; outcome?: string; status?: TraceStatus; meta?: TraceMeta;
}

export async function withTrace<T>(
  ctx: ExecutionContext | undefined,
  c: WithTraceCtx,
  fn: () => Promise<WithTraceResult<T>>,
): Promise<T> {
  const startedAt = new Date();
  try {
    const r = await fn();
    schedule(ctx, insertTrace({
      runId: c.runId, stageId: c.stageId, attempt: c.attempt,
      status: r.status ?? "ok", outcome: r.outcome, startedAt,
      durationMs: Date.now() - startedAt.getTime(),
      input: c.input == null ? undefined : redactForTrace(c.input),
      output: r.output == null ? undefined : redactForTrace(r.output),
      promptText: r.meta?.promptText ? String(redactForTrace(r.meta.promptText)) : undefined,
      model: r.meta?.model, tokensIn: r.meta?.tokensIn,
      tokensOut: r.meta?.tokensOut, costJpy: r.meta?.costJpy,
    }));
    return r.result;
  } catch (e) {
    schedule(ctx, insertTrace({
      runId: c.runId, stageId: c.stageId, attempt: c.attempt,
      status: "error", startedAt, durationMs: Date.now() - startedAt.getTime(),
      input: c.input == null ? undefined : redactForTrace(c.input),
      error: String(e),
    }));
    throw e;
  }
}

/** 計装外から直接 1 行記録（safety skip / line-approval skip 等） */
export async function recordSkip(
  ctx: ExecutionContext | undefined,
  c: { runId: string; stageId: string; outcome: string },
): Promise<void> {
  schedule(ctx, insertTrace({
    runId: c.runId, stageId: c.stageId, status: "skipped",
    outcome: c.outcome, startedAt: new Date(), durationMs: 0,
  }));
}
