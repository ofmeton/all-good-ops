import "server-only";
import { Resend } from "resend";

// Resend で plain text メールを送る。RESEND_API_KEY 未設定時は throw。
export async function sendMail(
  to: string,
  subject: string,
  text: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY が未設定です");
  }
  const from = process.env.MINPAKU_FROM_EMAIL ?? "onboarding@resend.dev";
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({ from, to, subject, text });
  if (error) {
    throw new Error(`Resend send failed: ${error.message ?? error.name}`);
  }
}
