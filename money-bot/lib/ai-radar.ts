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

/**
 * ai-radar 連携。spec §6.4 の α (direct Supabase read) を実装。
 * AI_RADAR_SUPABASE_URL / AI_RADAR_SUPABASE_ANON_KEY が両方設定されていれば
 * ai-radar 側の `signals` テーブルから 24h window を読みに行く。
 * いずれかが欠ければ既存の AI_RADAR_API_ENDPOINT を試し、それも無ければ mock を返す。
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
        .from("signals")
        .select("id, content, fetched_at, relevance_score")
        .gte("fetched_at", sinceIso)
        .order("relevance_score", { ascending: false, nullsFirst: false })
        .limit(20);
      if (error) throw error;
      const signals: AiRadarSignal[] = (data ?? []).map(
        (row: {
          id: string;
          content: string;
          fetched_at: string;
          relevance_score: number | null;
        }) => ({
          signalId: row.id,
          content: row.content,
          fetchedAt: row.fetched_at,
          ...(row.relevance_score != null
            ? { relevanceScore: row.relevance_score }
            : {}),
        }),
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
  const slug = head
    ? slugify(head.content)
    : `untitled-${Date.now()}`;
  return { slug, signals };
}

function slugify(text: string): string {
  return text
    .slice(0, 32)
    .replace(/[^a-zA-Z0-9\-ぁ-んァ-ヶー一-龯]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || `topic-${Date.now()}`;
}
