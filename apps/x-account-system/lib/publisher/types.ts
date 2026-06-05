/**
 * Publisher X types (PR-B)
 *
 * SSoT: outputs/improvements/x-account-design-consolidated/main-design-all-versions.md §6.4 / §6.5
 *
 * Publisher は Editor 通過後の draft を X に投稿する。
 * - kill-switch / brownout / editor reject / high-risk pending approval を gate でブロック
 * - dryRun=true で外部 API call なし
 * - OAuth 2.0 PKCE token 管理は token-store.ts に委譲
 */
import type { EditorOutput } from "../editor/types.ts";

export type PublishFormat = "short" | "medium" | "long" | "thread" | "article";

export type PublishRequest = {
  draftId: string;
  body: string;
  fmat: PublishFormat;
  editorOutput: EditorOutput;
  dryRun: boolean;
  /** test 用に retry の sleep を 0 にしたい場合 */
  noBackoff?: boolean;
  /** 高リスク承認モード判定: human approval を取った場合のみ true */
  highRiskApproved?: boolean;
};

export type BlockedReason =
  | "kill_switch"
  | "brownout"
  | "editor_rejected"
  | "risk_high_pending_approval"
  | "direct_api_disabled";

export type PublishStatus =
  | "published"
  | "dry_run"
  | "blocked"
  | "failed";

export type PublishResult = {
  draftId: string;
  status: PublishStatus;
  tweetId?: string;
  blockedReason?: BlockedReason;
  postedAt?: string;
  retryCount: number;
  error?: string;
};

/**
 * OAuth token の永続化 state.
 * Phase 0.5: in-memory + env から読む。
 * Phase 1: Supabase `oauth_tokens` table から取得、refresh cycle 対応。
 */
export type OAuthTokenState = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // epoch ms
  scope?: string;
};
