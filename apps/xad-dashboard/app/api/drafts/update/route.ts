import { NextResponse } from "next/server";
import { validateBody } from "@/lib/drafts-logic";
import { joinThread, splitThread, validateThreadParts } from "@/lib/thread-logic";
import { updateDraftBody } from "@/lib/drafts-queries";

// 本文 inline 編集の保存: validateBody で 400、pending かつ未公開のみ更新。id のみログ。
//
// thread draft（要件7）: クライアントは body を THREAD_DELIM 区切りの全文で送る。
//   isThread=true のとき splitThread で再分割 → validateThreadParts で検証（空 part /
//   本数超過は 400 で保存ブロック）→ body=joinThread(parts)・thread_bodies=parts を両更新。
//   契約（migration 0027）: thread_bodies が投稿時の正・body は join 派生。両方を書く。
// 単一 draft（isThread 省略/false）は従来どおり body のみ更新（thread_bodies は触らない）。
export async function POST(req: Request) {
  let payload: { id?: string; body?: unknown; isThread?: unknown };
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

  const isThread = payload.isThread === true;
  // thread draft は分割・検証して両列更新。単一は body のみ（thread_bodies 未指定）。
  let bodyToSave = v.value;
  let threadBodies: string[] | undefined;
  if (isThread) {
    const parts = splitThread(v.value);
    const tv = validateThreadParts(parts);
    if (!tv.ok) {
      return NextResponse.json({ error: tv.errors.join(" / ") }, { status: 400 });
    }
    bodyToSave = joinThread(parts); // 区切りを正準形に正規化
    threadBodies = parts;
  }

  try {
    const updated = await updateDraftBody(id, bodyToSave, threadBodies);
    if (updated === 0) {
      return NextResponse.json(
        { ok: false, updated, warning: "対象が pending/未公開ではないため更新されませんでした" },
      );
    }
    console.info(
      JSON.stringify({ level: "info", msg: "[drafts/update]", id, updated, isThread }),
    );
    return NextResponse.json({
      ok: true,
      updated,
      ...(isThread ? { body: bodyToSave, threadCount: threadBodies?.length ?? 0 } : {}),
    });
  } catch (e) {
    console.error(
      JSON.stringify({ level: "error", msg: "[drafts/update] failed", id, error: (e as Error).message }),
    );
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }
}
