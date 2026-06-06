# Collector Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 収集を「エージェント＝探索＋3軸スコア判断 / コード＝twitterapi道具・dedup・保存の配管」で作り直し、探索的に集めた素材を全件スコア＋理由付きで materials_store に保存する `collect` ジョブを追加する。

**Architecture:** 1ジョブ=1 Collectorセッション。エージェントが search 系ツール（twitterapi.io）で探索（固定watchlist＋海外トレンド＋キーワード＋新ソース発見＋スレ復元）→ コードが決定的に fetch・dedup → 別バッチの LLM が候補を3軸（freshness/velocity/target_fit）スコア＋理由 → materials_store へ全保存（除外なし）。改善レバーは `collector-config.ts`（数値）/`collector-prompts.ts`（判断）に集約。trace はツール境界で記録。

**Tech Stack:** TypeScript, Cloudflare Workers, `@anthropic-ai/sdk`（tool_use, claude-sonnet-4-5）, Supabase（xad schema）, twitterapi.io（advanced_search ほか）, Jest（ts-jest CJS）。

参照 spec: `apps/x-account-system/docs/superpowers/specs/2026-06-06-collector-agent-design.md`

---

## ファイル構成（責務）

- `lib/ingest/twitterapi-client.ts`（**修正**）— Tweet interface 拡張＋5エンドポイント関数追加（決定的 fetch 道具）。
- `lib/ingest/collector-config.ts`（**新規**）— 数値・設定系レバー SSOT（watchlist/woeid/weights/budget/dedup/model）。
- `lib/ingest/collector-prompts.ts`（**新規**）— 判断系レバー（target定義/探索戦略/scoring rubric/プロンプト builder）。
- `lib/ingest/collector-tools.ts`（**新規**）— エージェント用 search ツールの JSON schema ＋ tool_use → twitterapi 呼び出し dispatch。
- `lib/ingest/collector-scoring.ts`（**新規**）— 数値ヒント計算＋バッチ scorer（LLM tool_use で3軸スコア）。
- `lib/ingest/collector-persist.ts`（**新規**）— dedup ＋ materials_store 保存（配管）。
- `lib/ingest/collector.ts`（**新規**）— `runCollect()` オーケストレーション（探索ループ→dedup→scoring→persist）。
- `migrations/0015_collector_fields.sql`（**新規**）— materials_store カラム拡張＋candidate_sources テーブル。
- `src/queue.ts`（**修正**）— `case "collect"`。
- `src/worker.ts`（**修正**）— JobMessage union ＋ CRON_JOBS_BY_NAME ＋ CRON_JOBS に collect。
- `lib/safety/brownout-handler.ts`（**修正**）— ALL_JOBS に "collect"。
- `lib/registry/stages/index-stages.ts`（**修正**）— collect stage 追加。

DRY/YAGNI: get_article（長文）・4軸目（差別化）・UI は今回スコープ外（枠のみ）。

---

### Task 1: twitterapi-client.ts を拡張（Tweet 拡張＋5エンドポイント）

**Files:**
- Modify: `apps/x-account-system/lib/ingest/twitterapi-client.ts`
- Test: `apps/x-account-system/lib/ingest/twitterapi-client.test.ts`

- [ ] **Step 1: Write failing tests**

`apps/x-account-system/lib/ingest/twitterapi-client.test.ts` に追記（無ければ新規。既存 `fetchUserTweets` テストは残す）:

```typescript
import {
  searchTweets,
  getTrends,
  searchUsers,
  getUserFollowings,
  getThread,
  type Tweet,
} from "./twitterapi-client.ts";

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
            media: [{ type: "photo", media_url_https: "https://img/1.jpg" }],
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
    expect(t.media).toEqual([{ type: "photo", url: "https://img/1.jpg" }]);
    expect(t.author.isBlueVerified).toBe(true);
  });

  test("getTrends returns trend names", async () => {
    const fetchImpl = jsonFetch({ trends: [{ name: "#AI" }, { name: "Claude" }] });
    const out = await getTrends(1, "k", fetchImpl);
    expect(out).toEqual(["#AI", "Claude"]);
  });

  test("searchUsers returns handles", async () => {
    const fetchImpl = jsonFetch({ users: [{ userName: "x" }, { userName: "y" }] });
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
```

- [ ] **Step 2: Run tests — verify they FAIL**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/ingest/twitterapi-client.test.ts -t "twitterapi-client extended"`
Expected: FAIL（`searchTweets is not a function` 等）。

- [ ] **Step 3: Implement — 拡張 interface ＋ 共通 mapper ＋ 5関数**

`apps/x-account-system/lib/ingest/twitterapi-client.ts` の `Tweet` interface を拡張し、末尾に関数追加。

`Tweet` interface を以下に置換:

```typescript
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
```

ファイル先頭 BASE_URL の後に raw 型と mapper を追加:

```typescript
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
```

ファイル末尾に5関数:

```typescript
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
```

> NOTE: twitterapi.io の trends/user/search/followings/thread エンドポイントの正確な path・レスポンス key は実装時に1回 curl で確認（`feedback_external_crawler_pre_curl`）。上記 path（`/twitter/trends` 等）とレスポンス key（`trends`/`users`/`followings`）が異なる場合はここだけ直す。テストは mapper の挙動を固定しているので path 変更の影響は局所。

- [ ] **Step 4: Run tests — verify PASS**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/ingest/twitterapi-client.test.ts`
Expected: PASS（既存 fetchUserTweets テスト含め全緑）。

- [ ] **Step 5: Commit**

```bash
git add apps/x-account-system/lib/ingest/twitterapi-client.ts apps/x-account-system/lib/ingest/twitterapi-client.test.ts
git commit -m "feat(collector): twitterapi-client に5エンドポイント＋Tweet拡張(media/url/isReply/conversationId)"
```

---

### Task 2: collector-config.ts（数値レバー SSOT）

**Files:**
- Create: `apps/x-account-system/lib/ingest/collector-config.ts`
- Test: `apps/x-account-system/lib/ingest/collector-config.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { COLLECTOR_CONFIG } from "./collector-config.ts";

describe("COLLECTOR_CONFIG (改善レバー SSOT)", () => {
  test("has all levers with sane defaults", () => {
    expect(COLLECTOR_CONFIG.watchlist.length).toBeGreaterThan(0);
    expect(COLLECTOR_CONFIG.trendWoeids).toContain(1); // worldwide
    expect(COLLECTOR_CONFIG.scoringWeights.target_fit).toBeGreaterThan(0);
    expect(COLLECTOR_CONFIG.maxFetchPerRun).toBeGreaterThan(0);
    expect(COLLECTOR_CONFIG.maxExploreIterations).toBeGreaterThan(0);
    expect(COLLECTOR_CONFIG.scoringModel).toMatch(/claude/);
    expect(COLLECTOR_CONFIG.scoringBatchSize).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/ingest/collector-config.test.ts`
