import { validateSignature } from "@line/bot-sdk";

export function verifyLineWebhookSignature(
  body: string,
  signature: string | null,
  channelSecret: string | undefined,
): boolean {
  if (!channelSecret || !signature) return false;
  return validateSignature(body, channelSecret, signature);
}
