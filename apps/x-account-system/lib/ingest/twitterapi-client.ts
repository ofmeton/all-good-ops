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
    headers: { "x-api-key": key, "Accept": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`twitterapi.io error: ${res.status} ${res.statusText} for ${path}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

async function apiPost(
  path: string,
  body: Record<string, unknown>,
  key: string,
  fetchImpl: typeof fetch,
): Promise<Record<string, unknown>> {
  const res = await fetchImpl(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "x-api-key": key, "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(body),
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

interface BookmarkResponse extends TwitterApiResponse {
  status?: unknown;
  code?: unknown;
  error?: unknown;
  message?: unknown;
  msg?: unknown;
  next_cursor?: unknown;
  nextCursor?: unknown;
  cursor?: unknown;
  has_next_page?: unknown;
  hasNextPage?: unknown;
}

function isBookmarksAuthErrorPayload(json: BookmarkResponse): boolean {
  const parts = [json.status, json.code, json.error, json.message, json.msg]
    .filter((v) => typeof v === "string")
    .map((v) => String(v).toLowerCase());
  return parts.some((s) =>
    s.includes("auth") ||
    s.includes("unauthorized") ||
    s.includes("forbidden") ||
    s.includes("login_cookie") ||
    s.includes("cookie expired")
  );
}

function nonEmptyString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

function isFailureStatusOrCode(v: unknown): boolean {
  if (typeof v === "number") return Number.isFinite(v) && (v < 200 || v >= 300);
  const s = nonEmptyString(v);
  if (!s) return false;
  const n = Number(s);
  if (Number.isFinite(n)) return n < 200 || n >= 300;
  const lower = s.toLowerCase();
  return lower !== "success" && lower !== "ok";
}

function safeBookmarksErrorText(json: BookmarkResponse): string | null {
  const parts: string[] = [];
  const status = json.status;
  const code = json.code;
  if (isFailureStatusOrCode(status)) parts.push(`status=${String(status)}`);
  if (isFailureStatusOrCode(code)) parts.push(`code=${String(code)}`);
  for (const [k, v] of [["error", json.error], ["message", json.message], ["msg", json.msg]] as const) {
    const s = nonEmptyString(v);
    if (s) parts.push(`${k}=${s}`);
  }
  return parts.length > 0 ? parts.join(" ") : null;
}

function isBookmarksErrorPayload(json: BookmarkResponse): boolean {
  return json.tweets === undefined && json.data === undefined && safeBookmarksErrorText(json) !== null;
}

function nextBookmarkCursor(json: BookmarkResponse): string | null {
  const raw = json.next_cursor ?? json.nextCursor ?? json.cursor;
  if (typeof raw !== "string" || raw.length === 0) return null;
  if (raw === "0" || raw.toLowerCase() === "null") return null;
  if (json.has_next_page === false || json.hasNextPage === false) return null;
  return raw;
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
  const json = await apiGet(
    "/twitter/tweet/advanced_search",
    { query: `from:${userName} -is:retweet`, queryType: "Latest" },
    key,
    fetchImpl,
  );
  // Real API returns json.tweets (NOT json.data — legacy fallback included defensively)
  const arr = json.tweets ?? json.data ?? [];
  const raw = (Array.isArray(arr) ? arr : []) as RawTweet[];
  return raw.slice(0, maxResults).map(mapTweet);
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
  const arr = json.tweets ?? json.data ?? [];
  const raw = (Array.isArray(arr) ? arr : []) as RawTweet[];
  return raw.map(mapTweet);
}

/**
 * Fetch authenticated user's bookmarks via twitterapi.io bookmarks_v2.
 * Verified endpoint: POST /twitter/bookmarks_v2.
 *
 * Auth uses x-api-key header plus JSON body login_cookies/proxy. The cookie and proxy must never be logged.
 */
export async function fetchBookmarks(
  loginCookies: string,
  proxy: string,
  key: string,
  fetchImpl: typeof fetch = fetch,
  maxPages = 5,
): Promise<Tweet[]> {
  const out: Tweet[] = [];
  let cursor: string | null = null;
  const pages = Math.max(1, maxPages);

  for (let page = 0; page < pages; page += 1) {
    let json: BookmarkResponse;
    try {
      json = await apiPost(
        "/twitter/bookmarks_v2",
        {
          login_cookies: loginCookies,
          proxy,
          count: 20,
          ...(cursor ? { cursor } : {}),
        },
        key,
        fetchImpl,
      ) as BookmarkResponse;
    } catch (e) {
      if (/\b(401|403)\b/.test(String(e))) {
        throw new Error("twitterapi.io bookmarks auth failed (login_cookie expired?)");
      }
      throw e;
    }

    if (isBookmarksAuthErrorPayload(json)) {
      throw new Error("twitterapi.io bookmarks auth failed (login_cookie expired?)");
    }
    if (isBookmarksErrorPayload(json)) {
      throw new Error(`twitterapi.io bookmarks request failed: ${safeBookmarksErrorText(json)}`);
    }

    const arr = json.tweets ?? json.data ?? [];
    const raw = (Array.isArray(arr) ? arr : []) as RawTweet[];
    out.push(...raw.map(mapTweet));

    cursor = nextBookmarkCursor(json);
    if (!cursor) break;
  }

  return out;
}

/** 海外トレンド取得（woeid: 23424977=US 推奨。woeid=1 は実測で日本が返るため使わない） */
export async function getTrends(
  woeid: number,
  key: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  const json = await apiGet("/twitter/trends", { woeid: String(woeid) }, key, fetchImpl);
  const trendsRaw = json.trends ?? [];
  // Real response: { trends: [{ trend: { name: "...", ... } }, ...] }
  const trends = (Array.isArray(trendsRaw) ? trendsRaw : []) as Array<{ trend?: { name?: string } }>;
  return trends.map((t) => t.trend?.name ?? "").filter(Boolean);
}

/** 新ソース候補をキーワードで発見 */
export async function searchUsers(
  keyword: string,
  key: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  // Real API param is "query" (NOT "keyword"). Keep function param named `keyword`.
  const json = await apiGet("/twitter/user/search", { query: keyword }, key, fetchImpl);
  const usersRaw = json.users ?? [];
  // Real response: { users: [{ screen_name: "..." }] } — no userName field on search results
  const users = (Array.isArray(usersRaw) ? usersRaw : []) as Array<{ userName?: string; screen_name?: string }>;
  return users.map((u) => u.screen_name ?? u.userName ?? "").filter(Boolean);
}

/** 信頼ソースのフォロー先から新ソース発見 */
export async function getUserFollowings(
  handle: string,
  key: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  const json = await apiGet("/twitter/user/followings", { userName: handle }, key, fetchImpl);
  const followingsRaw = json.followings ?? [];
  const f = (Array.isArray(followingsRaw) ? followingsRaw : []) as Array<{ userName?: string; screen_name?: string }>;
  return f.map((u) => u.userName ?? u.screen_name ?? "").filter(Boolean);
}

/** スレッド全文復元 */
export async function getThread(
  conversationId: string,
  key: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Tweet[]> {
  // Real API param is "tweetId" (NOT "conversationId"). Keep function param named `conversationId`.
  const json = await apiGet(
    "/twitter/tweet/thread_context",
    { tweetId: conversationId },
    key,
    fetchImpl,
  );
  const arr = json.tweets ?? json.data ?? [];
  const raw = (Array.isArray(arr) ? arr : []) as RawTweet[];
  return raw.map(mapTweet);
}
