import { NextResponse, type NextRequest } from "next/server";
import { resolveActorByToken } from "@/lib/auth";
import { issueNonce, type LineLinkTarget } from "@/lib/db/line-link";

function appUrl(): string | null {
  const value = process.env.NEXT_PUBLIC_APP_URL;
  return value ? value.replace(/\/+$/, "") : null;
}

function returnCookieName(nonce: string): string {
  return `line_link_return_${nonce}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  const baseUrl = appUrl();
  if (!channelId || !baseUrl) {
    return new NextResponse(
      "LINE連携の設定が未完了です。管理者にお問い合わせください。",
      { status: 500 },
    );
  }
  if (!token) {
    return new NextResponse("token が必要です。", { status: 400 });
  }

  const actor = await resolveActorByToken(token);
  if (!actor || (actor.role !== "staff" && actor.role !== "owner")) {
    return new NextResponse("このURLは無効です。", { status: 401 });
  }

  const target: LineLinkTarget =
    actor.role === "staff"
      ? { type: "staff", staffId: actor.staffId }
      : { type: "owner", ownerId: actor.ownerId };
  const nonce = await issueNonce(target);
  const returnPath =
    actor.role === "staff"
      ? `/staff/${encodeURIComponent(token)}`
      : `/property/${encodeURIComponent(token)}`;
  const redirectUri = `${baseUrl}/api/line/link/callback`;
  const authorizeUrl = new URL("https://access.line.me/oauth2/v2.1/authorize");
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", channelId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", nonce);
  authorizeUrl.searchParams.set("scope", "profile openid");
  authorizeUrl.searchParams.set("bot_prompt", "aggressive");

  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set(returnCookieName(nonce), returnPath, {
    httpOnly: true,
    sameSite: "lax",
    secure: baseUrl.startsWith("https://"),
    path: "/",
    maxAge: 10 * 60,
  });
  return res;
}
