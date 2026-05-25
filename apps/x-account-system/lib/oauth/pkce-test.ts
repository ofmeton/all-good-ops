/**
 * X OAuth 2.0 PKCE test harness
 *
 * v10.2 §3.5 CR-4 の 4 項目を検証する:
 *   (1) code_verifier + code_challenge 生成 + 認可 URL 取得
 *   (2) callback コードから access_token + refresh_token 取得 (offline.access scope 必須)
 *   (3) refresh_token rotation を 2 回連続成功 (毎回新 refresh_token が出ること)
 *   (4) non_public_metrics (user_profile_clicks + url_link_clicks) を user context で GET
 *
 * 使い方:
 *   # Step 1: 認可 URL を取得
 *   tsx lib/oauth/pkce-test.ts --step=authorize
 *
 *   # Step 2: callback の code を貼って token 取得
 *   tsx lib/oauth/pkce-test.ts --step=token --code=<authorization_code> --state=<state>
 *
 *   # Step 3: refresh 2 回
 *   tsx lib/oauth/pkce-test.ts --step=refresh --refresh-token=<refresh_token>
 *
 *   # Step 4: non_public_metrics GET
 *   tsx lib/oauth/pkce-test.ts --step=metrics --access-token=<access_token> --tweet-id=<id>
 *
 *   # Step 5: refresh 失敗 → auth_blocked 通知 dry-run
 *   tsx lib/oauth/pkce-test.ts --step=auth-blocked-dry-run
 */
import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";

const X_CLIENT_ID = process.env.X_CLIENT_ID ?? "";
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET ?? "";
const X_REDIRECT_URI = process.env.X_REDIRECT_URI ?? "http://localhost:3000/oauth/x/callback";
const X_OAUTH_SCOPES =
  process.env.X_OAUTH_SCOPES ?? "tweet.read tweet.write users.read offline.access";

const TOKEN_URL = "https://api.x.com/2/oauth2/token";
const AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";

type TokenResponse = {
  token_type: string;
  expires_in: number;
  access_token: string;
  scope: string;
  refresh_token?: string;
};

// ---------------------------------------------------------------------------
// PKCE helpers
// ---------------------------------------------------------------------------
function base64url(buf: Buffer | Uint8Array): string {
  return Buffer.from(buf).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function generateCodeVerifier(): string {
  return base64url(randomBytes(64));
}

function generateCodeChallenge(verifier: string): string {
  return base64url(createHash("sha256").update(verifier).digest());
}

function generateState(): string {
  return base64url(randomBytes(24));
}

// ---------------------------------------------------------------------------
// Step 1: authorize
// ---------------------------------------------------------------------------
function step_authorize() {
  if (!X_CLIENT_ID) throw new Error("X_CLIENT_ID not set in env");
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);
  const state = generateState();
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", X_CLIENT_ID);
  url.searchParams.set("redirect_uri", X_REDIRECT_URI);
  url.searchParams.set("scope", X_OAUTH_SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");

  // 確認のため verifier + state も保存推奨 (本番は Supabase 等に)
  console.log(JSON.stringify({
    step: "authorize",
    verifier,
    state,
    challenge,
    authorizeUrl: url.toString(),
    next: "ブラウザで authorizeUrl にアクセス → callback の code と state を取得",
  }, null, 2));
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Step 2: token
// ---------------------------------------------------------------------------
async function step_token(code: string, verifier: string) {
  if (!X_CLIENT_ID || !X_CLIENT_SECRET) {
    throw new Error("X_CLIENT_ID / X_CLIENT_SECRET not set");
  }
  const basic = Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString("base64");
  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    client_id: X_CLIENT_ID,
    redirect_uri: X_REDIRECT_URI,
    code_verifier: verifier,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = (await res.json()) as TokenResponse | { error: string };
  if (!res.ok) {
    console.error(JSON.stringify({ step: "token", status: res.status, body: data }, null, 2));
    process.exit(1);
  }
  const ok = "refresh_token" in data && Boolean(data.refresh_token);
  console.log(JSON.stringify({
    step: "token",
    ok,
    hasRefreshToken: ok,
    scopes: (data as TokenResponse).scope,
    expiresIn: (data as TokenResponse).expires_in,
    accessTokenPreview: (data as TokenResponse).access_token?.slice(0, 16) + "...",
    refreshTokenPreview: ok ? (data as TokenResponse).refresh_token!.slice(0, 16) + "..." : null,
    next: ok ? "次は --step=refresh --refresh-token=<value>" : "offline.access scope が無いか確認",
  }, null, 2));
  process.exit(ok ? 0 : 2);
}

// ---------------------------------------------------------------------------
// Step 3: refresh (2 回連続 rotation テスト)
// ---------------------------------------------------------------------------
async function step_refresh(refreshToken: string, rounds = 2) {
  const basic = Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString("base64");
  let current = refreshToken;
  const trail: Array<{
    round: number; ok: boolean; newRefresh: string | null; expiresIn: number | null;
  }> = [];

  for (let r = 1; r <= rounds; r++) {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: current,
      client_id: X_CLIENT_ID,
    });
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const data = (await res.json()) as TokenResponse | { error: string };
    if (!res.ok) {
      trail.push({ round: r, ok: false, newRefresh: null, expiresIn: null });
      console.error(JSON.stringify({ step: "refresh", round: r, status: res.status, body: data }, null, 2));
      break;
    }
    const t = data as TokenResponse;
    if (!t.refresh_token) {
      trail.push({ round: r, ok: false, newRefresh: null, expiresIn: t.expires_in });
      console.error(`round ${r}: rotation failed (no new refresh_token)`);
      break;
    }
    trail.push({
      round: r,
      ok: true,
      newRefresh: t.refresh_token.slice(0, 16) + "...",
      expiresIn: t.expires_in,
    });
    current = t.refresh_token;
  }

  const allOk = trail.length === rounds && trail.every((t) => t.ok);
  console.log(JSON.stringify({
    step: "refresh",
    rounds,
    allOk,
    trail,
    finalRefreshTokenPreview: allOk ? current.slice(0, 16) + "..." : null,
  }, null, 2));
  process.exit(allOk ? 0 : 3);
}

