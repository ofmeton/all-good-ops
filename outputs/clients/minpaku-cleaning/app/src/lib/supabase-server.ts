import "server-only";
import { createClient } from "@supabase/supabase-js";

// env チェックは関数呼び出し時に遅延実行する。module top で throw すると
// Next.js の build 時 page data collection で server module を import した
// 段階で失敗してしまうため。
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください",
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
