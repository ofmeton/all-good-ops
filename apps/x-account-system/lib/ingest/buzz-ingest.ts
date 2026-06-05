/**
 * lib/ingest/buzz-ingest.ts — twitterapi.io buzz → materials_store
 *
 * Fetches recent tweets from seed accounts (reference-accounts 2026-05-26),
 * runs DLP redaction, then inserts into xad.materials_store with:
 *   source_type = 'x_inspirations'
 *   source_ref  = <userName>
 *   permitted_storage = 'title_only'
 *   publication_consent = 'pending'
 *   meta = { tweet_id }
 *
 * Dedup: skip if a row with meta->>'tweet_id' = <tweet.id> already exists.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { redact } from "../dlp/redact.ts";
import { fetchUserTweets, type Tweet } from "./twitterapi-client.ts";
import type { Env } from "../../src/worker.ts";

// ---------------------------------------------------------------------------
// 固定ネタ元 (チャエン型: AI企業公式 + 英語解説者 + 既存 JP publishers)
//   - ai_official : AI 企業公式。【速報】の一次ソース。チャエンのネタ元
//   - en_curator  : 英語圏の AI 解説者。海外バズの早期検知
//   - jp_publisher: 既存信頼アカ (raw/publishing/inspirations/2026-05-26-reference-accounts.md)
// ---------------------------------------------------------------------------
export type SourceCategory = "ai_official" | "en_curator" | "jp_publisher";

export interface SeedSource {
  handle: string;
  category: SourceCategory;
}

export const SEED_SOURCES: readonly SeedSource[] = [
  // --- 既存信頼 4 アカ ---
  { handle: "Shimayus", category: "jp_publisher" },
  { handle: "SuguruKun_ai", category: "jp_publisher" },
  { handle: "masahirochaen", category: "jp_publisher" },
  { handle: "ClaudeCode_love", category: "jp_publisher" },
  // --- ユーザー追加 20 アカ ---
  { handle: "ClaudeCode_UT", category: "jp_publisher" },
  { handle: "obsidianstudio9", category: "jp_publisher" },
  { handle: "MakeAI_CEO", category: "jp_publisher" },
  { handle: "mmmiyama_D", category: "jp_publisher" },
  { handle: "tetumemo", category: "jp_publisher" },
  { handle: "claudecode_lab", category: "jp_publisher" },
  { handle: "ObsidianOtaku", category: "jp_publisher" },
  { handle: "so_ainsight", category: "jp_publisher" },
  { handle: "Codestudiopjbk", category: "jp_publisher" },
  { handle: "exploraX_", category: "jp_publisher" },
  { handle: "jason_coder0", category: "jp_publisher" },
  { handle: "heynavtoor", category: "jp_publisher" },
  { handle: "ethancoder0", category: "jp_publisher" },
  { handle: "cyrilXBT", category: "jp_publisher" },
  { handle: "daifukujinji", category: "jp_publisher" },
  { handle: "Fluyeporlaweb", category: "jp_publisher" },
  { handle: "commte", category: "jp_publisher" },
  { handle: "csaba_kissi", category: "jp_publisher" },
  { handle: "ai_explorer25", category: "jp_publisher" },
  { handle: "Atenov_D", category: "jp_publisher" },
  // --- AI 企業公式 (チャエンの一次ソース。【速報】の一次出典) ---
  { handle: "AnthropicAI", category: "ai_official" },
  { handle: "OpenAI", category: "ai_official" },
  { handle: "GoogleDeepMind", category: "ai_official" },
  // --- 英語 AI 解説者 (海外バズの早期検知) ---
  { handle: "gerardsans", category: "en_curator" },
] as const;

/** 後方互換: handle の平坦リスト */
export const SEED_HANDLES: readonly string[] = SEED_SOURCES.map((s) => s.handle);

// ---------------------------------------------------------------------------
// キュレーション (スコアリング)
//   ※ 条件本体は TBD。現状は「枠」だけ用意し、足切りは無効 (全件通過) にしてある。
//      重み・しきい値・新規性判定は別セッションで詰める (plan k-x-drifting-lark Phase 4)。
// ---------------------------------------------------------------------------
export interface BuzzScore {
  score: number;
  reasons: string[];
}

/**
 * 取得ツイートの重要度スコア (暫定)。
 *   - ai_official を加点 (一次ソース優先)
 *   - エンゲージメント (like + retweet) の対数を加点
 * TODO(TBD): RT/いいね速度・日本語圏での新規性・トピック新鮮度を組み込む。
 */
export function scoreBuzz(tweet: Tweet, source: SeedSource): BuzzScore {
  const reasons: string[] = [];
  let score = 0;
  if (source.category === "ai_official") {
    score += 2;
    reasons.push("ai_official");
  }
  const engagement = (tweet.likeCount ?? 0) + (tweet.retweetCount ?? 0);
  if (engagement > 0) {
    score += Math.log10(engagement + 1);
    reasons.push(`engagement:${engagement}`);
  }
  return { score, reasons };
}

