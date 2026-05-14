import { randomBytes } from "crypto";

// 推測困難なトークンURL用文字列を生成する（32バイトの base64url）。
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}
