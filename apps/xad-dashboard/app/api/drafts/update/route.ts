import { NextResponse } from "next/server";
import { validateBody } from "@/lib/drafts-logic";
import { updateDraftBody } from "@/lib/drafts-queries";

// 本文 inline 編集の保存: validateBody で 400、pending かつ未公開のみ更新。id のみログ。
export async function POST(req: Request) {
  let payload: { id?: string; body?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const id = payload.id;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const v = validateBody(payload.body);
  if (!v.ok) {
    return NextResponse.json({ error: v.error }, { status: 400 });
  }

  try {
    const updated = await updateDraftBody(id, v.value);
    if (updated === 0) {
      return NextResponse.json(
        { ok: false, updated, warning: "対象が pending/未公開ではないため更新されませんでした" },
      );
    }
    console.info(JSON.stringify({ level: "info", msg: "[drafts/update]", id, updated }));
    return NextResponse.json({ ok: true, updated });
  } catch (e) {
    console.error(
      JSON.stringify({ level: "error", msg: "[drafts/update] failed", id, error: (e as Error).message }),
    );
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }
}