Expected: FAIL（module not found）。

- [ ] **Step 3: Implement**

```typescript
/**
 * lib/ingest/collector-config.ts — Collector の数値・設定系レバー SSOT。
 * 改善レバー L1/L2/L4/L7/L8/L9/L10 はここを編集する（散在禁止）。
 */

export interface CollectorWatchSource {
  handle: string;
  category: "ai_official" | "en_curator" | "jp_publisher";
}

export interface CollectorConfig {
  /** L1: 固定 watchlist（初期ソース） */
  watchlist: CollectorWatchSource[];
  /** L4: 海外トレンド woeid（1=worldwide, 23424977=US） */
  trendWoeids: number[];
  /** L5(数値側): 3軸の重み（overall 算出の参考。LLM に rubric として渡す） */
  scoringWeights: { freshness: number; velocity: number; target_fit: number };
  /** L8: 1 run で fetch する最大件数（budget 上限） */
  maxFetchPerRun: number;
  /** L8: 探索ループの最大反復（agent の tool_use 往復上限） */
  maxExploreIterations: number;
  /** L7: scoring モデル */
  scoringModel: string;
  /** L8: scoring の1バッチ件数 */
  scoringBatchSize: number;
  /** L9: dedup ウィンドウ（日。これより古い同一 tweet_id は無視＝実質 tweet_id unique 依存） */
  dedupWindowDays: number;
  /** L2: 新ソース候補を即 watchlist 昇格しない（常に candidate_sources へ） */
  autoPromoteDiscoveredSources: false;
}

/** 現行 SEED_SOURCES（28）を初期 watchlist として移植 */
export const COLLECTOR_CONFIG: CollectorConfig = {
  watchlist: [
    { handle: "AnthropicAI", category: "ai_official" },
    { handle: "OpenAI", category: "ai_official" },
    { handle: "GoogleDeepMind", category: "ai_official" },
    { handle: "gerardsans", category: "en_curator" },
    // jp_publisher（buzz-ingest SEED_SOURCES から移植。実装時に lib/ingest/buzz-ingest.ts の SEED_SOURCES を参照して全件転記）
    { handle: "Shimayus", category: "jp_publisher" },
    { handle: "SuguruKun_ai", category: "jp_publisher" },
    { handle: "masahirochaen", category: "jp_publisher" },
    { handle: "ClaudeCode_love", category: "jp_publisher" },
  ],
  trendWoeids: [1, 23424977],
  scoringWeights: { freshness: 0.3, velocity: 0.3, target_fit: 0.4 },
  maxFetchPerRun: 120,
  maxExploreIterations: 8,
  scoringModel: "claude-sonnet-4-5",
  scoringBatchSize: 20,
  dedupWindowDays: 14,
  autoPromoteDiscoveredSources: false,
};
```

> NOTE: watchlist の jp_publisher は実装時に `lib/ingest/buzz-ingest.ts` の `SEED_SOURCES`（28件）を全件転記。ここでは代表4件のみ記載。

- [ ] **Step 4: Run — verify PASS**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/ingest/collector-config.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/x-account-system/lib/ingest/collector-config.ts apps/x-account-system/lib/ingest/collector-config.test.ts
git commit -m "feat(collector): 数値レバーSSOT collector-config.ts"
```

---

### Task 3: collector-prompts.ts（判断レバー）

**Files:**
- Create: `apps/x-account-system/lib/ingest/collector-prompts.ts`
- Test: `apps/x-account-system/lib/ingest/collector-prompts.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import {
  TARGET_DEFINITION,
  buildExploreSystemPrompt,
  buildScoringSystemPrompt,
} from "./collector-prompts.ts";