/** 足切りしきい値。TBD: >0 に上げるとキュレーション (足切り) が有効になる。 */
export const CURATION_MIN_SCORE = 0;

/** Max tweets to fetch per seed handle */
const MAX_TWEETS_PER_HANDLE = 10;

// ---------------------------------------------------------------------------
// Supabase client (singleton)
// ---------------------------------------------------------------------------
let _supabase: SupabaseClient | null = null;

function getSupabase(env: Env): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      { db: { schema: process.env.SUPABASE_SCHEMA || "xad" } },
    ) as unknown as SupabaseClient;
  }
  return _supabase;
}

// Exported for testing (allows injection of a mock supabase)
export function resetSupabaseForTest(): void {
  _supabase = null;
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

/**
 * Check if a tweet_id already exists in materials_store (dedup).
 * Returns true if the tweet_id is already stored.
 */
async function tweetExists(sb: SupabaseClient, tweetId: string): Promise<boolean> {
  const { data, error } = await sb
    .from("materials_store")
    .select("id")
    .eq("source_type", "x_inspirations")
    .filter("meta->>tweet_id", "eq", tweetId)
    .limit(1);

  if (error) return false; // on error, attempt insert (non-critical)
  return Array.isArray(data) && data.length > 0;
}

/**
 * Insert a single tweet into materials_store.
 */
async function insertTweet(
  sb: SupabaseClient,
  tweet: Tweet,
  source: SeedSource,
  score: BuzzScore,
): Promise<boolean> {
  const { redactedText, highRiskHits } = redact(tweet.text);

  const row = {
    source_type: "x_inspirations" as const,
    source_ref: source.handle,
    raw_text: tweet.text,
    redacted_text: redactedText,
    pii: highRiskHits > 0,
    permitted_storage: "title_only" as const,
    publication_consent: "pending" as const,
    meta: {
      tweet_id: tweet.id,
      source_category: source.category,
      buzz_score: score.score,
      score_reasons: score.reasons,
    },
  };

  const { error } = await sb.from("materials_store").insert(row);
  if (error) {
    // FIX 5: a unique-violation (Postgres 23505) on the tweet_id index is a
    // BENIGN concurrent-dedup race — the existence check above is only an
    // optimization. Log at info and skip (not fatal to the run).
    if (isUniqueViolation(error)) {
      console.log(
        JSON.stringify({
          level: "info",
          msg: "[buzz-ingest] duplicate tweet_id skipped (unique violation)",
          tweet_id: tweet.id,
          userName: source.handle,
        }),
      );
      return false;
    }
    console.error(
      JSON.stringify({
        level: "error",
        msg: "[buzz-ingest] insert failed",
        tweet_id: tweet.id,
        userName: source.handle,
        error: error.message,
      }),
    );
    return false;
  }
  return true;
}

/** Postgres unique-violation detection (Supabase PostgrestError code 23505) */
function isUniqueViolation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "23505") return true;
  return /duplicate key value|unique constraint/i.test(error.message ?? "");
}

/**
 * runBuzzIngest — main entry point.
 *
 * @param env  Cloudflare Worker Env (for SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TWITTERAPI_IO_KEY)
 * @param fetchImpl  injected fetch for testing
 * @returns count of newly inserted rows
 */
export async function runBuzzIngest(
  env: Env,
  fetchImpl: typeof fetch = fetch,
): Promise<number> {
  const sb = getSupabase(env);
  let inserted = 0;
  let skippedByCuration = 0;

  for (const source of SEED_SOURCES) {
    let tweets: Tweet[];
    try {
      tweets = await fetchUserTweets(
        source.handle,
        env.TWITTERAPI_IO_KEY,
        MAX_TWEETS_PER_HANDLE,
        fetchImpl,
      );
    } catch (err) {
      console.error(
        JSON.stringify({
          level: "error",
          msg: "[buzz-ingest] fetchUserTweets failed",
          userName: source.handle,
          error: String(err),
        }),
      );
      continue; // skip this handle, proceed to next
    }

    for (const tweet of tweets) {
      // Dedup: skip if already stored
      const exists = await tweetExists(sb, tweet.id);
      if (exists) continue;

      // キュレーション: score < しきい値なら足切り (現状 CURATION_MIN_SCORE=0 で全件通過)
      const score = scoreBuzz(tweet, source);
      if (score.score < CURATION_MIN_SCORE) {
        skippedByCuration++;
        continue;
      }

      const ok = await insertTweet(sb, tweet, source, score);
      if (ok) inserted++;
    }
  }

  console.log(
    JSON.stringify({
      level: "info",
      msg: "[buzz-ingest] complete",
      inserted,
      skippedByCuration,
      handles: SEED_SOURCES.length,
    }),
  );

  return inserted;
}
