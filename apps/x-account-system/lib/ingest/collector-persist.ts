/**
 * lib/ingest/collector-persist.ts — dedup（冪等性）＋ materials_store 保存（配管）。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { redact } from "../dlp/redact.js";
import type { ScoredCandidate } from "./collector-scoring.js";

/** 既存 store にある tweet_id とバッチ内重複を除去。 */
export async function dedupCandidates(
  sb: SupabaseClient,
  scored: ScoredCandidate[],
): Promise<ScoredCandidate[]> {
  // バッチ内 dedup
  const seen = new Set<string>();
  const unique = scored.filter((c) => {
    if (seen.has(c.tweet.id)) return false;
    seen.add(c.tweet.id);
    return true;
  });
  const ids = unique.map((c) => c.tweet.id);
  if (ids.length === 0) return [];

  const { data, error } = await sb
    .from("materials_store")
    .select("meta")
    .eq("source_type", "x_inspirations")
    .in("meta->>tweet_id", ids);

  if (error) return unique; // fail-open: dedup できなくても unique violation で弾かれる
  const existing = new Set(
    (data ?? []).map((r: { meta?: { tweet_id?: string } }) => r.meta?.tweet_id),
  );
  return unique.filter((c) => !existing.has(c.tweet.id));
}

export interface MaterialRow {
  source_type: "x_inspirations";
  source_ref: string;
  raw_text: string;
  redacted_text: string;
  pii: boolean;
  permitted_storage: "title_only";
  publication_consent: "pending";
  meta: Record<string, unknown>;
}

/** ScoredCandidate → materials_store row。 */
export function buildMaterialRow(
  c: ScoredCandidate,
  redactedText: string,
  pii: boolean,
): MaterialRow {
  const createdAtParsed = new Date(c.tweet.createdAt);
  const collected_at = Number.isFinite(createdAtParsed.getTime())
    ? createdAtParsed.toISOString()
    : null;

  return {
    source_type: "x_inspirations",
    source_ref: c.tweet.author.userName,
    raw_text: c.tweet.text,
    redacted_text: redactedText,
    pii,
    permitted_storage: "title_only",
    publication_consent: "pending",
    meta: {
      tweet_id: c.tweet.id,
      tweet_url: c.tweet.tweetUrl ?? null,
      lang: c.tweet.lang ?? null,
      is_reply: c.tweet.isReply ?? null,
      conversation_id: c.tweet.conversationId ?? null,
      media: c.tweet.media ?? [],
      scores: c.scores,
      score_reason: c.scoreReason,
      discovery: c.discovery,
      collected_at,
      selection_status: "collected",
      cost_jpy: c.costJpy,
    },
  };
}

/** dedup→保存。保存できた件数を返す。unique violation は benign skip。 */
export async function saveScoredMaterials(
  sb: SupabaseClient,
  scored: ScoredCandidate[],
): Promise<number> {
  const fresh = await dedupCandidates(sb, scored);
  let saved = 0;
  for (const c of fresh) {
    const { redactedText, highRiskHits } = redact(c.tweet.text);
    const row = buildMaterialRow(c, redactedText, highRiskHits > 0);
    const { error } = await sb.from("materials_store").insert(row);
    if (!error) saved += 1;
  }
  return saved;
}
