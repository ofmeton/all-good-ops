/**
 * lib/ingest/inspirations-ingest.ts — 週次 inspirations ingest → materials_store
 *
 * Weekly broader version of buzz-ingest (W5-1).
 * Seed set: 24 X accounts (overseas ≥6, domestic ≥18) + 3 note seeds.
 *
 * X seeds (source_type='x_inspirations'):
 *   - Fetches via twitterapi.io (same client as buzz-ingest)
 *   - DLP redact applied
 *   - Dedup by meta->>'tweet_id'
 *
 * Note seeds (source_type='note_inspirations'):
 *   - note.com / external blog — no X API available
 *   - Stored as reference-only: handle/URL + meta, NO fabricated tweet content
 *   - raw_text = null (empty)
 *   - Dedup by meta->>'dedup_key' (stable: url slug + ISO week)
 *
 * Seed reference: raw/publishing/inspirations/2026-05-26-reference-accounts.md
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { redact } from "../dlp/redact.ts";
import { fetchUserTweets, type Tweet } from "./twitterapi-client.ts";
import type { Env } from "../../src/worker.ts";

// ---------------------------------------------------------------------------
// Seed sets (from raw/publishing/inspirations/2026-05-26-reference-accounts.md)
// ---------------------------------------------------------------------------

/** Overseas X handles (English / non-Japanese) */
export const OVERSEAS_HANDLES: readonly string[] = [
  "jason_coder0",   // 海外 coder (英語)
  "heynavtoor",     // 海外 AI 発信 (英語)
  "ethancoder0",    // 海外 coder (英語)
  "cyrilXBT",       // 海外 XBT 関連
  "Fluyeporlaweb",  // スペイン語
  "csaba_kissi",    // 海外
] as const;

/** Domestic X handles (Japanese-primary) */
export const DOMESTIC_HANDLES: readonly string[] = [
  // 既存信頼 4 アカ
  "Shimayus",
  "SuguruKun_ai",
  "masahirochaen",
  "ClaudeCode_love",
  // ユーザー追加 14 アカ (国内想定)
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
  "daifukujinji",
  "commte",
  "ai_explorer25",
  "Atenov_D",
] as const;

/** All X seed handles (overseas + domestic = 24 total) */
export const X_SEED_HANDLES: readonly string[] = [
  ...OVERSEAS_HANDLES,
  ...DOMESTIC_HANDLES,
] as const;

/**
 * Note competitor seeds.
 * note.com and external blogs have no twitterapi.io endpoint.
 * Stored as reference-only — no content fabrication.
 *
 * source: raw/publishing/inspirations/note-20260520-*.md
 */
export interface NoteSeed {
  /** Stable slug for deduplication (url-derived) */
  slug: string;
  /** note.com author handle or domain */
  handle: string;
  /** Canonical URL */
  url: string;
  /** Human-readable platform label */
  platform: "note" | "blog";
}

export const NOTE_SEEDS: readonly NoteSeed[] = [
  {
    slug: "kajiken0630-note",
    handle: "kajiken0630",
    url: "https://note.com/kajiken0630",
    platform: "note",
  },
  {
    slug: "uravation-blog",
    handle: "uravation",
    url: "https://uravation.com/media/",
    platform: "blog",
  },
  {
    slug: "smartround-note",
    handle: "smartround",
    url: "https://note.com/smartround",
    platform: "note",
  },
] as const;

/** Max tweets to fetch per X seed handle */
const MAX_TWEETS_PER_HANDLE = 10;

// ---------------------------------------------------------------------------
// Supabase client (singleton per module)
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

/** Exported for testing (allows injection of a mock supabase) */
export function resetSupabaseForTest(): void {
  _supabase = null;
}

// ---------------------------------------------------------------------------
// ISO week key — used for note dedup (weekly grain)
// ---------------------------------------------------------------------------

