# 人間キュレーションUI（ステージ2）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 収集Agが貯めた素材を Xライクに閲覧・ソート・フィルタ・選抜し、執筆Ag へ渡す人間キュレーションUIを既存 xad-dashboard に追加し、全意思決定を追記型ログ `curation_events` に残す。

**Architecture:** `apps/xad-dashboard`（Next.js 16）に `/curation` ルート追加。一覧はフラット化ビュー `xad.curation_materials` を service role で読み、選抜操作は POST route → RPC `set_selection_status`（jsonb_set 原子更新）＋ `curation_events` 追記 →（送信時のみ）Worker `/admin/enqueue?job=compose` を叩く。compose は配管 stub（実writer は次ステージ）。

**Tech Stack:** Next.js 16 / React 19 / Tailwind v4 / @supabase/supabase-js（dashboard）、Cloudflare Workers + Queues / ts-jest（worker）、Supabase Postgres（xad schema, ref=hofvvcvhjslevymhbcqj）、vitest（dashboard 純ロジックの新規テスト基盤）。

**作業ディレクトリ:** worktree `/Users/rikukudo/Projects/all-good-ops-curation-ui`（branch `task/260606-curation-ui`）。`apps/x-account-system`（worker）と `apps/xad-dashboard`（UI）の2パッケージに跨る。コマンドは各パッケージ dir で実行。

---

## File Structure

**migration（worker パッケージ）**
- `apps/x-account-system/migrations/0016_curation.sql` — ① `xad.curation_events` table + index ② `xad.set_selection_status(uuid[], text)` RPC ③ `xad.curation_materials` フラット化ビュー

**worker（`apps/x-account-system`）**
- `src/worker.ts`（modify）— JobMessage union に `"compose"`、`CRON_JOBS_BY_NAME` に `compose`
- `src/queue.ts`（modify）— `case "compose"` stub
- `lib/curation/compose-stub.ts`（create）— stub 本体（`queued` 素材読み込み）＋ unit test
- `lib/registry/stages/index-stages.ts`（modify）— `compose` ノード追加
- `lib/ingest/collector-persist.ts`（modify）— meta に `engagement` 追加
- `lib/ingest/collector-persist.test.ts`（modify）— engagement アサート追加

**dashboard（`apps/xad-dashboard`）**
- `lib/curation-logic.ts`（create）— 純ロジック（action→status、event row 構築、sort/filter）＋ vitest test
- `lib/curation-queries.ts`（create）— Supabase ラッパ（view 読み / count / RPC / events insert / enqueue）
- `app/api/curation/select/route.ts`（create）— POST オーケストレーション
- `app/curation/MaterialCard.tsx`（create）— Xライクカード
- `app/curation/CurationClient.tsx`（create）— client UI（タブ/ソート/フィルタ/検索/選択/アクションバー）
- `app/curation/page.tsx`（create）— server data fetch
- `app/layout.tsx`（modify）— nav に Curation
- `.env.example`（modify）— `WORKER_BASE_URL` / `OAUTH_ADMIN_SECRET`
- `vitest.config.ts` / `package.json`（modify）— vitest 基盤

**分析SQL**
- `apps/x-account-system/docs/curation-analysis.sql`（create）— L1/L3/L5/funnel の再利用 SQL

---

## Task 1: migration 0016（events table + RPC + view）

**Files:**
- Create: `apps/x-account-system/migrations/0016_curation.sql`

DB スキーマ層。jest 対象外（SQL は適用＋アサートで検証）。

- [ ] **Step 1: migration ファイルを書く**

`apps/x-account-system/migrations/0016_curation.sql`:

```sql
-- 0016_curation.sql — 人間キュレーションUI(ステージ2): 意思決定ログ・状態更新RPC・閲覧ビュー

-- ① 追記型 意思決定ログ（run_trace 相乗りでなく専用＝material単位・snapshot付き・分析容易）
create table if not exists xad.curation_events (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  material_id uuid not null references xad.materials_store(id),
  action text not null check (action in ('select','reject','reset','send_to_compose')),
  from_status text,
  to_status text not null,
  scores jsonb,            -- 決定時点の {freshness,velocity,target_fit,overall} コピー（drift 防止）
  discovery jsonb,         -- {via, query} コピー
  source_ref text,         -- author handle
  note text,               -- 任意: 人間メモ（スコア違和感等。L5 シグナル）
  compose_run_id uuid,     -- send_to_compose 時の enqueue runId（収集→選抜→執筆の貫通）
  actor text not null default 'ofmeton'
);
create index if not exists curation_events_material_idx on xad.curation_events(material_id);
create index if not exists curation_events_action_created_idx on xad.curation_events(action, created_at);
create index if not exists curation_events_via_idx on xad.curation_events((discovery->>'via'));

-- ② 選抜状態の原子的バッチ更新（meta jsonb 内 selection_status を jsonb_set。他 meta キーは保持）
create or replace function xad.set_selection_status(p_ids uuid[], p_status text)
returns integer language plpgsql as $$
declare n integer;
begin
  if p_status not in ('collected','selected','queued','rejected') then
    raise exception 'invalid selection_status: %', p_status;
  end if;
  update xad.materials_store
     set meta = jsonb_set(meta, '{selection_status}', to_jsonb(p_status)),
         updated_at = now()
   where id = any(p_ids)
     and source_type = 'x_inspirations';
  get diagnostics n = row_count;
  return n;
end $$;

-- ③ フラット化ビュー（jsonb の overall を numeric 列化 → サーバ側ソート/フィルタが正しく簡潔に）
create or replace view xad.curation_materials as
select
  m.id,
  m.source_ref,
  m.raw_text,
  m.created_at,
  (m.meta->>'collected_at')                       as collected_at,
  (m.meta->>'selection_status')                   as selection_status,
  (m.meta->'scores'->>'overall')::numeric         as overall_score,
  (m.meta->'scores'->>'freshness')::numeric       as freshness,
  (m.meta->'scores'->>'velocity')::numeric        as velocity,
  (m.meta->'scores'->>'target_fit')::numeric      as target_fit,
  (m.meta->>'score_reason')                        as score_reason,
  (m.meta->'discovery'->>'via')                    as discovery_via,
  (m.meta->'discovery'->>'query')                  as discovery_query,
  (m.meta->>'lang')                                as lang,
  (m.meta->>'tweet_url')                           as tweet_url,
  (m.meta->>'conversation_id')                     as conversation_id,
  (m.meta->'media')                                as media,
  (m.meta->'engagement')                           as engagement
from xad.materials_store m
where m.source_type = 'x_inspirations';
```

