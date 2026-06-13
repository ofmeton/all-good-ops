import { NextResponse } from "next/server";
import { discardApprovedDrafts } from "@/lib/publish-queries";

// 承認済みドラフトの論理破棄（要件3）。RPC discard_approved_drafts(0026) で CAS 遷移。
//   CAS: status='approved' AND published_at IS NULL AND scheduled_for IS NULL → 'discarded'。
//   元素材(core_ideas)は status='draft' に戻し再利用可（決定3）。復元可（論理破棄）。
//
// 人間ゲート: 破棄は UI の確認 dialog 起点（人間操作）。本ルートは記録のみで X API は介在しない。
// バリデーションは api/drafts/approve/route.ts を踏襲（ids/reason のみ受理・PII は出さず件数ログ）。
export async function POST(req: Request) {
  let body: { ids?: unknown; reason?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  // ids: 非空の文字列配列のみ受理。
  const rawIds = body.ids;
  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    return NextResponse.json({ error: "ids required (non-empty array)" }, { status: 400 });
  }
  const ids = rawIds.filter((v): v is string => typeof v === "string" && v.length > 0);
  if (ids.length === 0) {
    return NextResponse.json({ error: "ids must be non-empty strings" }, { status: 400 });
  }

  // reason: 任意の破棄理由。文字列のみ・上限 2000 字（approve route と同方針）。
  let reason: string | null = null;
  if (body.reason != null) {
    if (typeof body.reason !== "string") {
      return NextResponse.json({ error: "reason は文字列で指定してください" }, { status: 400 });
    }
    const trimmed = body.reason.trim();
    if (trimmed.length > 2000) {
      return NextResponse.json(
        { error: `reason が長すぎます（${trimmed.length}/2000字）` },
        { status: 400 },
      );
    }
    reason = trimmed.length > 0 ? trimmed : null;
  }

  try {
    const discarded = await discardApprovedDrafts(ids, reason);
    console.info(
      JSON.stringify({
        level: "info",
        msg: "[drafts/discard]",
        ids: ids.length,
        discarded,
        has_reason: reason != null,
      }),
    );
    // discarded===0 は CAS 不一致（対象外/二重押下）= no-op。エラーではなく ok:true で surface。
    return NextResponse.json({ ok: true, discarded });
  } catch (e) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "[drafts/discard] failed",
        ids: ids.length,
        error: (e as Error).message,
      }),
    );
    return NextResponse.json({ error: "discard failed" }, { status: 500 });
  }
}
