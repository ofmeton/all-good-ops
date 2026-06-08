import { NextResponse } from "next/server";
import { fetchRecommendations } from "@/lib/curation-queries";
import type { RecommendMaterialInput } from "@/lib/curation-formats";

/**
 * POST /api/curation/recommend
 * body: { materials: [{ id, text, lang?, hasMedia?, engagement? }] }
 * → worker /admin/recommend を呼び { recommendations } を返す。
 * fail-open: fetchRecommendations は内部で全失敗を握って [] を返す（throw しない）ため
 * UI を壊さない。bad json のみ 400。
 */
export async function POST(req: Request) {
  let body: { materials?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const raw = Array.isArray(body.materials) ? body.materials : [];
  // 境界検証: id/text を持つ row だけ worker へ渡す（無駄な従量課金を避ける）。
  const materials: RecommendMaterialInput[] = raw
    .filter((m): m is Record<string, unknown> => !!m && typeof m === "object")
    .map((m) => ({
      id: typeof m.id === "string" ? m.id : "",
      text: typeof m.text === "string" ? m.text : "",
      lang: typeof m.lang === "string" ? m.lang : null,
      hasMedia: !!m.hasMedia,
      engagement:
        m.engagement && typeof m.engagement === "object"
          ? (m.engagement as Record<string, number>)
          : null,
    }))
    .filter((m) => m.id.length > 0 && m.text.trim().length > 0);

  const recommendations = await fetchRecommendations(materials);
  return NextResponse.json({ ok: true, recommendations });
}
