/**
 * 予約確定 draft の冪等 UPDATE（post_drafts.scheduled_for / scheduled_post_id）。
 *
 * scheduled-publish スキルが chrome-devtools で X 予約登録した後、record CLI から呼ぶ。
 * `where id=$ and scheduled_for is null` ガードで冪等＝既予約 draft は no-op になり、
 * plan-scheduled-publish.ts（approved かつ scheduled_for IS NULL を拾う）が同じ draft を
 * 再プラン → 二重予約する退行を防ぐ。trace 記録(scheduled-publish-trace)とは別責務。
 *
 * trace と違いこれは**本体の write**（fail-open にしない）。Supabase エラーは throw する。
 * 個々の no-op（既予約）は正常系として applied=false で返す。IO は deps 注入で jest 可。
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface ScheduledMark {
  draftId: string;
  scheduledFor: string;
  scheduledPostId?: string;
}

export interface MarkScheduledResult {
  draftId: string;
  /** true=この呼び出しで更新（scheduled_for が null だった） / false=既予約で no-op */
  applied: boolean;
}

export interface MarkScheduledDeps {
  /** 1 draft の冪等 UPDATE を行い、実際に更新された行数(0 or 1)を返す。 */
  updateDraftSchedule: (
    draftId: string,
    scheduledFor: string,
    scheduledPostId: string | null,
  ) => Promise<number>;
}

let _client: SupabaseClient | null | undefined;

export function __setMarkSupabaseForTest(c: SupabaseClient | null): void {
  _client = c;
}

function getSupabase(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です (.env.local を確認)");
  }
  // 非 public schema は型上 "public" にキャスト（既存 trace-store 規約）
  _client = createClient(url, key, { db: { schema: "xad" as "public" } });
  return _client;
}

const defaultDeps: MarkScheduledDeps = {
  updateDraftSchedule: async (draftId, scheduledFor, scheduledPostId) => {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("post_drafts")
      .update({ scheduled_for: scheduledFor, scheduled_post_id: scheduledPostId })
      .eq("id", draftId)
      .is("scheduled_for", null) // 冪等ガード: 既予約は更新しない
      .select("id");
    if (error) throw new Error(`markScheduled UPDATE 失敗 (${draftId}): ${error.message}`);
    return Array.isArray(data) ? data.length : 0;
  },
};

/**
 * 予約確定分を冪等 UPDATE する。既予約(scheduled_for あり)は no-op で applied=false。
 * @returns 各 draft の適用結果（applied 件数で「今回確定した予約数」が分かる）
 */
export async function markScheduledReservations(
  marks: ScheduledMark[],
  deps: Partial<MarkScheduledDeps> = {},
): Promise<MarkScheduledResult[]> {
  const d = { ...defaultDeps, ...deps };
  const results: MarkScheduledResult[] = [];
  for (const m of marks) {
    const n = await d.updateDraftSchedule(m.draftId, m.scheduledFor, m.scheduledPostId ?? null);
    results.push({ draftId: m.draftId, applied: n > 0 });
  }
  return results;
}
