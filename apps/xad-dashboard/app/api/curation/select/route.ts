import { NextResponse } from "next/server";
import { ACTION_TO_STATUS, buildEventRows, type CurationAction } from "@/lib/curation-logic";
import {
  fetchMaterialsForEvents, setSelectionStatus, recordCurationEvents, enqueueCompose,
} from "@/lib/curation-queries";

export async function POST(req: Request) {
  let body: { ids?: string[]; action?: CurationAction; note?: string };
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
  const updated = await setSelectionStatus(ids, status);

  // 3. send_to_compose のみ enqueue（失敗しても更新は成功扱い）
  let composeRunId: string | null = null;
  let warning: string | undefined;
  if (action === "send_to_compose") {
    try { composeRunId = await enqueueCompose(); }
    catch (e) { warning = `執筆ジョブ起動失敗（再送可）: ${(e as Error).message}`; }
  }

  // 4. events 追記（snapshot + compose_run_id）
  const rows = buildEventRows(materials, action, body.note ?? null)
    .map((r) => ({ ...r, compose_run_id: composeRunId }));
  await recordCurationEvents(rows);

  return NextResponse.json({ ok: true, updated, composeRunId, warning });
}
