import { serverSupabase } from "./supabase";
import type { Trace } from "./colors";

export async function latestTraceByStage(): Promise<Record<string, NonNullable<Trace>>> {
  const sb = serverSupabase();
  const { data } = await sb
    .from("run_trace")
    .select("stage_id,status,outcome,started_at")
    .order("started_at", { ascending: false })
    .limit(200);
  const out: Record<string, NonNullable<Trace>> = {};
  for (const r of data ?? []) {
    if (!out[r.stage_id]) {
      out[r.stage_id] = {
        status: r.status as NonNullable<Trace>["status"],
        outcome: r.outcome ?? undefined,
      };
    }
  }
  return out;
}

export async function recentTracesForStage(stageId: string, limit = 20) {
  const sb = serverSupabase();
  const { data } = await sb
    .from("run_trace")
    .select("*")
    .eq("stage_id", stageId)
    .order("started_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function listRuns(limit = 50) {
  const sb = serverSupabase();
  const { data } = await sb
    .from("run")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function runTimeline(runId: string) {
  const sb = serverSupabase();
  const run = await sb.from("run").select("*").eq("id", runId).single();
  const { data: traces } = await sb
    .from("run_trace")
    .select("*")
    .eq("run_id", runId)
    .order("started_at", { ascending: true })
    .order("id", { ascending: true });
  return { run: run.data, traces: traces ?? [] };
}