- [ ] **Step 2: ローカル Supabase（or 本番別schemaは不可）へ適用して検証**

ローカル Supabase がある場合:
```bash
cd /Users/rikukudo/Projects/all-good-ops-curation-ui/apps/x-account-system
psql "$LOCAL_SUPABASE_URL" -f migrations/0016_curation.sql
```
本番適用は Task 11（人間確認ゲート）。ローカルが無ければ Step 3 の SQL アサートを本番適用後に回す。

- [ ] **Step 3: RPC とビューのアサート（適用先で実行）**

```sql
-- 不正 status は reject される
select xad.set_selection_status(array[]::uuid[], 'bogus'); -- → ERROR: invalid selection_status: bogus
-- ビューが行を返す（収集済みなら >0）
select count(*) from xad.curation_materials;
-- jsonb_set が他キーを壊さない: 任意1件を selected→確認→collected に戻す
select id, selection_status from xad.curation_materials limit 1;
```
Expected: 不正 status は ERROR、ビュー count は収集済み件数、status 往復で他 meta（scores/discovery）が保持される。

- [ ] **Step 4: Commit**

```bash
cd /Users/rikukudo/Projects/all-good-ops-curation-ui
git add apps/x-account-system/migrations/0016_curation.sql
git commit -m "feat(curation): migration 0016 — curation_events/set_selection_status/curation_materials view"
```

---

## Task 2: collector engagement meta（エンゲージソートのデータ手当て）

**Files:**
- Modify: `apps/x-account-system/lib/ingest/collector-persist.ts`（`buildMaterialRow` の meta）
- Test: `apps/x-account-system/lib/ingest/collector-persist.test.ts`

Tweet 型は既に likeCount 等を持つ（`lib/ingest/twitterapi-client.ts:24-29`、mapTweet で取得済み）。meta に集約するだけ。

- [ ] **Step 1: 失敗するテストを追加**

`collector-persist.test.ts` の `scored()` ヘルパの tweet に engagement 数値を追加し、`buildMaterialRow maps all fields` テストにアサート追加:

```ts
// scored() の tweet オブジェクトに追加:
//   likeCount: 10, retweetCount: 2, replyCount: 1, quoteCount: 3, bookmarkCount: 4, viewCount: 100,
// テスト末尾にアサート追加:
    expect(row.meta.engagement).toEqual({
      like: 10, retweet: 2, reply: 1, quote: 3, bookmark: 4, view: 100,
    });
```

- [ ] **Step 2: テスト失敗を確認**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true jest lib/ingest/collector-persist.test.ts`
Expected: FAIL（`row.meta.engagement` が undefined）

- [ ] **Step 3: 実装（buildMaterialRow の meta に engagement 追加）**

`collector-persist.ts` の `meta: { ... }` 内、`cost_jpy` の隣に追加:

```ts
      engagement: {
        like: c.tweet.likeCount ?? 0,
        retweet: c.tweet.retweetCount ?? 0,
        reply: c.tweet.replyCount ?? 0,
        quote: c.tweet.quoteCount ?? 0,
        bookmark: c.tweet.bookmarkCount ?? 0,
        view: c.tweet.viewCount ?? 0,
      },
```

- [ ] **Step 4: テスト通過を確認**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true jest lib/ingest/collector-persist.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/x-account-system/lib/ingest/collector-persist.ts apps/x-account-system/lib/ingest/collector-persist.test.ts
git commit -m "feat(collector): meta に engagement(like/rt/reply/quote/bookmark/view) を保存"
```

---

## Task 3: worker compose ジョブ配線 + stub

**Files:**
- Create: `apps/x-account-system/lib/curation/compose-stub.ts`
- Test: `apps/x-account-system/lib/curation/compose-stub.test.ts`
- Modify: `apps/x-account-system/src/worker.ts`（JobMessage union, CRON_JOBS_BY_NAME）
- Modify: `apps/x-account-system/src/queue.ts`（case "compose"）
- Modify: `apps/x-account-system/lib/registry/stages/index-stages.ts`（compose node）

- [ ] **Step 1: stub の失敗するテストを書く**

`apps/x-account-system/lib/curation/compose-stub.test.ts`:

```ts
import { runComposeStub } from "./compose-stub.ts";

function sbWith(rows: Array<{ id: string }>) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: async () => ({ data: rows, error: null }),
        }),
      }),
    }),
  };
}

describe("compose-stub", () => {
  test("queued 素材IDと件数を返す", async () => {
    const out = await runComposeStub(sbWith([{ id: "a" }, { id: "b" }]) as never);
    expect(out.count).toBe(2);
    expect(out.materialIds).toEqual(["a", "b"]);
  });

  test("0件でも ok（空配列）", async () => {
    const out = await runComposeStub(sbWith([]) as never);
    expect(out.count).toBe(0);
    expect(out.materialIds).toEqual([]);
  });
});
```

- [ ] **Step 2: テスト失敗を確認**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true jest lib/curation/compose-stub.test.ts`
Expected: FAIL（モジュール無し）

- [ ] **Step 3: stub 実装**

`apps/x-account-system/lib/curation/compose-stub.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ComposeStubResult {
  count: number;
  materialIds: string[];
}

