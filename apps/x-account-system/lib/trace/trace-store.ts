/**
 * Fail-open trace 書込ストア (xad.run / xad.run_trace)
 *
 * 観測ダッシュボード用に各工程の実行を Supabase に記録する。
 * trace 書込は本処理を妨げないため、Supabase 未設定 / insert 失敗時も
 * すべて握りつぶす（fail-open）。
 *
 * スキーマは createClient の db.schema で一度だけ指定し、以降は plain .from()
 * （既存 lib/optimizer/state-store.ts 規約に合わせる。.schema() を二重 chain しない）。
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { RunRow, TraceRow } from "./types.js";

let _client: SupabaseClient | null | undefined;

export function __setTraceSupabaseForTest(c: SupabaseClient | null): void {
  _client = c;
}

function getTraceSupabase(): SupabaseClient | null {
  if (_client !== undefined) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  _client = url && key ? createClient(url, key, { db: { schema: "xad" } }) : null;
  return _client;
}

export async function insertRun(run: RunRow): Promise<void> {
  try {
    const sb = getTraceSupabase();
    if (!sb) return;
    await sb.from("run").insert({
      id: run.id,
      job: run.job,
      trigger: run.trigger,
      date: run.date,
      status: run.status,
      attempt: run.attempt,
    });
  } catch {
    /* fail-open */
  }
}

export async function updateRun(
  id: string,
  patch: { status?: string; attempt?: number; error?: string; finished?: boolean },
): Promise<void> {
  try {
    const sb = getTraceSupabase();
    if (!sb) return;
    const row: Record<string, unknown> = {};
    if (patch.status) row.status = patch.status;
    if (patch.attempt != null) row.attempt = patch.attempt;
    if (patch.error != null) row.error = patch.error;
    if (patch.finished) row.finished_at = new Date().toISOString();
    await sb.from("run").update(row).eq("id", id);
  } catch {
    /* fail-open */
  }
}

export async function insertTrace(t: TraceRow): Promise<void> {
  try {
    const sb = getTraceSupabase();
    if (!sb) return;
    await sb.from("run_trace").insert({
      run_id: t.runId,
      stage_id: t.stageId,
      attempt: t.attempt ?? 1,
      status: t.status,
      outcome: t.outcome ?? null,
      started_at: t.startedAt.toISOString(),
      duration_ms: t.durationMs ?? null,
      input_json: t.input ?? null,
      output_json: t.output ?? null,
      prompt_text: t.promptText ?? null,
      model: t.model ?? null,
      tokens_in: t.tokensIn ?? null,
      tokens_out: t.tokensOut ?? null,
      cost_jpy: t.costJpy ?? null,
      error: t.error ?? null,
    });
  } catch {
    /* fail-open */
  }
}
