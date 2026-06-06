import type { SupabaseClient } from "@supabase/supabase-js";

export interface ComposeStubResult {
  count: number;
  materialIds: string[];
}

/**
 * 執筆配管 stub。selection_status='queued' の素材を読み件数/ID を返すだけ。
 * 実 writer エージェント本体は次ステージで本関数を置き換える。
 */
export async function runComposeStub(sb: SupabaseClient): Promise<ComposeStubResult> {
  const { data, error } = await sb
    .from("materials_store")
    .select("id")
    .eq("source_type", "x_inspirations")
    .eq("meta->>selection_status", "queued");
  if (error) throw new Error(`compose-stub read failed: ${error.message}`);
  const materialIds = (data ?? []).map((r: { id: string }) => r.id);
  return { count: materialIds.length, materialIds };
}
