import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = "Basic " + btoa(`${process.env.BASIC_AUTH_USER}:${process.env.BASIC_AUTH_PASS}`);
  if (auth !== expected) {
    return new NextResponse("Auth required", {
      status: 401, headers: { "WWW-Authenticate": 'Basic realm="xad"' },
    });
  }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
