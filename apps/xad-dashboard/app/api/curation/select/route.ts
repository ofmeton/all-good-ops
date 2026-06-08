import { NextResponse } from "next/server";
import { ACTION_TO_STATUS, buildEventRows, type CurationAction } from "@/lib/curation-logic";
import {
  fetchMaterialsForEvents, setSelectionStatus, recordCurationEvents, enqueueCompose,
} from "@/lib/curation-queries";

export async function POST(req: Request) {
  let body: { ids?: string[]; action?: CurationAction; note?: string; desiredFmat?: string; templateId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const ids = body.ids ?? [];
  const action = body.action;
  if (!action || !(action in ACTION_TO_STATUS) || ids.length === 0) {
    return NextResponse.json({ error: "ids/action required" }, { status: 400 });
  }
  const status = ACTION_TO_STATUS[action];

  // 1. snapshot 用に現在の素材を読む（from_status / scores / discovery）
  const materials = await fetchMaterialsForEvents(ids);

  // 2. status を原子更新（RPC 失敗時はここで throw → enqueue しない）
  //    send_to_compose のときだけ希望フォーマット/テンプレを meta に記録（他は null = 既存保持）
  const updated =
    action === "send_to_compose"
      ? await setSelectionStatus(ids, status, body.desiredFmat ?? null, body.templateId ?? null)
      : await setSelectionStatus(ids, status);

  // 3. send_to_compose のみ enqueue（失敗しても更新は成功扱い）。
  //    updated===0（id 不一致/source_type 不一致で 1 件も queued 化せず）なら enqueue しない
  //    （素材ゼロの orphan compose run を作らない）。warning で可視化。
  let composeRunId: string | null = null;
  let warning: string | undefined;
  if (action === "send_to_compose") {
    if (updated === 0) {
      warning = "対象素材が 0 件のため執筆ジョブは起動しませんでした（id/種別を確認）";
    } else {
      try { composeRunId = await enqueueCompose(); }
      catch (e) { warning = `執筆ジョブ起動失敗（再送可）: ${(e as Error).message}`; }
    }
  }

  // 4. events 追記（snapshot + compose_run_id）
  const rows = buildEventRows(materials, action, body.note ?? null)
    .map((r) => ({ ...r, compose_run_id: composeRunId }));
  await recordCurationEvents(rows);

  return NextResponse.json({ ok: true, updated, composeRunId, warning });
}