// ---------------------------------------------------------------------------
// Step 4: non_public_metrics
// ---------------------------------------------------------------------------
async function step_metrics(accessToken: string, tweetId: string) {
  const url = new URL(`https://api.x.com/2/tweets/${tweetId}`);
  url.searchParams.set("tweet.fields", "non_public_metrics,public_metrics,organic_metrics");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  const okMetrics =
    res.ok &&
    data &&
    data.data?.non_public_metrics &&
    typeof data.data.non_public_metrics.user_profile_clicks === "number";
  console.log(JSON.stringify({
    step: "metrics",
    ok: okMetrics,
    status: res.status,
    sampleFields: data?.data?.non_public_metrics,
  }, null, 2));
  process.exit(okMetrics ? 0 : 4);
}

// ---------------------------------------------------------------------------
// Step 5: auth_blocked dry-run (refresh が失敗した時の通知 path)
// ---------------------------------------------------------------------------
function step_auth_blocked_dry_run() {
  const payload = {
    type: "auth_blocked",
    platform: "x",
    detected_at: new Date().toISOString(),
    reason: "refresh_token_rotation_failed",
    next_action: "human_intervention_required",
    suggested_step: [
      "1. .env.local の X_REFRESH_TOKEN を削除",
      "2. lib/oauth/pkce-test.ts --step=authorize で再認可フロー開始",
      "3. callback の code を取って --step=token で新 token 取得",
    ],
  };
  console.log(JSON.stringify({
    step: "auth-blocked-dry-run",
    notify_via_line: true,
    payload,
    note: "本番では LINE Messaging API + Supabase auth_blocked テーブル更新 + 投稿 cron 停止フラグ",
  }, null, 2));
  process.exit(0);
}

// ---------------------------------------------------------------------------
// CLI dispatch
// ---------------------------------------------------------------------------
function arg(name: string): string | null {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split("=").slice(1).join("=") : null;
}

const step = arg("step") ?? "authorize";

(async () => {
  switch (step) {
    case "authorize":
      step_authorize();
      break;
    case "token": {
      const code = arg("code");
      const verifier = arg("verifier");
      if (!code || !verifier) {
        console.error("--code=<value> --verifier=<value> required");
        process.exit(1);
      }
      await step_token(code, verifier);
      break;
    }
    case "refresh": {
      const rt = arg("refresh-token") ?? process.env.X_REFRESH_TOKEN;
      if (!rt) {
        console.error("--refresh-token=<value> or X_REFRESH_TOKEN env required");
        process.exit(1);
      }
      const rounds = Number(arg("rounds") ?? "2");
      await step_refresh(rt, rounds);
      break;
    }
    case "metrics": {
      const at = arg("access-token") ?? process.env.X_ACCESS_TOKEN;
      const tid = arg("tweet-id");
      if (!at || !tid) {
        console.error("--access-token=<value> --tweet-id=<value> required");
        process.exit(1);
      }
      await step_metrics(at, tid);
      break;
    }
    case "auth-blocked-dry-run":
      step_auth_blocked_dry_run();
      break;
    default:
      console.error(`unknown --step=${step}`);
      process.exit(1);
  }
})().catch((err) => {
  console.error(String(err));
  process.exit(99);
});
