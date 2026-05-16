import "server-only";
import type { NextRequest } from "next/server";

// Vercel Cron からの呼び出しを Authorization: Bearer <CRON_SECRET> で検証する。
// CRON_SECRET 未設定時は false を返す（誤って公開エンドポイントにしないため）。
export function isCronAuthenticated(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}
