import { runMetricsIngest, computePcr, type MetricsIngestDeps } from "./ingest.ts";
import type { TweetMetrics } from "./x-metrics-client.ts";
import type { DraftRow } from "./match.ts";

const tweet = (over: Partial<TweetMetrics> = {}): TweetMetrics => ({
  tweetId: "t1", text: "本文A", createdAt: "2026-06-05T11:02:00Z",
  impressions: 1000, userProfileClicks: 30, urlLinkClicks: 7,
  likeCount: 1, retweetCount: 0, replyCount: 0, quoteCount: 0, bookmarkCount: 0, ...over,
});

describe("computePcr", () => {
  test("profile/impressions", () => expect(computePcr(30, 1000)).toBeCloseTo(0.03));
  test("impressions 0 → null", () => expect(computePcr(5, 0)).toBeNull());
  test("null impressions → null", () => expect(computePcr(5, null)).toBeNull());
  test("profileClicks 0 → 0 (not null)", () => expect(computePcr(0, 1000)).toBe(0));
});

describe("runMetricsIngest", () => {
  function makeDeps(over: Partial<MetricsIngestDeps> = {}): { deps: MetricsIngestDeps; upserts: any[] } {
    const upserts: any[] = [];
    const drafts: DraftRow[] = [{ id: "d1", body: "本文A", publishedAt: "2026-06-05T11:00:00Z" }];
    const deps: MetricsIngestDeps = {
      getAccessToken: async () => "TOKEN",
      fetchTweets: async () => [tweet()],
      loadPublishedDrafts: async () => drafts,
      upsertPostedRecord: async (draftId, tweetId, postedAt) => {
        upserts.push({ kind: "posted", draftId, tweetId, postedAt });
        return "pr1";
      },
      upsertMetrics: async (postedRecordId, m, pcr) => {
        upserts.push({ kind: "metrics", postedRecordId, impressions: m.impressions, pcr });
      },
      recordCost: async () => {},
      ...over,
    };
    return { deps, upserts };
  }

  test("matched tweet → posted_records + performance_metrics upsert", async () => {
    const { deps, upserts } = makeDeps();
    const r = await runMetricsIngest(deps);
    expect(r).toMatchObject({ tweetsFetched: 1, matched: 1, skipped: 0, upserted: 1 });
    expect(upserts.find((u) => u.kind === "posted")).toMatchObject({ draftId: "d1", tweetId: "t1" });
    expect(upserts.find((u) => u.kind === "metrics")).toMatchObject({ postedRecordId: "pr1", pcr: 0.03 });
  });

  test("unmatched tweet → skipped, no upsert", async () => {
    const { deps, upserts } = makeDeps({ fetchTweets: async () => [tweet({ text: "無関係" })] });
    const r = await runMetricsIngest(deps);
    expect(r).toMatchObject({ matched: 0, skipped: 1, upserted: 0 });
    expect(upserts).toHaveLength(0);
  });

  test("no token → empty result, fail-open", async () => {
    const { deps } = makeDeps({ getAccessToken: async () => null });
    const r = await runMetricsIngest(deps);
    expect(r).toMatchObject({ tweetsFetched: 0, matched: 0, upserted: 0 });
  });

  test("upsert failure on one tweet → loop continues, counts consistent", async () => {
    let call = 0;
    const { deps, upserts } = makeDeps({
      fetchTweets: async () => [tweet({ tweetId: "t1", text: "本文A" }), tweet({ tweetId: "t2", text: "本文B" })],
      loadPublishedDrafts: async () => [
        { id: "d1", body: "本文A", publishedAt: "2026-06-05T11:00:00Z" },
        { id: "d2", body: "本文B", publishedAt: "2026-06-05T11:00:00Z" },
      ],
      upsertPostedRecord: async (draftId, tweetId, postedAt) => {
        call++;
        if (call === 1) throw new Error("db error");
        upserts.push({ kind: "posted", draftId, tweetId, postedAt });
        return "pr2";
      },
    });
    const r = await runMetricsIngest(deps);
    expect(r).toMatchObject({ matched: 2, upserted: 1, skipped: 0, errors: 1 });
    expect(upserts.filter((u) => u.kind === "posted")).toHaveLength(1);
  });
});
