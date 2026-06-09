# X performance_metrics 取込み（metrics-ingest）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** X API v2 の non_public_metrics で本人の直近ツイートを取得し、公開済み draft に照合して `posted_records` / `performance_metrics` を upsert する cron job `metrics-ingest` を作り、optimizer の reward に燃料を供給する。

**Architecture:** 純関数の照合（`match.ts`）＋ X API クライアント（`x-metrics-client.ts`）＋ オーケストレーション（`ingest.ts`、依存注入でテスト容易）の3モジュール。新 job を worker/queue/wrangler に配線。読み取り専用・fail-open。

**Tech Stack:** TypeScript / Cloudflare Workers / Supabase (`xad` schema) / jest（`IN_MEMORY_FALLBACK` パターン）/ X API v2。

仕様: `docs/superpowers/specs/2026-06-09-x-performance-metrics-ingest-design.md`

作業ディレクトリ: `apps/x-account-system`。テスト実行: `IN_MEMORY_FALLBACK=true npx jest <path>`。

---

### Task 1: 照合ロジック `match.ts`（純関数・TDD）

**Files:**
- Create: `apps/x-account-system/lib/metrics/match.ts`
- Test: `apps/x-account-system/lib/metrics/match.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

```typescript
// lib/metrics/match.test.ts
import { normalizeForMatch, matchTweetToDraft, type DraftRow } from "./match.ts";

describe("normalizeForMatch", () => {
  test("trims, collapses whitespace, strips trailing t.co URL", () => {
    expect(normalizeForMatch("  AI で  経理を自動化\n\n詳細→ https://t.co/abc123 ")).toBe(
      "ai で 経理を自動化 詳細→",
    );
  });
  test("returns empty for null-ish", () => {
    expect(normalizeForMatch("")).toBe("");
  });
});

describe("matchTweetToDraft", () => {
  const drafts: DraftRow[] = [
    { id: "d1", body: "AIで経理を自動化する話", publishedAt: "2026-06-05T11:00:00Z" },
    { id: "d2", body: "全く別の投稿", publishedAt: "2026-06-01T00:00:00Z" },
  ];
  test("normalized equality within time window → match", () => {
    const t = { id: "t1", text: "AIで経理を自動化する話", createdAt: "2026-06-05T11:02:00Z" };
    expect(matchTweetToDraft(t, drafts)?.id).toBe("d1");
  });
  test("tweet text is prefix of draft body (URL appended) → match", () => {
    const t = { id: "t1", text: "AIで経理を自動化する話 https://t.co/x", createdAt: "2026-06-05T11:02:00Z" };
    expect(matchTweetToDraft(t, drafts)?.id).toBe("d1");
  });
  test("outside time window → null", () => {
    const t = { id: "t1", text: "AIで経理を自動化する話", createdAt: "2026-06-08T11:00:00Z" };
    expect(matchTweetToDraft(t, drafts)).toBeNull();
  });
  test("ambiguous (2 drafts same normalized body) → null", () => {
    const dup: DraftRow[] = [
      { id: "a", body: "同じ本文", publishedAt: "2026-06-05T11:00:00Z" },
      { id: "b", body: "同じ本文", publishedAt: "2026-06-05T11:30:00Z" },
    ];
    const t = { id: "t1", text: "同じ本文", createdAt: "2026-06-05T11:02:00Z" };
    expect(matchTweetToDraft(t, dup)).toBeNull();
  });
  test("no match → null", () => {
    const t = { id: "t1", text: "存在しない本文", createdAt: "2026-06-05T11:02:00Z" };
    expect(matchTweetToDraft(t, drafts)).toBeNull();
  });
});
```

- [ ] **Step 2: 失敗を確認** — `IN_MEMORY_FALLBACK=true npx jest lib/metrics/match.test.ts` → FAIL（モジュール無し）

- [ ] **Step 3: 最小実装**

```typescript
// lib/metrics/match.ts
export type DraftRow = { id: string; body: string; publishedAt: string | null };
export type TweetLite = { id: string; text: string; createdAt: string };

