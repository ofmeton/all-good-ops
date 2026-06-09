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
  /** 既に保存済みの写真添付 intent（approval_drafts.attachments）。承認時に上書きできる。 */
  attachments: Attachment[] | null;
  /** 承認/却下時に記録された理由・メモ（任意）。Stage 2B で追加。view 行には常に存在（未入力は null）。 */
  approval_reason: string | null;
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

// ===========================================================================
// メディア添付（T-A）— 写真=upload intent / 動画・GIF=本文 deep-link
//   intent と実結果を分離: 承認時は upload intent のみ書く。publish 時に
//   skill(media-fetch) が DL 成否を localPath/resolvedKind/fallbackReason に追記する。
//   動画/GIF は本文へ deep-link を直書きするため attachments には入れない。
// ===========================================================================

/** 写真添付 1 件。`kind:'upload'` は「DL→upload_file でネイティブ添付」する意図。
 *  localPath 以降は publish 時に skill が埋める実行結果（承認時は未定義）。 */
export interface Attachment {
  kind: "upload";
  mediaType: "photo";
  /** 元ネタ写真の実体 URL（pbs.twimg.com）。 */
  sourceUrl: string;
  /** 元ネタ素材 ID（approval_drafts.sources[].id）。 */
  sourceMaterialId: string;
  // ↓ publish 時に media-fetch が追記する実行結果（承認時は無い）
  /** DL 先のローカル一時パス（upload_file に渡す）。 */
  localPath?: string;
  /** 'upload'=DL 成功で添付可 / 'skipped'=DL 失敗で本文のみ投稿（サイレント失敗防止）。 */
  resolvedKind?: "upload" | "skipped";
  /** skipped に降格した理由（HTTP エラー等）。 */
  fallbackReason?: string;
}

/** メディア種別 → 投稿本文に貼る deep-link を決定的に構築する。
 *  video/animated_gif → `{tweetUrl}/video/1`（X が本文中で動画展開する）
 *  photo              → `{tweetUrl}/photo/{index}`（index は 1 始まり）
 *  末尾スラッシュは除去して正規化する。 */
export function buildMediaDeepLink(
  tweetUrl: string,
  mediaType: string,
  index = 1,
): string {
  const base = tweetUrl.replace(/\/+$/, "");
  if (mediaType === "video" || mediaType === "animated_gif") {
    return `${base}/video/1`;
  }
  const i = Number.isFinite(index) && index >= 1 ? Math.floor(index) : 1;
  return `${base}/photo/${i}`;
}

/** 元ネタ素材群から写真の upload intent（Attachment[]）を既定構築する。
 *  pbs.twimg.com の写真のみ対象。動画/GIF は対象外（本文 deep-link で扱う）。
 *  url/source id が欠落した要素は安全側で除外する。 */
export function defaultPhotoAttachments(sources: ApprovalSource[]): Attachment[] {
  const out: Attachment[] = [];
  for (const s of sources ?? []) {
    if (!s || !s.id || !s.media) continue;
    for (const m of s.media) {
      if (!m || m.type !== "photo") continue;
      if (typeof m.url !== "string" || m.url.length === 0) continue;
      out.push({
        kind: "upload",
        mediaType: "photo",
        sourceUrl: m.url,
        sourceMaterialId: s.id,
      });
    }
  }
  return out;
}

/** 添付上限（X 投稿の画像 4 枚 + 余裕。暴走 payload ガード）。 */
export const ATTACHMENTS_MAX = 8;

export type ValidateAttachmentsResult =
  | { ok: true; value: Attachment[] }
  | { ok: false; error: string };

/** API 境界の写真 attachments ガード。配列・必須フィールド・型・件数を検証し
 *  intent フィールドのみを再構築して内部へ渡す（実行結果フィールドは承認時に受け取らない）。 */
export function validateAttachments(raw: unknown): ValidateAttachmentsResult {
  if (raw == null) return { ok: true, value: [] };
  if (!Array.isArray(raw)) return { ok: false, error: "attachments が配列ではありません" };
  if (raw.length > ATTACHMENTS_MAX) {
    return { ok: false, error: `添付が多すぎます（${raw.length}/${ATTACHMENTS_MAX}）` };
  }
  const value: Attachment[] = [];
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i] as Record<string, unknown> | null;
    if (!a || typeof a !== "object") {
      return { ok: false, error: `attachments[${i}] が不正です` };
    }
    if (a.kind !== "upload") {
      return { ok: false, error: `attachments[${i}].kind は 'upload' のみ対応です` };
    }
    if (a.mediaType !== "photo") {
      return { ok: false, error: `attachments[${i}].mediaType は 'photo' のみ対応です` };
    }
    if (typeof a.sourceUrl !== "string" || a.sourceUrl.length === 0) {
      return { ok: false, error: `attachments[${i}].sourceUrl が空です` };
    }
    if (typeof a.sourceMaterialId !== "string" || a.sourceMaterialId.length === 0) {
      return { ok: false, error: `attachments[${i}].sourceMaterialId が空です` };
    }
    // intent のみ再構築（localPath/resolvedKind/fallbackReason は承認時に受け取らない）
    value.push({
      kind: "upload",
      mediaType: "photo",
      sourceUrl: a.sourceUrl,
      sourceMaterialId: a.sourceMaterialId,
    });
  }
  return { ok: true, value };
}
