/**
 * approvals.feedback から直近 N 件の人間フィードバックを取得して prompt に inject する helper。
 *
 * feedback の形状 (approvals テーブル):
 *   feedback: {
 *     visual?: string,    // visual に対するコメント
 *     reviewer?: string,  // reviewer 評価に対するコメント
 *     sns?: string,       // SNS 投稿に対するコメント
 *     general?: string,   // 全般コメント
 *   }
 */

import { getSupabase, hasSupabase } from "./supabase";

export type FeedbackChannel = "visual" | "reviewer" | "sns" | "general";

interface RawApproval {
  run_id: string;
  approved: boolean;
  feedback: Record<string, unknown> | null;
  decided_at: string;
}

export interface FeedbackEntry {
  runId: string;
  approved: boolean;
  comment: string;
  decidedAt: string;
}

/**
 * 過去 N 件の人間フィードバックを取得 (該当 channel フィルタ)
 * 既定: 5 件
 */
export async function fetchRecentFeedback(args: {
  channel: FeedbackChannel;
  limit?: number;
}): Promise<FeedbackEntry[]> {
  "use step";
  if (!hasSupabase()) return [];

  const supabase = getSupabase();
  const limit = args.limit ?? 5;

  const { data, error } = await supabase
    .from("approvals")
    .select("run_id, approved, feedback, decided_at")
    .order("decided_at", { ascending: false })
    .limit(50);

  if (error || !data) {
    console.warn("[feedback-history] fetch failed", error?.message);
    return [];
  }

  const entries: FeedbackEntry[] = [];
  for (const row of data as RawApproval[]) {
    const fb = row.feedback ?? {};
    const comment = (fb[args.channel] as string | undefined) ?? (fb["general"] as string | undefined);
    if (comment && comment.trim().length > 0) {
      entries.push({
        runId: row.run_id,
        approved: row.approved,
        comment: comment.trim(),
        decidedAt: row.decided_at,
      });
      if (entries.length >= limit) break;
    }
  }
  return entries;
}

/**
 * 取得済み feedback を agent に投入する文字列に整形
 */
export function feedbackContextString(entries: FeedbackEntry[]): string {
  if (entries.length === 0) return "";
  const lines: string[] = [];
  lines.push("--- 過去の人間フィードバック (直近 " + entries.length + " 件、新しい順) ---");
  for (const e of entries) {
    const verdict = e.approved ? "✅ 承認" : "❌ 却下";
    lines.push(`${verdict} — ${e.comment}`);
  }
  lines.push("--- 次の生成では上記フィードバックを踏まえてください ---");
  return lines.join("\n");
}
