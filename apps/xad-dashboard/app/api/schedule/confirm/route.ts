import { NextResponse } from "next/server";
import { validateMarks } from "@/lib/schedule-logic";
import { confirmReservations } from "@/lib/schedule-queries";

/**
 * POST /api/schedule/confirm  ← 人間ゲート（「予約を確定」ボタン）
 * body: { marks: [{ draftId, scheduledFor, scheduledPostId? }] }
 * → 境界検証(validateMarks: draft/スロット重複も弾く) → Worker /admin/mark-scheduled。
 * 冪等: 既予約は applied=false の no-op として集計（二重予約防止）。
 * api/drafts/approve のバリデーション様式を踏襲（bad json=400 / 検証失敗=400 / 配管失敗=500）。
 */
export async function POST(req: Request) {
  let body: { marks?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const v = validateMarks(body?.marks);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  if (v.value.length === 0) {
    return NextResponse.json({ error: "確定する予約がありません" }, { status: 400 });
  }
  try {
    const result = await confirmReservations(v.value);
    console.info(
      JSON.stringify({
        level: "info",
        msg: "[schedule/confirm]",
        marks: v.value.length,
        applied: result.applied,
        noop: result.noop,
        runId: result.runId ?? null,
      }),
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "[schedule/confirm] failed",
        marks: v.value.length,
        error: (e as Error).message,
      }),
    );
    return NextResponse.json({ error: "予約確定に失敗しました" }, { status: 500 });
  }
}
