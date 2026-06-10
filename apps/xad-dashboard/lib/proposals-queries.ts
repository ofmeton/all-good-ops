import { serverSupabase } from "./supabase";

export type ProposalRow = {
  id: string;
  proposal_type: string;
  scope: string;
  hypothesis: string;
  evidence: Record<string, unknown>;
  rank: "A" | "B" | "C" | null;
  accepted: boolean | null;
  implemented: boolean | null;
  reviewer_reason: string | null;
  meta: Record<string, unknown> | null;
};

export type ApplyDescriptor = { paramId: string; value: number };

const COLS =
  "id, proposal_type, scope, hypothesis, evidence, rank, accepted, implemented, reviewer_reason, meta";

/** 未レビュー（accepted is null）の提案を rank(A→B→C)・新しい順で返す。 */
export async function listPendingProposals(limit = 100): Promise<ProposalRow[]> {
  const sb = serverSupabase();
  const { data, error } = await sb
    .from("optimizer_proposal")
    .select(COLS)
    .is("accepted", null)
    .order("rank", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listPendingProposals failed: ${error.message}`);
  return (data ?? []) as ProposalRow[];
}

/** accept/reject を記録。accept 時に任意で tier-T 構造化変更を meta.apply へ。 */
export async function setProposalDecision(
  ids: string[],
  accepted: boolean,
  reason?: string | null,
  apply?: ApplyDescriptor | null,
): Promise<number> {
  const sb = serverSupabase();
  const { data, error } = await sb.rpc("set_proposal_decision", {
    p_ids: ids,
    p_accepted: accepted,
    p_reason: reason ?? null,
    p_apply: apply ?? null,
  });
  if (error) throw new Error(`setProposalDecision failed: ${error.message}`);
  return (data as number) ?? 0;
}
