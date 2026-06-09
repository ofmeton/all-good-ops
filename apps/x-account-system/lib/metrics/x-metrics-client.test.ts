import { parseTweetMetrics, fetchRecentTweetsWithMetrics } from "./x-metrics-client.ts";

describe("parseTweetMetrics", () => {
  test("maps non_public + public metrics with null safety", () => {
    const apiTweet = {
      id: "111", text: "本文", created_at: "2026-06-05T11:00:00.000Z",
      public_metrics: { like_count: 10, retweet_count: 2, reply_count: 1, quote_count: 0, bookmark_count: 3 },
      non_public_metrics: { impression_count: 1000, url_link_clicks: 7, user_profile_clicks: 30 },
    };
    expect(parseTweetMetrics(apiTweet)).toEqual({
      tweetId: "111", text: "本文", createdAt: "2026-06-05T11:00:00.000Z",
      impressions: 1000, userProfileClicks: 30, urlLinkClicks: 7,
      likeCount: 10, retweetCount: 2, replyCount: 1, quoteCount: 0, bookmarkCount: 3,
    });
  });
  test("non_public_metrics 欠落(30日超)→ impressions/profile/url は null", () => {
    const apiTweet = {
      id: "222", text: "古い", created_at: "2026-01-01T00:00:00.000Z",
      public_metrics: { like_count: 5, retweet_count: 0, reply_count: 0, quote_count: 0, bookmark_count: 0 },
    };
    const m = parseTweetMetrics(apiTweet);
    expect(m.impressions).toBeNull();
    expect(m.userProfileClicks).toBeNull();
    expect(m.urlLinkClicks).toBeNull();
    expect(m.likeCount).toBe(5);
  });
});

describe("fetchRecentTweetsWithMetrics", () => {
  test("calls timeline endpoint with bearer + fields, returns parsed", async () => {
    const calls: string[] = [];
    const fakeFetch = async (url: string, init: any) => {
      calls.push(url);
      expect(init.headers.Authorization).toBe("Bearer TOKEN");
      return {
        ok: true,
        json: async () => ({
          data: [{ id: "111", text: "本文", created_at: "2026-06-05T11:00:00.000Z",
            public_metrics: { like_count: 1, retweet_count: 0, reply_count: 0, quote_count: 0, bookmark_count: 0 },
            non_public_metrics: { impression_count: 500, url_link_clicks: 2, user_profile_clicks: 9 } }],
        }),
      } as any;
    };
    const out = await fetchRecentTweetsWithMetrics("TOKEN", "userX", fakeFetch as any);
    expect(out).toHaveLength(1);
    expect(out[0].tweetId).toBe("111");
    expect(calls[0]).toContain("/2/users/userX/tweets");
    expect(calls[0]).toContain("non_public_metrics");
  });
});
