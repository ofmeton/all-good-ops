// drafts-logic.ts — 承認体験(T3)の純ロジック。DB/IO 非依存（vitest 対象）。
// 状態遷移・本文バリデーション・承認可否のみ。配管は drafts-queries が持つ。

export type DraftApprovalAction = "approve" | "reject";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "auto_approved";

/** UI アクション → human_approval_status。RPC guard と一致させる。 */
export const ACTION_TO_STATUS: Record<DraftApprovalAction, "approved" | "rejected"> = {
  approve: "approved",
  reject: "rejected",
};

/** 元ネタツイート 1 件（approval_drafts.sources[] の要素）。 */
export interface ApprovalSource {
  id: string;
  raw_text: string | null;
  translation: string | null;
  tweet_url: string | null;
  lang: string | null;
  source_ref: string | null;
  media: { type: string; url: string }[] | null;
  engagement: Record<string, number> | null;
}

/** 承認待ち draft 1 件（approval_drafts view の 1 行）。 */
export interface ApprovalDraft {
  id: string;
  created_at: string;
  core_idea_id: string;
  body: string;
  fmat: string | null;
  human_approval_status: ApprovalStatus;
  human_approved_at: string | null;
  risk_level: "low" | "high";
  risk_reasons: string[] | null;
  editor_status: string | null;
  published_at: string | null;
  scheduled_for: string | null;
  idea_title: string | null;
  idea_summary: string | null;
  idea_status: string | null;
  sources: ApprovalSource[];
}

/** 本文の上限（X 長文/記事も収まる安全側上限）。 */
export const BODY_MAX_LEN = 25000;

export type ValidateResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

/** 本文を trim し、空/上限超を弾く。保存前のサーバ・クライアント共通ガード。 */
export function validateBody(raw: unknown): ValidateResult {
  if (typeof raw !== "string") return { ok: false, error: "本文が文字列ではありません" };
  const value = raw.trim();
  if (value.length === 0) return { ok: false, error: "本文が空です" };
  if (value.length > BODY_MAX_LEN) {
    return { ok: false, error: `本文が長すぎます（${value.length}/${BODY_MAX_LEN}字）` };
  }
  return { ok: true, value };
}

/** 承認/却下できるのは pending かつ未公開・未予約のときだけ（RPC の CAS と同条件）。 */
export function canApprove(
  d: Pick<ApprovalDraft, "human_approval_status" | "published_at" | "scheduled_for">,
): boolean {
  return (
    d.human_approval_status === "pending" &&
    d.published_at == null &&
    d.scheduled_for == null
  );
}
