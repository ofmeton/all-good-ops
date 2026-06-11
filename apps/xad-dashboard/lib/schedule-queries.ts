import { serverSupabase } from "./supabase";
import { toPlanRows, type PlanRow, type Reservation, type ScheduleStock } from "./schedule-logic";

/**
 * 承認済み未予約・未公開ストックを承認順(FIFO)で取得。
 * 条件 = human_approval_status='approved' AND scheduled_for IS NULL AND published_at IS NULL。
 * publish-queries.listApprovedStock（今すぐ投稿）と**同一の3条件**で、両タブが同じストックを出す。
 * （published_at IS NULL を欠くと、今すぐ投稿で公開済みの draft がスケジュールに残り二重投稿の温床になる）。
 * CLI plan-scheduled-publish.ts と同じ source(post_drafts)・同じ並び。serverSupabase(service role) 専用。
 */
export async function listApprovedStock(limit = 100): Promise<ScheduleStock[]> {
  const sb = serverSupabase();
  const { data, error } = await sb
    .from("post_drafts")
    .select("id, body, fmat, human_approved_at, risk_level, risk_reasons, attachments")
    .eq("human_approval_status", "approved")
    .is("scheduled_for", null)
    .is("published_at", null) // ← 今すぐ投稿タブと整合（公開済みはストックに残さない・二重投稿防止）
    .order("human_approved_at", { ascending: true })
    .order("id", { ascending: true }) // 同値/null 時の非決定性回避（FIFO 安定化）
    .limit(limit);
  if (error) throw new Error(`listApprovedStock failed: ${error.message}`);
  return (data ?? []) as ScheduleStock[];
}

/**
 * Worker /admin/plan-slots を叩いてスロット割当プランを取得（SSOT は Worker = CLI と同じ planSlots）。
 * fetchTemplateOptions と同じ規約（WORKER_BASE_URL + OAUTH_ADMIN_SECRET / Bearer）だが、
 * こちらは **fail-loud**（プランは閲覧体験の中核＝黙って空にしない）。env 未設定・HTTP 失敗は throw。
 */
export async function fetchSlotPlan(
  opts: { includeToday?: boolean; days?: number } = {},
): Promise<PlanRow[]> {
  const base = process.env.WORKER_BASE_URL;
  const key = process.env.OAUTH_ADMIN_SECRET;
  if (!base || !key) throw new Error("WORKER_BASE_URL / OAUTH_ADMIN_SECRET 未設定");
  const url = `${base.replace(/\/$/, "")}/admin/plan-slots`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      includeToday: !!opts.includeToday,
      ...(opts.days && opts.days > 0 ? { days: Math.floor(opts.days) } : {}),
    }),
  });
  if (!res.ok) throw new Error(`plan-slots failed: HTTP ${res.status}`);
  const body = (await res.json()) as { plan?: unknown };
  return toPlanRows(body?.plan); // 外部出力は境界で検証
}

export interface ConfirmResult {
  applied: number;
  noop: number;
  runId?: string;
  results: { draftId: string; applied: boolean }[];
}

/**
 * Worker /admin/mark-scheduled を叩いて予約を確定（本体 write）。fail-loud（throw）。
 * Worker 側が冪等 UPDATE（scheduled_for IS NULL）+ 観測 trace を SSOT lib で実行する。
 */
export async function confirmReservations(marks: Reservation[]): Promise<ConfirmResult> {
  const base = process.env.WORKER_BASE_URL;
  const key = process.env.OAUTH_ADMIN_SECRET;
  if (!base || !key) throw new Error("WORKER_BASE_URL / OAUTH_ADMIN_SECRET 未設定");
  const url = `${base.replace(/\/$/, "")}/admin/mark-scheduled`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ reservations: marks }),
  });
  if (!res.ok) throw new Error(`mark-scheduled failed: HTTP ${res.status}`);
  const body = (await res.json()) as Partial<ConfirmResult>;
  return {
    applied: typeof body.applied === "number" ? body.applied : 0,
    noop: typeof body.noop === "number" ? body.noop : 0,
    runId: typeof body.runId === "string" ? body.runId : undefined,
    results: Array.isArray(body.results) ? body.results : [],
  };
}
