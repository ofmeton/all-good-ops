export type TweetMetrics = {
  tweetId: string;
  text: string;
  createdAt: string;
  impressions: number | null;
  userProfileClicks: number | null;
  urlLinkClicks: number | null;
  likeCount: number | null;
  retweetCount: number | null;
  replyCount: number | null;
  quoteCount: number | null;
  bookmarkCount: number | null;
};

type FetchImpl = typeof fetch;
const numOrNull = (v: unknown): number | null => (typeof v === "number" ? v : null);

export function parseTweetMetrics(apiTweet: any): TweetMetrics {
  const pub = apiTweet?.public_metrics ?? {};
  const np = apiTweet?.non_public_metrics ?? {};
  return {
    tweetId: String(apiTweet?.id ?? ""),
    text: String(apiTweet?.text ?? ""),
    createdAt: String(apiTweet?.created_at ?? ""),
    impressions: numOrNull(np.impression_count ?? pub.impression_count),
    userProfileClicks: numOrNull(np.user_profile_clicks),
    urlLinkClicks: numOrNull(np.url_link_clicks),
    likeCount: numOrNull(pub.like_count),
    retweetCount: numOrNull(pub.retweet_count),
    replyCount: numOrNull(pub.reply_count),
    quoteCount: numOrNull(pub.quote_count),
    bookmarkCount: numOrNull(pub.bookmark_count),
  };
}

/** GET /2/users/me → user id */
export async function getMyUserId(
  accessToken: string,
  fetchImpl: FetchImpl = fetch,
): Promise<string> {
  const res = await fetchImpl("https://api.x.com/2/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`getMyUserId failed: ${res.status}`);
  const json: any = await res.json();
  const id = json?.data?.id;
  if (!id) throw new Error("getMyUserId: no id");
  return String(id);
}

/** GET /2/users/:id/tweets?max_results=100&tweet.fields=public_metrics,non_public_metrics,created_at */
export async function fetchRecentTweetsWithMetrics(
  accessToken: string,
  userId: string,
  fetchImpl: FetchImpl = fetch,
): Promise<TweetMetrics[]> {
  const url = new URL(`https://api.x.com/2/users/${userId}/tweets`);
  url.searchParams.set("max_results", "100");
  url.searchParams.set("tweet.fields", "public_metrics,non_public_metrics,created_at");
  const res = await fetchImpl(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`fetchRecentTweets failed: ${res.status}`);
  const json: any = await res.json();
  const data: any[] = Array.isArray(json?.data) ? json.data : [];
  return data.map(parseTweetMetrics);
}
