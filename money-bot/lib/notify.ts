import { messagingApi } from "@line/bot-sdk";
import { Resend } from "resend";

export interface ApprovalNotifyPayload {
  runId: string;
  approvalUrl: string;
  draftTitle: string;
  thumbnailUrl?: string | undefined;
}

type NotifyChannel = "line" | "resend" | "mock";

let cachedLineClient: messagingApi.MessagingApiClient | null = null;
function getLineClient(): messagingApi.MessagingApiClient | null {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!channelAccessToken) return null;
  if (!cachedLineClient) {
    cachedLineClient = new messagingApi.MessagingApiClient({ channelAccessToken });
  }
  return cachedLineClient;
}

let cachedResend: Resend | null = null;
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!cachedResend) {
    cachedResend = new Resend(key);
  }
  return cachedResend;
}

export async function notifyApprovalReady(
  payload: ApprovalNotifyPayload,
): Promise<{ ok: boolean; via: NotifyChannel }> {
  "use step";
  const line = getLineClient();
  const toUserId = process.env.LINE_TO_USER_ID;

  if (line && toUserId) {
    try {
      await line.pushMessage({
        to: toUserId,
        messages: [
          {
            type: "text",
            text:
              `[money-bot] ドラフト準備完了\n` +
              `${payload.draftTitle}\n\n` +
              `承認: ${payload.approvalUrl}`,
          },
        ],
      });
      return { ok: true, via: "line" };
    } catch (err) {
      console.error("[notify] LINE push failed, falling back to Resend", err);
    }
  }

  const resend = getResend();
  const fallbackTo = process.env.NOTIFY_FALLBACK_EMAIL;
  if (resend && fallbackTo) {
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM ?? "money-bot@example.com",
        to: fallbackTo,
        subject: `[money-bot] approval needed — ${payload.draftTitle}`,
        text: `Approval URL: ${payload.approvalUrl}\nrun: ${payload.runId}`,
      });
      return { ok: true, via: "resend" };
    } catch (err) {
      console.error("[notify] Resend fallback failed", err);
    }
  }

  console.warn("[notify] no channel configured, mock-only", payload);
  return { ok: true, via: "mock" };
}

export async function notifyError(message: string, context?: unknown): Promise<void> {
  "use step";
  const line = getLineClient();
  const toUserId = process.env.LINE_TO_USER_ID;
  const body = `[money-bot ERROR]\n${message}\n${context ? JSON.stringify(context).slice(0, 800) : ""}`;

  if (line && toUserId) {
    try {
      await line.pushMessage({ to: toUserId, messages: [{ type: "text", text: body }] });
      return;
    } catch (err) {
      console.error("[notify.error] LINE push failed", err);
    }
  }

  console.error("[notify.error]", message, context);
}
