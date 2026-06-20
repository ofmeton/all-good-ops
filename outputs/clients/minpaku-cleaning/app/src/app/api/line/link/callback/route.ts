import { NextResponse, type NextRequest } from "next/server";
import {
  bindLineUser,
  consumeNonce,
  getLineLinkReturnPath,
} from "@/lib/db/line-link";
import {
  extractLineUserIdFromIdToken,
  parseLineTokenResponse,
  LineIdTokenError,
} from "@/lib/line-login";

function appUrl(): string | null {
  const value = process.env.NEXT_PUBLIC_APP_URL;
  return value ? value.replace(/\/+$/, "") : null;
}

function returnCookieName(nonce: string): string {
  return `line_link_return_${nonce}`;
}

function isSafeReturnPath(path: string | undefined): path is string {
  return (
    typeof path === "string" &&
    (path.startsWith("/staff/") || path.startsWith("/property/")) &&
    !path.startsWith("//") &&
    !path.includes("\\")
  );
}

function redirectTo(path: string, status: "success" | "error", cookieName?: string) {
  const baseUrl = appUrl();
  const url = new URL(path, baseUrl ?? "http://localhost");
  url.searchParams.set("line_link", status);
  const res = NextResponse.redirect(url);
  if (cookieName) res.cookies.delete(cookieName);
  return res;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET;
  const baseUrl = appUrl();
  if (!channelId || !channelSecret || !baseUrl) {
    return new NextResponse(
      "LINE連携の設定が未完了です。管理者にお問い合わせください。",
      { status: 500 },
    );
  }
  if (!code || !state) {
    return new NextResponse("LINE連携の認証情報が不足しています。", { status: 400 });
  }
  const cookieName = returnCookieName(state);
  const cookieReturnPath = req.cookies.get(cookieName)?.value;

  const target = await consumeNonce(state);
  if (!target) {
    return new NextResponse("LINE連携リンクの有効期限が切れたか、既に使用されています。", {
      status: 410,
    });
  }

  const redirectUri = `${baseUrl}/api/line/link/callback`;
  const form = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: channelId,
    client_secret: channelSecret,
  });
  const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (!tokenRes.ok) {
    const fallback = isSafeReturnPath(cookieReturnPath)
      ? cookieReturnPath
      : await getLineLinkReturnPath(target);
    if (fallback) return redirectTo(fallback, "error", cookieName);
    return new NextResponse("LINE認証に失敗しました。", { status: 502 });
  }

  try {
    const tokenJson = await tokenRes.json().catch(() => {
      throw new LineIdTokenError("LINE token response を解析できません");
    });
    const tokenBody = parseLineTokenResponse(tokenJson);
    const lineUserId = extractLineUserIdFromIdToken(tokenBody.id_token, channelId);
    await bindLineUser(target, lineUserId);
    const path = isSafeReturnPath(cookieReturnPath)
      ? cookieReturnPath
      : await getLineLinkReturnPath(target);
    if (path) return redirectTo(path, "success", cookieName);
    return new NextResponse("LINE連携は完了しましたが、戻り先URLを確認できませんでした。", {
      status: 200,
    });
  } catch (e) {
    if (e instanceof LineIdTokenError) {
      const fallback = isSafeReturnPath(cookieReturnPath)
        ? cookieReturnPath
        : await getLineLinkReturnPath(target);
      if (fallback) return redirectTo(fallback, "error", cookieName);
      return new NextResponse("LINE認証情報の検証に失敗しました。", { status: 400 });
    }
    throw e;
  }
}
