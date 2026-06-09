import { serverSupabase } from "./supabase";
import type { ApprovalDraft, Attachment } from "./drafts-logic";

/** approval_drafts から「点検済み(editor_status='approved')かつ pending・未公開・未予約」の
 *  draft を新着順で取得。点検前 draft を人間ゲートに載せない（fact-check バイパス退行防止）。 */
export async function listPendingDrafts(limit = 100): Promise<ApprovalDraft[]> {
  const sb = serverSupabase();
  const { data, error } = await sb
    .from("approval_drafts")
    .select("*")
    // editor_status='approved' = MA チェッカー（fact-check/risk 判定）通過済み。
    // これを外すと compose 直後の未点検 pending draft が承認可能になり、承認後は
    // check のクエリ（editor_status='pending'）に二度と一致せず未点検のまま公開されうる。必須。
    .eq("editor_status", "approved")
    .eq("human_approval_status", "pending")
    .is("published_at", null)
    .is("scheduled_for", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listPendingDrafts failed: ${error.message}`);
  return (data ?? []) as ApprovalDraft[];
}

/** RPC で承認状態を原子更新（pending のみ claim）。claim 件数を返す。
 *  attachments 指定時のみ写真 upload intent を書く（null は既存値を維持＝後方互換）。
 *  reason は承認/却下どちらでも記録可（null/未指定は既存値維持）。Stage 2B。 */
export async function setApprovalStatus(
  ids: string[],
  status: "approved" | "rejected",
  attachments?: Attachment[] | null,
  reason?: string | null,
): Promise<number> {
  const sb = serverSupabase();
  const { data, error } = await sb.rpc("set_approval_status", {
    p_ids: ids,
    p_status: status,
    // 承認かつ写真添付がある時だけ渡す。空配列/未指定は null（既存値維持）。
    p_attachments:
      status === "approved" && attachments && attachments.length > 0 ? attachments : null,
    p_reason: reason ?? null,
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
