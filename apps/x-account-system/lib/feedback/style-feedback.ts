/**
 * style-feedback.ts
 *
 * LINE フィードバックコマンド (修正: / 覚えて:) の永続化と読み出し。
 *
 * 役割:
 *   - addStyleFeedback: ユーザー指摘を xad.style_feedback に保存
 *   - getRecentStyleFeedback: 直近のフィードバック本文を新しい順で取得
 *
 * 設計方針:
 *   ここで取得したフィードバックは draft 生成プロンプトに
 *   SOFT reference (「できるだけ参考に」、厳守ではない) として注入する。
 *
 * Supabase が未設定 / fallback の場合:
 *   - addStyleFeedback は no-op (warn のみ)
 *   - getRecentStyleFeedback は [] を返す
 */

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

// Env は worker.ts 由来だが、循環 import を避けるため最小 shape のみ要求する。
type SupabaseEnv = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

let _supabase: SupabaseClient | null = null;

function getSupabase(env: SupabaseEnv): SupabaseClient | null {
  // 他 lib モジュールと同じく IN_MEMORY_FALLBACK では Supabase を使わない。
  // (cache より先に判定。fallback では常に null を返す)
  if (process.env.IN_MEMORY_FALLBACK === "true") return null;
  if (_supabase) return _supabase;
  const url = env.SUPABASE_URL || process.env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _supabase = createClient(url, key, {
    db: { schema: process.env.SUPABASE_SCHEMA || "public" },
  }) as unknown as SupabaseClient;
  return _supabase;
}

export type StyleFeedbackKind = "remember" | "revise";

/**
 * フィードバックを保存する。Supabase 未設定なら no-op (warn)。
 */
export async function addStyleFeedback(
  env: SupabaseEnv,
  kind: StyleFeedbackKind,
  body: string,
  draftId?: string,
): Promise<void> {
  const sb = getSupabase(env);
  if (!sb) {
    console.warn("[style-feedback] Supabase not configured, addStyleFeedback skipped");
    return;
  }
  const { error } = await sb.from("style_feedback").insert({
    kind,
    body,
    draft_id: draftId ?? null,
  });
  if (error) {
    // 非致命: フィードバック保存失敗で承認フロー全体を落とさない。
    console.error("[style-feedback] insert error:", error.message);
  }
}

/**
 * 直近のフィードバック本文を新しい順で返す。Supabase 未設定なら []。
 */
export async function getRecentStyleFeedback(
  env: SupabaseEnv,
  limit = 15,
): Promise<string[]> {
  const sb = getSupabase(env);
  if (!sb) return [];
  const { data, error } = await sb
    .from("style_feedback")
    .select("body")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[style-feedback] select error:", error.message);
    return [];
  }
  const rows = Array.isArray(data) ? data : [];
  return rows
    .map((r) => (r as { body?: unknown }).body)
    .filter((b): b is string => typeof b === "string" && b.length > 0);
}
