/**
 * scripts/x-bookmark-login.ts — twitterapi.io user_login_v2 で bookmark 用 login_cookie を取得するローカル helper。
 *
 * 使い方:
 *   TWITTERAPI_IO_KEY=... X_LOGIN_USERNAME=... X_LOGIN_EMAIL=... X_LOGIN_PASSWORD=... X_LOGIN_PROXY=... X_LOGIN_2FA=... \
 *     tsx scripts/x-bookmark-login.ts
 *   proxy は必須（residential proxy URL）。X_LOGIN_2FA は 6 桁コードではなく base32 TOTP secret。
 *
 * CI では実行しない。パスワード、proxy 認証情報、cookie をログに混ぜない。
 */
import "dotenv/config";

const BASE_URL = "https://api.twitterapi.io";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[x-bookmark-login] env ${name} is required`);
  return v;
}

async function main(): Promise<void> {
  const apiKey = requireEnv("TWITTERAPI_IO_KEY");
  const userName = requireEnv("X_LOGIN_USERNAME");
  const email = requireEnv("X_LOGIN_EMAIL");
  const password = requireEnv("X_LOGIN_PASSWORD");
  const proxy = process.env.X_LOGIN_PROXY ?? process.env.TWITTERAPI_IO_PROXY;
  if (!proxy) throw new Error("[x-bookmark-login] env X_LOGIN_PROXY or TWITTERAPI_IO_PROXY is required");
  const totpSecret = process.env.X_LOGIN_2FA;

  const res = await fetch(`${BASE_URL}/twitter/user_login_v2`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_name: userName,
      email,
      password,
      proxy,
      ...(totpSecret ? { totp_secret: totpSecret } : {}),
    }),
  });

  const json = await res.json().catch(() => ({})) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`[x-bookmark-login] user_login_v2 failed: ${res.status} ${res.statusText}`);
  }

  if (typeof json.login_cookie !== "string" || json.login_cookie.length === 0) {
    throw new Error("[x-bookmark-login] login_cookie not found in user_login_v2 response");
  }

  console.log("# Put this value with:");
  console.log("# wrangler secret put TWITTERAPI_IO_LOGIN_COOKIE");
  console.log(json.login_cookie);
}

if (process.argv[1] && process.argv[1].endsWith("x-bookmark-login.ts")) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
