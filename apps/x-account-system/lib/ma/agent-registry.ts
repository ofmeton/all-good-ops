/**
 * lib/ma/agent-registry.ts — 永続 Managed Agent の参照解決（段階1 P1）
 *
 * xad.ma_agents（migration 0020）から agent_key（writer / editor 等の論理キー）で
 * active な agent_id / version / environment_id を引き、run-session の persistent
 * 経路（agentRef / environmentId）に渡す。
 *
 * miss（未 bootstrap）は **throw**。run-session の「キー欠落は誤 stub せず明示
 * エラー」ガードと同列の思想で、未準備の agent を黙って ephemeral に流したり
 * stub 投稿させたりしない（誤投稿防止）。
 *
 * Supabase client は呼び出し側が xad schema 用に構成して注入する
 * （lib/trace/trace-store.ts と同じ `db.schema:"xad" as "public"` cast 規約。
 * 本 util は schema を二重 chain せず plain .from() を使う）。
 *
 * isolate 内 Map cache: 同一 isolate（Worker request）内で同じ key の再解決を
 * 避ける。clearCache() はテスト隔離用。
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface AgentRef {
  agentId: string;
  version: string;
  environmentId: string;
}

const cache = new Map<string, AgentRef>();

/** テスト隔離用に cache を空にする。 */
export function clearCache(): void {
  cache.clear();
}

/**
 * agent_key から active な agent の参照を解決する。
 * miss（行無し / status!=active）は "agent not bootstrapped" で throw。
 * query エラーも握り潰さず throw（fail-open しない＝誤動作より明示失敗を選ぶ）。
 */
export async function getAgentRef(sb: SupabaseClient, key: string): Promise<AgentRef> {
  const cached = cache.get(key);
  if (cached) return cached;

  const { data, error } = await sb
    .from("ma_agents")
    .select("agent_id, version, environment_id")
    .eq("agent_key", key)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(`[ma-registry] query failed for "${key}": ${error.message}`);
  }
  if (!data) {
    throw new Error(`[ma-registry] agent not bootstrapped: ${key}`);
  }

  const row = data as { agent_id: string; version: string; environment_id: string };
  const ref: AgentRef = {
    agentId: row.agent_id,
    version: row.version,
    environmentId: row.environment_id,
  };
  cache.set(key, ref);
  return ref;
}
