/**
 * lib/ingest/collector-persist.ts — dedup（冪等性）＋ materials_store 保存（配管）。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { redact } from "../dlp/redact.js";
import type { ScoredCandidate } from "./collector-scoring.js";
import { TRANSLATION_ENGINE } from "./collector-translate.js";

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

/** ScoredCandidate → materials_store row。translation 指定時のみ meta に翻訳を付与。 */
export function buildMaterialRow(
  c: ScoredCandidate,
  redactedText: string,
  pii: boolean,
  translation?: string,
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
      // 翻訳がある（海外ツイート）ときだけ meta に積む。日本語/翻訳失敗は付与しない。
      ...(translation
        ? { translation, translation_engine: TRANSLATION_ENGINE }
        : {}),
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
      engagement: {
        like: c.tweet.likeCount ?? 0,
        retweet: c.tweet.retweetCount ?? 0,
        reply: c.tweet.replyCount ?? 0,
        quote: c.tweet.quoteCount ?? 0,
        bookmark: c.tweet.bookmarkCount ?? 0,
        view: c.tweet.viewCount ?? 0,
      },
    },
  };
}

/** dedup→保存。保存できた件数を返す。unique violation は benign skip。
 *  translations（tweet_id→日本語訳）が渡されれば該当 row の meta に翻訳を付与する。 */
export async function saveScoredMaterials(
  sb: SupabaseClient,
  scored: ScoredCandidate[],
  translations?: Map<string, string>,
): Promise<number> {
  const fresh = await dedupCandidates(sb, scored);
  let saved = 0;
  for (const c of fresh) {
    const { redactedText, highRiskHits } = redact(c.tweet.text);
    const row = buildMaterialRow(c, redactedText, highRiskHits > 0, translations?.get(c.tweet.id));
    const { error } = await sb.from("materials_store").insert(row);
    if (error) {
      console.warn(JSON.stringify({ level: "warn", msg: "[collect] material insert failed", tweet_id: c.tweet.id, error: error.message }));
    } else {
      saved += 1;
    }
  }
  return saved;
}
