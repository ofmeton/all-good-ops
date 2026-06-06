import { z } from "zod";

// ログイン入力の検証。形式不正・過大入力（DoS）を認証処理の前に弾く。
// 戻り値: エラーメッセージ（不正時）/ null（正常時）。
const schema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(1024),
});

export function validateLoginInput(
  email: string,
  password: string,
): string | null {
  const parsed = schema.safeParse({ email, password });
  if (parsed.success) return null;
  return "メールアドレスまたはパスワードが正しくありません";
}