/**
 * 執筆配管 stub。selection_status='queued' の素材を読み件数/ID を返すだけ。
 * 実 writer エージェント本体は次ステージで本関数を置き換える。
 */
export async function runComposeStub(sb: SupabaseClient): Promise<ComposeStubResult> {
  const { data, error } = await sb
    .from("materials_store")
    .select("id")
    .eq("source_type", "x_inspirations")
    .eq("meta->>selection_status", "queued");
  if (error) throw new Error(`compose-stub read failed: ${error.message}`);
  const materialIds = (data ?? []).map((r: { id: string }) => r.id);
  return { count: materialIds.length, materialIds };
}
```

- [ ] **Step 4: テスト通過を確認**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true jest lib/curation/compose-stub.test.ts`
Expected: PASS

- [ ] **Step 5: JobMessage union と admin-enqueueable に compose 追加**

`src/worker.ts` の JobMessage 2つ目のバリアント（行88-96）の job union に `"compose"` を追加:
```ts
        | "inspirations-ingest"
        | "compose"
        | "rotation-notice";
```
同 `CRON_JOBS_BY_NAME`（行137付近）に追加:
```ts
  collect: true,
  compose: true,
```
注: compose は cron を持たない（`CRON_JOBS` には追加しない）。`/admin/enqueue` 経由のみ。

- [ ] **Step 6: queue.ts に case "compose" を追加**

`src/queue.ts` の `case "inspirations-ingest":` の直前に追加:
```ts
    case "compose": {
      const rid = runId ?? "";
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        db: { schema: process.env.SUPABASE_SCHEMA || "xad" },
      });
      const { runComposeStub } = await import("../lib/curation/compose-stub.js");
      if (rid) {
        await withTrace(ctx, { runId: rid, stageId: "compose" }, async () => {
          const out = await runComposeStub(sb as never);
          console.log(JSON.stringify({ level: "info", msg: "[compose] stub", date: msg.date, count: out.count }));
          return { result: out.count, output: out };
        });
      } else {
        const out = await runComposeStub(sb as never);
        console.log(JSON.stringify({ level: "info", msg: "[compose] stub(untraced)", count: out.count }));
      }
      break;
    }
```

- [ ] **Step 7: registry に compose ノード追加 + 再生成**

`lib/registry/stages/index-stages.ts` の `ideation` ノード定義の直前（collect/ingest 群の後）に追加:
```ts
  {
    id: "compose", label: "Compose (writer stub)", group: "generate",
    purpose: "人間が選抜(queued)した素材から投稿ドラフトを生成する執筆工程。現状は配管 stub（queued 素材の件数/IDを trace 記録）。実 writer 本体は後続ステージ。",
    objectiveFunction: "選抜素材→チャエン層に刺さる投稿ドラフトの質を最大化（後続実装）",
    inputs: ["xad.materials_store (selection_status=queued)"],
    outputs: ["（stub）trace のみ / 後続: post_drafts"],
    keyVariables: [{ name: "選抜トリガ", desc: "/curation の『執筆へ送る』→ /admin/enqueue?job=compose" }],
    logicKind: "llm", sourcePaths: ["apps/x-account-system/lib/curation/compose-stub.ts"],
    upstream: ["collect"], downstream: [],
  },
```

Run: `cd apps/x-account-system && npm run build:registry`
Expected: `registry.generated.json` 再生成、エラーなし。

- [ ] **Step 8: worker typecheck + 全テスト**

Run: `cd apps/x-account-system && npm run worker:typecheck && IN_MEMORY_FALLBACK=true jest`
Expected: typecheck PASS、全テスト緑。

- [ ] **Step 9: Commit**

```bash
git add apps/x-account-system/lib/curation apps/x-account-system/src/worker.ts apps/x-account-system/src/queue.ts apps/x-account-system/lib/registry
git commit -m "feat(curation): compose ジョブ配線 + stub + registry ノード"
```

---

## Task 4: dashboard 純ロジック（curation-logic.ts）+ vitest 基盤

**Files:**
- Modify: `apps/xad-dashboard/package.json`（vitest devDep + script）
- Create: `apps/xad-dashboard/vitest.config.ts`
- Create: `apps/xad-dashboard/lib/curation-logic.ts`
- Test: `apps/xad-dashboard/lib/curation-logic.test.ts`

純TS（React/Supabase 非依存）に sort/filter/action→status/event-row を集約しテスト可能化。

- [ ] **Step 1: vitest を追加**

```bash
cd /Users/rikukudo/Projects/all-good-ops-curation-ui/apps/xad-dashboard
npm install -D vitest@^2
```
`package.json` の scripts に追加:
```json
    "test": "vitest run",
```
`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["lib/**/*.test.ts"] } });
```

- [ ] **Step 2: 失敗するテストを書く**

`apps/xad-dashboard/lib/curation-logic.test.ts`:

