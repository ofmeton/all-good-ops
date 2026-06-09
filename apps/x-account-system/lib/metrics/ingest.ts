import { matchTweetToDraft, type DraftRow } from "./match.ts";
import type { TweetMetrics } from "./x-metrics-client.ts";

export function computePcr(profileClicks: number | null, impressions: number | null): number | null {
  if (!impressions || impressions <= 0 || profileClicks == null) return null;
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
};

export async function runMetricsIngest(deps: MetricsIngestDeps): Promise<MetricsIngestResult> {
  const token = await deps.getAccessToken();
  if (!token) return { tweetsFetched: 0, matched: 0, skipped: 0, upserted: 0 };

  const [tweets, drafts] = await Promise.all([
    deps.fetchTweets(token),
    deps.loadPublishedDrafts(),
  ]);
  // getMyUserId + timeline = 2 req（コスト記録用の概算）
  await deps.recordCost(2);

  let matched = 0;
  let skipped = 0;
  let upserted = 0;
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
      console.warn(JSON.stringify({ level: "warn", msg: "[metrics-ingest] upsert failed", tweetId: t.tweetId, error: String(e) }));
    }
  }
  return { tweetsFetched: tweets.length, matched, skipped, upserted };
}
