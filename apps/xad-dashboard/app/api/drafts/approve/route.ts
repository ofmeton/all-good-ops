import { NextResponse } from "next/server";
import {
  ACTION_TO_STATUS,
  validateAttachments,
  type DraftApprovalAction,
  type Attachment,
} from "@/lib/drafts-logic";
import { setApprovalStatus } from "@/lib/drafts-queries";

// 承認/却下: pending のみ RPC で CAS 遷移。id のみログ（本文/PII は出さない）。
// 承認時に写真の upload intent(attachments) を受け取り RPC へ渡す（境界で検証）。
// reason: 承認/却下理由の任意自由テキスト（Stage 2B）。上限 2000 字。
export async function POST(req: Request) {
  let body: { ids?: string[]; action?: DraftApprovalAction; attachments?: unknown; reason?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const ids = body.ids ?? [];
  const action = body.action;
  if (!action || !(action in ACTION_TO_STATUS) || ids.length === 0) {
    return NextResponse.json({ error: "ids/action required" }, { status: 400 });
  }
  const status = ACTION_TO_STATUS[action];

  // attachments は単一 draft 承認時のみ（RPC は claimed 全件に同値を書くため曖昧回避）
  // 既知 follow-up: 「写真を全部外して 0 枚にする」意図は現状送らない（空配列→null 化で
  //   RPC が coalesce により既存値を維持する＝クリア経路が無い）。承認時の新規 intent 付与のみ対応。
  let attachments: Attachment[] | null = null;
  if (body.attachments != null) {
    if (action !== "approve" || ids.length !== 1) {
      return NextResponse.json(
        { error: "attachments は単一 draft の承認時のみ指定できます" },
        { status: 400 },
      );
    }
    const v = validateAttachments(body.attachments);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    attachments = v.value;
  }

  // reason: 任意の承認/却下理由（Stage 2B）。文字列のみ・上限 2000 字。
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
    const updated = await setApprovalStatus(ids, status, attachments, reason);
    console.info(
      JSON.stringify({
        level: "info",
        msg: "[drafts/approve]",
        action,
        ids: ids.length,
        updated,
        attachments: attachments?.length ?? 0,
        has_reason: reason != null,
      }),
    );
    return NextResponse.json({ ok: true, updated, attachments: attachments?.length ?? 0 });
  } catch (e) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "[drafts/approve] failed",
        action,
        ids: ids.length,
        error: (e as Error).message,
      }),
    );
    return NextResponse.json({ error: "approval failed" }, { status: 500 });
  }
}