/** 照合用に本文を正規化: lowercase(latin) / 連続空白→単一空白 / 末尾 t.co・http(s) URL 除去 / trim */
export function normalizeForMatch(text: string): string {
  if (!text) return "";
  return text
    .replace(/https?:\/\/\S+/g, "") // URL 除去（t.co 含む）
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * tweet を published draft 群に照合。正規化一致 or 一方が他方の prefix、
 * かつ公開時刻が ±windowMs 以内。該当が一意のときのみ返す（曖昧/不一致は null）。
 */
export function matchTweetToDraft(
  tweet: TweetLite,
  drafts: DraftRow[],
  windowMs = 24 * 3600 * 1000,
): DraftRow | null {
  const nt = normalizeForMatch(tweet.text);
  if (!nt) return null;
  const tMs = Date.parse(tweet.createdAt);
  const hits = drafts.filter((d) => {
    if (!d.publishedAt) return false;
    const nb = normalizeForMatch(d.body);
    if (!nb) return false;
    const textOk = nb === nt || nb.startsWith(nt) || nt.startsWith(nb);
    if (!textOk) return false;
    const dMs = Date.parse(d.publishedAt);
    return Number.isFinite(dMs) && Math.abs(dMs - tMs) <= windowMs;
  });
  return hits.length === 1 ? hits[0] : null;
}
```

- [ ] **Step 4: 緑を確認** — `IN_MEMORY_FALLBACK=true npx jest lib/metrics/match.test.ts` → PASS

- [ ] **Step 5: コミット**

```bash
git add apps/x-account-system/lib/metrics/match.ts apps/x-account-system/lib/metrics/match.test.ts
git commit -m "feat(xad/metrics): tweet↔draft 照合ロジック(match.ts)"
```

---

### Task 2: X API レスポンス整形 `x-metrics-client.ts`（TDD）

**Files:**
- Create: `apps/x-account-system/lib/metrics/x-metrics-client.ts`
- Test: `apps/x-account-system/lib/metrics/x-metrics-client.test.ts`

参照: `lib/oauth/pkce-test.ts:215-217`（`https://api.x.com/2/tweets/:id?tweet.fields=non_public_metrics,public_metrics`）。

- [ ] **Step 1: 失敗するテストを書く**

```typescript
// lib/metrics/x-metrics-client.test.ts
import { parseTweetMetrics, fetchRecentTweetsWithMetrics } from "./x-metrics-client.ts";

describe("parseTweetMetrics", () => {
  test("maps non_public + public metrics with null safety", () => {
    const apiTweet = {
      id: "111", text: "本文", created_at: "2026-06-05T11:00:00.000Z",
      public_metrics: { like_count: 10, retweet_count: 2, reply_count: 1, quote_count: 0, bookmark_count: 3 },
      non_public_metrics: { impression_count: 1000, url_link_clicks: 7, user_profile_clicks: 30 },
    };
    expect(parseTweetMetrics(apiTweet)).toEqual({
      tweetId: "111", text: "本文", createdAt: "2026-06-05T11:00:00.000Z",
      impressions: 1000, userProfileClicks: 30, urlLinkClicks: 7,
      likeCount: 10, retweetCount: 2, replyCount: 1, quoteCount: 0, bookmarkCount: 3,
    });
  });
  test("non_public_metrics 欠落(30日超)→ impressions/profile/url は null", () => {
    const apiTweet = {
      id: "222", text: "古い", created_at: "2026-01-01T00:00:00.000Z",
      public_metrics: { like_count: 5, retweet_count: 0, reply_count: 0, quote_count: 0, bookmark_count: 0 },
    };
    const m = parseTweetMetrics(apiTweet);
    expect(m.impressions).toBeNull();
    expect(m.userProfileClicks).toBeNull();
    expect(m.urlLinkClicks).toBeNull();
    expect(m.likeCount).toBe(5);
  });
});

describe("fetchRecentTweetsWithMetrics", () => {
  test("calls timeline endpoint with bearer + fields, returns parsed", async () => {
    const calls: string[] = [];
    const fakeFetch = async (url: string, init: any) => {
      calls.push(url);
      expect(init.headers.Authorization).toBe("Bearer TOKEN");
      return {
        ok: true,
        json: async () => ({
          data: [{ id: "111", text: "本文", created_at: "2026-06-05T11:00:00.000Z",
            public_metrics: { like_count: 1, retweet_count: 0, reply_count: 0, quote_count: 0, bookmark_count: 0 },
            non_public_metrics: { impression_count: 500, url_link_clicks: 2, user_profile_clicks: 9 } }],
        }),
      } as any;
    };
    const out = await fetchRecentTweetsWithMetrics("TOKEN", "userX", fakeFetch as any);
    expect(out).toHaveLength(1);
    expect(out[0].tweetId).toBe("111");
    expect(calls[0]).toContain("/2/users/userX/tweets");
    expect(calls[0]).toContain("non_public_metrics");
  });
});
```

- [ ] **Step 2: 失敗を確認** — `IN_MEMORY_FALLBACK=true npx jest lib/metrics/x-metrics-client.test.ts` → FAIL

- [ ] **Step 3: 最小実装**

```typescript
// lib/metrics/x-metrics-client.ts
export type TweetMetrics = {
  tweetId: string;
  text: string;
  createdAt: string;
  impressions: number | null;
  userProfileClicks: number | null;
  urlLinkClicks: number | null;
  likeCount: number | null;
  retweetCount: number | null;
  replyCount: number | null;
  quoteCount: number | null;
  bookmarkCount: number | null;
};

type FetchImpl = typeof fetch;
const numOrNull = (v: unknown): number | null => (typeof v === "number" ? v : null);

export function parseTweetMetrics(apiTweet: any): TweetMetrics {
  const pub = apiTweet?.public_metrics ?? {};
  const np = apiTweet?.non_public_metrics ?? {};
  return {
    tweetId: String(apiTweet?.id ?? ""),
    text: String(apiTweet?.text ?? ""),
    createdAt: String(apiTweet?.created_at ?? ""),
    impressions: numOrNull(np.impression_count ?? pub.impression_count),
    userProfileClicks: numOrNull(np.user_profile_clicks),
    urlLinkClicks: numOrNull(np.url_link_clicks),
    likeCount: numOrNull(pub.like_count),
    retweetCount: numOrNull(pub.retweet_count),
    replyCount: numOrNull(pub.reply_count),
    quoteCount: numOrNull(pub.quote_count),
    bookmarkCount: numOrNull(pub.bookmark_count),
  };
}

/** GET /2/users/me → user id */
export async function getMyUserId(
  accessToken: string,
  fetchImpl: FetchImpl = fetch,
): Promise<string> {
  const res = await fetchImpl("https://api.x.com/2/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`getMyUserId failed: ${res.status}`);
  const json: any = await res.json();
  const id = json?.data?.id;
  if (!id) throw new Error("getMyUserId: no id");
  return String(id);
}

/** GET /2/users/:id/tweets?max_results=100&tweet.fields=public_metrics,non_public_metrics,created_at */
export async function fetchRecentTweetsWithMetrics(
  accessToken: string,
  userId: string,
  fetchImpl: FetchImpl = fetch,
): Promise<TweetMetrics[]> {
  const url = new URL(`https://api.x.com/2/users/${userId}/tweets`);
  url.searchParams.set("max_results", "100");
  url.searchParams.set("tweet.fields", "public_metrics,non_public_metrics,created_at");
  const res = await fetchImpl(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`fetchRecentTweets failed: ${res.status}`);
  const json: any = await res.json();
  const data: any[] = Array.isArray(json?.data) ? json.data : [];
  return data.map(parseTweetMetrics);
}
```

- [ ] **Step 4: 緑を確認** — `IN_MEMORY_FALLBACK=true npx jest lib/metrics/x-metrics-client.test.ts` → PASS

- [ ] **Step 5: コミット**

```bash
git add apps/x-account-system/lib/metrics/x-metrics-client.ts apps/x-account-system/lib/metrics/x-metrics-client.test.ts
git commit -m "feat(xad/metrics): X API v2 metrics クライアント(整形+取得)"
```

---

### Task 3: オーケストレーション `ingest.ts`（依存注入・TDD）

**Files:**
- Create: `apps/x-account-system/lib/metrics/ingest.ts`
- Test: `apps/x-account-system/lib/metrics/ingest.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

