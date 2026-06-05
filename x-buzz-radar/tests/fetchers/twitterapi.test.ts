import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { searchTwitterApi } from "@/lib/fetchers/twitterapi";

const FIXTURE_DIR = path.join(process.cwd(), "tests/fixtures");
const FIXTURE_200 = JSON.parse(
  fs.readFileSync(path.join(FIXTURE_DIR, "twitterapi-search-200.json"), "utf-8"),
);
const FIXTURE_EMPTY = JSON.parse(
  fs.readFileSync(path.join(FIXTURE_DIR, "twitterapi-search-empty.json"), "utf-8"),
);

describe("searchTwitterApi", () => {
  beforeEach(() => {
    process.env.TWITTERAPI_IO_KEY = "test_key";
    vi.restoreAllMocks();
  });

  it("returns normalized tweets from 200 response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => FIXTURE_200,
    } as Response);

    const result = await searchTwitterApi({
      query: "(claude code) min_faves:300",
      limit: 50,
    });

    expect(result).toHaveLength(1);
    expect(result[0].tweet_id).toBe("1234567890");
    expect(result[0].author_screen_name).toBe("demo_user");
    expect(result[0].likes).toBe(1245);
    expect(result[0].retweets).toBe(187);
    expect(result[0].lang).toBe("en");
  });

  it("returns empty array for empty response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => FIXTURE_EMPTY,
    } as Response);

    const result = await searchTwitterApi({ query: "test", limit: 50 });
    expect(result).toEqual([]);
  });

  it("throws on non-200 response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "rate limit",
    } as Response);

    await expect(
      searchTwitterApi({ query: "test", limit: 50 }),
    ).rejects.toThrow(/429/);
  });

  it("respects limit param", async () => {
    const many = {
      data: Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        text: `tweet ${i}`,
        author: { userName: "u", id: "1" },
        createdAt: "2026-05-23T01:00:00Z",
        likeCount: 100,
        retweetCount: 10,
        replyCount: 0,
      })),
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => many,
    } as Response);

    const result = await searchTwitterApi({ query: "test", limit: 30 });
    expect(result).toHaveLength(30);
  });
});
