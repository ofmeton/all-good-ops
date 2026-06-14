/**
 * fetch-chaen-article-study.ts — 研究補完: チャエン(masahirochaen) + 記事(X Article) の追加収集。
 *
 * 2026-06-13 viral/thread 研究のギャップ補完:
 *  - 競合に masahirochaen(チャエン)を追加（バズ投稿 + スレッド全文）
 *  - X Article(記事)投稿を全ハンドル横断で検出し、get_article で本文を取得して構造研究
 *
 * 注意: twitterapi.io へ外部 API call（read）。get_article は 100 credits/記事のため上限を設ける。
 * 実行: cd apps/x-account-system && TWITTERAPI_IO_KEY=... npx tsx scripts/fetch-chaen-article-study.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "https://api.twitterapi.io";

const CHAEN = "masahirochaen";
// Article 横断スキャン対象（チャエン + 既存6アカ）。
const ARTICLE_SCAN_HANDLES = [
  "masahirochaen",
  "nobel_824",
  "ClaudeCode_love",
  "ClaudeCode_UT",
  "MakeAI_CEO",
  "Gencoin8",
  "obsidianstudio9",
] as const;

const SINCE = "2026-04-29";
const CHAEN_MIN_FAVES = 100;
const CHAEN_MAX_ROOTS = 15;
const ARTICLE_SCAN_MIN_FAVES = 30;
const MAX_ARTICLES_TOTAL = 12; // get_article は 100 credits/件 → 総数を bound

const OUT_DIR = path.resolve(
  process.cwd(),
  "../../raw/publishing/research/2026-06-13-chaen-article-study",
);

interface RawTweet {
  id: string;
  text?: string;
  createdAt?: string;
  lang?: string;
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
  bookmarkCount?: number;
  viewCount?: number;
  conversationId?: string;
  isReply?: boolean;
  url?: string;
  twitterUrl?: string;
  author?: { userName?: string };
  article?: unknown; // non-null/object when the tweet is an X Article
  extendedEntities?: unknown;
}

function key(): string {
  const k = process.env.TWITTERAPI_IO_KEY;
  if (!k) throw new Error("TWITTERAPI_IO_KEY is required");
  return k;
}

async function apiGet(p: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}${p}?${qs}`, {
    headers: { "x-api-key": key(), Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`twitterapi.io ${res.status} ${res.statusText} for ${p}`);
  return (await res.json()) as Record<string, unknown>;
}

async function search(query: string, queryType: "Latest" | "Top"): Promise<RawTweet[]> {
  const json = await apiGet("/twitter/tweet/advanced_search", { query, queryType });
  const arr = (json.tweets ?? json.data ?? []) as RawTweet[];
  return Array.isArray(arr) ? arr : [];
}

async function thread(tweetId: string): Promise<RawTweet[]> {
  const json = await apiGet("/twitter/tweet/thread_context", { tweetId });
  const arr = (json.tweets ?? json.data ?? []) as RawTweet[];
  return Array.isArray(arr) ? arr : [];
}

async function getArticle(tweetId: string): Promise<unknown> {
  // GET /twitter/article (tweet_id, 100 credits/記事)
  const json = await apiGet("/twitter/article", { tweet_id: tweetId });
  return json.article ?? json;
}

function hasArticle(t: RawTweet): boolean {
  return t.article != null && t.article !== false;
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  // 1) チャエン: バズ投稿 + スレッド全文
  const chaenTweets = await search(
    `from:${CHAEN} since:${SINCE} min_faves:${CHAEN_MIN_FAVES} -is:retweet`,
    "Top",
  );
  const seenRoot = new Set<string>();
  const chaenRoots = chaenTweets
    .filter((t) => {
      const r = t.conversationId ?? t.id;
      if (seenRoot.has(r)) return false;
      seenRoot.add(r);
      return true;
    })
    .slice(0, CHAEN_MAX_ROOTS);
  const chaenThreads: Array<{ root: RawTweet; thread: RawTweet[] }> = [];
  for (const root of chaenRoots) {
    const t = await thread(root.conversationId ?? root.id);
    chaenThreads.push({ handle: CHAEN, root, thread: t.filter((x) => x.author?.userName === CHAEN) } as never);
  }
  await writeFile(path.join(OUT_DIR, `${CHAEN}.tweets.json`), JSON.stringify(chaenTweets, null, 2));
  await writeFile(path.join(OUT_DIR, `${CHAEN}.threads.json`), JSON.stringify(chaenThreads, null, 2));

  // 2) Article 横断検出 → get_article で本文取得（総数 bound）
  const articleHits: Array<{ handle: string; tweet_id: string; root: RawTweet }> = [];
  for (const handle of ARTICLE_SCAN_HANDLES) {
    const tweets = await search(
      `from:${handle} since:${SINCE} min_faves:${ARTICLE_SCAN_MIN_FAVES} -is:retweet`,
      "Latest",
    );
    for (const t of tweets) {
      if (hasArticle(t)) articleHits.push({ handle, tweet_id: t.id, root: t });
    }
  }
  // handle ごとに散らしつつ総数を MAX に bound
  const bounded = articleHits.slice(0, MAX_ARTICLES_TOTAL);
  const articles: Array<{ handle: string; tweet_id: string; root: RawTweet; article: unknown }> = [];
  for (const hit of bounded) {
    try {
      const article = await getArticle(hit.tweet_id);
      articles.push({ ...hit, article });
    } catch (e) {
      console.warn(`get_article failed for ${hit.tweet_id}: ${String(e)}`);
    }
  }
  await writeFile(path.join(OUT_DIR, "articles.json"), JSON.stringify(articles, null, 2));

  const metadata = {
    session_date: new Date().toISOString(),
    source: "twitterapi.io",
    note: "Gap-fill: チャエン(masahirochaen)競合追加 + X Article(記事)投稿研究。Generated by human-run script.",
    date_range: { since: SINCE },
    chaen: { handle: CHAEN, min_faves: CHAEN_MIN_FAVES, roots: chaenRoots.length },
    article_scan: {
      handles: ARTICLE_SCAN_HANDLES,
      min_faves: ARTICLE_SCAN_MIN_FAVES,
      detected: articleHits.length,
      fetched: articles.length,
      max_articles_total: MAX_ARTICLES_TOTAL,
    },
  };
  await writeFile(path.join(OUT_DIR, "metadata.json"), JSON.stringify(metadata, null, 2));

  console.log(
    JSON.stringify({
      chaen_tweets: chaenTweets.length,
      chaen_roots: chaenRoots.length,
      articles_detected: articleHits.length,
      articles_fetched: articles.length,
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
