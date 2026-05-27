/**
 * Supabase client (Phase 0.5 in-memory fallback 対応)
 *
 * 環境変数:
 *   IN_MEMORY_FALLBACK=true  → Supabase を呼ばず default を返す
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 未設定 → null client → fallback と同等
 *
 * 3 つの query:
 *   - getMonthlyFailureStoryPostCount: X3 で参照
 *   - getVerifiedMaterialIds: X3 で参照
 *   - fetchRecentPostBodies: R5 で参照
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function isFallback(): boolean {
  return process.env.IN_MEMORY_FALLBACK === "true";
}

export function getSupabase(): SupabaseClient | null {
  if (isFallback()) return null;
  if (
    !_client &&
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    _client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
  }
  return _client;
}

/**
 * 当月内に posted_records へ書かれた primary_hook='failure_story' の draft 数。
 * fallback では 0 を返す。
 */
export async function getMonthlyFailureStoryPostCount(
  now: Date,
): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1,
  ).toISOString();

  const { count, error } = await supabase
    .from("posted_records")
    .select("*, post_drafts!inner(primary_hook)", {
      count: "exact",
      head: true,
    })
    .eq("post_drafts.primary_hook", "failure_story")
    .gte("posted_at", monthStart)
    .lt("posted_at", monthEnd);

  if (error) throw new Error(`getMonthlyFailureStoryPostCount: ${error.message}`);
  return count ?? 0;
}

/**
 * materials_store から「verified_failure_story=true AND publication_consent='granted'
 * AND redaction_reviewed=true」を満たす ID の Set。
 * fallback では入力 IDs 全部 verified と仮定して返す。
 */
export async function getVerifiedMaterialIds(
  materialIds: string[],
): Promise<Set<string>> {
  if (materialIds.length === 0) return new Set();
  const supabase = getSupabase();
  if (!supabase) return new Set(materialIds);

  const { data, error } = await supabase
    .from("materials_store")
    .select("id")
    .in("id", materialIds)
    .eq("verified_failure_story", true)
    .eq("publication_consent", "granted")
    .eq("redaction_reviewed", true);

  if (error) throw new Error(`getVerifiedMaterialIds: ${error.message}`);
  return new Set((data ?? []).map((r: { id: string }) => r.id));
}

/**
 * 直近 N 日に posted_records に書かれた draft の body + embedding。
 * embedding が未保存の row は embedding=undefined になる。
 * fallback では空配列を返す (= R5 always pass)。
 */
export type RecentPost = {
  id: string;
  body: string;
  embedding?: number[];
};

export async function fetchRecentPostBodies(
  daysBack = 14,
): Promise<RecentPost[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const since = new Date(Date.now() - daysBack * 86400000).toISOString();
  const { data, error } = await supabase
    .from("posted_records")
    .select("draft_id, post_drafts!inner(body, embedding)")
    .gte("posted_at", since);

  if (error) throw new Error(`fetchRecentPostBodies: ${error.message}`);
  return (data ?? []).map((r: {
    draft_id: string;
    post_drafts: { body: string; embedding?: number[] };
  }) => ({
    id: r.draft_id,
    body: r.post_drafts.body,
    embedding: r.post_drafts.embedding,
  }));
}
