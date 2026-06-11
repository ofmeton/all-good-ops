import { prepareMediaDownload } from "@/lib/media-download";

// 外部 CDN を server 側で fetch するため node ランタイム。
export const runtime = "nodejs";

/**
 * GET /api/media/download?url=<media url>
 * クロスオリジンの twitter CDN 画像を same-origin で attachment 配信し、ブラウザから直接DLさせる。
 * url は allowlist（pbs.twimg.com / video.twimg.com）で検証（SSRF 防止）。
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const prepared = prepareMediaDownload(searchParams.get("url"));
  if (!prepared) {
    return new Response("invalid or disallowed url", { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(prepared.fetchUrl, { redirect: "follow" });
  } catch {
    return new Response("upstream fetch failed", { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return new Response("upstream error", { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  return new Response(upstream.body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${prepared.filename}"`,
      "Cache-Control": "private, max-age=0",
    },
  });
}