```typescript
// lib/metrics/ingest.test.ts
import { runMetricsIngest, computePcr, type MetricsIngestDeps } from "./ingest.ts";
import type { TweetMetrics } from "./x-metrics-client.ts";
import type { DraftRow } from "./match.ts";

const tweet = (over: Partial<TweetMetrics> = {}): TweetMetrics => ({
  tweetId: "t1", text: "本文A", createdAt: "2026-06-05T11:02:00Z",
  impressions: 1000, userProfileClicks: 30, urlLinkClicks: 7,
  likeCount: 1, retweetCount: 0, replyCount: 0, quoteCount: 0, bookmarkCount: 0, ...over,
});

describe("computePcr", () => {
  test("profile/impressions", () => expect(computePcr(30, 1000)).toBeCloseTo(0.03));
  test("impressions 0 → null", () => expect(computePcr(5, 0)).toBeNull());
  test("null impressions → null", () => expect(computePcr(5, null)).toBeNull());
});

describe("runMetricsIngest", () => {
  function makeDeps(over: Partial<MetricsIngestDeps> = {}): { deps: MetricsIngestDeps; upserts: any[] } {
    const upserts: any[] = [];
    const drafts: DraftRow[] = [{ id: "d1", body: "本文A", publishedAt: "2026-06-05T11:00:00Z" }];
    const deps: MetricsIngestDeps = {
      getAccessToken: async () => "TOKEN",
      fetchTweets: async () => [tweet()],
      loadPublishedDrafts: async () => drafts,
      upsertPostedRecord: async (draftId, tweetId, postedAt) => {
        upserts.push({ kind: "posted", draftId, tweetId, postedAt });
        return "pr1";
      },
      upsertMetrics: async (postedRecordId, m, pcr) => {
        upserts.push({ kind: "metrics", postedRecordId, impressions: m.impressions, pcr });
      },
      recordCost: async () => {},
      ...over,
    };
    return { deps, upserts };
  }

  test("matched tweet → posted_records + performance_metrics upsert", async () => {
    const { deps, upserts } = makeDeps();
    const r = await runMetricsIngest(deps);
    expect(r).toMatchObject({ tweetsFetched: 1, matched: 1, skipped: 0, upserted: 1 });
    expect(upserts.find((u) => u.kind === "posted")).toMatchObject({ draftId: "d1", tweetId: "t1" });
    expect(upserts.find((u) => u.kind === "metrics")).toMatchObject({ postedRecordId: "pr1", pcr: 0.03 });
  });

  test("unmatched tweet → skipped, no upsert", async () => {
    const { deps, upserts } = makeDeps({ fetchTweets: async () => [tweet({ text: "無関係" })] });
    const r = await runMetricsIngest(deps);
    expect(r).toMatchObject({ matched: 0, skipped: 1, upserted: 0 });
    expect(upserts).toHaveLength(0);
  });

  test("no token → empty result, fail-open", async () => {
    const { deps } = makeDeps({ getAccessToken: async () => null });
    const r = await runMetricsIngest(deps);
    expect(r).toMatchObject({ tweetsFetched: 0, matched: 0, upserted: 0 });
  });
});
```

