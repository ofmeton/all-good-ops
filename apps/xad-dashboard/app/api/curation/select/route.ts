import { NextResponse } from "next/server";
import { ACTION_TO_STATUS, buildEventRows, type CurationAction } from "@/lib/curation-logic";
import {
  fetchMaterialsForEvents, setSelectionStatus, setSelectionStatusItems,
  recordCurationEvents, enqueueCompose, type SelectionItem,
} from "@/lib/curation-queries";

interface SelectAssignment { id: string; desiredFmat?: string; templateId?: string }

export async function POST(req: Request) {
  let body: {
    ids?: string[]; action?: CurationAction; note?: string;
    desiredFmat?: string; templateId?: string;
    assignments?: SelectAssignment[];
  };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const ids = body.ids ?? [];
  const action = body.action;
  if (!action || !(action in ACTION_TO_STATUS) || ids.length === 0) {
    return NextResponse.json({ error: "ids/action required" }, { status: 400 });
  }
  const status = ACTION_TO_STATUS[action];

  // 素材ごと割り当て（要件1）。外部入力なので境界検証: 配列かつ各要素の id が string のものだけ採る。
  // ids に存在する素材のみ通し（未知 id 混入を弾く）。1 件でも有効なら per-item RPC 経路を使う。
  const idSet = new Set(ids);
  const assignments: SelectionItem[] =
    action === "send_to_compose" && Array.isArray(body.assignments)
      ? body.assignments
          .filter((a): a is SelectAssignment => !!a && typeof a.id === "string" && idSet.has(a.id))
          .map((a) => ({
            id: a.id,
            desiredFmat: typeof a.desiredFmat === "string" ? a.desiredFmat : null,
            templateId: typeof a.templateId === "string" ? a.templateId : null,
          }))
      : [];

  // 1. snapshot 用に現在の素材を読む（from_status / scores / discovery）
  const materials = await fetchMaterialsForEvents(ids);

  // 2. status を原子更新（RPC 失敗時はここで throw → enqueue しない）
  //    send_to_compose のとき:
  //      - assignments あり → 素材ごと希望を per-item RPC（0025）で反映
  //      - assignments なし → 既存 4 引数 RPC（バッチ全件同一・後方互換）
  let updated: number;
  if (action === "send_to_compose") {
    updated =
      assignments.length > 0
        ? await setSelectionStatusItems(assignments, status)
        : await setSelectionStatus(ids, status, body.desiredFmat ?? null, body.templateId ?? null);
  } else {
    updated = await setSelectionStatus(ids, status);
  }

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
