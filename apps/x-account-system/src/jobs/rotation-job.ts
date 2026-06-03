/**
 * rotation-job.ts — W5-9
 *
 * Monthly cron "rotation-notice" (月初 rotation 通知).
 *
 * Flow:
 *   1. getXAccessToken() — read current token state
 *   2. If no token → LINE warning (手動再認証案内) → return
 *   3. If isTokenExpired() OR near expiry (within NEAR_EXPIRY_DAYS) → auto-refresh
 *      a. refreshAccessToken(state, env) → success → LINE success notification
 *      b. refresh throws (kill-switch + auth_blocked already recorded inside
 *         refreshAccessToken) → catch → LINE escalation notification
 *   4. If token still has plenty of time → no refresh needed (silent or info log)
 *
 * Responsibility:
 *   - Does NOT duplicate refresh logic — delegates to token-store.refreshAccessToken
 *   - Kill-switch + auth_blocked recording handled inside refreshAccessToken (W5-8)
 *   - Surfaces the failure via LINE escalation so the operator can act
 */

import {
  getXAccessToken,
  isTokenExpired,
  refreshAccessToken,
} from "../../lib/publisher/token-store.js";
import { pushLine } from "../../lib/line/line-client.js";
import type { Env } from "../worker.js";
import type { RefreshEnv } from "../../lib/publisher/token-store.js";

/** Days before expiry to trigger a proactive refresh (5 days) */
const NEAR_EXPIRY_DAYS = 5;
const NEAR_EXPIRY_MS = NEAR_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

/**
 * Return true if token's expiresAt is within NEAR_EXPIRY_DAYS from now
 * (includes already-expired tokens handled by isTokenExpired).
 */
function isNearExpiry(expiresAt: number | undefined, now = Date.now()): boolean {
  if (expiresAt === undefined) return false;
  return expiresAt - now < NEAR_EXPIRY_MS;
}

export async function runRotationNotice(env: Env): Promise<void> {
  // 1. Read current token state
  const state = await getXAccessToken();

  if (!state) {
    // No token at all — warn operator to re-authorize
    console.log(
      JSON.stringify({
        level: "warn",
        msg: "[rotation-notice] X token が見つかりません。手動再認証が必要です。",
      }),
    );
    await pushLine(
      env.LINE_USER_ID_OFMETON,
      "[rotation-notice] ⚠️ X token が見つかりません。\n/oauth/x/start から再認証してください。",
      env.LINE_CHANNEL_ACCESS_TOKEN,
    );
    return;
  }

  // 2. Check if refresh is needed
  const expired = isTokenExpired(state);
  const nearExpiry = isNearExpiry(state.expiresAt);

  if (!expired && !nearExpiry) {
    // Token is healthy — no action needed
    const daysLeft =
      state.expiresAt !== undefined
        ? Math.floor((state.expiresAt - Date.now()) / 86400_000)
        : null;
    console.log(
      JSON.stringify({
        level: "info",
        msg: "[rotation-notice] X token は有効です。rotation 不要。",
        days_left: daysLeft,
      }),
    );
    // Silent — no LINE push needed for healthy token
    return;
  }

  // 3. Refresh needed (expired or near expiry)
  const reason = expired ? "期限切れ" : `${NEAR_EXPIRY_DAYS}日以内に期限切れ`;
  console.log(
    JSON.stringify({
      level: "info",
      msg: `[rotation-notice] X token rotation 開始 (${reason})`,
      expires_at: state.expiresAt,
    }),
  );

  const refreshEnv: RefreshEnv = {
    X_CLIENT_ID: env.X_CLIENT_ID,
    X_CLIENT_SECRET: env.X_CLIENT_SECRET,
    X_REDIRECT_URI: env.X_REDIRECT_URI,
  };

  try {
    const newToken = await refreshAccessToken(state, refreshEnv);
    const newDaysLeft =
      newToken.expiresAt !== undefined
        ? Math.floor((newToken.expiresAt - Date.now()) / 86400_000)
        : null;

    console.log(
      JSON.stringify({
        level: "info",
        msg: "[rotation-notice] X token rotation 成功",
        new_expires_at: newToken.expiresAt,
        new_days_left: newDaysLeft,
      }),
    );

    await pushLine(
      env.LINE_USER_ID_OFMETON,
      [
        `[rotation-notice] ✅ X token rotation 完了`,
        `理由: ${reason}`,
        newDaysLeft !== null
          ? `新しい有効期限まで ${newDaysLeft} 日`
          : "有効期限不明 (env fallback)",
      ].join("\n"),
      env.LINE_CHANNEL_ACCESS_TOKEN,
    );
  } catch (err) {
    // refreshAccessToken already triggered kill-switch + recorded auth_blocked internally
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(
      JSON.stringify({
        level: "error",
        msg: "[rotation-notice] X token rotation 失敗 — publishing blocked",
        error: errMsg,
      }),
    );

    // Escalate to operator via LINE
    await pushLine(
      env.LINE_USER_ID_OFMETON,
      [
        `[rotation-notice] 🚨 X token rotation 失敗 — エスカレーション`,
        `エラー: ${errMsg}`,
        `publishing は一時停止されました。手動で /oauth/x/start から再認証してください。`,
      ].join("\n"),
      env.LINE_CHANNEL_ACCESS_TOKEN,
    );
    // Do NOT rethrow — job ACKed, operator notified, kill-switch activated
  }
}