- [ ] **Step 2: 失敗を確認** — `IN_MEMORY_FALLBACK=true npx jest lib/metrics/ingest.test.ts` → FAIL

- [ ] **Step 3: 最小実装**（デフォルト依存は Task 5 で実体配線。ここでは DI のみで緑にする）

```typescript
// lib/metrics/ingest.ts
import { matchTweetToDraft, type DraftRow } from "./match.ts";
import type { TweetMetrics } from "./x-metrics-client.ts";

export function computePcr(profileClicks: number | null, impressions: number | null): number | null {
  if (!impressions || impressions <= 0 || profileClicks == null) return null;
  return profileClicks / impressions;
}

export type MetricsIngestDeps = {
  getAccessToken: () => Promise<string | null>;
  fetchTweets: (accessToken: string) => Promise<TweetMetrics[]>;
  loadPublishedDrafts: () => Promise<DraftRow[]>;
  upsertPostedRecord: (draftId: string, tweetId: string, postedAt: string) => Promise<string>;
  upsertMetrics: (postedRecordId: string, m: TweetMetrics, pcr: number | null) => Promise<void>;
  recordCost: (reqCount: number) => Promise<void>;
};

export type MetricsIngestResult = {
  tweetsFetched: number;
  matched: number;
  skipped: number;
  upserted: number;
};

export async function runMetricsIngest(deps: MetricsIngestDeps): Promise<MetricsIngestResult> {
  const token = await deps.getAccessToken();
  if (!token) return { tweetsFetched: 0, matched: 0, skipped: 0, upserted: 0 };

  const [tweets, drafts] = await Promise.all([
    deps.fetchTweets(token),
    deps.loadPublishedDrafts(),
  ]);
  // getMyUserId + timeline = 2 req（コスト記録用の概算）
  await deps.recordCost(2);

  let matched = 0;
  let skipped = 0;
  let upserted = 0;
  for (const t of tweets) {
    const draft = matchTweetToDraft({ id: t.tweetId, text: t.text, createdAt: t.createdAt }, drafts);
    if (!draft) {
      skipped++;
      continue;
    }
    matched++;
    try {
      const postedRecordId = await deps.upsertPostedRecord(draft.id, t.tweetId, t.createdAt);
      const pcr = computePcr(t.userProfileClicks, t.impressions);
      await deps.upsertMetrics(postedRecordId, t, pcr);
      upserted++;
    } catch (e) {
      // fail-open: 当該 tweet のみ skip
      console.warn(JSON.stringify({ level: "warn", msg: "[metrics-ingest] upsert failed", tweetId: t.tweetId, error: String(e) }));
    }
  }
  return { tweetsFetched: tweets.length, matched, skipped, upserted };
}
```

