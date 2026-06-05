/**
 * X Publisher (PR-B)
 *
 * SSoT: outputs/improvements/x-account-design-consolidated/main-design-all-versions.md §6.4 / §6.5
 *
 * Flow:
 *   1. EditorOutput.decision === 'rejected' → blocked editor_rejected
 *   2. EditorOutput.riskLevel === 'high' AND !highRiskApproved → blocked risk_high_pending_approval
 *   3. kill-switch (env / store) === true → blocked kill_switch
 *   4. brownout (env / store) === true → blocked brownout
 *   5. dryRun === true → status='dry_run'
 *   6. token 未取得 → dryRun 強制 (Phase 0.5)
 *   7. X API POST /2/tweets with retry (max 3, exponential backoff 1s/2s/4s)
 */
import type {
  PublishRequest,
  PublishResult,
  BlockedReason,
} from "./types.ts";
import {
  getXAccessToken,
  isTokenExpired,
  refreshAccessToken,
} from "./token-store.ts";
import { assertPublishingEnabled } from "../safety/kill-switch.ts";
import { segmentForPublish } from "./format-post.ts";

const X_TWEETS_ENDPOINT = "https://api.twitter.com/2/tweets";
const MAX_RETRIES = 3;

/** kill-switch / brownout 判定 (env または in-memory override) */
let _killSwitchOverride: boolean | null = null;
let _brownoutOverride: boolean | null = null;
/**
 * X API 直投の封印フラグ (チャエン半自動設計)。本番は常に封印され、実投稿は
 * chrome-devtools 予約投稿 (.claude/skills/x-scheduled-publish) が担う。
 * テストで posting 経路を検証する場合のみ __setDirectApiEnabled(true) で開ける。
 */
let _directApiOverride: boolean | null = null;

export function __setKillSwitchOverride(v: boolean | null) {
  _killSwitchOverride = v;
}
export function __setBrownoutOverride(v: boolean | null) {
  _brownoutOverride = v;
}
export function __setDirectApiEnabled(v: boolean | null) {
  _directApiOverride = v;
}

function isDirectApiEnabled(): boolean {
  if (_directApiOverride !== null) return _directApiOverride;
  return process.env.X_DIRECT_API_ENABLED === "true";
}

function isKillSwitchOn(): boolean {
  if (_killSwitchOverride !== null) return _killSwitchOverride;
  return process.env.X_PUBLISHER_KILL_SWITCH === "true";
}

