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
  const { data: sessions } = await sb
    .from("run_session")
    .select("*")
    .eq("run_id", runId)
    .order("id", { ascending: true });
  return { run: run.data, traces: traces ?? [], sessions: sessions ?? [] };
}

export async function runSessions(runId: string) {
  const sb = serverSupabase();
  const { data } = await sb
    .from("run_session")
    .select("*")
    .eq("run_id", runId)
    .order("id", { ascending: true });
  return data ?? [];
}

export async function sessionEvents(sessionId: string) {
  const sb = serverSupabase();
  const { data } = await sb
    .from("session_event")
    .select("*")
    .eq("session_id", sessionId)
    .order("seq", { ascending: true });
  return data ?? [];
}

export interface ProvenanceMaterial {
  id: string;
  sourceRef: string | null;
  collectorSessionId: string | null;
}
export interface ComposeProvenance {
  writerSessionId: string | null;
  materials: ProvenanceMaterial[];
}

export async function composeProvenance(draftId: string): Promise<ComposeProvenance> {
  const sb = serverSupabase();
  const { data: draft } = await sb
    .from("post_drafts")
    .select("id,core_idea_id,writer_session_id")
    .eq("id", draftId)
    .single();
  const writerSessionId = (draft as { writer_session_id?: string } | null)?.writer_session_id ?? null;
  const coreIdeaId = (draft as { core_idea_id?: string } | null)?.core_idea_id;
  if (!coreIdeaId) return { writerSessionId, materials: [] };

  const { data: ci } = await sb
    .from("core_ideas")
    .select("source_material_ids")
    .eq("id", coreIdeaId)
    .single();
  const ids = ((ci as { source_material_ids?: string[] } | null)?.source_material_ids ?? []) as string[];
  if (ids.length === 0) return { writerSessionId, materials: [] };

  const { data: mats } = await sb
    .from("materials_store")
    .select("id,source_ref,meta")
    .in("id", ids);
  const materials: ProvenanceMaterial[] = (mats ?? []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    sourceRef: (m.source_ref as string | null) ?? null,
    collectorSessionId: ((m.meta as { collector_session_id?: string } | null)?.collector_session_id) ?? null,
  }));
  return { writerSessionId, materials };
}