describe("collector-prompts (判断レバー)", () => {
  test("target definition は chaen 層", () => {
    expect(TARGET_DEFINITION).toContain("ビジネスパーソン");
  });
  test("explore prompt は海外トレンド先取りと全保存方針を含む", () => {
    const p = buildExploreSystemPrompt();
    expect(p).toContain("海外");
    expect(p).toMatch(/除外しない|全件/);
  });
  test("scoring prompt は3軸を含む", () => {
    const p = buildScoringSystemPrompt();
    expect(p).toContain("freshness");
    expect(p).toContain("velocity");
    expect(p).toContain("target_fit");
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/ingest/collector-prompts.test.ts`
Expected: FAIL。

- [ ] **Step 3: Implement**

```typescript
/**
 * lib/ingest/collector-prompts.ts — Collector の判断系レバー。
 * 改善レバー L3(探索戦略)/L5(rubric)/L6(target定義) はここを編集する。
 */

/** L6: ターゲット定義（チャエン層コピー, 分析doc §9.1） */
export const TARGET_DEFINITION = `
ターゲット読者: 「AIを仕事・キャリアに活かしたい日本のビジネスパーソン全般」。
経営者/個人事業主〜会社員〜エンジニア〜これからAIを学ぶ初学者まで横断。
「最新AIを誰よりも速く・分かりやすく知りたい」情報感度の高い層。専門家でなくてOK。
判定の合言葉: 「チャエン（@masahirochaen）が投稿しそうなネタか？」`.trim();

/** L3: 探索戦略を指示する system prompt */
export function buildExploreSystemPrompt(): string {
  return `あなたは X 発信用の「ネタ収集エージェント」です。日本のAI速報アカウント向けに、価値あるネタの素材ツイートを探索的に集めます。

${TARGET_DEFINITION}

## 探索方針
- 固定 watchlist（AI企業公式 / 英語AI解説者 / 日本のAI発信者）を巡回する。
- **海外トレンドを先取りして日本に最速輸入するのが最大の価値**。get_trends（海外）で来てるトピックを掴み、search_tweets でそのネタの一次情報を拾う。
- キーワード検索（例: 新モデル名・新機能名 + min_faves でバズ閾値）を動的に組み立てる。
- 良質な新ソースを search_users / get_user_followings で発見してよい（採否は後段が決める）。
- スレッド断片しか無い時は get_thread で全文を復元する。

## 重要な制約
- あなたは**除外判断をしない**。集めた候補は後段で全件スコアリングされ全保存される。雑に見える素材も拾ってよい（後でスコアで沈む）。
- 十分な多様性と件数（数十件規模）が集まったら終了する。だらだら探索しない。
- 検索ツールを使って実際にデータを集めること。憶測でツイートを作らない。`;
}

/** L5: scoring rubric を指示する system prompt */
export function buildScoringSystemPrompt(): string {
  return `あなたは収集済みツイートを「X発信ネタとしての価値」で採点する評価器です。

${TARGET_DEFINITION}

各ツイートを 3軸 0-100 で採点し、理由を1文添えてください。
- **freshness（速報性・鮮度）**: 今まさに起きた新情報ほど高い。古いネタは低い（数値ヒント age_hours を参照）。
- **velocity（バズ伸び）**: いいね/RT/bookmark の伸び速度が速いほど高い（数値ヒント velocity_per_hour / engagement_rate を参照）。
- **target_fit（ターゲット適合）**: 上記ターゲットに刺さるか＝「チャエンが投稿しそうか」。AI実務・最新性・分かりやすさが高いほど高い。空ツイート/無関係リプ/非AIネタは低い。
- **overall**: 3軸の総合（重み freshness:velocity:target_fit ≒ 3:3:4 を目安に、ただし明らかに target_fit が低いものは overall も大きく下げる）。
- **reason**: なぜそのスコアかを日本語1文。

数値ヒントは参考。最終判断はあなたが行う。`;
}
```

- [ ] **Step 4: Run — verify PASS**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/ingest/collector-prompts.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/x-account-system/lib/ingest/collector-prompts.ts apps/x-account-system/lib/ingest/collector-prompts.test.ts
git commit -m "feat(collector): 判断レバー collector-prompts.ts(target定義/探索/rubric)"
```

---

### Task 4: collector-scoring.ts（数値ヒント＋バッチ scorer）

**Files:**
- Create: `apps/x-account-system/lib/ingest/collector-scoring.ts`
- Test: `apps/x-account-system/lib/ingest/collector-scoring.test.ts`

scorer は `callClaudeTraced`（`lib/trace/llm-trace.ts`）を使い tool_use で構造化出力を得る。`Candidate` 型は Task 5 でも使うため本タスクで定義する。

- [ ] **Step 1: Write failing test**

```typescript
import {
  computeHints,
  scoreCandidates,
  type Candidate,
  type ScoredCandidate,
} from "./collector-scoring.ts";

function cand(id: string, ageH: number, likes: number): Candidate {
  const created = new Date(Date.now() - ageH * 3600_000).toISOString();
  return {
    tweet: {
      id,
      text: `t${id}`,
      author: { userName: "a" },
      createdAt: created,
      likeCount: likes,
      retweetCount: 0,
      viewCount: 1000,
    },
    discovery: { via: "fixed", query: "from:a" },
  };
}

describe("computeHints", () => {
  test("fresh + high engagement → higher velocity hint", () => {
    const h = computeHints(cand("1", 1, 100).tweet, Date.now());
    expect(h.age_hours).toBeCloseTo(1, 0);
    expect(h.velocity_per_hour).toBeGreaterThan(0);
    expect(h.engagement_rate).toBeCloseTo(0.1, 1);
  });
});

describe("scoreCandidates", () => {
  test("maps tool_use scores onto candidates", async () => {
    const fakeClient = {
      messages: {
        create: async () => ({
          content: [
            {
              type: "tool_use",
              input: {
                scores: [
                  {
                    id: "1",
                    freshness: 80,
                    velocity: 70,
                    target_fit: 90,
                    overall: 82,
                    reason: "新機能の速報",
                  },
                ],
              },
            },
          ],
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      },
    };
    const out: ScoredCandidate[] = await scoreCandidates(
      fakeClient as never,
      [cand("1", 1, 100)],
      { now: Date.now(), batchSize: 20, model: "claude-sonnet-4-5" },
    );
    expect(out).toHaveLength(1);
    expect(out[0].scores.overall).toBe(82);
    expect(out[0].scores.target_fit).toBe(90);
    expect(out[0].scoreReason).toBe("新機能の速報");
    expect(out[0].costJpy).toBeGreaterThan(0);
  });

  test("missing score falls back to zeros (全保存・除外しない)", async () => {
    const fakeClient = {
      messages: {
        create: async () => ({
          content: [{ type: "tool_use", input: { scores: [] } }],
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      },
    };
    const out = await scoreCandidates(fakeClient as never, [cand("1", 1, 1)], {
      now: Date.now(),
      batchSize: 20,
      model: "claude-sonnet-4-5",
    });
    expect(out).toHaveLength(1);
    expect(out[0].scores.overall).toBe(0);
    expect(out[0].scoreReason).toMatch(/未採点|スコア欠落/);
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/ingest/collector-scoring.test.ts`
Expected: FAIL。

- [ ] **Step 3: Implement**

```typescript
/**
 * lib/ingest/collector-scoring.ts — 数値ヒント計算＋3軸バッチ scorer。
 * 数値は道具（ここで計算）、重み付け判断は脳（LLM）。
 */
import { callClaudeTraced } from "../trace/llm-trace.js";
import { buildScoringSystemPrompt } from "./collector-prompts.js";
import type { Tweet } from "./twitterapi-client.js";

export interface DiscoveryTag {
  via: "fixed" | "keyword" | "trend" | "user_search" | "following";
  query: string;
}

export interface Candidate {
  tweet: Tweet;
  discovery: DiscoveryTag;
}

export interface AxisScores {
  freshness: number;
  velocity: number;
  target_fit: number;
  overall: number;
}

export interface ScoredCandidate extends Candidate {
  scores: AxisScores;
  scoreReason: string;
  costJpy: number;
}

export interface NumericHints {
  age_hours: number;
  velocity_per_hour: number;
  engagement_rate: number;
}

/** 数値ヒント（LLM に添える参考値）。velocity/freshness の素 */
export function computeHints(tweet: Tweet, now: number): NumericHints {
  const created = new Date(tweet.createdAt).getTime();
  const ageHours = Number.isFinite(created)
    ? Math.max((now - created) / 3600_000, 0.1)
    : 9999;
  const engagement =
    (tweet.likeCount ?? 0) + (tweet.retweetCount ?? 0) + (tweet.bookmarkCount ?? 0);
  const views = tweet.viewCount ?? 0;
  return {
    age_hours: Math.round(ageHours * 10) / 10,
    velocity_per_hour: Math.round((engagement / ageHours) * 10) / 10,
    engagement_rate: views > 0 ? Math.round((engagement / views) * 1000) / 1000 : 0,
  };
}

const SCORE_TOOL = {
  name: "score_materials",
  description: "収集ツイートを3軸で採点",
  input_schema: {
    type: "object",
    properties: {
      scores: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            freshness: { type: "number" },
            velocity: { type: "number" },
            target_fit: { type: "number" },
            overall: { type: "number" },
            reason: { type: "string" },
          },
          required: ["id", "freshness", "velocity", "target_fit", "overall", "reason"],
        },
      },
    },
    required: ["scores"],
  },
} as const;

interface RawScore {
  id: string;
  freshness: number;
  velocity: number;
  target_fit: number;
  overall: number;
  reason: string;
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export interface ScoreOpts {
  now: number;
  batchSize: number;
  model: string;
}

/** 候補を batchSize ごとに採点。欠落は zeros にして全件返す（除外しない）。 */
export async function scoreCandidates(
  client: Parameters<typeof callClaudeTraced>[0],
  candidates: Candidate[],
  opts: ScoreOpts,
): Promise<ScoredCandidate[]> {
  const system = buildScoringSystemPrompt();
  const result: ScoredCandidate[] = [];

  for (const batch of chunk(candidates, opts.batchSize)) {
    const lines = batch.map((c) => {
      const h = computeHints(c.tweet, opts.now);
      return JSON.stringify({
        id: c.tweet.id,
        text: c.tweet.text,
        lang: c.tweet.lang,
        is_reply: c.tweet.isReply ?? false,
        has_media: (c.tweet.media?.length ?? 0) > 0,
        age_hours: h.age_hours,
        velocity_per_hour: h.velocity_per_hour,
        engagement_rate: h.engagement_rate,
      });
    });
    const userPrompt = `次の候補を score_materials で採点せよ。\n${lines.join("\n")}`;

    const out = await callClaudeTraced(client, {
      params: {
        model: opts.model,
        max_tokens: 4096,
        system,
        tools: [SCORE_TOOL as never],
        tool_choice: { type: "tool", name: "score_materials" },
        messages: [{ role: "user", content: userPrompt }],
      },
      promptText: `${system}\n\n---\n\n${userPrompt}`,
    });

    const rawScores = ((out.toolUse as { scores?: RawScore[] })?.scores ?? []) as RawScore[];
    const byId = new Map(rawScores.map((s) => [s.id, s]));
    const costJpy =
      (((out.meta.tokensIn ?? 0) / 1_000_000) * 3 +
        ((out.meta.tokensOut ?? 0) / 1_000_000) * 15) *
      150; // USD→JPY 固定

    for (const c of batch) {
      const s = byId.get(c.tweet.id);
      result.push({
        ...c,
        scores: s
          ? {
              freshness: s.freshness,
              velocity: s.velocity,
              target_fit: s.target_fit,
              overall: s.overall,
            }
          : { freshness: 0, velocity: 0, target_fit: 0, overall: 0 },
        scoreReason: s ? s.reason : "スコア欠落（未採点・全保存方針で保持）",
        costJpy: costJpy / batch.length,
      });
    }
  }
  return result;
}
```

- [ ] **Step 4: Run — verify PASS**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/ingest/collector-scoring.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/x-account-system/lib/ingest/collector-scoring.ts apps/x-account-system/lib/ingest/collector-scoring.test.ts
git commit -m "feat(collector): 数値ヒント＋3軸バッチscorer collector-scoring.ts"
```

---

### Task 5: collector-tools.ts（探索ツール定義＋dispatch）

**Files:**
- Create: `apps/x-account-system/lib/ingest/collector-tools.ts`
- Test: `apps/x-account-system/lib/ingest/collector-tools.test.ts`

エージェントが呼ぶ search 系ツールの JSON schema と、tool_use を twitterapi-client 呼び出しに変換する dispatch。dispatch は取得 tweet に discovery タグを付けて返す。

- [ ] **Step 1: Write failing test**

```typescript
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
});
```

- [ ] **Step 2: Run — verify FAIL**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/ingest/collector-tools.test.ts`
Expected: FAIL。

- [ ] **Step 3: Implement**

```typescript
/**
 * lib/ingest/collector-tools.ts — エージェント探索ツールの schema ＋ dispatch。
 * fetch は決定的コード（道具）。エージェントは「どのツールをどの引数で呼ぶか」を判断する。
 */
import type { Candidate, DiscoveryTag } from "./collector-scoring.js";
import {
  searchTweets,
  getTrends,
  searchUsers,
  getUserFollowings,
  getThread,
  type QueryType,
} from "./twitterapi-client.js";

export const COLLECTOR_TOOLS = [
  {
    name: "search_tweets",
    description: "X advanced search（キーワード/min_faves/lang/from:/since 構文可）でツイート取得",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        queryType: { type: "string", enum: ["Latest", "Top"] },
        via: {
          type: "string",
          enum: ["fixed", "keyword", "trend", "following"],
          description: "この検索の発見経路。固定watchlist=fixed, 自由検索=keyword, トレンド由来=trend",
        },
      },
      required: ["query", "queryType"],
    },
  },
  {
    name: "get_trends",
    description: "海外トレンド取得（woeid: 1=worldwide, 23424977=US）",
    input_schema: {
      type: "object",
      properties: { woeid: { type: "number" } },
      required: ["woeid"],
    },
  },
  {
    name: "search_users",
    description: "キーワードで新ソース候補アカウントを発見",
    input_schema: {
      type: "object",
      properties: { keyword: { type: "string" } },
      required: ["keyword"],
    },
  },
  {
    name: "get_user_followings",
    description: "あるアカウントのフォロー先を取得（新ソース発見）",
    input_schema: {
      type: "object",
      properties: { handle: { type: "string" } },
      required: ["handle"],
    },
  },
  {
    name: "get_thread",
    description: "conversationId でスレッド全文を復元",
    input_schema: {
      type: "object",
      properties: { conversationId: { type: "string" } },
      required: ["conversationId"],
    },
  },
] as const;

export interface ToolApi {
  searchTweets: typeof searchTweets;
  getTrends: typeof getTrends;
  searchUsers: typeof searchUsers;
  getUserFollowings: typeof getUserFollowings;
  getThread: typeof getThread;
}

export interface ToolDeps {
  key: string;
  fetchImpl: typeof fetch;
  /** test 注入用。未指定なら本物の twitterapi-client 関数 */
  api?: ToolApi;
}

export interface DispatchResult {
  candidates: Candidate[];
  toolResultText: string;
}

function defaultApi(): ToolApi {
  return { searchTweets, getTrends, searchUsers, getUserFollowings, getThread };
}

/** tool_use を実 fetch に変換。tweet には discovery タグを付与。 */
export async function dispatchTool(
  name: string,
  input: Record<string, unknown>,
  deps: ToolDeps,
): Promise<DispatchResult> {
  const api = deps.api ?? defaultApi();
  const k = deps.key;
  const f = deps.fetchImpl;

  switch (name) {
    case "search_tweets": {
      const query = String(input.query ?? "");
      const queryType = (input.queryType as QueryType) ?? "Latest";
      const via = (input.via as DiscoveryTag["via"]) ?? "keyword";
      const tweets = await api.searchTweets(query, queryType, k, f);
      const candidates: Candidate[] = tweets.map((t) => ({
        tweet: t,
        discovery: { via, query },
      }));
      return { candidates, toolResultText: `取得 ${tweets.length} 件 (query=${query})` };
    }
    case "get_trends": {
      const woeid = Number(input.woeid ?? 1);
      const trends = await api.getTrends(woeid, k, f);
      return { candidates: [], toolResultText: `海外トレンド: ${trends.join(", ")}` };
    }
    case "search_users": {
      const keyword = String(input.keyword ?? "");
      const users = await api.searchUsers(keyword, k, f);
      return { candidates: [], toolResultText: `候補ソース: ${users.join(", ")}` };
    }
    case "get_user_followings": {
      const handle = String(input.handle ?? "");
      const users = await api.getUserFollowings(handle, k, f);
      return { candidates: [], toolResultText: `${handle} のフォロー先: ${users.join(", ")}` };
    }
    case "get_thread": {
      const cid = String(input.conversationId ?? "");
      const tweets = await api.getThread(cid, k, f);
      const candidates: Candidate[] = tweets.map((t) => ({
        tweet: t,
        discovery: { via: "fixed", query: `thread:${cid}` },
      }));
      return { candidates, toolResultText: `スレッド ${tweets.length} 件復元` };
    }
    default:
      return { candidates: [], toolResultText: `unknown tool: ${name}` };
  }
}
```

- [ ] **Step 4: Run — verify PASS**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/ingest/collector-tools.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/x-account-system/lib/ingest/collector-tools.ts apps/x-account-system/lib/ingest/collector-tools.test.ts
git commit -m "feat(collector): 探索ツール定義＋dispatch collector-tools.ts"
```

---

### Task 6: collector-persist.ts（dedup＋保存）

**Files:**
- Create: `apps/x-account-system/lib/ingest/collector-persist.ts`
- Test: `apps/x-account-system/lib/ingest/collector-persist.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { dedupCandidates, buildMaterialRow } from "./collector-persist.ts";
import type { ScoredCandidate } from "./collector-scoring.ts";

function scored(id: string): ScoredCandidate {
  return {
    tweet: {
      id,
      text: `t${id}`,
      author: { userName: "a" },
      createdAt: "x",
      media: [{ type: "photo", url: "u" }],
      lang: "en",
      isReply: false,
      conversationId: "c1",
      tweetUrl: "https://x.com/a/status/" + id,
    },
    discovery: { via: "keyword", query: "Claude" },
    scores: { freshness: 1, velocity: 2, target_fit: 3, overall: 4 },
    scoreReason: "r",
    costJpy: 0.1,
  };
}

describe("collector-persist", () => {
  test("dedup drops ids already in store and in-batch dups", async () => {
    const sb = {
      from: () => ({
        select: () => ({
          eq: () => ({
            in: async () => ({ data: [{ meta: { tweet_id: "1" } }], error: null }),
          }),
        }),
      }),
    };
    const out = await dedupCandidates(sb as never, [scored("1"), scored("2"), scored("2")]);
    expect(out.map((c) => c.tweet.id)).toEqual(["2"]);
  });

  test("buildMaterialRow maps all fields", () => {
    const row = buildMaterialRow(scored("9"), "redacted t9", false);
    expect(row.source_type).toBe("x_inspirations");
    expect(row.source_ref).toBe("a");
    expect(row.meta.tweet_id).toBe("9");
    expect(row.meta.scores.overall).toBe(4);
    expect(row.meta.discovery.via).toBe("keyword");
    expect(row.meta.media).toEqual([{ type: "photo", url: "u" }]);
    expect(row.meta.selection_status).toBe("collected");
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/ingest/collector-persist.test.ts`
Expected: FAIL。

- [ ] **Step 3: Implement**

```typescript
/**
 * lib/ingest/collector-persist.ts — dedup（冪等性）＋ materials_store 保存（配管）。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { redact } from "../dlp/redact.js";
import type { ScoredCandidate } from "./collector-scoring.js";

/** 既存 store にある tweet_id とバッチ内重複を除去。 */
export async function dedupCandidates(
  sb: SupabaseClient,
  scored: ScoredCandidate[],
): Promise<ScoredCandidate[]> {
  // バッチ内 dedup
  const seen = new Set<string>();
  const unique = scored.filter((c) => {
    if (seen.has(c.tweet.id)) return false;
    seen.add(c.tweet.id);
    return true;
  });
  const ids = unique.map((c) => c.tweet.id);
  if (ids.length === 0) return [];

  const { data, error } = await sb
    .from("materials_store")
    .select("meta")
    .eq("source_type", "x_inspirations")
    .in("meta->>tweet_id", ids);

  if (error) return unique; // fail-open: dedup できなくても unique violation で弾かれる
  const existing = new Set(
    (data ?? []).map((r: { meta?: { tweet_id?: string } }) => r.meta?.tweet_id),
  );
  return unique.filter((c) => !existing.has(c.tweet.id));
}

export interface MaterialRow {
  source_type: "x_inspirations";
  source_ref: string;
  raw_text: string;
  redacted_text: string;
  pii: boolean;
  permitted_storage: "title_only";
  publication_consent: "pending";
  meta: Record<string, unknown>;
}

/** ScoredCandidate → materials_store row。 */
export function buildMaterialRow(
  c: ScoredCandidate,
  redactedText: string,
  pii: boolean,
): MaterialRow {
  return {
    source_type: "x_inspirations",
    source_ref: c.tweet.author.userName,
    raw_text: c.tweet.text,
    redacted_text: redactedText,
    pii,
    permitted_storage: "title_only",
    publication_consent: "pending",
    meta: {
      tweet_id: c.tweet.id,
      tweet_url: c.tweet.tweetUrl ?? null,
      lang: c.tweet.lang ?? null,
      is_reply: c.tweet.isReply ?? null,
      conversation_id: c.tweet.conversationId ?? null,
      media: c.tweet.media ?? [],
      scores: c.scores,
      score_reason: c.scoreReason,
      discovery: c.discovery,
      collected_at: new Date(c.tweet.createdAt).toISOString
        ? c.tweet.createdAt
        : null,
      selection_status: "collected",
      cost_jpy: c.costJpy,
    },
  };
}

/** dedup→保存。保存できた件数を返す。unique violation は benign skip。 */
export async function saveScoredMaterials(
  sb: SupabaseClient,
  scored: ScoredCandidate[],
): Promise<number> {
  const fresh = await dedupCandidates(sb, scored);
  let saved = 0;
  for (const c of fresh) {
    const { redactedText, highRiskHits } = redact(c.tweet.text);
    const row = buildMaterialRow(c, redactedText, highRiskHits > 0);
    const { error } = await sb.from("materials_store").insert(row);
    if (!error) saved += 1;
  }
  return saved;
}
```

> NOTE: `redact` の戻り値（`redactedText`/`highRiskHits`）は `lib/dlp/redact.ts` の既存 API（buzz-ingest.ts L215 と同じ）。`collected_at` の三項は createdAt をそのまま保存（パース不能なら null）。実装時に簡潔化してよい。

- [ ] **Step 4: Run — verify PASS**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/ingest/collector-persist.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/x-account-system/lib/ingest/collector-persist.ts apps/x-account-system/lib/ingest/collector-persist.test.ts
git commit -m "feat(collector): dedup＋materials_store保存 collector-persist.ts"
```

---

### Task 7: collector.ts（探索ループ・オーケストレーション）

**Files:**
- Create: `apps/x-account-system/lib/ingest/collector.ts`
- Test: `apps/x-account-system/lib/ingest/collector.test.ts`

`runCollect` は: 探索ループ（agent が search ツールを呼ぶ→ dispatch→ tool_result を返す、end_turn か maxExploreIterations まで）→ 候補集約 → scoreCandidates → saveScoredMaterials → `{ inserted, meta }`。

- [ ] **Step 1: Write failing test**

```typescript
import { runCollect } from "./collector.ts";

describe("runCollect", () => {
  test("explores via tool_use then scores and persists", async () => {
    // 1回目: search_tweets を tool_use → 2回目: end_turn
    let turn = 0;
    const fakeAnthropic = {
      messages: {
        create: async (args: { tools?: { name: string }[] }) => {
          turn += 1;
          // scoring 呼び出し（score_materials tool）は tools 名で判別
          const isScoring = (args.tools ?? []).some((t) => t.name === "score_materials");
          if (isScoring) {
            return {
              content: [
                {
                  type: "tool_use",
                  input: {
                    scores: [
                      { id: "1", freshness: 50, velocity: 50, target_fit: 60, overall: 55, reason: "ok" },
                    ],
                  },
                },
              ],
              usage: { input_tokens: 10, output_tokens: 5 },
            };
          }
          if (turn === 1) {
            return {
              stop_reason: "tool_use",
              content: [
                { type: "tool_use", id: "tu1", name: "search_tweets", input: { query: "Claude", queryType: "Latest", via: "keyword" } },
              ],
              usage: { input_tokens: 20, output_tokens: 10 },
            };
          }
          return { stop_reason: "end_turn", content: [{ type: "text", text: "done" }], usage: { input_tokens: 5, output_tokens: 2 } };
        },
      },
    };

    const inserts: unknown[] = [];
    const sb = {
      from: () => ({
        select: () => ({ eq: () => ({ in: async () => ({ data: [], error: null }) }) }),
        insert: async (row: unknown) => {
          inserts.push(row);
          return { error: null };
        },
      }),
    };

    const inserted = await runCollect({
      anthropic: fakeAnthropic as never,
      sb: sb as never,
      twitterApiKey: "k",
      fetchImpl: undefined as never,
      api: {
        searchTweets: async () => [
          { id: "1", text: "Claude new feature", author: { userName: "a" }, createdAt: new Date().toISOString(), likeCount: 100, viewCount: 1000 },
        ],
        getTrends: async () => ["#AI"],
        searchUsers: async () => [],
        getUserFollowings: async () => [],
        getThread: async () => [],
      },
      now: Date.now(),
    });

    expect(inserted).toBe(1);
    expect(inserts).toHaveLength(1);
    expect((inserts[0] as { meta: { scores: { overall: number } } }).meta.scores.overall).toBe(55);
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/ingest/collector.test.ts`
Expected: FAIL。

- [ ] **Step 3: Implement**

```typescript
/**
 * lib/ingest/collector.ts — Collector Agent オーケストレーション。
 * 探索＝脳（tool_use ループ）／fetch＝道具／score＝バッチ脳／persist＝配管。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TraceMeta } from "../trace/types.js";
import { COLLECTOR_CONFIG } from "./collector-config.js";
import { buildExploreSystemPrompt } from "./collector-prompts.js";
import { COLLECTOR_TOOLS, dispatchTool, type ToolApi } from "./collector-tools.js";
import { scoreCandidates, type Candidate } from "./collector-scoring.js";
import { saveScoredMaterials } from "./collector-persist.js";

interface AnthropicLike {
  messages: {
    create: (args: Record<string, unknown>) => Promise<{
      stop_reason?: string;
      content: Array<{ type: string; id?: string; name?: string; input?: unknown; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    }>;
  };
}

export interface RunCollectDeps {
  anthropic: AnthropicLike;
  sb: SupabaseClient;
  twitterApiKey: string;
  fetchImpl: typeof fetch;
  api?: ToolApi; // test 注入
  now?: number;
  onTrace?: (m: TraceMeta) => void;
}

/** 探索ループを回して候補を集約し、採点・保存。inserted 件数を返す。 */
export async function runCollect(deps: RunCollectDeps): Promise<number> {
  const now = deps.now ?? Date.now();
  const system = buildExploreSystemPrompt();
  const watchHandles = COLLECTOR_CONFIG.watchlist.map((s) => s.handle).join(", ");
  const messages: Array<{ role: "user" | "assistant"; content: unknown }> = [
    {
      role: "user",
      content: `今日の収集を実行せよ。固定watchlist: ${watchHandles}。海外トレンド woeid=${COLLECTOR_CONFIG.trendWoeids.join("/")} を確認し、キーワード探索も行う。十分集まったら終了。`,
    },
  ];

  const candidates: Candidate[] = [];
  let tokensIn = 0;
  let tokensOut = 0;

  for (let i = 0; i < COLLECTOR_CONFIG.maxExploreIterations; i++) {
    if (candidates.length >= COLLECTOR_CONFIG.maxFetchPerRun) break;
    const res = await deps.anthropic.messages.create({
      model: COLLECTOR_CONFIG.scoringModel,
      max_tokens: 1024,
      system,
      tools: COLLECTOR_TOOLS as never,
      messages,
    });
    tokensIn += res.usage?.input_tokens ?? 0;
    tokensOut += res.usage?.output_tokens ?? 0;

    const toolUses = res.content.filter((c) => c.type === "tool_use");
    if (res.stop_reason !== "tool_use" || toolUses.length === 0) break;

    messages.push({ role: "assistant", content: res.content });
    const toolResults: Array<Record<string, unknown>> = [];
    for (const tu of toolUses) {
      const r = await dispatchTool(tu.name ?? "", (tu.input ?? {}) as Record<string, unknown>, {
        key: deps.twitterApiKey,
        fetchImpl: deps.fetchImpl,
        api: deps.api,
      });
      candidates.push(...r.candidates);
      toolResults.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: r.toolResultText,
      });
    }
    messages.push({ role: "user", content: toolResults });
  }

  if (candidates.length === 0) {
    deps.onTrace?.({ tokensIn, tokensOut, model: COLLECTOR_CONFIG.scoringModel });
    return 0;
  }

  const scored = await scoreCandidates(deps.anthropic as never, candidates, {
    now,
    batchSize: COLLECTOR_CONFIG.scoringBatchSize,
    model: COLLECTOR_CONFIG.scoringModel,
  });

  const inserted = await saveScoredMaterials(deps.sb, scored);

  const scoreCostJpy = scored.reduce((s, c) => s + c.costJpy, 0);
  const exploreCostJpy =
    ((tokensIn / 1_000_000) * 3 + (tokensOut / 1_000_000) * 15) * 150;
  deps.onTrace?.({
    model: COLLECTOR_CONFIG.scoringModel,
    tokensIn,
    tokensOut,
    costJpy: scoreCostJpy + exploreCostJpy,
  });
  return inserted;
}
```

- [ ] **Step 4: Run — verify PASS**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/ingest/collector.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/x-account-system/lib/ingest/collector.ts apps/x-account-system/lib/ingest/collector.test.ts
git commit -m "feat(collector): 探索ループ・オーケストレーション collector.ts"
```

---

### Task 8: migration 0015（materials_store 拡張＋candidate_sources）

**Files:**
- Create: `apps/x-account-system/migrations/0015_collector_fields.sql`

スコアは `meta` jsonb に入れる（Task 6 の通り）ので materials_store の DDL 変更は最小。クエリ性能のため `selection_status` と `overall` の生成列インデックスを足す。新ソース候補用テーブルを作る。

- [ ] **Step 1: Write migration**

```sql
-- 0015_collector_fields.sql — Collector Agent: 選抜状態のインデックスと新ソース候補テーブル

-- selection_status / overall は meta jsonb 内（buildMaterialRow 参照）。
-- 人間UIのソート・絞り込み高速化のため式インデックスを張る。
create index if not exists materials_store_selection_status_idx
  on xad.materials_store ((meta->>'selection_status'))
  where source_type = 'x_inspirations';

create index if not exists materials_store_overall_idx
  on xad.materials_store (((meta->'scores'->>'overall')::numeric))
  where source_type = 'x_inspirations';

-- 新ソース発見プール（即 watchlist 昇格しない）
create table if not exists xad.candidate_sources (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  handle text not null,
  discovered_via text not null,          -- user_search | following | trend
  discovered_query text,
  reason text,
  status text not null default 'candidate' -- candidate | promoted | rejected
    check (status in ('candidate','promoted','rejected')),
  unique (handle)
);
```

- [ ] **Step 2: Apply to prod (人間確認必須＝migration)**

> 本番 Supabase への migration は人間確認必須。ユーザー承認後に Supabase MCP `apply_migration`（project=hofvvcvhjslevymhbcqj）で適用。
Run（確認後）: MCP `apply_migration` に上記 SQL を渡す。
Expected: `materials_store_*_idx` と `candidate_sources` が作成される。

- [ ] **Step 3: Commit**

```bash
git add apps/x-account-system/migrations/0015_collector_fields.sql
git commit -m "feat(collector): migration 0015 選抜indexとcandidate_sources"
```

---

### Task 9: worker/queue/brownout/registry に collect を配線

**Files:**
- Modify: `apps/x-account-system/src/worker.ts`
- Modify: `apps/x-account-system/src/queue.ts`
- Modify: `apps/x-account-system/lib/safety/brownout-handler.ts`
- Modify: `apps/x-account-system/lib/registry/stages/index-stages.ts`

- [ ] **Step 1: worker.ts — JobMessage union に collect 追加**

`src/worker.ts` の JobMessage の2つ目のメンバー（job: "ideation" | "buzz-ingest" | ...）の union に `"collect"` を追加:

```typescript
      job:
        | "ideation"
        | "buzz-ingest"
        | "collect"
        | "daily-digest"
        | "optimizer-update"
        | "rollback-monitor"
        | "inspirations-ingest"
        | "rotation-notice";
```

- [ ] **Step 2: worker.ts — CRON_JOBS_BY_NAME と CRON_JOBS に追加**

`CRON_JOBS_BY_NAME` に:
```typescript
  collect: true,
```
`CRON_JOBS` に1スロット（収集は朝の前。05:30 JST=20:30 UTC 例）:
```typescript
  "30 20 * * *": "collect",          // 05:30 JST
```

- [ ] **Step 3: brownout-handler.ts — ALL_JOBS に追加**

`lib/safety/brownout-handler.ts` の ALL_JOBS 配列に `"collect",` を追加。

- [ ] **Step 4: queue.ts — case "collect" 追加**

`src/queue.ts` の switch に（buzz-ingest case の隣に）:

```typescript
case "collect": {
  const rid = runId ?? "";
  const { createClient } = await import("@supabase/supabase-js");
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: process.env.SUPABASE_SCHEMA || "xad" },
  });
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const { runCollect } = await import("../lib/ingest/collector.js");
  if (rid) {
    await withTrace(ctx, { runId: rid, stageId: "collect" }, async () => {
      let traceMeta: import("../lib/trace/types.js").TraceMeta | undefined;
      const inserted = await runCollect({
        anthropic: anthropic as never,
        sb: sb as never,
        twitterApiKey: env.TWITTERAPI_IO_KEY,
        fetchImpl: fetch,
        onTrace: (m) => {
          traceMeta = m;
        },
      });
      console.log(JSON.stringify({ level: "info", msg: "[collect] 完了", date: msg.date, inserted }));
      return { result: inserted, output: { inserted }, meta: traceMeta };
    });
  } else {
    await runCollect({
      anthropic: anthropic as never,
      sb: sb as never,
      twitterApiKey: env.TWITTERAPI_IO_KEY,
      fetchImpl: fetch,
    });
  }
  break;
}
```

> NOTE: `env.TWITTERAPI_IO_KEY` が Env interface（worker.ts）と wrangler secret に存在することを確認。buzz-ingest が使う既存 key 名に合わせる（無ければ Env に追加し `wrangler secret put`）。

- [ ] **Step 5: registry — collect stage 追加**

`lib/registry/stages/index-stages.ts` の buzz-ingest stage の隣に:

```typescript
{
  id: "collect", label: "Collector Agent", group: "ingest",
  purpose: "エージェントが探索的にネタを集め(固定/海外トレンド/キーワード/新ソース/スレ復元)、全件3軸スコア＋理由を付けて materials_store へ全保存。",
  objectiveFunction: "速報性×velocity×ターゲット適合の高いネタの網羅性を最大化（除外は人間UIに委ね、収集網羅性を最大化）",
  inputs: ["twitterapi.io (advanced_search/trends/users/followings/thread)"],
  outputs: ["xad.materials_store (x_inspirations, scores/discovery付き)"],
  keyVariables: [
    { name: "探索スコープ", desc: "固定watchlist＋海外トレンド＋キーワード＋新ソース発見" },
    { name: "scoring weights", desc: "freshness/velocity/target_fit (collector-config)" },
  ],
  logicKind: "llm", sourcePaths: ["apps/x-account-system/lib/ingest/collector.ts"],
  upstream: [], downstream: ["ideation"],
},
```

- [ ] **Step 6: typecheck＋registry build＋全テスト**

Run:
```bash
cd apps/x-account-system && npm run worker:typecheck && IN_MEMORY_FALLBACK=true npm test && npm run build:registry
```
Expected: 型エラー0、全テスト緑、registry 生成成功（collect stage が registry.generated.json に出る）。

- [ ] **Step 7: Commit**

```bash
git add apps/x-account-system/src/worker.ts apps/x-account-system/src/queue.ts apps/x-account-system/lib/safety/brownout-handler.ts apps/x-account-system/lib/registry/stages/index-stages.ts apps/x-account-system/lib/registry/registry.generated.json
git commit -m "feat(collector): collectジョブをworker/queue/brownout/registryに配線"
```

---

### Task 10: E2E 検証＋デプロイ＋PR

**Files:** なし（検証・デプロイ）

- [ ] **Step 1: 最終ローカル検証**

Run:
```bash
cd apps/x-account-system && npm run worker:typecheck && IN_MEMORY_FALLBACK=true npm test && npm run build:registry
```
Expected: 全緑。

- [ ] **Step 2: デプロイ（人間確認必須）**

> deploy は人間確認必須。承認後 `wrangler deploy`。secret（TWITTERAPI_IO_KEY/ANTHROPIC_API_KEY/SUPABASE_*）が投入済みか確認（`feedback_deploy_verify_all_secrets`）。

- [ ] **Step 3: 実 Worker で1回実行**

承認後:
```bash
curl -s "https://<worker-host>/admin/enqueue?job=collect&key=<OAUTH_ADMIN_SECRET>"
```
Expected: `{ ok: true, enqueued: {... job: "collect" ...} }`。

- [ ] **Step 4: trace と保存を SQL で確認**

Supabase MCP execute_sql（project=hofvvcvhjslevymhbcqj）:
```sql
select t.stage_id, t.status, t.tokens_in, t.tokens_out, t.cost_jpy, t.output_json
from xad.run r join xad.run_trace t on t.run_id = r.id
where r.job = 'collect' order by t.started_at desc limit 5;

select meta->>'tweet_id' id, source_ref, meta->'scores'->>'overall' overall,
       meta->>'selection_status' sel, meta->'discovery'->>'via' via,
       jsonb_array_length(coalesce(meta->'media','[]'::jsonb)) media_n
from xad.materials_store
where source_type='x_inspirations' and meta ? 'scores'
order by created_at desc limit 20;
```
Expected: collect run の trace（cost_jpy 非null）、materials に scores/discovery/media/selection_status=collected が入っている。dedup 冪等（再実行で重複insertなし）。

- [ ] **Step 5: push 前 verify＋PR**

```bash
cd /Users/rikukudo/Projects/all-good-ops-collector-agent
git log --oneline main..HEAD   # 並列混入チェック
git push -u origin task/260606-collector-agent
gh pr create --fill --base main
```

- [ ] **Step 6: finishing-a-development-branch**

`superpowers:finishing-a-development-branch` で merge / PR / discard を決定。完了後 `bash scripts/wt-done.sh`。

---

## Self-Review（plan 著者チェック）

- **Spec coverage**: 探索フル(Task1,5,7)/全保存スコア(Task4,6)/3軸(Task3,4)/ターゲット定義(Task3)/wrapper拡張media等(Task1)/materials拡張(Task6,8)/trace+cost_jpy(Task4,7,9)/改善レバー集約(Task2,3)/candidate_sources(Task8)/配線(Task9)/E2E(Task10) — 全項目にタスク対応あり。UI・4軸目・get_article は spec 通りスコープ外。
- **Placeholder scan**: watchlist 全件転記と twitterapi path の curl 確認は NOTE で明示（実値はコード内に存在、転記/確認のみ）。それ以外プレースホルダなし。
- **Type consistency**: `Candidate`/`ScoredCandidate`/`DiscoveryTag`(scoring.ts) → tools.ts/persist.ts/collector.ts で一貫。`ToolApi` は tools.ts 定義を scoring・collector で共有。`callClaudeTraced` 戻り `{text,toolUse,meta}` を scoring が使用（llm-trace.ts と一致）。`withTrace` 戻り `{result,output,meta}` を queue.ts が使用（with-trace.ts と一致）。
