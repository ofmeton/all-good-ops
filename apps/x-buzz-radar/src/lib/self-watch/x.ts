import { requireAdmin } from "@/lib/supabase";

interface TweetMetricsResponse {
  data?: {
    public_metrics?: {
      like_count?: number;
      retweet_count?: number;
      reply_count?: number;
      bookmark_count?: number;
      impression_count?: number;
    };
    non_public_metrics?: {
      impression_count?: number;
    };
  };
}

export async function watchXPost(
  post_id: string,
  hoursSincePost: number,
): Promise<void> {
  const token = process.env.X_API_BEARER_TOKEN;
  if (!token) {
    console.warn("X_API_BEARER_TOKEN not set — skip X self-watch");
    return;
  }

  const url = `https://api.twitter.com/2/tweets/${post_id}?tweet.fields=public_metrics,non_public_metrics`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    console.warn(`X self-watch ${post_id} status ${res.status}`);
    return;
  }
  const json = (await res.json()) as TweetMetricsResponse;
  const m = json.data?.public_metrics ?? {};
  const nm = json.data?.non_public_metrics ?? {};

  const sb = requireAdmin();
  await sb.from("post_engagement_snapshots").insert({
    post_id,
    platform: "x",
    hours_since_post: hoursSincePost,
    likes: m.like_count ?? 0,
    retweets: m.retweet_count ?? 0,
    replies: m.reply_count ?? 0,
    impressions: nm.impression_count ?? m.impression_count ?? null,
    bookmarks: m.bookmark_count ?? null,
    source: "api",
  });
}