```ts
import { describe, test, expect } from "vitest";
import {
  ACTION_TO_STATUS, buildEventRows, sortMaterials, filterMaterials,
  type CurationMaterial,
} from "./curation-logic";

function mat(p: Partial<CurationMaterial>): CurationMaterial {
  return {
    id: "1", source_ref: "alice", raw_text: "hello AI", created_at: "2026-06-06T00:00:00Z",
    collected_at: "2026-06-06T00:00:00Z", selection_status: "collected",
    overall_score: 50, freshness: 40, velocity: 30, target_fit: 60,
    score_reason: "r", discovery_via: "keyword", discovery_query: "AI",
    lang: "en", tweet_url: "u", conversation_id: null, media: [], engagement: null, ...p,
  };
}

describe("curation-logic", () => {
  test("action→status map", () => {
    expect(ACTION_TO_STATUS.select).toBe("selected");
    expect(ACTION_TO_STATUS.reject).toBe("rejected");
    expect(ACTION_TO_STATUS.reset).toBe("collected");
    expect(ACTION_TO_STATUS.send_to_compose).toBe("queued");
  });

  test("buildEventRows が snapshot を作る", () => {
    const m = mat({ id: "x", overall_score: 90, source_ref: "bob", discovery_via: "trend" });
    const rows = buildEventRows([m], "reject", "やりすぎ");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      material_id: "x", action: "reject", from_status: "collected", to_status: "rejected",
      source_ref: "bob", note: "やりすぎ",
    });
    expect(rows[0].scores).toEqual({ freshness: 40, velocity: 30, target_fit: 60, overall: 90 });
    expect(rows[0].discovery).toEqual({ via: "trend", query: "AI" });
  });

  test("sortMaterials: overall desc 既定 / 軸切替", () => {
    const a = mat({ id: "a", overall_score: 10, velocity: 99 });
    const b = mat({ id: "b", overall_score: 80, velocity: 1 });
    expect(sortMaterials([a, b], "overall_score").map((m) => m.id)).toEqual(["b", "a"]);
    expect(sortMaterials([a, b], "velocity").map((m) => m.id)).toEqual(["a", "b"]);
  });

  test("filterMaterials: via / media / lang / source / text", () => {
    const en = mat({ id: "en", lang: "en", discovery_via: "keyword", raw_text: "claude rocks", media: [] });
    const ja = mat({ id: "ja", lang: "ja", discovery_via: "trend", raw_text: "猫", media: [{ type: "photo", url: "u" }] });
    expect(filterMaterials([en, ja], { via: "trend" }).map((m) => m.id)).toEqual(["ja"]);
    expect(filterMaterials([en, ja], { hasMedia: true }).map((m) => m.id)).toEqual(["ja"]);
    expect(filterMaterials([en, ja], { lang: "en" }).map((m) => m.id)).toEqual(["en"]);
    expect(filterMaterials([en, ja], { text: "claude" }).map((m) => m.id)).toEqual(["en"]);
    expect(filterMaterials([en, ja], { source: "alice" }).map((m) => m.id)).toEqual(["en", "ja"]);
  });
});
```

- [ ] **Step 3: テスト失敗を確認**

Run: `cd apps/xad-dashboard && npm test`
Expected: FAIL（モジュール無し）

- [ ] **Step 4: curation-logic.ts 実装**

`apps/xad-dashboard/lib/curation-logic.ts`:

```ts
export type SelectionStatus = "collected" | "selected" | "queued" | "rejected";
export type CurationAction = "select" | "reject" | "reset" | "send_to_compose";

export interface MediaItem { type: string; url: string }

export interface CurationMaterial {
  id: string;
  source_ref: string | null;
  raw_text: string | null;
  created_at: string;
  collected_at: string | null;
  selection_status: SelectionStatus;
  overall_score: number | null;
  freshness: number | null;
  velocity: number | null;
  target_fit: number | null;
  score_reason: string | null;
  discovery_via: string | null;
  discovery_query: string | null;
  lang: string | null;
  tweet_url: string | null;
  conversation_id: string | null;
  media: MediaItem[] | null;
  engagement: Record<string, number> | null;
}

export const ACTION_TO_STATUS: Record<CurationAction, SelectionStatus> = {
  select: "selected",
  reject: "rejected",
  reset: "collected",
  send_to_compose: "queued",
};

export interface CurationEventRow {
  material_id: string;
  action: CurationAction;
  from_status: SelectionStatus;
  to_status: SelectionStatus;
  scores: { freshness: number | null; velocity: number | null; target_fit: number | null; overall: number | null };
  discovery: { via: string | null; query: string | null };
  source_ref: string | null;
  note: string | null;
}

/** 決定時点の snapshot 付き event 行を作る（compose_run_id は route で後付け）。 */
export function buildEventRows(
  materials: CurationMaterial[],
  action: CurationAction,
  note: string | null,
): CurationEventRow[] {
  const to = ACTION_TO_STATUS[action];
  return materials.map((m) => ({
    material_id: m.id,
    action,
    from_status: m.selection_status,
    to_status: to,
    scores: { freshness: m.freshness, velocity: m.velocity, target_fit: m.target_fit, overall: m.overall_score },
    discovery: { via: m.discovery_via, query: m.discovery_query },
    source_ref: m.source_ref,
    note,
  }));
}

export type SortKey = "overall_score" | "freshness" | "velocity" | "target_fit" | "collected_at" | "engagement";

function engagementTotal(m: CurationMaterial): number {
  const e = m.engagement;
  if (!e) return -1; // engagement 無し（既存素材）は末尾へ
  return (e.like ?? 0) + (e.retweet ?? 0) + (e.view ?? 0) + (e.bookmark ?? 0);
}

/** 既定 overall desc。collected_at は新しい順、engagement は合算 desc。null は末尾。 */
export function sortMaterials(materials: CurationMaterial[], key: SortKey): CurationMaterial[] {
  const copy = [...materials];
  if (key === "collected_at") {
    return copy.sort((a, b) => (b.collected_at ?? "").localeCompare(a.collected_at ?? ""));
  }
  if (key === "engagement") {
    return copy.sort((a, b) => engagementTotal(b) - engagementTotal(a));
  }
  return copy.sort((a, b) => (b[key] ?? -1) - (a[key] ?? -1));
}

export interface FilterSpec {
  via?: string;        // discovery_via 完全一致
  hasMedia?: boolean;  // media が1件以上
  lang?: string;       // lang 完全一致
  source?: string;     // source_ref 部分一致（小文字）
  text?: string;       // raw_text 部分一致（小文字）
}

export function filterMaterials(materials: CurationMaterial[], f: FilterSpec): CurationMaterial[] {
  return materials.filter((m) => {
    if (f.via && m.discovery_via !== f.via) return false;
    if (f.hasMedia && !(m.media && m.media.length > 0)) return false;
    if (f.lang && m.lang !== f.lang) return false;
    if (f.source && !(m.source_ref ?? "").toLowerCase().includes(f.source.toLowerCase())) return false;
    if (f.text && !(m.raw_text ?? "").toLowerCase().includes(f.text.toLowerCase())) return false;
    return true;
  });
}
```

