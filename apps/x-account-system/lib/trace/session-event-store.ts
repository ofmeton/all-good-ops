/**
 * Fail-open session トレース書込ストア (xad.session_event / xad.run_session)。
 * 1B 観測用。本処理を妨げないため Supabase 未設定 / insert 失敗時は握りつぶす。
 * trace-store.ts と同じ schema=xad / テスト注入口の規約に合わせる。
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { redactForTrace } from "./redact-io.js";
import type { SessionEventInput, RunSessionRow } from "./types.js";

let _client: SupabaseClient | null | undefined;

export function __setSessionTraceSupabaseForTest(c: SupabaseClient | null): void {
  _client = c;
}

function getSb(): SupabaseClient | null {
  if (_client !== undefined) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  _client = url && key ? createClient(url, key, { db: { schema: "xad" as "public" } }) : null;
  return _client;
}

export async function insertSessionEvents(
  sessionId: string,
  agentKey: string,
  events: SessionEventInput[],
): Promise<void> {
  try {
    if (events.length === 0) return;
    const sb = getSb();
    if (!sb) return;
    const rows = events.map((e) => ({
      session_id: sessionId,
      seq: e.seq,
      type: e.type,
      agent_key: agentKey,
      payload: redactForTrace(e.payload),
    }));
    await sb.from("session_event").insert(rows);
  } catch {
    /* fail-open */
  }
}

export async function recordRunSession(row: RunSessionRow): Promise<void> {
  try {
    const sb = getSb();
    if (!sb) return;
    await sb.from("run_session").insert({
      run_id: row.runId,
      stage_id: row.stageId,
      session_id: row.sessionId,
      agent_key: row.agentKey ?? null,
    });
  } catch {
    /* fail-open */
  }
}
