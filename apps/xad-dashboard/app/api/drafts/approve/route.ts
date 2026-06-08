import { NextResponse } from "next/server";
import { ACTION_TO_STATUS, type DraftApprovalAction } from "@/lib/drafts-logic";
import { setApprovalStatus } from "@/lib/drafts-queries";

// 承認/却下: pending のみ RPC で CAS 遷移。id のみログ（本文/PII は出さない）。
export async function POST(req: Request) {
  let body: { ids?: string[]; action?: DraftApprovalAction };
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

  try {
    const updated = await setApprovalStatus(ids, status);
    console.info(
      JSON.stringify({ level: "info", msg: "[drafts/approve]", action, ids: ids.length, updated }),
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
