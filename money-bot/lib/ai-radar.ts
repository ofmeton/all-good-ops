import { createClient } from "@supabase/supabase-js";
import { getSupabase, hasSupabase } from "./supabase";

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
  {
    signalId: "mock-signal-2",
    content: "Vercel が AI Gateway で Anthropic / OpenAI を統合課金化。Active CPU pricing。",
    fetchedAt: new Date().toISOString(),
    relevanceScore: 0.7,
  },
];

interface AiRadarArticleRow {
  id: string;
  title_ja: string | null;
  title_original: string | null;
  summary_3line: string | null;
  seed_summary: string | null;
  tip_summary: string | null;
  pipeline: string | null;
  detected_at: string | null;
  published_at: string | null;
  claude_tip_score: number | null;
  content_seed_score: number | null;
  score_note: number | null;
  recommended_media: string | null;
}

const PIPELINES_FOR_NOTE = ["content_seed", "claude_tip", "both"] as const;

/**
 * ai-radar 連携。spec §6.4 の α 方式 (direct supabase) を実装。
 * 実テーブルは `articles` (ai-radar v2 schema)。`pipeline IN (content_seed/claude_tip/both)` を 24h window で読む。
 * AI_RADAR_* が無ければ β (API endpoint) を試し、いずれも無ければ MOCK を返す。
 */
export async function fetchAiRadarSignals(): Promise<AiRadarSignal[]> {
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
          "id, title_ja, title_original, summary_3line, seed_summary, tip_summary, pipeline, detected_at, published_at, claude_tip_score, content_seed_score, score_note, recommended_media",
        )
        .gte("detected_at", sinceIso)
        .in("pipeline", [...PIPELINES_FOR_NOTE])
        .order("content_seed_score", { ascending: false, nullsFirst: false })
        .limit(20);
      if (error) throw error;

      const signals: AiRadarSignal[] = (data ?? []).map((row) =>
        articleRowToSignal(row as AiRadarArticleRow),
      );
      if (signals.length > 0) {
        await upsertSignalCache(signals);
        return signals;
      }
    } catch (err) {
      console.warn("[ai-radar] direct supabase read failed, falling through", err);
    }
  }

  const apiEndpoint = process.env.AI_RADAR_API_ENDPOINT;
  const apiKey = process.env.AI_RADAR_API_KEY;
  if (apiEndpoint) {
    try {
      const res = await fetch(`${apiEndpoint}/signals?since=24h`, {
        headers: apiKey ? { authorization: `Bearer ${apiKey}` } : {},
      });
      if (res.ok) {
        const json = (await res.json()) as { signals?: AiRadarSignal[] };
        const signals = json.signals ?? [];
        if (signals.length > 0) {
          await upsertSignalCache(signals);
          return signals;
        }
      }
    } catch (err) {
      console.warn("[ai-radar] API endpoint read failed", err);
    }
  }

  console.warn("[ai-radar] using MOCK signals — set AI_RADAR_* env to enable");
  return MOCK_SIGNALS;
}

function articleRowToSignal(row: AiRadarArticleRow): AiRadarSignal {
  const title = row.title_ja ?? row.title_original ?? "(no title)";
  const summary = row.summary_3line ?? row.seed_summary ?? row.tip_summary ?? "";
  const content = summary ? `${title}\n\n${summary}` : title;
  const score =
    Math.max(
      row.content_seed_score ?? 0,
      row.claude_tip_score ?? 0,
      row.score_note ?? 0,
    ) / 100;
  return {
    signalId: row.id,
    content,
    fetchedAt: row.detected_at ?? row.published_at ?? new Date().toISOString(),
    ...(Number.isFinite(score) && score > 0 ? { relevanceScore: score } : {}),
  };
}

async function upsertSignalCache(signals: AiRadarSignal[]): Promise<void> {
  if (!hasSupabase() || signals.length === 0) return;
  const supabase = getSupabase();
  const rows = signals.map((s) => ({
    signal_id: s.signalId,
    content: { content: s.content, relevanceScore: s.relevanceScore ?? null },
    fetched_at: s.fetchedAt,
  }));
  const { error } = await supabase
    .from("ai_radar_signals_cache")
    .upsert(rows, { onConflict: "signal_id" });
  if (error) console.warn("[ai-radar] cache upsert failed", error.message);
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
