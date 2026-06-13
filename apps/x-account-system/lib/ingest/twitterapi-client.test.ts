import {
  fetchUserTweets,
  fetchBookmarks,
  searchTweets,
  getTrends,
  searchUsers,
  getUserFollowings,
  getThread,
  type Tweet,
} from "./twitterapi-client.ts";

// Existing fetchUserTweets tests
describe("fetchUserTweets", () => {
  test("returns mapped tweets from json.tweets", async () => {
    const mockFetch = (async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({
        tweets: [{ id: "1", text: "hi", author: { userName: "a" }, createdAt: "x" }],
      }),
    })) as unknown as typeof fetch;
    const out = await fetchUserTweets("a", "k", 20, mockFetch);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("1");
  });

  test("throws on non-ok response", async () => {
    const mockFetch = (async () => ({
      ok: false,
      status: 500,
      statusText: "ERR",
      json: async () => ({}),
    })) as unknown as typeof fetch;
    await expect(fetchUserTweets("a", "k", 20, mockFetch)).rejects.toThrow(
      /twitterapi.io error/,
    );
  });
});

function jsonFetch(body: unknown, ok = true): typeof fetch {
  return (async () =>
    ({
      ok,
      status: ok ? 200 : 500,
      statusText: ok ? "OK" : "ERR",
      json: async () => body,
    }) as Response) as unknown as typeof fetch;
}

describe("twitterapi-client extended", () => {
  test("fetchBookmarks maps tweets and sends login_cookies/proxy in POST body", async () => {
    const seen: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = (async (url: RequestInfo | URL, init?: RequestInit) => {
      seen.push({ url: String(url), init });
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({
          tweets: [
            {
              id: "b1",
              text: "bookmarked",
              createdAt: "Sat May 23 13:23:33 +0000 2026",
              lang: "en",
              author: { userName: "alice" },
            },
          ],
        }),
      } as Response;
    }) as unknown as typeof fetch;

    const out = await fetchBookmarks("cookie-value", "http://proxy.example", "k", fetchImpl);
    expect(out).toEqual([
      expect.objectContaining({
        id: "b1",
        text: "bookmarked",
        author: { userName: "alice", id: undefined, isBlueVerified: undefined },
        lang: "en",
      }),
    ]);
    expect(seen).toHaveLength(1);
    const url = new URL(seen[0].url);
    expect(url.pathname).toBe("/twitter/bookmarks_v2");
    expect(url.searchParams.get("login_cookie")).toBeNull();
    expect(url.searchParams.get("login_cookies")).toBeNull();
    expect(seen[0].init?.method).toBe("POST");
    const body = JSON.parse(String(seen[0].init?.body)) as Record<string, unknown>;
    expect(body).toEqual({ login_cookies: "cookie-value", proxy: "http://proxy.example", count: 20 });
  });

  test("fetchBookmarks returns [] for legitimate empty bookmarks page", async () => {
    const out = await fetchBookmarks(
      "secret-cookie",
      "http://user:pass@proxy.example",
      "k",
      jsonFetch({ tweets: [] }),
    );
    expect(out).toEqual([]);
  });

  test("fetchBookmarks throws on HTTP 200 error payload without leaking cookie/proxy", async () => {
    const p = fetchBookmarks(
      "secret-cookie",
      "http://user:pass@proxy.example",
      "k",
      jsonFetch({ status: "error", msg: "proxy connect failed" }),
    );
    await expect(p).rejects.toThrow(/twitterapi\.io bookmarks request failed: .*status=error.*msg=proxy connect failed/);
    await expect(p).rejects.not.toThrow(/secret-cookie|user:pass@proxy/);
  });

  test("fetchBookmarks keeps auth-error payload as specific auth failure", async () => {
    await expect(
      fetchBookmarks(
        "secret-cookie",
        "http://proxy.example",
        "k",
        jsonFetch({ status: "error", msg: "login_cookie expired" }),
      ),
    ).rejects.toThrow("twitterapi.io bookmarks auth failed (login_cookie expired?)");
  });

  test("searchTweets returns mapped tweets with extended fields", async () => {
    const fetchImpl = jsonFetch({
      tweets: [
        {
          id: "1",
          text: "hi",
          createdAt: "Sat May 23 13:23:33 +0000 2026",
          lang: "en",
          isReply: true,
          conversationId: "99",
          url: "https://x.com/a/status/1",
          likeCount: 10,
          retweetCount: 2,
          bookmarkCount: 1,
          quoteCount: 0,
          viewCount: 100,
          author: { userName: "a", isBlueVerified: true },
          extendedEntities: {
            media: [
              { type: "photo", media_url_https: "https://img/1.jpg" },
              { type: "animated_gif", media_url_https: "https://img/2.gif" },
            ],
          },
        },
      ],
    });
    const out = await searchTweets("Claude min_faves:5", "Latest", "k", fetchImpl);
    expect(out).toHaveLength(1);
    const t = out[0];
    expect(t.isReply).toBe(true);
    expect(t.conversationId).toBe("99");
    expect(t.tweetUrl).toBe("https://x.com/a/status/1");
    expect(t.media).toEqual([
      { type: "photo", url: "https://img/1.jpg" },
      { type: "gif", url: "https://img/2.gif" },
    ]);
    expect(t.author.isBlueVerified).toBe(true);
  });

  test("getTrends returns trend names", async () => {
    const fetchImpl = jsonFetch({ trends: [{ trend: { name: "#AI" } }, { trend: { name: "Claude" } }] });
    const out = await getTrends(1, "k", fetchImpl);
    expect(out).toEqual(["#AI", "Claude"]);
  });

  test("searchUsers returns handles", async () => {
    const fetchImpl = jsonFetch({ users: [{ screen_name: "x" }, { screen_name: "y" }] });
    const out = await searchUsers("AI news", "k", fetchImpl);
    expect(out).toEqual(["x", "y"]);
  });

  test("getUserFollowings returns handles", async () => {
    const fetchImpl = jsonFetch({ followings: [{ userName: "f1" }] });
    const out = await getUserFollowings("a", "k", fetchImpl);
    expect(out).toEqual(["f1"]);
  });

  test("getThread returns tweets in conversation", async () => {
    const fetchImpl = jsonFetch({
      tweets: [{ id: "2", text: "t", createdAt: "x", author: { userName: "a" } }],
    });
    const out = await getThread("99", "k", fetchImpl);
    expect(out[0].id).toBe("2");
  });

  test("searchTweets throws on non-ok", async () => {
    await expect(
      searchTweets("q", "Latest", "k", jsonFetch({}, false)),
    ).rejects.toThrow(/twitterapi.io error/);
  });
});
