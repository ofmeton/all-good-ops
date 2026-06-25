import type { XBuzzTweet } from "@/lib/types";

export interface SearchInput {
  query: string;
  limit?: number;
  cursor?: string;
}

interface TwitterApiTweet {
  id: string;
  url?: string;
  text: string;
  author: { userName: string; id: string };
  createdAt: string;
  lang?: string;
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
  viewCount?: number;
}

interface TwitterApiResponse {
  data?: TwitterApiTweet[];
  has_next_page?: boolean;
  next_cursor?: string;
}

export type NormalizedTweet = Pick<
  XBuzzTweet,
  | "tweet_id"
  | "author_screen_name"
  | "author_id"
  | "body"
  | "lang"
  | "posted_at"
  | "likes"
  | "retweets"
  | "replies"
>;

export async function searchTwitterApi(
  input: SearchInput,
): Promise<NormalizedTweet[]> {
  const apiKey = process.env.TWITTERAPI_IO_KEY;
  if (!apiKey) throw new Error("TWITTERAPI_IO_KEY not set");

  const params = new URLSearchParams({
    query: input.query,
    queryType: "Latest",
  });
  if (input.cursor) params.set("cursor", input.cursor);

  const url = `https://api.twitterapi.io/twitter/tweet/advanced_search?${params.toString()}`;

  const res = await fetch(url, {
    headers: { "x-api-key": apiKey },
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`twitterapi.io ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as TwitterApiResponse;
  const tweets = json.data ?? [];
  const limit = input.limit ?? 50;

  return tweets.slice(0, limit).map((t) => ({
    tweet_id: t.id,
    author_screen_name: t.author.userName,
    author_id: t.author.id ?? null,
    body: t.text,
    lang: t.lang ?? null,
    posted_at: t.createdAt,
    likes: t.likeCount ?? 0,
    retweets: t.retweetCount ?? 0,
    replies: t.replyCount ?? 0,
  }));
}