- [ ] **Step 5: テスト通過を確認**

Run: `cd apps/xad-dashboard && npm test`
Expected: PASS（5 テスト）

- [ ] **Step 6: Commit**

```bash
git add apps/xad-dashboard/lib/curation-logic.ts apps/xad-dashboard/lib/curation-logic.test.ts apps/xad-dashboard/vitest.config.ts apps/xad-dashboard/package.json apps/xad-dashboard/package-lock.json
git commit -m "feat(curation): dashboard 純ロジック(curation-logic) + vitest"
```

---

## Task 5: dashboard Supabase ラッパ（curation-queries.ts）

**Files:**
- Create: `apps/xad-dashboard/lib/curation-queries.ts`

DB 接触の薄いラッパ。既存 `lib/queries.ts` 同様 unit test なし（build typecheck + E2E で検証）。

- [ ] **Step 1: curation-queries.ts 実装**

`apps/xad-dashboard/lib/curation-queries.ts`:

```ts
import { serverSupabase } from "./supabase";
import type { CurationMaterial, SelectionStatus, CurationEventRow } from "./curation-logic";

/** view から status 別に取得（overall desc、上限 limit）。 */
export async function listCurationMaterials(
  status: SelectionStatus, limit = 300,
): Promise<CurationMaterial[]> {
  const sb = serverSupabase();
  const { data } = await sb
    .from("curation_materials")
    .select("*")
    .eq("selection_status", status)
    .order("overall_score", { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data ?? []) as CurationMaterial[];
}

/** 各タブの件数。 */
export async function tabCounts(): Promise<Record<SelectionStatus, number>> {
  const sb = serverSupabase();
  const statuses: SelectionStatus[] = ["collected", "selected", "queued", "rejected"];
  const out = { collected: 0, selected: 0, queued: 0, rejected: 0 } as Record<SelectionStatus, number>;
  await Promise.all(statuses.map(async (s) => {
    const { count } = await sb
      .from("curation_materials").select("id", { count: "exact", head: true })
      .eq("selection_status", s);
    out[s] = count ?? 0;
  }));
  return out;
}

/** snapshot 用に対象素材の現在 meta を取得。 */
export async function fetchMaterialsForEvents(ids: string[]): Promise<CurationMaterial[]> {
  const sb = serverSupabase();
  const { data } = await sb.from("curation_materials").select("*").in("id", ids);
  return (data ?? []) as CurationMaterial[];
}

/** RPC で status を原子更新。更新件数を返す。 */
export async function setSelectionStatus(ids: string[], status: SelectionStatus): Promise<number> {
  const sb = serverSupabase();
  const { data, error } = await sb.rpc("set_selection_status", { p_ids: ids, p_status: status });
  if (error) throw new Error(`set_selection_status failed: ${error.message}`);
  return (data as number) ?? 0;
}

/** curation_events を一括追記。 */
export async function recordCurationEvents(
  rows: Array<CurationEventRow & { compose_run_id?: string | null }>,
): Promise<void> {
  const sb = serverSupabase();
  const { error } = await sb.from("curation_events").insert(rows);
  if (error) throw new Error(`curation_events insert failed: ${error.message}`);
}

/** Worker の /admin/enqueue を叩いて compose を起動。runId を返す（失敗時は null）。 */
export async function enqueueCompose(): Promise<string | null> {
  const base = process.env.WORKER_BASE_URL;
  const key = process.env.OAUTH_ADMIN_SECRET;
  if (!base || !key) throw new Error("WORKER_BASE_URL / OAUTH_ADMIN_SECRET 未設定");
  const url = `${base.replace(/\/$/, "")}/admin/enqueue?job=compose&key=${encodeURIComponent(key)}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`enqueue compose failed: HTTP ${res.status}`);
  const body = (await res.json()) as { ok?: boolean; enqueued?: { runId?: string } };
  return body.enqueued?.runId ?? null;
}
```

- [ ] **Step 2: typecheck（build で確認、Task 9 でまとめて build。ここでは tsc 部分確認）**

Run: `cd apps/xad-dashboard && npx tsc --noEmit`
Expected: 型エラーなし（route/UI 未実装でも本ファイル単体は通る）。

- [ ] **Step 3: Commit**

```bash
git add apps/xad-dashboard/lib/curation-queries.ts
git commit -m "feat(curation): dashboard Supabase ラッパ(view読み/count/RPC/events/enqueue)"
```

---

## Task 6: dashboard API route（/api/curation/select）

**Files:**
- Create: `apps/xad-dashboard/app/api/curation/select/route.ts`

不変条件: read(snapshot)→RPC更新→(send時)enqueue→events追記。enqueue 失敗でも 200＋warning。RPC 失敗時は enqueue しない。

- [ ] **Step 1: route 実装**

`apps/xad-dashboard/app/api/curation/select/route.ts`:

```ts
import { NextResponse } from "next/server";
import { ACTION_TO_STATUS, buildEventRows, type CurationAction } from "@/lib/curation-logic";
import {
  fetchMaterialsForEvents, setSelectionStatus, recordCurationEvents, enqueueCompose,
} from "@/lib/curation-queries";

