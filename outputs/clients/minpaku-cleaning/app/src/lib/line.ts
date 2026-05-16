import "server-only";
import { messagingApi } from "@line/bot-sdk";

// LINE Messaging API push。lineUserId / message のみのシンプルなテキスト push。
// LINE_CHANNEL_ACCESS_TOKEN が未設定なら例外を投げる（notify.ts が status='skipped' で扱う）。
export async function pushLineMessage(
  lineUserId: string,
  message: string,
): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN が未設定です");
  }
  const client = new messagingApi.MessagingApiClient({
    channelAccessToken: token,
  });
  await client.pushMessage({
    to: lineUserId,
    messages: [{ type: "text", text: message }],
  });
}