function isoWeekKey(): string {
  const now = new Date();
  // ISO week: year + week number
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const dayOfYear = Math.floor((now.getTime() - jan4.getTime()) / 86_400_000);
  const weekNum = Math.ceil((dayOfYear + jan4.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// X tweet dedup + insert
// ---------------------------------------------------------------------------

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
    // FIX 5: unique-violation (23505) on the tweet_id index is a benign dedup
    // race — existence check is just an optimization. Log info + skip.
    if (isUniqueViolation(error)) {
      console.log(
        JSON.stringify({
          level: "info",
          msg: "[inspirations-ingest] duplicate tweet_id skipped (unique violation)",
          tweet_id: tweet.id,
          userName,
        }),
      );
      return false;
    }
    console.error(
      JSON.stringify({
        level: "error",
        msg: "[inspirations-ingest] insert tweet failed",
        tweet_id: tweet.id,
        userName,
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

// ---------------------------------------------------------------------------
// Note seed dedup + insert
// ---------------------------------------------------------------------------

async function noteExists(sb: SupabaseClient, dedupKey: string): Promise<boolean> {
  const { data, error } = await sb
    .from("materials_store")
    .select("id")
    .eq("source_type", "note_inspirations")
    .filter("meta->>dedup_key", "eq", dedupKey)
    .limit(1);

  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}

async function insertNoteSeed(
  sb: SupabaseClient,
  seed: NoteSeed,
  weekKey: string,
): Promise<boolean> {
  // Dedup key: slug + iso-week (allows weekly refresh — same seed can re-appear next week)
  const dedupKey = `${seed.slug}:${weekKey}`;

  const row = {
    source_type: "note_inspirations" as const,
    source_ref: seed.handle,
    // No raw_text — note has no twitterapi endpoint; no fabrication
    raw_text: null,
    redacted_text: null,
    pii: false,
    permitted_storage: "title_only" as const,
    publication_consent: "pending" as const,
    meta: {
      dedup_key: dedupKey,
      url: seed.url,
      platform: seed.platform,
      week: weekKey,
      note_type: "reference_only", // explicit: no tweet content stored
    },
  };

  const { error } = await sb.from("materials_store").insert(row);
  if (error) {
    // FIX 5: benign unique-violation (concurrent note-seed dedup race) → skip.
    if (isUniqueViolation(error)) {
      console.log(
        JSON.stringify({
          level: "info",
          msg: "[inspirations-ingest] duplicate note seed skipped (unique violation)",
          handle: seed.handle,
          dedup_key: dedupKey,
        }),
      );
      return false;
    }
    console.error(
      JSON.stringify({
        level: "error",
        msg: "[inspirations-ingest] insert note seed failed",
        handle: seed.handle,
        dedup_key: dedupKey,
        error: error.message,
      }),
    );
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * runInspirationsIngest — weekly broader ingest.
 *
 * @param env       Cloudflare Worker Env
 * @param fetchImpl injected fetch for testing
 * @returns count of newly inserted rows (X tweets + note references)
 */
export async function runInspirationsIngest(
  env: Env,
  fetchImpl: typeof fetch = fetch,
): Promise<number> {
  const sb = getSupabase(env);
  let inserted = 0;
  const weekKey = isoWeekKey();

  // ---- X seeds: fetch via twitterapi.io ----
  for (const userName of X_SEED_HANDLES) {
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
          msg: "[inspirations-ingest] fetchUserTweets failed",
          userName,
          error: String(err),
        }),
      );
      continue; // continue past per-source failures
    }

    for (const tweet of tweets) {
      const exists = await tweetExists(sb, tweet.id);
      if (exists) continue;

      const ok = await insertTweet(sb, tweet, userName);
      if (ok) inserted++;
    }
  }

  // ---- Note seeds: reference-only, no content fetch ----
  for (const seed of NOTE_SEEDS) {
    const dedupKey = `${seed.slug}:${weekKey}`;
    try {
      const exists = await noteExists(sb, dedupKey);
      if (exists) continue;

      const ok = await insertNoteSeed(sb, seed, weekKey);
      if (ok) inserted++;
    } catch (err) {
      console.error(
        JSON.stringify({
          level: "error",
          msg: "[inspirations-ingest] note seed failed",
          handle: seed.handle,
          error: String(err),
        }),
      );
      // continue past per-source failures
    }
  }

  console.log(
    JSON.stringify({
      level: "info",
      msg: "[inspirations-ingest] complete",
      inserted,
      x_handles: X_SEED_HANDLES.length,
      note_seeds: NOTE_SEEDS.length,
      week: weekKey,
    }),
  );

  return inserted;
}
