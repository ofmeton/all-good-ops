import { requireAdmin } from "@/lib/supabase";
import { callJson, SONNET } from "@/lib/anthropic";

interface TrackAOutput {
  new_queries: string[];
  query_retire_candidates: string[];
  threshold_adjust: number;
  notes: string;
}

export async function runTrackA(): Promise<{ proposals: TrackAOutput }> {
  const sb = requireAdmin();
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const { data: adopted } = await sb
    .from("x_buzz_tweets")
    .select("category, buzz_pattern, body, claude_relevance")
    .eq("status", "adopted")
    .gte("updated_at", since)
    .limit(80);

  const { data: rejected } = await sb
    .from("x_buzz_tweets")
    .select("rejection_reason, body")
    .eq("status", "rejected")
    .gte("updated_at", since)
    .limit(80);

  const { data: queries } = await sb
    .from("query_pool")
    .select("query_id, query_string, total_hits, total_adoptions")
    .eq("active", true);

  const adoptedLines = (adopted ?? [])
    .map(
      (a) =>
        `- [${a.category}/${a.buzz_pattern}] rel=${a.claude_relevance} ${String(a.body).slice(0, 80)}`,
    )
    .join("\n");

  const rejectedLines = (rejected ?? [])
    .map(
      (r) =>
        `- (${r.rejection_reason ?? "未指定"}) ${String(r.body).slice(0, 60)}`,
    )
    .join("\n");

  const queryLines = (queries ?? [])
    .map(
      (q) =>
        `- "${q.query_string}" hits=${q.total_hits} adoptions=${q.total_adoptions}`,
    )
    .join("\n");

  const out = await callJson<TrackAOutput>({
    model: SONNET,
    system: "あなたは情報検索の自己改善エンジニアです。出力は JSON のみ。",
    user: `## 過去7日の採用 (${adopted?.length ?? 0}件)
${adoptedLines || "(なし)"}

## 過去7日の棄却 (${rejected?.length ?? 0}件)
${rejectedLines || "(なし)"}

## 現在の active query
${queryLines || "(なし)"}

以下を提案してください:
- new_queries: 採用バズに頻出のキーワードから新規 query string (3-5 個)
- query_retire_candidates: hits>50 かつ adoption率<5% の query (query_string) 一覧
- threshold_adjust: claude_relevance の adoption_threshold を 上げる(+N) / 下げる(-N) / 据置(0)
- notes: 全体所見 (200字)

JSON:
{"new_queries": ["..."], "query_retire_candidates": ["..."], "threshold_adjust": 0, "notes": "..."}`,
    maxTokens: 1024,
  });

  return { proposals: out };
}
