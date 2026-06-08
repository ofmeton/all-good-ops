import { serverSupabase } from "./supabase";
import type { ApprovalDraft } from "./drafts-logic";

/** approval_drafts から pending かつ未公開・未予約の draft を新着順で取得。 */
export async function listPendingDrafts(limit = 100): Promise<ApprovalDraft[]> {
  const sb = serverSupabase();
  const { data, error } = await sb
    .from("approval_drafts")
    .select("*")
    .eq("human_approval_status", "pending")
    .is("published_at", null)
    .is("scheduled_for", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listPendingDrafts failed: ${error.message}`);
  return (data ?? []) as ApprovalDraft[];
}

/** RPC で承認状態を原子更新（pending のみ claim）。claim 件数を返す。 */
export async function setApprovalStatus(
  ids: string[],
  status: "approved" | "rejected",
): Promise<number> {
  const sb = serverSupabase();
  const { data, error } = await sb.rpc("set_approval_status", {
    p_ids: ids,
    p_status: status,
  });
  if (error) throw new Error(`set_approval_status failed: ${error.message}`);
  return (data as number) ?? 0;
}

/** post_drafts.body を service role で直接更新（pending かつ未公開のみ）。更新件数を返す。 */
export async function updateDraftBody(id: string, body: string): Promise<number> {
  const sb = serverSupabase();
  const { data, error } = await sb
    .from("post_drafts")
    .update({ body })
    .eq("id", id)
    .eq("human_approval_status", "pending")
    .is("published_at", null)
    .select("id");
  if (error) throw new Error(`updateDraftBody failed: ${error.message}`);
  return Array.isArray(data) ? data.length : 0;
}
