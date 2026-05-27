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

const X_TWEETS_ENDPOINT = "https://api.twitter.com/2/tweets";
const MAX_RETRIES = 3;

/** kill-switch / brownout 判定 (env または in-memory override) */
let _killSwitchOverride: boolean | null = null;
let _brownoutOverride: boolean | null = null;

export function __setKillSwitchOverride(v: boolean | null) {
  _killSwitchOverride = v;
}
export function __setBrownoutOverride(v: boolean | null) {
  _brownoutOverride = v;
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
async function postTweetWithRetry(
  body: string,
  accessToken: string,
  noBackoff: boolean,
): Promise<{ tweetId: string; retryCount: number } | { error: string; retryCount: number }> {
  let lastError = "unknown error";
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await _fetchImpl(X_TWEETS_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: body }),
      });
      if (res.ok) {
        const json = (await res.json()) as XPostResponse;
        if (json.data?.id) {
          return { tweetId: json.data.id, retryCount: attempt };
        }
        lastError = `unexpected response shape: ${JSON.stringify(json).slice(0, 200)}`;
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

  // ---- Gate 5: dry-run ----
  if (req.dryRun) {
    return {
      draftId: req.draftId,
      status: "dry_run",
      postedAt: new Date().toISOString(),
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

  // ---- Actual POST ----
  const result = await postTweetWithRetry(
    req.body,
    token.accessToken,
    req.noBackoff ?? false,
  );
  if ("tweetId" in result) {
    return {
      draftId: req.draftId,
      status: "published",
      tweetId: result.tweetId,
      postedAt: new Date().toISOString(),
      retryCount: result.retryCount,
    };
  }
  return {
    draftId: req.draftId,
    status: "failed",
    retryCount: result.retryCount,
    error: result.error,
  };
}

/** test helper: blocked reason 列挙用 */
export const BLOCKED_REASONS: BlockedReason[] = [
  "kill_switch",
  "brownout",
  "editor_rejected",
  "risk_high_pending_approval",
];
