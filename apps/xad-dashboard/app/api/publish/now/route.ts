import { NextResponse } from "next/server";
import {
  getApprovedStockById,
  buildHandoffPayload,
  markPublished,
} from "@/lib/publish-queries";

// 「今すぐ手動投稿」API。2 モード:
//   mode="handoff" : id の承認済みストックを読み、chrome 半自動投稿用のハンドオフ payload を返す。
//   mode="confirm" : 投稿完了後、published_at を冪等 UPDATE で確定（二重押下は no-op）。
//
// ★ポリシー（厳守）: このルートは **X API を一切叩かない**。実投稿は chrome-devtools 半自動
//   （通常投稿コンポーザ・source=本人クライアント維持）でエージェントが行う。ここは投稿対象の
//   整形（handoff）と投稿後の記録（confirm=published_at）だけを担う。X_DIRECT_API_ENABLED /
//   x-publisher.ts Gate 5.5 には一切触れない。Next.js から X へポストする経路は存在しない。
//
// バリデーションは api/drafts/approve/route.ts を踏襲（id/PII は出さず id 長のみログ）。
export async function POST(req: Request) {
  let body: { id?: unknown; mode?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  const mode = body.mode === "confirm" ? "confirm" : body.mode === "handoff" ? "handoff" : null;
  if (!id || !mode) {
    return NextResponse.json({ error: "id/mode required (mode: handoff|confirm)" }, { status: 400 });
  }

  try {
    if (mode === "handoff") {
      const draft = await getApprovedStockById(id);
      if (!draft) {
        // 既に公開/予約された・存在しない → 候補外。投稿対象として返さない。
        return NextResponse.json({ error: "対象は承認済みストックにありません（公開済み/予約済み/不存在）" }, { status: 404 });
      }
      const payload = buildHandoffPayload(draft);
      console.info(
        JSON.stringify({
          level: "info",
          msg: "[publish/now] handoff",
          id,
          chars: payload.charCount,
          photos: payload.photos.length,
          video: payload.hasVideoDeepLink,
        }),
      );
      return NextResponse.json({ ok: true, mode, payload });
    }

    // mode === "confirm": 投稿完了後の published_at 確定（冪等）。
    const updated = await markPublished(id);
    console.info(
      JSON.stringify({ level: "info", msg: "[publish/now] confirm", id, updated }),
    );
    // updated===0 は二重押下 or 既公開（no-op）。エラーではなく ok:true で surface する。
    return NextResponse.json({ ok: true, mode, updated });
  } catch (e) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "[publish/now] failed",
        mode,
        id_len: id.length,
        error: (e as Error).message,
      }),
    );
    return NextResponse.json({ error: "publish action failed" }, { status: 500 });
  }
}