- [ ] **Step 4: 緑を確認** — `IN_MEMORY_FALLBACK=true npx jest lib/metrics/ingest.test.ts` → PASS

- [ ] **Step 5: コミット**

```bash
git add apps/x-account-system/lib/metrics/ingest.ts apps/x-account-system/lib/metrics/ingest.test.ts
git commit -m "feat(xad/metrics): ingest オーケストレーション(DI・computePcr)"
```

---

### Task 4: migration `0022_metrics_ingest.sql`（upsert 用一意制約）

**Files:**
- Create: `apps/x-account-system/migrations/0022_metrics_ingest.sql`

- [ ] **Step 1: 既存重複の事前確認（DDL 前 inspect）**

Run（本番 schema に対し read-only。`feedback_db_migration_pre_inspect`）:
```bash
cd apps/x-account-system && IN_MEMORY_FALLBACK= DOTENV_CONFIG_PATH=/Users/rikukudo/Projects/private-agents/all-good-ops/apps/x-account-system/.env.local \
  npx tsx -r dotenv/config -e "import('@supabase/supabase-js').then(async ({createClient})=>{const sb=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{db:{schema:'xad'}});const {data}=await sb.from('posted_records').select('platform,platform_post_id');console.log(JSON.stringify(data));process.exit(0)})"
```
Expected: `platform_post_id` の `(platform, non-null platform_post_id)` に重複が無いこと。重複があれば手当て（古い seed を NULL 化 or 一意化）してから次へ。

- [ ] **Step 2: migration を書く**

```sql
-- 0022_metrics_ingest.sql
-- metrics-ingest の冪等 upsert 用一意制約。
-- posted_records: 同一プラットフォームの同一 tweet は 1 行（platform_post_id NULL は対象外）。
create unique index if not exists uq_posted_records_platform_post
  on xad.posted_records (platform, platform_post_id)
  where platform_post_id is not null;

-- performance_metrics: MVP は最新スナップショット 1 行/post（reward-extractor が [0] を読む前提と整合）。
create unique index if not exists uq_perf_metrics_posted_record
  on xad.performance_metrics (posted_record_id);
```

- [ ] **Step 3: 適用は人間ゲート**

migration の本番適用（Supabase apply_migration / MCP 書込）は**人間確認必須**。本タスクはファイル作成までで、適用は Task 6 の検証直前に人間承認のうえ実施する。

- [ ] **Step 4: コミット**

```bash
git add apps/x-account-system/migrations/0022_metrics_ingest.sql
git commit -m "feat(xad/metrics): 0022 metrics-ingest upsert 一意制約"
```

---

### Task 5: 既定依存の実体配線 + job 登録

**Files:**
- Modify: `apps/x-account-system/lib/metrics/ingest.ts`（`defaultDeps` 追加・`runMetricsIngest` を引数省略可に）
- Modify: `apps/x-account-system/src/worker.ts:74-86`（JobMessage union）, `:95-101`（CRON_JOBS）, `:104-112`（CRON_JOBS_BY_NAME）
- Modify: `apps/x-account-system/src/queue.ts:255`付近（case 追加）
- Modify: `apps/x-account-system/wrangler.toml`（crons）

- [ ] **Step 1: `ingest.ts` に既定依存を追加（テスト維持）**

