import { COLLECTOR_TOOLS, dispatchTool } from "./collector-tools.ts";
import type { Tweet } from "./twitterapi-client.ts";

const tweet: Tweet = { id: "1", text: "x", author: { userName: "a" }, createdAt: "x" };

describe("collector-tools", () => {
  test("exposes 5 tools", () => {
    const names = COLLECTOR_TOOLS.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "search_tweets",
        "get_trends",
        "search_users",
        "get_user_followings",
        "get_thread",
      ]),
    );
  });

  test("dispatch search_tweets tags discovery and returns candidates", async () => {
    const deps = {
      key: "k",
      fetchImpl: undefined as never,
      api: {
        searchTweets: async () => [tweet],
        getTrends: async () => ["#AI"],
        searchUsers: async () => ["x"],
        getUserFollowings: async () => ["y"],
        getThread: async () => [tweet],
      },
    };
    const r = await dispatchTool(
      "search_tweets",
      { query: "Claude min_faves:5", queryType: "Latest" },
      deps,
    );
    expect(r.candidates).toHaveLength(1);
    expect(r.candidates[0].discovery).toEqual({ via: "keyword", query: "Claude min_faves:5" });
  });

  test("dispatch get_trends returns trend strings as toolResult, no candidates", async () => {
    const deps = {
      key: "k",
      fetchImpl: undefined as never,
      api: {
        searchTweets: async () => [],
        getTrends: async () => ["#AI", "Claude"],
        searchUsers: async () => [],
        getUserFollowings: async () => [],
        getThread: async () => [],
      },
    };
    const r = await dispatchTool("get_trends", { woeid: 1 }, deps);
    expect(r.candidates).toHaveLength(0);
    expect(r.toolResultText).toContain("#AI");
  });

  test("dispatch get_thread tags discovery {via:'fixed', query:'thread:<cid>'} and returns candidates", async () => {
    const deps = {
      key: "k",
      fetchImpl: undefined as never,
      api: {
        searchTweets: async () => [],
        getTrends: async () => [],
        searchUsers: async () => [],
        getUserFollowings: async () => [],
        getThread: async () => [tweet],
      },
    };
    const r = await dispatchTool("get_thread", { conversationId: "99" }, deps);
    expect(r.candidates).toHaveLength(1);
    expect(r.candidates[0].discovery).toEqual({ via: "fixed", query: "thread:99" });
  });

  test("dispatch unknown tool returns empty candidates and 'unknown tool' text", async () => {
    const deps = {
      key: "k",
      fetchImpl: undefined as never,
      api: {
        searchTweets: async () => [],
        getTrends: async () => [],
        searchUsers: async () => [],
        getUserFollowings: async () => [],
        getThread: async () => [],
      },
    };
    const r = await dispatchTool("no_such_tool", {}, deps);
    expect(r.candidates).toHaveLength(0);
    expect(r.toolResultText).toContain("unknown tool");
  });
});
