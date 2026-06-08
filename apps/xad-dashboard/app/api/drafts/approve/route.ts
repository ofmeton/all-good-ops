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
export async function POST(req: Request) {
  let body: { ids?: string[]; action?: DraftApprovalAction; attachments?: unknown };
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

  try {
    const updated = await setApprovalStatus(ids, status, attachments);
    console.info(
      JSON.stringify({
        level: "info",
        msg: "[drafts/approve]",
        action,
        ids: ids.length,
        updated,
        attachments: attachments?.length ?? 0,
      }),
    );
    return NextResponse.json({ ok: true, updated });
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
