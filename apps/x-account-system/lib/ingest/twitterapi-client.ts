/**
 * lib/ingest/twitterapi-client.ts — twitterapi.io fetch wrapper (Workers-compatible)
 *
 * Single-file rate-limited client. Uses global fetch (no axios / no node:*).
 * Endpoint: GET https://api.twitterapi.io/twitter/tweet/advanced_search
 * Auth: x-api-key header
 * Response field: json.tweets (NOT json.data — see memory reference_twitterapi_io_response_shape)
 */

const BASE_URL = "https://api.twitterapi.io";

export interface TweetMedia {
  type: "photo" | "video" | "gif";
  url: string;
}

/** Tweet shape from twitterapi.io (extended 2026-06-06) */
export interface Tweet {
  id: string;
  text: string;
  author: { userName: string; id?: string; isBlueVerified?: boolean };
  createdAt: string;
  lang?: string;
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
  quoteCount?: number;
  bookmarkCount?: number;
  viewCount?: number;
  isReply?: boolean;
  conversationId?: string;
  tweetUrl?: string;
  media?: TweetMedia[];
}

interface RawMediaEntity {
  type?: string;
  media_url_https?: string;
  video_info?: unknown;
}
interface RawTweet {
  id: string;
  text: string;
  createdAt: string;
  lang?: string;
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
  quoteCount?: number;
  bookmarkCount?: number;
  viewCount?: number;
  isReply?: boolean;
  conversationId?: string;
  url?: string;
  twitterUrl?: string;
  author?: { userName?: string; id?: string; isBlueVerified?: boolean };
  extendedEntities?: { media?: RawMediaEntity[] };
}

function mapMediaType(t?: string): TweetMedia["type"] {
  if (t === "video") return "video";
  if (t === "animated_gif") return "gif";
  return "photo";
}

function mapTweet(r: RawTweet): Tweet {
  const media = (r.extendedEntities?.media ?? [])
    .filter((m) => m.media_url_https)
    .map((m) => ({ type: mapMediaType(m.type), url: m.media_url_https as string }));
  return {
    id: r.id,
    text: r.text,
    author: {
      userName: r.author?.userName ?? "",
      id: r.author?.id,
      isBlueVerified: r.author?.isBlueVerified,
    },
    createdAt: r.createdAt,
    lang: r.lang,
    likeCount: r.likeCount,
    retweetCount: r.retweetCount,
    replyCount: r.replyCount,
    quoteCount: r.quoteCount,
    bookmarkCount: r.bookmarkCount,
    viewCount: r.viewCount,
    isReply: r.isReply,
    conversationId: r.conversationId,
    tweetUrl: r.url ?? r.twitterUrl,
    media: media.length ? media : undefined,
  };
}

async function apiGet(
  path: string,
  params: Record<string, string>,
  key: string,
  fetchImpl: typeof fetch,
): Promise<Record<string, unknown>> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetchImpl(`${BASE_URL}${path}?${qs}`, {
    method: "GET",
    headers: { "x-api-key": key, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`twitterapi.io error: ${res.status} ${res.statusText} for ${path}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

interface TwitterApiResponse {
  tweets?: RawTweet[];
  data?: RawTweet[]; // legacy / fallback
}

/**
 * Fetch recent tweets for a given user handle via advanced_search.
 * Uses `from:<userName> -is:retweet` query.
 *
 * @param userName  X handle (without @)
 * @param key       twitterapi.io API key (x-api-key header)
 * @param maxResults max tweets to return (default 20)
 * @param fetchImpl injected fetch for testing (defaults to global fetch)
 */
export async function fetchUserTweets(
  userName: string,
  key: string,
  maxResults = 20,
  fetchImpl: typeof fetch = fetch,
): Promise<Tweet[]> {
  const query = `from:${userName} -is:retweet`;
  const url = `${BASE_URL}/twitter/tweet/advanced_search?query=${encodeURIComponent(query)}&queryType=Latest`;

  const res = await fetchImpl(url, {
    method: "GET",
    headers: {
      "x-api-key": key,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(
      `twitterapi.io error: ${res.status} ${res.statusText} for user=${userName}`,
    );
  }

  const json = (await res.json()) as TwitterApiResponse;
  // Real API returns json.tweets (NOT json.data — legacy fallback included defensively)
  const tweets = (json.tweets ?? json.data ?? []).slice(0, maxResults);
  return tweets.map(mapTweet);
}

export type QueryType = "Latest" | "Top";

/** advanced_search 任意クエリ（X検索構文フル対応） */
export async function searchTweets(
  query: string,
  queryType: QueryType,
  key: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Tweet[]> {
  const json = await apiGet(
    "/twitter/tweet/advanced_search",
    { query, queryType },
    key,
    fetchImpl,
  );
  const raw = (json.tweets ?? json.data ?? []) as RawTweet[];
  return raw.map(mapTweet);
}

/** 海外トレンド取得（woeid: 1=worldwide, 23424977=US） */
export async function getTrends(
  woeid: number,
  key: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  const json = await apiGet("/twitter/trends", { woeid: String(woeid) }, key, fetchImpl);
  const trends = (json.trends ?? []) as Array<{ name?: string }>;
  return trends.map((t) => t.name ?? "").filter(Boolean);
}

/** 新ソース候補をキーワードで発見 */
export async function searchUsers(
  keyword: string,
  key: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  const json = await apiGet("/twitter/user/search", { keyword }, key, fetchImpl);
  const users = (json.users ?? []) as Array<{ userName?: string }>;
  return users.map((u) => u.userName ?? "").filter(Boolean);
}

/** 信頼ソースのフォロー先から新ソース発見 */
export async function getUserFollowings(
  handle: string,
  key: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  const json = await apiGet("/twitter/user/followings", { userName: handle }, key, fetchImpl);
  const f = (json.followings ?? []) as Array<{ userName?: string }>;
  return f.map((u) => u.userName ?? "").filter(Boolean);
}

/** スレッド全文復元 */
export async function getThread(
  conversationId: string,
  key: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Tweet[]> {
  const json = await apiGet(
    "/twitter/tweet/thread_context",
    { conversationId },
    key,
    fetchImpl,
  );
  const raw = (json.tweets ?? json.data ?? []) as RawTweet[];
  return raw.map(mapTweet);
}
