/**
 * LINE / Resend 通知ラッパー。
 *
 * spec §5.1 (approval gate) / §6.1 (LINE Messaging API) / §10 (障害時 fallback)
 *
 * - 主経路: LINE Messaging API push (ofmeton bot)
 * - 副経路: Resend mail (LINE 障害時の fallback)
 *
 * 月次予算: LINE 無料枠 500通/月 内に収まる想定 (1日1通 = 30通/月 + エラー数件)
 */

// TODO(Phase 1): npm install 後に有効化
// import { Client as LineClient, type MessageAPIResponseBase } from "@line/bot-sdk";

export interface ApprovalNotifyPayload {
  runId: string;
  approvalUrl: string;
  draftTitle: string;
  thumbnailUrl?: string;
}

export async function notifyApprovalReady(
  payload: ApprovalNotifyPayload,
): Promise<{ ok: boolean; via: "line" | "resend" | "mock" }> {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const toUserId = process.env.LINE_TO_USER_ID;

  if (!accessToken || !toUserId) {
    // Phase 1 着手前: 環境変数未設定なら mock 経路
    // eslint-disable-next-line no-console
    console.warn("[notify] LINE env not set, falling back to mock", payload);
    return { ok: true, via: "mock" };
  }

  // TODO(Phase 1): 実装
  // const client = new LineClient({ channelAccessToken: accessToken });
  // await client.pushMessage(toUserId, [
  //   {
  //     type: "text",
  //     text: `[money-bot] note ドラフト準備完了: ${payload.draftTitle}\n承認: ${payload.approvalUrl}`,
  //   },
  //   ...(payload.thumbnailUrl
  //     ? [{ type: "image" as const, originalContentUrl: payload.thumbnailUrl, previewImageUrl: payload.thumbnailUrl }]
  //     : []),
  // ]);
  return { ok: true, via: "line" };
}

export async function notifyError(message: string, context?: unknown): Promise<void> {
  // TODO(Phase 1): LINE 経由 + 失敗時 Resend fallback
  // eslint-disable-next-line no-console
  console.error("[notify.error]", message, context);
}
