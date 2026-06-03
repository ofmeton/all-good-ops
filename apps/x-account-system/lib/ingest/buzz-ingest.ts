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
// Seed handles (from raw/publishing/inspirations/2026-05-26-reference-accounts.md)
// 24 accounts: 4 existing + 20 user-added
// ---------------------------------------------------------------------------
export const SEED_HANDLES: readonly string[] = [
  // 既存信頼 4 アカ
  "Shimayus",
  "SuguruKun_ai",
  "masahirochaen",
  "ClaudeCode_love",
  // ユーザー追加 20 アカ
  "ClaudeCode_UT",
  "obsidianstudio9",
  "MakeAI_CEO",
  "mmmiyama_D",
  "tetumemo",
  "claudecode_lab",
  "ObsidianOtaku",
  "so_ainsight",
  "Codestudiopjbk",
  "exploraX_",
  "jason_coder0",
  "heynavtoor",
  "ethancoder0",
  "cyrilXBT",
  "daifukujinji",
  "Fluyeporlaweb",
  "commte",
  "csaba_kissi",
  "ai_explorer25",
  "Atenov_D",
] as const;

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
  userName: string,
): Promise<boolean> {
  const { redactedText, highRiskHits } = redact(tweet.text);

  const row = {
    source_type: "x_inspirations" as const,
    source_ref: userName,
    raw_text: tweet.text,
    redacted_text: redactedText,
    pii: highRiskHits > 0,
    permitted_storage: "title_only" as const,
    publication_consent: "pending" as const,
    meta: { tweet_id: tweet.id },
  };

  const { error } = await sb.from("materials_store").insert(row);
  if (error) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "[buzz-ingest] insert failed",
        tweet_id: tweet.id,
        userName,
        error: error.message,
      }),
    );
    return false;
  }
  return true;
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

  for (const userName of SEED_HANDLES) {
    let tweets: Tweet[];
    try {
      tweets = await fetchUserTweets(
        userName,
        env.TWITTERAPI_IO_KEY,
        MAX_TWEETS_PER_HANDLE,
        fetchImpl,
      );
    } catch (err) {
      console.error(
        JSON.stringify({
          level: "error",
          msg: "[buzz-ingest] fetchUserTweets failed",
          userName,
          error: String(err),
        }),
      );
      continue; // skip this handle, proceed to next
    }

    for (const tweet of tweets) {
      // Dedup: skip if already stored
      const exists = await tweetExists(sb, tweet.id);
      if (exists) continue;

      const ok = await insertTweet(sb, tweet, userName);
      if (ok) inserted++;
    }
  }

  console.log(
    JSON.stringify({
      level: "info",
      msg: "[buzz-ingest] complete",
      inserted,
      handles: SEED_HANDLES.length,
    }),
  );

  return inserted;
}
