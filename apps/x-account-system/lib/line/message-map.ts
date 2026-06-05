/**
 * message-map.ts
 *
 * LINE 承認カードの message_id ↔ draft_id 紐づけ。
 * 引用リプライ (quotedMessageId) から対象 draft を逆引きするために使う。
 *
 * Supabase 未設定 / IN_MEMORY_FALLBACK の場合:
 *   - recordLineMessage は no-op (warn)
 *   - lookupDraftByMessage は null を返す
 *
 * 非致命設計: 紐づけ失敗で承認フロー全体を落とさない (latest-pending fallback がある)。
 */

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

// 循環 import を避けるため最小 shape のみ要求する。
type SupabaseEnv = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

let _supabase: SupabaseClient | null = null;

function getSupabase(env: SupabaseEnv): SupabaseClient | null {
  if (process.env.IN_MEMORY_FALLBACK === "true") return null;
  if (_supabase) return _supabase;
  const url = env.SUPABASE_URL || process.env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _supabase = createClient(url, key, {
    db: { schema: process.env.SUPABASE_SCHEMA || "xad" },
  }) as unknown as SupabaseClient;
  return _supabase;
}

/**
 * 承認カードの message_id と draft_id を紐づけて保存する。
 * Supabase 未設定なら no-op (warn)。失敗しても throw しない。
 */
export async function recordLineMessage(
  env: SupabaseEnv,
  messageId: string,
  draftId: string,
): Promise<void> {
  if (!messageId || !draftId) return;
  const sb = getSupabase(env);
  if (!sb) {
    console.warn("[message-map] Supabase not configured, recordLineMessage skipped");
    return;
  }
  const { error } = await sb
    .from("line_message_map")
    .upsert({ message_id: messageId, draft_id: draftId }, { onConflict: "message_id" });
  if (error) {
    // 非致命: 紐づけ保存失敗で承認フローは落とさない。
    console.error("[message-map] upsert error:", error.message);
  }
}

/**
 * 引用元の message_id から draft_id を逆引きする。
 * 見つからない / 未設定なら null (呼び出し側は latest-pending にフォールバック)。
 */
export async function lookupDraftByMessage(
  env: SupabaseEnv,
  quotedMessageId: string,
): Promise<string | null> {
  if (!quotedMessageId) return null;
  const sb = getSupabase(env);
  if (!sb) return null;
  const { data, error } = await sb
    .from("line_message_map")
    .select("draft_id")
    .eq("message_id", quotedMessageId)
    .maybeSingle();
  if (error) {
    console.error("[message-map] select error:", error.message);
    return null;
  }
  if (!data) return null;
  const draftId = (data as { draft_id?: unknown }).draft_id;
  return typeof draftId === "string" && draftId.length > 0 ? draftId : null;
}
