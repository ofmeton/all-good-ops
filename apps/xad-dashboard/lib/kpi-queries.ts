// kpi-queries.ts — トップ KPI ストリップ用の薄い count 専用クエリ（F10）。
// 既存 queries の条件を**複製**して持つ（import せず独立。head:true なので行転送ゼロ）。
// 条件の出典:
//   承認待ち      = lib/drafts-queries.ts listPendingDrafts
//   承認済みストック = lib/publish-queries.ts listApprovedStock
//   収集素材       = lib/curation-queries.ts tabCounts の collected
//   提案          = lib/proposals-queries.ts listPendingProposals
import { serverSupabase } from "./supabase";

export interface DashboardKpis {
  collectedMaterials: number;
  pendingApprovals: number;
  approvedStock: number;
  pendingProposals: number;
  lastRun: { status: string | null; startedAt: string | null } | null;
}

export async function dashboardKpis(): Promise<DashboardKpis> {
  const sb = serverSupabase();
  const [collected, pending, stock, proposals, lastRun] = await Promise.all([
    sb
      .from("curation_materials")
      .select("id", { count: "exact", head: true })
      .eq("selection_status", "collected"),
    sb
      .from("approval_drafts")
      .select("id", { count: "exact", head: true })
      .eq("editor_status", "approved")
      .eq("human_approval_status", "pending")
      .is("published_at", null)
      .is("scheduled_for", null),
    sb
      .from("post_drafts")
      .select("id", { count: "exact", head: true })
      .eq("human_approval_status", "approved")
      .is("scheduled_for", null)
      .is("published_at", null),
    sb
      .from("optimizer_proposal")
      .select("id", { count: "exact", head: true })
      .is("accepted", null),
    sb
      .from("run")
      .select("status, started_at")
      .order("started_at", { ascending: false })
      .limit(1),
  ]);
  return {
    collectedMaterials: collected.count ?? 0,
    pendingApprovals: pending.count ?? 0,
    approvedStock: stock.count ?? 0,
    pendingProposals: proposals.count ?? 0,
    lastRun: lastRun.data?.[0]
      ? {
          status: (lastRun.data[0].status as string | null) ?? null,
          startedAt: (lastRun.data[0].started_at as string | null) ?? null,
        }
      : null,
  };
}
