// Next.js 16 proxy 規約（旧 middleware.ts）。Basic 認証で観測ダッシュボード全体を保護。
// ハンドラは default export（Next 16 middleware/proxy loader は default を読む）。
import { NextRequest, NextResponse } from "next/server";

export default function proxy(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = "Basic " + btoa(`${process.env.BASIC_AUTH_USER}:${process.env.BASIC_AUTH_PASS}`);
  if (auth !== expected) {
    return new NextResponse("Auth required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="xad"' },
    });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