`runMetricsIngest(deps)` を `runMetricsIngest(deps: MetricsIngestDeps = defaultDeps())` に変更し、以下を追記。既存テストは明示 deps を渡すので緑のまま。

```typescript
// lib/metrics/ingest.ts に追記
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getXAccessToken } from "../publisher/token-store.ts";
import { recordCostLedger } from "../cost/cost-ledger.ts";
import { getMyUserId, fetchRecentTweetsWithMetrics } from "./x-metrics-client.ts";

const X_API_COST_JPY_PER_REQ = 0.5;

function ingestSupabase(): SupabaseClient | null {
  if (process.env.IN_MEMORY_FALLBACK === "true") return null;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: (process.env.SUPABASE_SCHEMA || "public") as "public" },
  });
}

export function defaultDeps(): MetricsIngestDeps {
  const sb = ingestSupabase();
  return {
    getAccessToken: async () => (await getXAccessToken())?.accessToken ?? null,
    fetchTweets: async (token) => {
      const uid = await getMyUserId(token);
      return await fetchRecentTweetsWithMetrics(token, uid);
    },
    loadPublishedDrafts: async () => {
      if (!sb) return [];
      const { data } = await sb
        .from("post_drafts")
        .select("id, body, published_at")
        .eq("platform", "x")
        .not("published_at", "is", null)
        .gte("published_at", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString());
      return (data ?? []).map((d: any) => ({ id: d.id, body: d.body, publishedAt: d.published_at }));
    },
    upsertPostedRecord: async (draftId, tweetId, postedAt) => {
      if (!sb) return "memory";
      const { data, error } = await sb
        .from("posted_records")
        .upsert(
          { draft_id: draftId, platform: "x", platform_post_id: tweetId, posted_at: postedAt },
          { onConflict: "platform,platform_post_id" },
        )
        .select("id")
        .single();
      if (error) throw new Error(`upsertPostedRecord: ${error.message}`);
      return (data as any).id as string;
    },
    upsertMetrics: async (postedRecordId, m, pcr) => {
      if (!sb) return;
      const { error } = await sb.from("performance_metrics").upsert(
        {
          posted_record_id: postedRecordId,
          measured_at: new Date().toISOString(),
          impressions: m.impressions,
          user_profile_clicks: m.userProfileClicks,
          url_link_clicks: m.urlLinkClicks,
          pcr,
          like_count: m.likeCount,
          retweet_count: m.retweetCount,
          reply_count: m.replyCount,
          quote_count: m.quoteCount,
          bookmark_count: m.bookmarkCount,
        },
        { onConflict: "posted_record_id" },
      );
      if (error) throw new Error(`upsertMetrics: ${error.message}`);
    },
    recordCost: async (reqCount) => {
      if (!sb) return;
      await recordCostLedger(sb as never, {
        category: "x_api_metrics",
        costJpy: X_API_COST_JPY_PER_REQ * reqCount,
        unitCount: reqCount,
        meta: { source: "metrics-ingest" },
      });
    },
  };
}
```

そして関数シグネチャを変更:
```typescript
export async function runMetricsIngest(deps: MetricsIngestDeps = defaultDeps()): Promise<MetricsIngestResult> {
```

- [ ] **Step 2: 既存テストが緑のままを確認** — `IN_MEMORY_FALLBACK=true npx jest lib/metrics` → PASS（全 metrics テスト）

- [ ] **Step 3: worker.ts に job 登録**

`src/worker.ts:74-81` の union に `"metrics-ingest"` を追加:
```typescript
        | "rotation-notice"
        | "metrics-ingest"
        | "compose"
```
`src/worker.ts:95-101` の CRON_JOBS に追加:
```typescript
  "0 15 1 * *": "rotation-notice",   // 月初 rotation 通知
  "0 11 * * *": "metrics-ingest",    // 20:00 JST（digest/optimizer の前）
```
`src/worker.ts:104-112` の CRON_JOBS_BY_NAME に追加:
```typescript
  "rotation-notice": true,
  "metrics-ingest": true,
```

- [ ] **Step 4: queue.ts に case 追加**（`src/queue.ts:271` の daily-digest case の後）

