/**
 * lib/ingest/twitterapi-client.ts — twitterapi.io fetch wrapper (Workers-compatible)
 *
 * Single-file rate-limited client. Uses global fetch (no axios / no node:*).
 * Endpoint: GET https://api.twitterapi.io/twitter/tweet/advanced_search
 * Auth: x-api-key header
 * Response field: json.tweets (NOT json.data — see memory reference_twitterapi_io_response_shape)
 */

const BASE_URL = "https://api.twitterapi.io";

/** Tweet shape from twitterapi.io advanced_search (2026-05-23 confirmed shape) */
export interface Tweet {
  id: string;
  text: string;
  author: { userName: string; id?: string };
  createdAt: string;
  lang?: string;
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
  viewCount?: number;
}

interface TwitterApiResponse {
  tweets?: Tweet[];
  data?: Tweet[]; // legacy / fallback
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
  return tweets;
}
