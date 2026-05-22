/**
 * Supabase クライアント (server-only).
 *
 * spec: docs/superpowers/specs/2026-05-22-money-bot-design.md §6.1
 *
 * - workflow / API route から呼ぶ。ブラウザに service_role_key を絶対露出させない。
 * - publish_queue / approvals / kpi_daily / ai_radar_signals_cache に対する CRUD はここを経由。
 *
 * TODO(Phase 1):
 *   - generate_typescript_types で migration から型生成して `Database` 型を導入
 *   - RLS ポリシーは migration 0001 では off。Phase 2 で公開ダッシュボード作る時に on にする
 */

// TODO(Phase 1): npm install 後に有効化
// import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getSupabase(): unknown /* SupabaseClient */ {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定。.env.example を参照",
    );
  }
  // return createClient(url, key, { auth: { persistSession: false } });
  return { __mock__: true, url, hasKey: Boolean(key) };
}
