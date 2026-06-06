import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

// 長さに依存しないタイミング安全比較。長さが異なる場合は即 false（ただし
// 早期 return による長さリークを避けるため、同長バッファでのダミー比較を行う）。
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // 長さ不一致でも timingSafeEqual を1回実行してから false を返す。
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

// Vercel Cron からの呼び出しを Authorization: Bearer <CRON_SECRET> で検証する。
// CRON_SECRET 未設定時は false を返す（誤って公開エンドポイントにしないため）。
// シークレット比較はタイミング攻撃を避けるため timingSafeEqual を使う。
export function isCronAuthenticated(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  if (!header) return false;
  return safeEqual(header, `Bearer ${secret}`);
}