```typescript
    // ----------------------------------------------------------------
    // metrics-ingest: X API v2 で engagement を取込み performance_metrics へ
    // ----------------------------------------------------------------
    case "metrics-ingest": {
      const { runMetricsIngest } = await import("../lib/metrics/ingest.js");
      const result = await runMetricsIngest();
      console.log(
        JSON.stringify({
          level: "info",
          msg: "[metrics-ingest] engagement 取込み 完了",
          date: msg.date,
          tweetsFetched: result.tweetsFetched,
          matched: result.matched,
          skipped: result.skipped,
          upserted: result.upserted,
        }),
      );
      break;
    }
```

- [ ] **Step 5: brownout allowedJobs に追加**（読み取り＝reduced 状態でも許可）

`lib/safety/brownout-handler.ts` の allowedJobs に `metrics-ingest` を daily-digest と同列で追加（`stop_posting` / `cron_halt` の許可リストに `"metrics-ingest"` を含める）。該当配列を grep して daily-digest が出る箇所すべてに併記。

- [ ] **Step 6: wrangler.toml に cron 追加**

`[triggers]` の crons 配列に `"0 11 * * *"` を追加（既存 5 本の隣）。

- [ ] **Step 7: 型・ビルド確認** — `IN_MEMORY_FALLBACK=true npx jest lib/metrics` → PASS、かつ `npx tsc --noEmit` で metrics 関連の新規型エラーが無いこと（既存の `.ts` 拡張子 TS5097 は全リポ既存事項で無視）。

- [ ] **Step 8: コミット**

```bash
git add apps/x-account-system/lib/metrics/ingest.ts apps/x-account-system/src/worker.ts apps/x-account-system/src/queue.ts apps/x-account-system/wrangler.toml apps/x-account-system/lib/safety/brownout-handler.ts
git commit -m "feat(xad/metrics): metrics-ingest job 配線(worker/queue/cron/brownout)+既定依存"
```

---

### Task 6: 本番実証（prod-lib-diag）＋ optimizer 燃料確認

**前提:** Task 4 の migration を**人間承認のうえ**本番適用済みであること。

- [ ] **Step 1: ローカルから本番取込みを実行**（`prod-lib-diag`。書込み発生＝事前に人間確認）

一時スクリプト `scripts/_diag_metrics.ts`（実行後削除）:
```typescript
import { runMetricsIngest } from "../lib/metrics/ingest.ts";
runMetricsIngest().then((r) => { console.log(JSON.stringify(r, null, 2)); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });
```
Run:
```bash
cd apps/x-account-system && IN_MEMORY_FALLBACK= DOTENV_CONFIG_PATH=/Users/rikukudo/Projects/private-agents/all-good-ops/apps/x-account-system/.env.local \
  npx tsx -r dotenv/config scripts/_diag_metrics.ts
```
Expected: `tweetsFetched > 0`、`matched ≥ 1`、`upserted ≥ 1`。

- [ ] **Step 2: optimizer が燃料を得たことを確認**

`extractSuccessSignals` を本番で実行（Stage 2A の diag と同型）し、`count > 0`・timeBand/hook/fmat が実値分布することを確認。

- [ ] **Step 3: 一時スクリプト削除 + 最終確認**

```bash
rm -f apps/x-account-system/scripts/_diag_metrics.ts
```
`git status` に一時ファイルが残らないこと。

- [ ] **Step 4: PR**（squash・auto-merge。`feedback_pr_auto_merge_default`）

```bash
git push -u origin task/260609-xad-metrics-ingest
gh pr create --title "feat(xad/metrics): performance_metrics 取込み(metrics-ingest)" --body "...spec/検証結果..."
gh pr merge --squash --auto
```

---

## Self-Review メモ

- **Spec coverage**: データソース(Task2/5) / 照合backfill(Task1/3) / upsert冪等(Task4/5) / cron配線(Task5) / cost記録(Task5) / fail-open(Task3) / テスト(Task1-3) / 本番実証(Task6) — 全網羅。business_outcomes・時系列は spec 通りスコープ外。
- **型整合**: `TweetMetrics`(x-metrics-client) / `DraftRow`(match) / `MetricsIngestDeps`(ingest) を各 Task で一貫使用。`upsertMetrics(postedRecordId, m, pcr)` の3引数はテスト・実装・default で一致。
- **人間ゲート**: migration 本番適用(Task4-3 / Task6前提) と 本番書込み実行(Task6-1) は人間確認必須。
