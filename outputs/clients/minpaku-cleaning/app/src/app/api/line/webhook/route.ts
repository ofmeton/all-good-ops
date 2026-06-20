import { NextResponse, type NextRequest } from "next/server";
import { messagingApi } from "@line/bot-sdk";
import { verifyLineWebhookSignature } from "@/lib/line-webhook";

type WebhookEvent = {
  type?: string;
  replyToken?: string;
};

type WebhookBody = {
  events?: WebhookEvent[];
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-line-signature");
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!verifyLineWebhookSignature(body, signature, channelSecret)) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  let parsed: WebhookBody;
  try {
    parsed = JSON.parse(body) as WebhookBody;
  } catch {
    return new NextResponse("invalid body", { status: 400 });
  }

  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (accessToken) {
    const client = new messagingApi.MessagingApiClient({
      channelAccessToken: accessToken,
    });
    await Promise.all(
      (parsed.events ?? [])
        .filter((event) => event.type === "follow" && event.replyToken)
        .map((event) =>
          client.replyMessage({
            replyToken: event.replyToken as string,
            messages: [
              {
                type: "text",
                text: "友だち追加ありがとうございます。トークンURLからLINE連携を完了してください。",
              },
            ],
          }),
        ),
    );
  }

  return NextResponse.json({ ok: true });
}
