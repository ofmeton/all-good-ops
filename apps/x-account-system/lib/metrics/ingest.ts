import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getXAccessToken } from "../publisher/token-store.ts";
import { recordCostLedger } from "../cost/cost-ledger.ts";
import { getMyUserId, fetchRecentTweetsWithMetrics } from "./x-metrics-client.ts";
import { matchTweetToDraft, type DraftRow } from "./match.ts";
import type { TweetMetrics } from "./x-metrics-client.ts";

const X_API_COST_JPY_PER_REQ = 0.5;

function ingestSupabase(): SupabaseClient | null {
  if (process.env.IN_MEMORY_FALLBACK === "true") return null;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: (process.env.SUPABASE_SCHEMA || "public") as "public" },
  });
}

export function defaultDeps(): MetricsIngestDeps {
  const sb = ingestSupabase();
  return {
    getAccessToken: async () => (await getXAccessToken())?.accessToken ?? null,
    fetchTweets: async (token) => {
      const uid = await getMyUserId(token);
      return await fetchRecentTweetsWithMetrics(token, uid);
    },
    loadPublishedDrafts: async () => {
      if (!sb) return [];
      const { data, error } = await sb
        .from("post_drafts")
        .select("id, body, published_at")
        .eq("platform", "x")
        .not("published_at", "is", null)
        .gte("published_at", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString());
      if (error) throw new Error(`loadPublishedDrafts: ${error.message}`);
      return (data ?? []).map((d: any) => ({ id: d.id, body: d.body, publishedAt: d.published_at }));
    },
    upsertPostedRecord: async (draftId, tweetId, postedAt) => {
      if (!sb) return "memory";
      // 既存行があれば再利用（trace_id/scheduled_at を保持・更新しない）。
      const { data: existing, error: selErr } = await sb
        .from("posted_records")
        .select("id")
        .eq("platform", "x")
        .eq("platform_post_id", tweetId)
        .maybeSingle();
      if (selErr) throw new Error(`upsertPostedRecord select: ${selErr.message}`);
      if (existing) return (existing as { id: string }).id;
      // 無ければ INSERT。posted_records は NOT NULL の trace_id / scheduled_at を持つので補う。
      const { data, error } = await sb
        .from("posted_records")
        .insert({
          draft_id: draftId,
          platform: "x",
          platform_post_id: tweetId,
          posted_at: postedAt,
          scheduled_at: postedAt, // backfill: 実投稿時刻を流用
          trace_id: crypto.randomUUID(),
        })
        .select("id")
        .single();
      if (error) throw new Error(`upsertPostedRecord insert: ${error.message}`);
      return (data as { id: string }).id;
    },
    upsertMetrics: async (postedRecordId, m, pcr) => {
      if (!sb) return;
      const { error } = await sb.from("performance_metrics").upsert(
        {
          posted_record_id: postedRecordId,
          measured_at: new Date().toISOString(),
          impressions: m.impressions,
          user_profile_clicks: m.userProfileClicks,
          url_link_clicks: m.urlLinkClicks,
          pcr,
          like_count: m.likeCount,
          retweet_count: m.retweetCount,
          reply_count: m.replyCount,
          quote_count: m.quoteCount,
          bookmark_count: m.bookmarkCount,
        },
        { onConflict: "posted_record_id" },
      );
      if (error) throw new Error(`upsertMetrics: ${error.message}`);
    },
    recordCost: async (reqCount) => {
      if (!sb) return;
      await recordCostLedger(sb, {
        category: "x_api_metrics",
        costJpy: X_API_COST_JPY_PER_REQ * reqCount,
        unitCount: reqCount,
        meta: { source: "metrics-ingest" },
      });
    },
  };
}

export function computePcr(profileClicks: number | null, impressions: number | null): number | null {
  if (impressions == null || impressions <= 0 || profileClicks == null) return null;
  return profileClicks / impressions;
}

export type MetricsIngestDeps = {
  getAccessToken: () => Promise<string | null>;
  fetchTweets: (accessToken: string) => Promise<TweetMetrics[]>;
  loadPublishedDrafts: () => Promise<DraftRow[]>;
  upsertPostedRecord: (draftId: string, tweetId: string, postedAt: string) => Promise<string>;
  upsertMetrics: (postedRecordId: string, m: TweetMetrics, pcr: number | null) => Promise<void>;
  recordCost: (reqCount: number) => Promise<void>;
};

export type MetricsIngestResult = {
  tweetsFetched: number;
  matched: number;
  skipped: number;
  upserted: number;
  errors: number;
};

export async function runMetricsIngest(deps: MetricsIngestDeps = defaultDeps()): Promise<MetricsIngestResult> {
  const token = await deps.getAccessToken();
  if (!token) return { tweetsFetched: 0, matched: 0, skipped: 0, upserted: 0, errors: 0 };

  const [tweets, drafts] = await Promise.all([
    deps.fetchTweets(token),
    deps.loadPublishedDrafts(),
  ]);
  // getMyUserId + timeline = 2 req（コスト記録用の概算）
  await deps.recordCost(2);

  let matched = 0;
  let skipped = 0;
  let upserted = 0;
  let errors = 0;
  for (const t of tweets) {
    const draft = matchTweetToDraft({ id: t.tweetId, text: t.text, createdAt: t.createdAt }, drafts);
    if (!draft) {
      skipped++;
      continue;
    }
    matched++;
    try {
      const postedRecordId = await deps.upsertPostedRecord(draft.id, t.tweetId, t.createdAt);
      const pcr = computePcr(t.userProfileClicks, t.impressions);
      await deps.upsertMetrics(postedRecordId, t, pcr);
      upserted++;
    } catch (e) {
      errors++;
      console.warn(JSON.stringify({ level: "warn", msg: "[metrics-ingest] upsert failed", tweetId: t.tweetId, error: String(e) }));
    }
  }
  return { tweetsFetched: tweets.length, matched, skipped, upserted, errors };
}
