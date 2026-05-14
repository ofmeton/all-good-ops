import { NextResponse, type NextRequest } from "next/server";

// 現在のパスをリクエストヘッダーに載せ、admin/layout.tsx が headers() で読めるようにする。
// response.headers ではなく request.headers に載せる点に注意（layout が読むのはリクエスト側）。
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: "/admin/:path*" };
