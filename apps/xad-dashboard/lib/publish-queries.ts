// publish-queries.ts — 「今すぐ手動投稿」(Team B) の read query + ハンドオフ整形 + published_at 確定。
//
// ポリシー（厳守）: ここから X API は一切叩かない。実投稿は chrome-devtools 半自動
//   （通常投稿コンポーザ・source=本人クライアント維持）でエージェントが行う。本アプリの責務は
//   「投稿対象の選択 / 本文＋メディアのハンドオフ payload 生成 / 投稿後の published_at 記録」のみ。
//
// 独立性: A の listApprovedStock を import せず、自分の薄い read query を持つ（A 未マージでも単体動作）。
// drafts-logic.ts のメディア区分ユーティリティ（Attachment 型 / buildMediaDeepLink）は **読み取り再利用**。
import { serverSupabase } from "./supabase";
import { buildMediaDeepLink, type Attachment } from "./drafts-logic";

/** 「今すぐ投稿」対象になる承認済みストック 1 件（薄い read 形）。 */
export interface PublishStock {
  id: string;
  body: string;
  fmat: string | null;
  human_approved_at: string | null;
  risk_level: "low" | "high" | null;
  risk_reasons: string[] | null;
  /** 写真 upload intent（承認時に書かれた attachments）。動画/GIF は本文 deep-link 側。 */
  attachments: Attachment[] | null;
}

const STOCK_COLS = "id, body, fmat, human_approved_at, risk_level, risk_reasons, attachments";

/** 承認済み未予約・未公開ストックを承認順(FIFO)に取得。
 *  条件 = human_approval_status='approved' AND scheduled_for IS NULL AND published_at IS NULL。
 *  予約済み(scheduled_for あり)や公開済みは「今すぐ投稿」候補に出さない。 */
export async function listApprovedStock(limit = 100): Promise<PublishStock[]> {
  const sb = serverSupabase();
  const { data, error } = await sb
    .from("post_drafts")
    .select(STOCK_COLS)
    .eq("human_approval_status", "approved")
    .is("scheduled_for", null)
    .is("published_at", null)
    .order("human_approved_at", { ascending: true })
    .order("id", { ascending: true }) // 同値/null 時の非決定性回避（FIFO 安定化）
    .limit(limit);
  if (error) throw new Error(`listApprovedStock failed: ${error.message}`);
  return (data ?? []) as PublishStock[];
}

/** id 指定で承認済み未公開ストックを 1 件取得（ハンドオフ生成の正本読み）。無ければ null。 */
export async function getApprovedStockById(id: string): Promise<PublishStock | null> {
  const sb = serverSupabase();
  const { data, error } = await sb
    .from("post_drafts")
    .select(STOCK_COLS)
    .eq("id", id)
    .eq("human_approval_status", "approved")
    .is("published_at", null)
    .limit(1);
  if (error) throw new Error(`getApprovedStockById failed: ${error.message}`);
  const row = (data ?? [])[0];
  return (row as PublishStock | undefined) ?? null;
}

// ===========================================================================
// ハンドオフ payload（純ロジック・DB 非依存 = vitest 対象）
//   chrome-devtools で「今すぐ手動投稿」するエージェントへ渡す投稿対象の整形結果。
//   X API は介在しない。写真=upload intent / 動画・GIF=本文 deep-link（drafts-logic と同区分）。
// ===========================================================================

/** ハンドオフに載せる写真 1 件（DL→ネイティブ添付する upload intent）。 */
export interface HandoffPhoto {
  sourceUrl: string;
  sourceMaterialId: string;
}

/** 「今すぐ投稿」ハンドオフ payload。コピー導線でエージェント/人へ渡す。 */
export interface HandoffPayload {
  draftId: string;
  /** 投稿本文（動画/GIF の deep-link は本文内に既に含まれる＝そのまま貼る）。 */
  body: string;
  charCount: number;
  fmat: string | null;
  riskLevel: "low" | "high" | null;
  riskReasons: string[];
  /** 写真 upload intent 群（DL してネイティブ添付）。 */
  photos: HandoffPhoto[];
  /** 本文に動画/GIF の deep-link（/video/1）が含まれるか（含むなら upload 不要・本文展開）。 */
  hasVideoDeepLink: boolean;
  /** 動画 deep-link の例示（先頭の status URL から構築・表示用。無ければ null）。 */
  videoDeepLinkHint: string | null;
}

/** ストック 1 件 → ハンドオフ payload。DB/IO 非依存の純関数（テスト対象）。 */
export function buildHandoffPayload(draft: PublishStock): HandoffPayload {
  const body = typeof draft.body === "string" ? draft.body : "";
  // 写真 upload intent のみ抽出（drafts-logic の Attachment 区分に従う）。
  const photos: HandoffPhoto[] = Array.isArray(draft.attachments)
    ? draft.attachments
        .filter((a) => a && a.kind === "upload" && a.mediaType === "photo" && !!a.sourceUrl)
        .map((a) => ({ sourceUrl: a.sourceUrl, sourceMaterialId: a.sourceMaterialId }))
    : [];
  // 動画/GIF は本文に deep-link 直書き（承認 UI で追記済）。/video/1 の有無で判定。
  const hasVideoDeepLink = /\/video\/1\b/.test(body);
  // 表示用ヒント: 本文中の最初の status URL から buildMediaDeepLink で video deep-link を再構築。
  let videoDeepLinkHint: string | null = null;
  if (hasVideoDeepLink) {
    const m = body.match(/https?:\/\/(?:x|twitter)\.com\/[^\s]+\/status\/\d+/);
    if (m) videoDeepLinkHint = buildMediaDeepLink(m[0], "video");
  }
  return {
    draftId: draft.id,
    body,
    charCount: [...body].length,
    fmat: draft.fmat ?? null,
    riskLevel: draft.risk_level ?? null,
    riskReasons: Array.isArray(draft.risk_reasons) ? draft.risk_reasons : [],
    photos,
    hasVideoDeepLink,
    videoDeepLinkHint,
  };
}

/** post_drafts.published_at を service role で**冪等 UPDATE**（published_at IS NULL ガード）。
 *  確定した件数を返す。二重押下時は 0 件（no-op）= 二重「投稿済み」記録を防ぐ。
 *  updateDraftBody と同型。X API は介在しない（実投稿は chrome 側で完了済みの前提で記録のみ）。 */
export async function markPublished(id: string): Promise<number> {
  const sb = serverSupabase();
  const { data, error } = await sb
    .from("post_drafts")
    .update({ published_at: new Date().toISOString() })
    .eq("id", id)
    .eq("human_approval_status", "approved")
    .is("published_at", null) // ← 冪等ガード（二重押下 no-op）
    .select("id");
  if (error) throw new Error(`markPublished failed: ${error.message}`);
  return Array.isArray(data) ? data.length : 0;
}
