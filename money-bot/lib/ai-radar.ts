import { createClient } from "@supabase/supabase-js";

export interface AiRadarSignal {
  signalId: string;
  content: string;
  fetchedAt: string;
  relevanceScore?: number;
}

const MOCK_SIGNALS: AiRadarSignal[] = [
  {
    signalId: "mock-signal-1",
    content: "Anthropic が Claude 4.7 をリリース。コンテキスト 1M tokens 対応。",
    fetchedAt: new Date().toISOString(),
    relevanceScore: 0.9,
  },
];

const PIPELINES_FOR_NOTE = ["content_seed", "claude_tip", "both"] as const;

export async function fetchAiRadarSignals(): Promise<AiRadarSignal[]> {
  "use step";
  const directUrl = process.env.AI_RADAR_SUPABASE_URL;
  const directKey = process.env.AI_RADAR_SUPABASE_ANON_KEY;

  if (directUrl && directKey) {
    try {
      const aiRadar = createClient(directUrl, directKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await aiRadar
        .from("articles")
        .select(
          "id, title_ja, title_original, summary_3line, seed_summary, tip_summary, detected_at, published_at, claude_tip_score, content_seed_score, score_note",
        )
        .gte("detected_at", sinceIso)
        .in("pipeline", [...PIPELINES_FOR_NOTE])
        .order("content_seed_score", { ascending: false, nullsFirst: false })
        .limit(20);
      if (error) throw error;

      const signals: AiRadarSignal[] = (data ?? []).map((row: {
        id: string;
        title_ja: string | null;
        title_original: string | null;
        summary_3line: string | null;
        seed_summary: string | null;
        tip_summary: string | null;
        detected_at: string | null;
        published_at: string | null;
        claude_tip_score: number | null;
        content_seed_score: number | null;
        score_note: number | null;
      }) => {
        const title = row.title_ja ?? row.title_original ?? "(no title)";
        const summary = row.summary_3line ?? row.seed_summary ?? row.tip_summary ?? "";
        const score = Math.max(
          row.content_seed_score ?? 0,
          row.claude_tip_score ?? 0,
          row.score_note ?? 0,
        ) / 100;
        return {
          signalId: row.id,
          content: summary ? `${title}\n\n${summary}` : title,
          fetchedAt: row.detected_at ?? row.published_at ?? new Date().toISOString(),
          ...(Number.isFinite(score) && score > 0 ? { relevanceScore: score } : {}),
        };
      });
      if (signals.length > 0) return signals;
    } catch (err) {
      console.warn("[ai-radar] direct supabase read failed", err);
    }
  }

  console.warn("[ai-radar] using MOCK signals");
  return MOCK_SIGNALS;
}

export function selectTopic(signals: AiRadarSignal[]): {
  slug: string;
  signals: AiRadarSignal[];
} {
  const head = signals[0];
  const slug = head ? slugify(head.content) : `untitled-${Date.now()}`;
  return { slug, signals };
}

function slugify(text: string): string {
  return (
    text
      .slice(0, 32)
      .replace(/[^a-zA-Z0-9\-ぁ-んァ-ヶー一-龯]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || `topic-${Date.now()}`
  );
}