function isBrownoutOn(): boolean {
  if (_brownoutOverride !== null) return _brownoutOverride;
  return process.env.X_PUBLISHER_BROWNOUT === "true";
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

/** dependency injection point for tests */
let _fetchImpl: typeof fetch = globalThis.fetch;
export function __setFetchImpl(f: typeof fetch | null) {
  _fetchImpl = f ?? globalThis.fetch;
}

type XPostResponse = {
  data?: { id: string; text: string };
  errors?: Array<{ message: string; code?: number }>;
};

/**
 * X API POST /2/tweets を retry 付きで叩く。
 * 5xx / network error は retry、4xx は即 fail。
 */
type PostTweetResult =
  | { tweetId: string; retryCount: number }
  | { error: string; retryCount: number; unauthorized?: boolean };

async function postTweetWithRetry(
  body: string,
  accessToken: string,
  noBackoff: boolean,
  replyToId?: string,
): Promise<PostTweetResult> {
  let lastError = "unknown error";
  // thread chaining (X API v2): reply.in_reply_to_tweet_id で前ツイートに連結
  const payload: { text: string; reply?: { in_reply_to_tweet_id: string } } = {
    text: body,
  };
  if (replyToId) {
    payload.reply = { in_reply_to_tweet_id: replyToId };
  }
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await _fetchImpl(X_TWEETS_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = (await res.json()) as XPostResponse;
        if (json.data?.id) {
          return { tweetId: json.data.id, retryCount: attempt };
        }
        lastError = `unexpected response shape: ${JSON.stringify(json).slice(0, 200)}`;
      } else if (res.status === 401) {
        // 401 = expired/invalid access token. Surface separately so the caller
        // can attempt ONE token refresh + retry. Do not retry here.
        const text = await res.text();
        return {
          error: `HTTP 401: ${text.slice(0, 200)}`,
          retryCount: attempt,
          unauthorized: true,
        };
      } else if (res.status >= 400 && res.status < 500) {
        // 4xx は retry しない
        const text = await res.text();
        return {
          error: `HTTP ${res.status}: ${text.slice(0, 200)}`,
          retryCount: attempt,
        };
      } else {
        const text = await res.text();
        lastError = `HTTP ${res.status}: ${text.slice(0, 200)}`;
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    // exponential backoff (skip on last attempt)
    if (attempt < MAX_RETRIES - 1 && !noBackoff) {
      await sleep(1000 * Math.pow(2, attempt));
    }
  }
  return { error: lastError, retryCount: MAX_RETRIES };
}

/**
 * Main entry point.
 */
export async function publishToX(req: PublishRequest): Promise<PublishResult> {
  // ---- Gate 1: editor rejected ----
  if (req.editorOutput.decision === "rejected") {
    return {
      draftId: req.draftId,
      status: "blocked",
      blockedReason: "editor_rejected",
      retryCount: 0,
    };
  }

  // ---- Gate 2: high-risk pending approval ----
  if (req.editorOutput.riskLevel === "high" && !req.highRiskApproved) {
    return {
      draftId: req.draftId,
      status: "blocked",
      blockedReason: "risk_high_pending_approval",
      retryCount: 0,
    };
  }

  // ---- Gate 3: kill-switch ----
  if (isKillSwitchOn()) {
    return {
      draftId: req.draftId,
      status: "blocked",
      blockedReason: "kill_switch",
      retryCount: 0,
    };
  }

  // ---- Gate 4: brownout ----
  if (isBrownoutOn()) {
    return {
      draftId: req.draftId,
      status: "blocked",
      blockedReason: "brownout",
      retryCount: 0,
    };
  }

  // ---- Gate 4.5: DB kill-switch (safety_state table) ----
  try {
    await assertPublishingEnabled();
  } catch {
    return {
      draftId: req.draftId,
      status: "blocked",
      blockedReason: "kill_switch",
      retryCount: 0,
    };
  }

  // ---- Segment body into clean tweet(s) (strip scaffolding, thread split) ----
  const segments = segmentForPublish(req.body, req.fmat);

  // ---- Gate 5: dry-run ----
  if (req.dryRun) {
    return {
      draftId: req.draftId,
      status: "dry_run",
      postedAt: new Date().toISOString(),
      retryCount: 0,
      error:
        segments.length > 1
          ? `dry-run: ${segments.length} 連結ツイートとして投稿予定`
          : undefined,
    };
  }

  // ---- Gate 5.5: X API 直投の恒久封印 (チャエン半自動設計) ----
  // dry-run は上で返るので影響なし。実 POST 直前で必ず封じる。実投稿は
  // chrome-devtools 予約投稿 (.claude/skills/x-scheduled-publish) が担う。
  if (!isDirectApiEnabled()) {
    return {
      draftId: req.draftId,
      status: "blocked",
      blockedReason: "direct_api_disabled",
      retryCount: 0,
    };
  }

  // ---- Token retrieval (Phase 0.5: env or in-memory) ----
  let token = await getXAccessToken();
  if (!token) {
    // Phase 0.5 では token 未設定なら dry_run 扱い (実投稿しない)
    return {
      draftId: req.draftId,
      status: "dry_run",
      postedAt: new Date().toISOString(),
      retryCount: 0,
      error: "X_ACCESS_TOKEN not set, falling back to dry-run",
    };
  }
  if (isTokenExpired(token)) {
    try {
      token = await refreshAccessToken(token);
    } catch (e) {
      return {
        draftId: req.draftId,
        status: "failed",
        retryCount: 0,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  // ---- Actual POST (thread chain) ----
  // 1) 先頭ツイートを投稿 (reply 無し)。既存の 401→refresh→retry を維持する。
  const noBackoff = req.noBackoff ?? false;
  let result = await postTweetWithRetry(segments[0], token.accessToken, noBackoff);

  // ---- Reactive 401 recovery: refresh ONCE + retry ONCE (先頭ツイートのみ) ----
  // X access tokens expire (~2h). If the post returns 401 the stored token went
  // stale between read and send; refresh (rotating the refresh_token) and retry.
  if (!("tweetId" in result) && result.unauthorized) {
    try {
      const refreshed = await refreshAccessToken(token);
      token = refreshed;
      result = await postTweetWithRetry(segments[0], token.accessToken, noBackoff);
    } catch (e) {
      // Refresh failed → kill-switch already triggered inside refreshAccessToken.
      // Fail closed; do NOT loop.
      return {
        draftId: req.draftId,
        status: "failed",
        retryCount: result.retryCount,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  // 先頭ツイートが失敗 → 何も投稿されていないので failed。
  if (!("tweetId" in result)) {
    return {
      draftId: req.draftId,
      status: "failed",
      retryCount: result.retryCount,
      error: result.error,
    };
  }

  const firstTweetId = result.tweetId;
  let retryCount = result.retryCount;

  // 2) 残りのセグメントを直前ツイートへの reply として順次投稿する。
  //    途中で失敗したら STOP し、部分スレッドとして published を返す (二重投稿しない)。
  let previousId = firstTweetId;
  for (let i = 1; i < segments.length; i++) {
    const seg = await postTweetWithRetry(
      segments[i],
      token.accessToken,
      noBackoff,
      previousId,
    );
    retryCount += seg.retryCount;
    if (!("tweetId" in seg)) {
      // 部分スレッド: 先頭 id は live。エラーを note に載せて二重投稿せず返す。
      return {
        draftId: req.draftId,
        status: "published",
        tweetId: firstTweetId,
        postedAt: new Date().toISOString(),
        retryCount,
        error: `partial_thread: posted ${i}/${segments.length} tweets, segment ${i + 1} failed: ${seg.error}`,
      };
    }
    previousId = seg.tweetId;
  }

  return {
    draftId: req.draftId,
    status: "published",
    tweetId: firstTweetId,
    postedAt: new Date().toISOString(),
    retryCount,
  };
}

/** test helper: blocked reason 列挙用 */
export const BLOCKED_REASONS: BlockedReason[] = [
  "kill_switch",
  "brownout",
  "editor_rejected",
  "risk_high_pending_approval",
  "direct_api_disabled",
];