export async function POST(req: Request) {
  let body: { ids?: string[]; action?: CurationAction; note?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const ids = body.ids ?? [];
  const action = body.action;
  if (!action || !(action in ACTION_TO_STATUS) || ids.length === 0) {
    return NextResponse.json({ error: "ids/action required" }, { status: 400 });
  }
  const status = ACTION_TO_STATUS[action];

  // 1. snapshot 用に現在の素材を読む（from_status / scores / discovery）
  const materials = await fetchMaterialsForEvents(ids);

  // 2. status を原子更新（RPC 失敗時はここで throw → enqueue しない）
  const updated = await setSelectionStatus(ids, status);

  // 3. send_to_compose のみ enqueue（失敗しても更新は成功扱い）
  let composeRunId: string | null = null;
  let warning: string | undefined;
  if (action === "send_to_compose") {
    try { composeRunId = await enqueueCompose(); }
    catch (e) { warning = `執筆ジョブ起動失敗（再送可）: ${(e as Error).message}`; }
  }

  // 4. events 追記（snapshot + compose_run_id）
  const rows = buildEventRows(materials, action, body.note ?? null)
    .map((r) => ({ ...r, compose_run_id: composeRunId }));
  await recordCurationEvents(rows);

  return NextResponse.json({ ok: true, updated, composeRunId, warning });
}
```

- [ ] **Step 2: typecheck**

Run: `cd apps/xad-dashboard && npx tsc --noEmit`
Expected: 型エラーなし。

- [ ] **Step 3: Commit**

```bash
git add apps/xad-dashboard/app/api/curation/select/route.ts
git commit -m "feat(curation): /api/curation/select route（更新→enqueue→events、fail-open）"
```

---

## Task 7: dashboard MaterialCard

**Files:**
- Create: `apps/xad-dashboard/app/curation/MaterialCard.tsx`

Xライク表示カード。チェックボックスで選択。frontend-design 流儀（Tailwind、`lib/colors.ts` 同様のバッジ色）。

- [ ] **Step 1: MaterialCard 実装**

`apps/xad-dashboard/app/curation/MaterialCard.tsx`:

```tsx
"use client";
import type { CurationMaterial } from "@/lib/curation-logic";

function scoreColor(v: number | null): string {
  if (v == null) return "bg-gray-100 text-gray-500";
  if (v >= 70) return "bg-green-100 text-green-800";
  if (v >= 40) return "bg-amber-100 text-amber-800";
  return "bg-gray-100 text-gray-600";
}

export function MaterialCard({
  m, checked, onToggle,
}: { m: CurationMaterial; checked: boolean; onToggle: (id: string) => void }) {
  const e = m.engagement;
  return (
    <div className={`border rounded p-3 ${checked ? "border-blue-500 bg-blue-50" : ""}`}>
      <div className="flex items-start gap-2">
        <input type="checkbox" checked={checked} onChange={() => onToggle(m.id)} className="mt-1" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold">@{m.source_ref}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${scoreColor(m.overall_score)}`}>
              overall {m.overall_score ?? "—"}
            </span>
            <span className="text-xs text-gray-500">
              f{m.freshness ?? "—"} / v{m.velocity ?? "—"} / fit{m.target_fit ?? "—"}
            </span>
            {m.lang && <span className="text-xs text-gray-400">{m.lang}</span>}
          </div>
          <p className="whitespace-pre-wrap text-sm mt-1">{m.raw_text}</p>
          {m.media && m.media.length > 0 && (
            <div className="flex gap-2 mt-2">
              {m.media.map((md, i) => (
                <img key={i} src={md.url} alt="" className="h-20 w-20 object-cover rounded border" />
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-2">
            <span className="px-1.5 py-0.5 bg-gray-100 rounded">
              {m.discovery_via}{m.discovery_query ? `: ${m.discovery_query}` : ""}
            </span>
            {m.collected_at && <span>{new Date(m.collected_at).toLocaleString("ja-JP")}</span>}
            {e && <span>♥{e.like ?? 0} ↺{e.retweet ?? 0} 👁{e.view ?? 0}</span>}
            {m.tweet_url && (
              <a href={m.tweet_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">原ツイート</a>
            )}
          </div>
          {m.score_reason && (
            <details className="text-xs text-gray-500 mt-1">
              <summary>採点理由</summary>
              <p className="mt-1">{m.score_reason}</p>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/xad-dashboard/app/curation/MaterialCard.tsx
git commit -m "feat(curation): MaterialCard（Xライク・スコア/メディア/discovery/エンゲージ）"
```

---

## Task 8: dashboard CurationClient（タブ/ソート/フィルタ/検索/アクション）

**Files:**
- Create: `apps/xad-dashboard/app/curation/CurationClient.tsx`

client state の中核。props で4タブ分の素材と件数を受け取り、選択/ソート/フィルタ/検索/一括アクションを担う。アクション後は `router.refresh()` でサーバ再取得。

- [ ] **Step 1: CurationClient 実装**

`apps/xad-dashboard/app/curation/CurationClient.tsx`:

```tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  sortMaterials, filterMaterials, type CurationMaterial, type SelectionStatus,
  type SortKey, type CurationAction, type FilterSpec,
} from "@/lib/curation-logic";
import { MaterialCard } from "./MaterialCard";

const TABS: { key: SelectionStatus; label: string }[] = [
  { key: "collected", label: "未処理" },
  { key: "selected", label: "選抜済" },
  { key: "queued", label: "送信済" },
  { key: "rejected", label: "除外" },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "overall_score", label: "総合" }, { key: "freshness", label: "鮮度" },
  { key: "velocity", label: "伸び" }, { key: "target_fit", label: "適合" },
  { key: "collected_at", label: "新着" }, { key: "engagement", label: "反応" },
];

export function CurationClient({
  materials, counts, limit,
}: {
  materials: Record<SelectionStatus, CurationMaterial[]>;
  counts: Record<SelectionStatus, number>;
  limit: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<SelectionStatus>("collected");
  const [sort, setSort] = useState<SortKey>("overall_score");
  const [filter, setFilter] = useState<FilterSpec>({});
  const [text, setText] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<string>("");

  const base = materials[tab] ?? [];
  const shown = sortMaterials(filterMaterials(base, { ...filter, text }), sort);
  const vias = Array.from(new Set(base.map((m) => m.discovery_via).filter(Boolean))) as string[];
  const langs = Array.from(new Set(base.map((m) => m.lang).filter(Boolean))) as string[];

  function toggle(id: string) {
    setChecked((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function act(action: CurationAction) {
    const ids = Array.from(checked);
    if (ids.length === 0) return;
    let note: string | null = null;
    if (action === "reject" || action === "select") {
      note = window.prompt("メモ（任意・スコア違和感など。空でOK）") || null;
    }
    setMsg("送信中…");
    const res = await fetch("/api/curation/select", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids, action, note }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(`失敗: ${body.error ?? res.status}`); return; }
    setMsg(body.warning ?? `${body.updated} 件を更新しました`);
    setChecked(new Set());
    startTransition(() => router.refresh());
  }

  return (
    <main className="p-4 max-w-3xl">
      <h1 className="font-bold text-xl mb-3">Curation</h1>

      {/* タブ */}
      <div className="flex gap-4 border-b mb-3 text-sm">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setChecked(new Set()); }}
            className={`pb-1 ${tab === t.key ? "font-bold border-b-2 border-black" : "text-gray-500"}`}>
            {t.label} ({counts[t.key]})
          </button>
        ))}
      </div>

      {/* コントロール */}
      <div className="flex flex-wrap items-center gap-2 mb-3 text-sm">
        <label>並び:
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="border rounded ml-1 px-1">
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
        <select value={filter.via ?? ""} onChange={(e) => setFilter((f) => ({ ...f, via: e.target.value || undefined }))} className="border rounded px-1">
          <option value="">経路:全</option>
          {vias.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={filter.lang ?? ""} onChange={(e) => setFilter((f) => ({ ...f, lang: e.target.value || undefined }))} className="border rounded px-1">
          <option value="">言語:全</option>
          {langs.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={!!filter.hasMedia} onChange={(e) => setFilter((f) => ({ ...f, hasMedia: e.target.checked || undefined }))} />
          メディア有
        </label>
        <input placeholder="ソース" value={filter.source ?? ""} onChange={(e) => setFilter((f) => ({ ...f, source: e.target.value || undefined }))} className="border rounded px-1 w-24" />
        <input placeholder="本文検索" value={text} onChange={(e) => setText(e.target.value)} className="border rounded px-1 w-32" />
      </div>

      {/* アクションバー */}
      <div className="flex items-center gap-2 mb-3 text-sm sticky top-0 bg-white py-2 border-b">
        <span className="text-gray-500">{checked.size} 件選択</span>
        <button disabled={pending || checked.size === 0} onClick={() => act("send_to_compose")}
          className="px-2 py-1 bg-blue-600 text-white rounded disabled:opacity-40">執筆へ送る</button>
        <button disabled={pending || checked.size === 0} onClick={() => act("select")}
          className="px-2 py-1 border rounded disabled:opacity-40">選抜</button>
        <button disabled={pending || checked.size === 0} onClick={() => act("reject")}
          className="px-2 py-1 border rounded disabled:opacity-40">除外</button>
        <button disabled={pending || checked.size === 0} onClick={() => act("reset")}
          className="px-2 py-1 border rounded disabled:opacity-40">未処理へ戻す</button>
        {msg && <span className="text-gray-600">{msg}</span>}
      </div>

      {/* 件数注意（limit 超過の明示） */}
      {counts[tab] > limit && (
        <p className="text-xs text-amber-700 mb-2">
          {counts[tab]} 件中 上位 {limit} 件のみ表示（overall 降順）。
        </p>
      )}

      {/* 一覧 */}
      <div className="space-y-3">
        {shown.length === 0 && <p className="text-gray-500 text-sm">該当する素材がありません。</p>}
        {shown.map((m) => (
          <MaterialCard key={m.id} m={m} checked={checked.has(m.id)} onToggle={toggle} />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/xad-dashboard/app/curation/CurationClient.tsx
git commit -m "feat(curation): CurationClient（タブ/ソート/フィルタ/検索/一括アクション）"
```

---

## Task 9: dashboard page + nav + env

**Files:**
- Create: `apps/xad-dashboard/app/curation/page.tsx`
- Modify: `apps/xad-dashboard/app/layout.tsx`
- Modify: `apps/xad-dashboard/.env.example`

- [ ] **Step 1: page.tsx（server fetch）**

`apps/xad-dashboard/app/curation/page.tsx`:

```tsx
import { listCurationMaterials, tabCounts } from "@/lib/curation-queries";
import { CurationClient } from "./CurationClient";
import type { CurationMaterial, SelectionStatus } from "@/lib/curation-logic";

export const dynamic = "force-dynamic";
const LIMIT = 300;

export default async function CurationPage() {
  const statuses: SelectionStatus[] = ["collected", "selected", "queued", "rejected"];
  const [collected, selected, queued, rejected, counts] = await Promise.all([
    listCurationMaterials("collected", LIMIT).catch(() => []),
    listCurationMaterials("selected", LIMIT).catch(() => []),
    listCurationMaterials("queued", LIMIT).catch(() => []),
    listCurationMaterials("rejected", LIMIT).catch(() => []),
    tabCounts().catch(() => ({ collected: 0, selected: 0, queued: 0, rejected: 0 })),
  ]);
  const materials: Record<SelectionStatus, CurationMaterial[]> = { collected, selected, queued, rejected };
  return <CurationClient materials={materials} counts={counts} limit={LIMIT} />;
}
```

- [ ] **Step 2: nav リンク追加**

`apps/xad-dashboard/app/layout.tsx` の header（行34付近、Runs リンクの後）に追加:
```tsx
          <a href="/runs" className="text-blue-600 hover:underline">Runs</a>
          <a href="/curation" className="text-blue-600 hover:underline">Curation</a>
```

- [ ] **Step 3: .env.example に追記**

`apps/xad-dashboard/.env.example` の末尾に追加:
```
# Worker 連携（執筆へ送る → /admin/enqueue?job=compose）
WORKER_BASE_URL=https://ofmeton-x-account.<subdomain>.workers.dev
OAUTH_ADMIN_SECRET=
```

- [ ] **Step 4: dashboard build（全 typecheck）**

Run: `cd apps/xad-dashboard && npm run build`
Expected: build 成功（型エラー・lint エラーなし）。

- [ ] **Step 5: Commit**

```bash
git add apps/xad-dashboard/app/curation/page.tsx apps/xad-dashboard/app/layout.tsx apps/xad-dashboard/.env.example
git commit -m "feat(curation): /curation page + nav + env"
```

---

## Task 10: 改善分析 SQL（レバー計測の再利用クエリ）

**Files:**
- Create: `apps/x-account-system/docs/curation-analysis.sql`

- [ ] **Step 1: 分析 SQL を書く**

`apps/x-account-system/docs/curation-analysis.sql`:

```sql
-- 人間キュレーション歩留まり分析（改善レバー L1/L3/L5/funnel の計測）
-- 実行: Supabase SQL editor（xad schema）

-- L1: ソース別 採用率（select / (select+reject)）
select source_ref,
       count(*) filter (where action='select')                          as selected,
       count(*) filter (where action in ('select','reject'))            as decided,
       round(count(*) filter (where action='select')::numeric
             / nullif(count(*) filter (where action in ('select','reject')),0), 2) as select_rate
from xad.curation_events group by source_ref order by decided desc;

-- L3: discovery 経路別 採用率
select discovery->>'via' as via,
       count(*) filter (where action='select')               as selected,
       count(*) filter (where action in ('select','reject')) as decided
from xad.curation_events group by 1 order by decided desc;

-- L5（最重要）: overall スコア bucket × 人間判断（高スコアreject / 低スコアselect を検出）
select width_bucket((scores->>'overall')::numeric, 0, 100, 5) * 20 as score_bucket_top,
       count(*) filter (where action='select') as selected,
       count(*) filter (where action='reject') as rejected
from xad.curation_events
where action in ('select','reject') and scores ? 'overall'
group by 1 order by 1;

-- funnel: 現在の状態別 件数
select selection_status, count(*) from xad.curation_materials group by 1;
```

- [ ] **Step 2: Commit**

```bash
git add apps/x-account-system/docs/curation-analysis.sql
git commit -m "docs(curation): 改善レバー計測 SQL（L1/L3/L5/funnel）"
```

---

## Task 11: 全体検証 + 出荷（人間確認ゲート）

**Files:** なし（検証・デプロイ）

- [ ] **Step 1: ローカル全緑**

```bash
cd /Users/rikukudo/Projects/all-good-ops-curation-ui/apps/x-account-system
npm run worker:typecheck && IN_MEMORY_FALLBACK=true jest && npm run build:registry
cd ../xad-dashboard && npm test && npm run build
```
Expected: すべて緑。

- [ ] **Step 2: push 前 verify**

```bash
cd /Users/rikukudo/Projects/all-good-ops-curation-ui
git log --oneline main..HEAD
```
Expected: 本タスクの commit のみ（並列混入なし）。

- [ ] **Step 3: 出荷（各ステップ人間確認）**
  1. **migration 0016 を本番適用**（ref=hofvvcvhjslevymhbcqj）— Task 1 Step3 のアサート確認。
  2. **worker 再デプロイ**（compose ジョブ登録）— `wrangler deploy`。
  3. **dashboard Vercel デプロイ** — `WORKER_BASE_URL` / `OAUTH_ADMIN_SECRET` を Vercel env 投入後。
  4. **実データ E2E**: `/curation` で実 ~138 件表示 → ソート/フィルタ/検索動作 → 数件「選抜」→ selected タブ移動 → 「執筆へ送る」→ queued 化 ＋ `xad.run`/`run_trace` に compose run 記録 ＋ `curation_events` に snapshot 付き行 → Task 10 の SQL が走る。

- [ ] **Step 4: PR + finishing-a-development-branch**

```bash
git push -u origin task/260606-curation-ui
gh pr create --fill
```
`superpowers:finishing-a-development-branch` で merge/PR/discard を決定。

---

## Self-Review（spec 突合）

- **S1-S13 網羅**: 未処理タブ/overall既定(S1)、freshnessソート＋一括除外(S2)、source/viaフィルタ＋件数バッジ(S3)、score_reason＋note(S4)、4アクション双方向(S5)、選抜済タブ送信(S6)、queued重複防止(S7)、tweet_urlリンク/media/原文(S8)、本文検索(S9)、空状態/enqueue失敗warning(S10)、limit300＋超過明示(S11)、curation_events＋分析SQL＋件数(S12)、全遷移ログ(S13)。✅
- **ログ徹底**: 全状態遷移を `buildEventRows` で snapshot 付き記録、compose_run_id で執筆貫通、分析SQL を Task 10 で同梱。✅
- **不変条件**: route は read→RPC→(send)enqueue→events、enqueue 失敗で 200+warning、service role はサーバ側のみ。✅
- **型整合**: `CurationMaterial`/`SelectionStatus`/`CurationAction`/`CurationEventRow` は curation-logic.ts 単一定義を全所で import。view 列名 = CurationMaterial プロパティ名一致。✅
- **placeholder なし**: 全 step に実コード/実コマンド。✅
