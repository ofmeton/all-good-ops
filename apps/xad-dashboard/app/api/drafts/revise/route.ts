import { NextResponse } from "next/server";
import { validateInstruction } from "@/lib/drafts-logic";
import { FMAT_OPTIONS } from "@/lib/curation-formats";
import { requestRevision } from "@/lib/drafts-queries";
import { enqueueCompose } from "@/lib/curation-queries";

const FMAT_VALUES: readonly string[] = FMAT_OPTIONS.map((o) => o.value);

// 修正依頼（要件4+5）: pending のみ RPC で 'revision_requested' へ CAS 遷移し、
// 成功時に即 compose を enqueue（決定2: select 経路と同 UX で再生成を起動）。
// 人間ゲート不変: 再生成後は通常 check → 人間承認へ戻る（自動公開に到達しない）。
// id のみログ（指示文/PII は出さない）。enqueue 失敗は遷移成立済のため warning surface。
export async function POST(req: Request) {
  let body: {
    id?: string;
    instruction?: unknown;
    desiredFmat?: unknown;
    templateId?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const id = body.id;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  // 指示文（必須・1〜2000字）。境界検証は approve route の reason 様式に倣う。
  const v = validateInstruction(body.instruction);
  if (!v.ok) {
    return NextResponse.json({ error: v.error }, { status: 400 });
  }

  // desiredFmat: 未指定（現状維持）なら null。指定時は whitelist 検証（RPC も再検証する）。
  let desiredFmat: string | null = null;
  if (body.desiredFmat != null && body.desiredFmat !== "") {
    if (typeof body.desiredFmat !== "string" || !FMAT_VALUES.includes(body.desiredFmat)) {
      return NextResponse.json({ error: "desiredFmat が不正です" }, { status: 400 });
    }
    desiredFmat = body.desiredFmat;
  }

  // templateId: 未指定（現状維持）なら null。文字列のみ（id の正当性は registry 側に委譲）。
  let templateId: string | null = null;
  if (body.templateId != null && body.templateId !== "") {
    if (typeof body.templateId !== "string") {
      return NextResponse.json({ error: "templateId が不正です" }, { status: 400 });
    }
    templateId = body.templateId;
  }

  let updated: number;
  try {
    updated = await requestRevision(id, v.value, desiredFmat, templateId);
  } catch (e) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "[drafts/revise] failed",
        id,
        error: (e as Error).message,
      }),
    );
    return NextResponse.json({ error: "revision failed" }, { status: 500 });
  }

  // CAS で claim できなかった（既に処理済み・公開済み等）→ enqueue せず no-op を返す。
  if (updated === 0) {
    console.info(JSON.stringify({ level: "info", msg: "[drafts/revise] no-op", id, updated }));
    return NextResponse.json({ ok: true, updated: 0, enqueued: false });
  }

  // 遷移成立 → 即 compose を enqueue（決定2）。失敗しても遷移は成立済なので
  // throw せず warning を surface（次回 cron / 手動 enqueue で再生成は拾える）。
  let enqueued = false;
  let warning: string | undefined;
  try {
    const runId = await enqueueCompose();
    enqueued = true;
    console.info(
      JSON.stringify({ level: "info", msg: "[drafts/revise]", id, updated, enqueued, runId }),
    );
  } catch (e) {
    warning =
      "修正依頼は受理しましたが、再生成の起動に失敗しました（後で自動で再生成されます）";
    console.error(
      JSON.stringify({
        level: "error",
        msg: "[drafts/revise] enqueue failed",
        id,
        error: (e as Error).message,
      }),
    );
  }

  return NextResponse.json({ ok: true, updated, enqueued, ...(warning ? { warning } : {}) });
}
