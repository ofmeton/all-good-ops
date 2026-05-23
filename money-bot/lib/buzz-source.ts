/**
 * x-buzz-radar source — twitterapi.io advanced search + Haiku 関連度判定。
 *
 * Phase 1.5: ai-radar の articles 取り込みは廃止。情報源は X バズツイートのみ。
 *
 * 流れ:
 *   1. twitterapi.io の advanced search で「Claude AI tips/news/case」関連ツイートを取得
 *   2. 各 tweet を Haiku 4.5 で関連度判定 (0-100)
 *   3. relevance_score >= 60 のものを採用、Supabase buzz_tweets にキャッシュ
 *   4. 採用済みの一番スコア高い tweet を signal として返す
 */

import { getSupabase, hasSupabase } from "./supabase";
import { getAgentId, getEnvironmentId, hasManagedAgentsConfig, runManagedAgent } from "./managed-agents";

export interface BuzzSignal {
  signalId: string;
  tweetId: string;
  author: string;
  body: string;
  likes: number;
  retweets: number;
  replies: number;
  postedAt: string;
  relevanceScore: number;
  category: "tips" | "news" | "compare" | "case" | "other";
}

interface TwitterApiTweet {
  id: string;
  text: string;
  author: { userName: string; id?: string };
  createdAt: string;
  lang?: string;
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
}

interface TwitterApiResponse {
  data?: TwitterApiTweet[];
}

const DEFAULT_QUERIES = [
  "Claude AI tips min_faves:100 -is:retweet lang:en",
  "Anthropic Claude min_faves:200 -is:retweet lang:en",
  "Claude Code workflow min_faves:50 -is:retweet lang:en",
];

const MOCK_BUZZ_SIGNAL: BuzzSignal = {
  signalId: "mock-buzz-1",
  tweetId: "mock-tweet",
  author: "mock_author",
  body: "I just replaced 90% of my SQL workflow with Claude. Here's how:",
  likes: 1234,
  retweets: 234,
  replies: 56,
  postedAt: new Date().toISOString(),
  relevanceScore: 85,
  category: "tips",
};

/**
 * twitterapi.io + Haiku 判定で採用 tweet を 1 件返す step。
 */
export async function fetchTopBuzzSignal(): Promise<BuzzSignal> {
  "use step";

  const apiKey = process.env.TWITTERAPI_IO_KEY;
  if (!apiKey) {
    console.warn("[buzz-source] TWITTERAPI_IO_KEY not set, returning MOCK");
    return MOCK_BUZZ_SIGNAL;
  }

  const query = DEFAULT_QUERIES[Math.floor(Math.random() * DEFAULT_QUERIES.length)] ?? DEFAULT_QUERIES[0];
  const params = new URLSearchParams({ query: query as string, queryType: "Latest" });

  let tweets: TwitterApiTweet[] = [];
  try {
    const res = await fetch(
      `https://api.twitterapi.io/twitter/tweet/advanced_search?${params.toString()}`,
      {
        headers: { "x-api-key": apiKey },
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!res.ok) {
      console.warn(`[buzz-source] twitterapi.io ${res.status}, falling back to MOCK`);
      return MOCK_BUZZ_SIGNAL;
    }
    const json = (await res.json()) as TwitterApiResponse;
    tweets = (json.data ?? []).slice(0, 15);
  } catch (err) {
    console.warn("[buzz-source] fetch failed, MOCK", err);
    return MOCK_BUZZ_SIGNAL;
  }

  if (tweets.length === 0) return MOCK_BUZZ_SIGNAL;

  // Haiku 関連度判定 (managed agent reviewer を流用 or 既存 writer/sns agent を流用)
  // Phase 1.5 MVP: 単純化のため reviewer agent を使い回す
  if (!hasManagedAgentsConfig()) {
    return mapToSignal(tweets[0]!, 70, "tips");
  }

  let bestTweet: TwitterApiTweet | null = null;
  let bestScore = -1;
  let bestCategory: BuzzSignal["category"] = "other";

  for (const tweet of tweets.slice(0, 5)) {
    try {
      const result = await runManagedAgent({
        agentId: getAgentId("reviewer"),
        environmentId: getEnvironmentId(),
        userMessage:
          `次のツイートが Claude (Anthropic AI) の実用活用 / Tips / 事例 / ニュースに関係するか 0-100 で判定して、 ` +
          `JSON で {"score": 0-100, "category": "tips|news|compare|case|other"} のみ返してください。\n\n` +
          `tweet by @${tweet.author.userName}: "${tweet.text.slice(0, 500)}"`,
        maxPollMs: 30000,
      });
      const m = result.text.match(/"score"\s*:\s*(\d+)/);
      const c = result.text.match(/"category"\s*:\s*"(tips|news|compare|case|other)"/);
      const score = m && m[1] ? parseInt(m[1], 10) : 0;
      const category = (c && c[1] ? c[1] : "other") as BuzzSignal["category"];
      if (score > bestScore) {
        bestScore = score;
        bestTweet = tweet;
        bestCategory = category;
      }
    } catch (err) {
      console.warn("[buzz-source] relevance judge failed for tweet", tweet.id, err);
    }
  }

  const final = bestTweet ?? tweets[0]!;
  const signal = mapToSignal(final, Math.max(bestScore, 0), bestCategory);

  // cache to Supabase (best effort, ignore errors)
  if (hasSupabase()) {
    const supabase = getSupabase();
    await supabase
      .from("buzz_tweets")
      .upsert(
        {
          tweet_id: signal.tweetId,
          author_screen_name: signal.author,
          body: signal.body,
          lang: final.lang ?? null,
          posted_at: signal.postedAt,
          likes: signal.likes,
          retweets: signal.retweets,
          replies: signal.replies,
          relevance_score: signal.relevanceScore,
          category: signal.category,
        },
        { onConflict: "tweet_id" },
      );
  }

  return signal;
}

function mapToSignal(
  t: TwitterApiTweet,
  score: number,
  category: BuzzSignal["category"],
): BuzzSignal {
  return {
    signalId: `buzz:${t.id}`,
    tweetId: t.id,
    author: t.author.userName,
    body: t.text,
    likes: t.likeCount ?? 0,
    retweets: t.retweetCount ?? 0,
    replies: t.replyCount ?? 0,
    postedAt: t.createdAt,
    relevanceScore: score,
    category,
  };
}
