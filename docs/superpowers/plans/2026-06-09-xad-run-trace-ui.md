# 段階1-1B 実行履歴トラッキングUI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** worker が MA session の思考/ツール/結果イベントを `xad.session_event` へ永続化し、dashboard `runs/[id]` で各工程の思考・入力素材・素材の出所・出力を辿れる観測UIを作る。

**Architecture:** dashboard は純 Supabase reader を維持。`runMaSession` に `onEvent` フックを足し、各 caller（collect/compose/check）が session 終了時にイベントを fail-open で一括永続化＋`xad.run_session`(run→session ブリッジ) を記録。session→成果物の相関は既存 `writer_session_id`/`collector_session_id` ＋新 `checker_session_id` で張り、compose の素材 provenance は `core_ideas.source_material_ids → materials_store.meta.collector_session_id` で drill-down。

**Tech Stack:** TypeScript / Supabase(@supabase/supabase-js, schema=xad) / Cloudflare Workers(queue) / worker test=jest(ts-jest, `IN_MEMORY_FALLBACK=true jest`) / dashboard=Next.js16+React19+Tailwind v4, test=vitest。

> **spec からの確定差分:** `xad.run_session` の `ref_kind/ref_id` は不採用。代わりに `post_drafts.checker_session_id` を追加し、checker→draft を `writer_session_id` と対称に張る。run_session は run→session の純ブリッジ `(run_id, stage_id, session_id, agent_key)`。

**作業ディレクトリ:** `/Users/rikukudo/Projects/all-good-ops-xad-run-trace-ui`（worktree, branch `task/260609-xad-run-trace-ui`）。worker パスは `apps/x-account-system/`、dashboard は `apps/xad-dashboard/`。

---

## ファイル構成

**worker (`apps/x-account-system/`)**
- Create: `migrations/0021_session_trace.sql` — `xad.session_event` / `xad.run_session` / `post_drafts.checker_session_id`
- Modify: `lib/trace/types.ts` — `SessionEventType` / `SessionEventInput` / `RunSessionRow`
- Create: `lib/trace/session-event-store.ts` — `insertSessionEvents` / `recordRunSession`（fail-open＋redact）
- Create: `lib/trace/session-event-store.test.ts`
- Modify: `lib/ma/run-session.ts` — `onEvent` フック＋drain で emit
- Modify: `lib/ma/run-session.test.ts` — onEvent 発火テスト
- Modify: `lib/curation/run-compose.ts` — writer session 永続化配線
- Modify: `lib/ingest/collector.ts` ＋ `src/queue.ts` — collector session 永続化配線（runId 配線含む）
- Modify: `lib/check/run-check.ts` — checker session 永続化＋`checker_session_id` 書込

**dashboard (`apps/xad-dashboard/`)**
- Modify: `lib/supabase.ts` — テスト注入口 `__setSupabaseForTest`
- Modify: `lib/queries.ts` — `runSessions` / `sessionEvents` / `composeProvenance` / `runTimeline` 拡張
- Create: `lib/queries.composeProvenance.test.ts`
- Create: `lib/console-link.ts` — Console session link ヘルパ
- Create: `app/runs/[id]/SessionTrace.tsx` — session イベントタイムライン（client）
- Create: `app/runs/[id]/MaterialProvenance.tsx` — compose 素材→collector drill-down（client）
- Modify: `app/runs/[id]/page.tsx` — 工程タイムライン統合

---

## Task 1: migration 0021（session_event / run_session / checker_session_id）

**Files:**
- Create: `apps/x-account-system/migrations/0021_session_trace.sql`

- [ ] **Step 1: SQL ファイルを作成**

`apps/x-account-system/migrations/0021_session_trace.sql`:

```sql
-- 1B 観測: MA session のイベント実体と run→session ブリッジ
-- session_event: drain 中に worker が永続化（fail-open）。1 session = N event。
create table if not exists xad.session_event (
  id          bigint generated always as identity primary key,
  session_id  text not null,
  seq         int  not null,
  type        text not null,           -- thinking|text|custom_tool_use|custom_tool_result|model_request_end
  agent_key   text,                    -- collector|writer|checker
  payload     jsonb not null,          -- redactForTrace 済
  created_at  timestamptz not null default now(),
  unique (session_id, seq)
);
create index if not exists session_event_session_idx on xad.session_event (session_id, seq);

-- run_session: 1 run が起こした MA session 群（compose/check は 1 run = N session）
create table if not exists xad.run_session (
  id          bigint generated always as identity primary key,
  run_id      uuid not null,
  stage_id    text not null,           -- collect|compose|check
  session_id  text not null,
  agent_key   text,
  created_at  timestamptz not null default now()
);
create index if not exists run_session_run_idx on xad.run_session (run_id);
create index if not exists run_session_session_idx on xad.run_session (session_id);

-- checker→draft 相関（writer_session_id と対称）
alter table xad.post_drafts add column if not exists checker_session_id text;
```

- [ ] **Step 2: SQL 構文確認（適用は Task 10 で人間確認）**

Run: `grep -c "create table if not exists" apps/x-account-system/migrations/0021_session_trace.sql`
Expected: `2`

- [ ] **Step 3: Commit**

```bash
cd /Users/rikukudo/Projects/all-good-ops-xad-run-trace-ui
git add apps/x-account-system/migrations/0021_session_trace.sql
git commit -m "feat(xad): migration 0021 session_event/run_session/checker_session_id"
```

---

## Task 2: trace 型を追加

**Files:**
- Modify: `apps/x-account-system/lib/trace/types.ts`（末尾に追記）

- [ ] **Step 1: 型を追記**

`apps/x-account-system/lib/trace/types.ts` の末尾に追加:

```ts
/** MA session イベントの種別（runMaSession drain が emit）。 */
export type SessionEventType =
  | "thinking"
  | "text"
  | "custom_tool_use"
  | "custom_tool_result"
  | "model_request_end";

/** runMaSession の onEvent が渡す 1 イベント。payload は redact 前の生データ。 */
export interface SessionEventInput {
  seq: number;
  type: SessionEventType;
  payload: unknown;
}

/** xad.run_session への 1 行（run→session ブリッジ）。 */
export interface RunSessionRow {
  runId: string;
  stageId: string;
  sessionId: string;
  agentKey?: string;
}
```

- [ ] **Step 2: typecheck**

Run: `cd apps/x-account-system && npx tsc -p src/tsconfig.json --noEmit 2>&1 | head -5`
Expected: 追記による新規エラーなし（既存状態と同じ）

- [ ] **Step 3: Commit**

```bash
cd /Users/rikukudo/Projects/all-good-ops-xad-run-trace-ui
git add apps/x-account-system/lib/trace/types.ts
git commit -m "feat(xad): session event/run_session 型を trace types に追加"
```

---

## Task 3: session-event-store（fail-open 永続化）

**Files:**
- Create: `apps/x-account-system/lib/trace/session-event-store.ts`
- Test: `apps/x-account-system/lib/trace/session-event-store.test.ts`

- [ ] **Step 1: 失敗テストを書く**

`apps/x-account-system/lib/trace/session-event-store.test.ts`:

```ts
import {
  insertSessionEvents,
  recordRunSession,
  __setSessionTraceSupabaseForTest,
} from "./session-event-store";
import { redactForTrace } from "./redact-io";
import type { SupabaseClient } from "@supabase/supabase-js";

function makeFakeSb() {
  const inserts: Array<{ table: string; rows: unknown }> = [];
  const sb = {
    from(table: string) {
      return {
        insert(rows: unknown) {
          inserts.push({ table, rows });
          return Promise.resolve({ error: null });
        },
      };
    },
  } as unknown as SupabaseClient;
  return { sb, inserts };
}

describe("session-event-store", () => {
  afterEach(() => __setSessionTraceSupabaseForTest(undefined as never));

  test("insertSessionEvents は session_event に redact 済 payload を 1 行/イベントで insert", async () => {
    const { sb, inserts } = makeFakeSb();
    __setSessionTraceSupabaseForTest(sb);
    const payload = { text: "hello", email: "a@b.com" };
    await insertSessionEvents("sesn_1", "writer", [{ seq: 0, type: "text", payload }]);
    expect(inserts).toHaveLength(1);
    expect(inserts[0].table).toBe("session_event");
    const rows = inserts[0].rows as Array<Record<string, unknown>>;
    expect(rows[0]).toMatchObject({
      session_id: "sesn_1",
      seq: 0,
      type: "text",
      agent_key: "writer",
      payload: redactForTrace(payload),
    });
  });

  test("空配列では insert しない", async () => {
    const { sb, inserts } = makeFakeSb();
    __setSessionTraceSupabaseForTest(sb);
    await insertSessionEvents("sesn_1", "writer", []);
    expect(inserts).toHaveLength(0);
  });

  test("recordRunSession は run_session に 1 行 insert", async () => {
    const { sb, inserts } = makeFakeSb();
    __setSessionTraceSupabaseForTest(sb);
    await recordRunSession({ runId: "r1", stageId: "compose", sessionId: "sesn_1", agentKey: "writer" });
    expect(inserts[0]).toMatchObject({
      table: "run_session",
      rows: { run_id: "r1", stage_id: "compose", session_id: "sesn_1", agent_key: "writer" },
    });
  });

  test("client 未設定なら fail-open（throw しない）", async () => {
    __setSessionTraceSupabaseForTest(null);
    await expect(insertSessionEvents("s", "writer", [{ seq: 0, type: "text", payload: {} }])).resolves.toBeUndefined();
    await expect(recordRunSession({ runId: "r", stageId: "x", sessionId: "s" })).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/trace/session-event-store.test.ts 2>&1 | tail -15`
Expected: FAIL（`Cannot find module './session-event-store'`）

- [ ] **Step 3: 実装を書く**

`apps/x-account-system/lib/trace/session-event-store.ts`:

```ts
/**
 * Fail-open session トレース書込ストア (xad.session_event / xad.run_session)。
 * 1B 観測用。本処理を妨げないため Supabase 未設定 / insert 失敗時は握りつぶす。
 * trace-store.ts と同じ schema=xad / テスト注入口の規約に合わせる。
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { redactForTrace } from "./redact-io.js";
import type { SessionEventInput, RunSessionRow } from "./types.js";

let _client: SupabaseClient | null | undefined;

export function __setSessionTraceSupabaseForTest(c: SupabaseClient | null): void {
  _client = c;
}

function getSb(): SupabaseClient | null {
  if (_client !== undefined) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  _client = url && key ? createClient(url, key, { db: { schema: "xad" as "public" } }) : null;
  return _client;
}

export async function insertSessionEvents(
  sessionId: string,
  agentKey: string,
  events: SessionEventInput[],
): Promise<void> {
  try {
    if (events.length === 0) return;
    const sb = getSb();
    if (!sb) return;
    const rows = events.map((e) => ({
      session_id: sessionId,
      seq: e.seq,
      type: e.type,
      agent_key: agentKey,
      payload: redactForTrace(e.payload),
    }));
    await sb.from("session_event").insert(rows);
  } catch {
    /* fail-open */
  }
}

export async function recordRunSession(row: RunSessionRow): Promise<void> {
  try {
    const sb = getSb();
    if (!sb) return;
    await sb.from("run_session").insert({
      run_id: row.runId,
      stage_id: row.stageId,
      session_id: row.sessionId,
      agent_key: row.agentKey ?? null,
    });
  } catch {
    /* fail-open */
  }
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/trace/session-event-store.test.ts 2>&1 | tail -15`
Expected: PASS（4 tests）

- [ ] **Step 5: Commit**

```bash
cd /Users/rikukudo/Projects/all-good-ops-xad-run-trace-ui
git add apps/x-account-system/lib/trace/session-event-store.ts apps/x-account-system/lib/trace/session-event-store.test.ts
git commit -m "feat(xad): session-event-store (fail-open 永続化＋redact)"
```

---

## Task 4: runMaSession に onEvent フックを追加

**Files:**
- Modify: `apps/x-account-system/lib/ma/run-session.ts`
- Test: `apps/x-account-system/lib/ma/run-session.test.ts`（追記）

> drain ループ（`apps/x-account-system/lib/ma/run-session.ts` の `for(;;)` 内、本plan時点で約 300-355 行）に emit を挿す。thinking content block の形は SDK 依存のため `b.thinking ?? b.text` で吸収（実行時に不明なら text のみで成立）。

- [ ] **Step 1: 失敗テストを追記**

`apps/x-account-system/lib/ma/run-session.test.ts` の `describe("runMaSession", () => {` 内に追記（既存 `makeMockClient` / `asyncIterableOf` を流用）:

```ts
  describe("onEvent フック", () => {
    test("thinking/text/model_request_end を seq 昇順で emit", async () => {
      const events: Array<Record<string, unknown>> = [
        { type: "agent.message", content: [{ type: "thinking", thinking: "考え中" }, { type: "text", text: "結論" }] },
        { type: "span.model_request_end", model_usage: { input_tokens: 5, output_tokens: 2 } },
        { type: "session.status_idle", stop_reason: { type: "end_turn" } },
      ];
      const { client } = makeMockClient(events);
      const seen: Array<{ seq: number; type: string }> = [];
      await runMaSession({
        agentRef: { id: "agent_x", version: "1" },
        environmentId: "env_x",
        userMessage: "hi",
        client,
        onEvent: (e) => seen.push({ seq: e.seq, type: e.type }),
      });
      expect(seen).toEqual([
        { seq: 0, type: "thinking" },
        { seq: 1, type: "text" },
        { seq: 2, type: "model_request_end" },
      ]);
    });

    test("custom_tool_use と custom_tool_result をペアで emit", async () => {
      const events: Array<Record<string, unknown>> = [
        { type: "agent.custom_tool_use", id: "tu_1", name: "get_x", input: { q: "ai" } },
        { type: "session.status_idle", stop_reason: { type: "end_turn" } },
      ];
      const { client } = makeMockClient(events);
      const seen: Array<{ type: string; payload: unknown }> = [];
      await runMaSession({
        agentRef: { id: "agent_x", version: "1" },
        environmentId: "env_x",
        userMessage: "hi",
        client,
        customToolHandler: async () => "RESULT",
        onEvent: (e) => seen.push({ type: e.type, payload: e.payload }),
      });
      expect(seen.map((s) => s.type)).toEqual(["custom_tool_use", "custom_tool_result"]);
      expect(seen[0].payload).toMatchObject({ tool_use_id: "tu_1", name: "get_x", input: { q: "ai" } });
      expect(seen[1].payload).toMatchObject({ tool_use_id: "tu_1", result: "RESULT", is_error: false });
    });
  });
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/ma/run-session.test.ts -t "onEvent" 2>&1 | tail -15`
Expected: FAIL（`onEvent` 未定義のため emit されず `seen` 空）

- [ ] **Step 3: deps に onEvent を追加**

`apps/x-account-system/lib/ma/run-session.ts` の `RunMaSessionDeps` 内、`onTrace?` 定義の直後に追加:

```ts
  /** drain 中の各イベントを上流に渡す（1B 観測の session_event 永続化に接続）。 */
  onEvent?: (ev: import("../trace/types.js").SessionEventInput) => void;
```

- [ ] **Step 4: drain ループに emit を実装**

`apps/x-account-system/lib/ma/run-session.ts`、drain ループ開始直前（`const it = stream[Symbol.asyncIterator]();` の直後あたり）に seq カウンタと emit ヘルパを追加:

```ts
    let evSeq = 0;
    const emit = (type: import("../trace/types.js").SessionEventType, payload: unknown) => {
      deps.onEvent?.({ seq: evSeq++, type, payload });
    };
```

`agent.message` 分岐を、text 累積に emit を足す形へ差し替え:

```ts
      if (t === "agent.message") {
        for (const b of (ev.content as Array<Record<string, unknown>>) ?? []) {
          if (b.type === "text" && typeof b.text === "string") {
            agentText += b.text;
            emit("text", { text: b.text });
          } else if (b.type === "thinking") {
            const tx = (typeof b.thinking === "string" ? b.thinking : typeof b.text === "string" ? b.text : "");
            emit("thinking", { text: tx });
          }
        }
        transitions.push("agent.message");
      } else if (t === "agent.custom_tool_use") {
```

`custom_tool_use` 分岐内、`toolCalls.push(...)` の直後に:

```ts
        emit("custom_tool_use", { tool_use_id: ev.id, name, input: ev.input });
```

同分岐内、result を `events.send` した直後（`transitions.push("custom_tool_result.sent");` の直前）に:

```ts
        emit("custom_tool_result", { tool_use_id: ev.id, result, is_error: isError });
```

`span.model_request_end` 分岐内、`modelUsage = ev.model_usage;` の直後に:

```ts
        emit("model_request_end", { model_usage: ev.model_usage });
```

- [ ] **Step 5: テストが通ることを確認**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/ma/run-session.test.ts 2>&1 | tail -15`
Expected: PASS（既存テスト＋新規 onEvent 2 件すべて緑）

- [ ] **Step 6: Commit**

```bash
cd /Users/rikukudo/Projects/all-good-ops-xad-run-trace-ui
git add apps/x-account-system/lib/ma/run-session.ts apps/x-account-system/lib/ma/run-session.test.ts
git commit -m "feat(xad): runMaSession に onEvent フック（drain イベント emit）"
```

---

## Task 5: compose caller に writer session 永続化を配線

**Files:**
- Modify: `apps/x-account-system/lib/curation/run-compose.ts`

> per-material ループ（本plan時点で約 157-175 行が runSession 呼び）。session 終了後にイベント永続化＋run_session 記録。draft↔session は既存 `writer_session_id` が担うため run_session は ref なし。

- [ ] **Step 1: import を追加**

`apps/x-account-system/lib/curation/run-compose.ts` の import 群に追加:

```ts
import { insertSessionEvents, recordRunSession } from "../trace/session-event-store.js";
import type { SessionEventInput } from "../trace/types.js";
```

- [ ] **Step 2: onEvent バッファを runSession に配線**

`run-compose.ts` の per-material ループ内、`runSession({...})` 呼び出しを次のように改修（`customToolHandler,` の直後に `onEvent` を足す）:

```ts
    const sessionEvents: SessionEventInput[] = [];
    let res;
    try {
      res = await runSession({
        apiKey: deps.apiKey,
        agentRef: { id: agentRef.agentId, version: agentRef.version },
        environmentId: agentRef.environmentId,
        userMessage,
        customToolHandler,
        timeoutMs: cfg.timeoutMs,
        now: deps.now,
        onEvent: (e) => sessionEvents.push(e),
      });
    } catch (e) {
      res = { ok: false, terminal: "error" as const, error: String(e) } as Awaited<ReturnType<typeof runMaSession>>;
    }
```

- [ ] **Step 3: session 終了直後に永続化**

`run-compose.ts`、`deps.onTrace?.({ model: cfg.writerModel, ... });`（costJpy 通知）の直後に追加:

```ts
    // 1B 観測: writer session のイベントと run→session ブリッジを永続化（fail-open）。
    if (res.ids?.session) {
      await insertSessionEvents(res.ids.session, "writer", sessionEvents);
      await recordRunSession({ runId: deps.runId ?? "", stageId: "compose", sessionId: res.ids.session, agentKey: "writer" });
    }
```

- [ ] **Step 4: 既存 compose テストが緑のままか確認**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/curation 2>&1 | tail -15`
Expected: PASS（既存テスト緑。fail-open のため store 未設定でも影響なし）

- [ ] **Step 5: Commit**

```bash
cd /Users/rikukudo/Projects/all-good-ops-xad-run-trace-ui
git add apps/x-account-system/lib/curation/run-compose.ts
git commit -m "feat(xad): compose に writer session 永続化を配線"
```

---

## Task 6: collect caller に collector session 永続化を配線（runId 配線含む）

**Files:**
- Modify: `apps/x-account-system/lib/ingest/collector.ts`
- Modify: `apps/x-account-system/src/queue.ts`（collect case で runId を runCollect に渡す）

- [ ] **Step 1: queue が runCollect に runId を渡しているか確認**

Run: `cd apps/x-account-system && sed -n '82,110p' src/queue.ts`
Expected: collect case の `runCollect(...)` 呼び出しを確認。`runId`/`rid` が deps に渡っていなければ Step 4 で追加。

- [ ] **Step 2: collector.ts に import と runId 受け取りを追加**

`apps/x-account-system/lib/ingest/collector.ts` の import 群に追加:

```ts
import { insertSessionEvents, recordRunSession } from "../trace/session-event-store.js";
import type { SessionEventInput } from "../trace/types.js";
```

`runCollect` の deps 型（引数オブジェクトの型定義）に `runId?: string;` を追加する。型が inline の場合は該当プロパティ群に `runId?: string;` を足す。

- [ ] **Step 3: onEvent バッファと永続化を配線**

`collector.ts`、explore の `runSession({...})` 呼び出しに `onEvent` を追加し、`if (res) { ... }` ブロック内（`collectorSessionId = res.ids?.session;` の直後）に永続化を追加:

```ts
  const sessionEvents: SessionEventInput[] = [];
  let res: Awaited<ReturnType<typeof runMaSession>> | undefined;
  try {
    res = await runSession({
      apiKey: deps.apiKey,
      agentRef: { id: agentRef.agentId, version: agentRef.version },
      environmentId: agentRef.environmentId,
      userMessage,
      customToolHandler,
      onEvent: (e) => sessionEvents.push(e),
    });
  } catch (e) {
    console.warn(JSON.stringify({ level: "error", msg: "[collect] explore session failed", error: String(e) }));
  }
  if (res) {
    collectorSessionId = res.ids?.session;
    tokensIn = (res.sessionUsage as { input_tokens?: number } | undefined)?.input_tokens ?? 0;
    tokensOut = (res.sessionUsage as { output_tokens?: number } | undefined)?.output_tokens ?? 0;
    if (collectorSessionId) {
      // 1B 観測: collector explore session を永続化（fail-open）。
      await insertSessionEvents(collectorSessionId, "collector", sessionEvents);
      await recordRunSession({ runId: deps.runId ?? "", stageId: "collect", sessionId: collectorSessionId, agentKey: "collector" });
    }
  }
```

- [ ] **Step 4: queue.ts collect case で runId を渡す**

`apps/x-account-system/src/queue.ts` の collect case、`runCollect` を呼ぶ deps オブジェクトに `runId: rid,` を追加（既に渡っていれば skip）。

- [ ] **Step 5: 既存テスト緑を確認**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/ingest 2>&1 | tail -15 && npx tsc -p src/tsconfig.json --noEmit 2>&1 | head -5`
Expected: jest PASS、tsc 新規エラーなし

- [ ] **Step 6: Commit**

```bash
cd /Users/rikukudo/Projects/all-good-ops-xad-run-trace-ui
git add apps/x-account-system/lib/ingest/collector.ts apps/x-account-system/src/queue.ts
git commit -m "feat(xad): collect に collector session 永続化を配線"
```

---

## Task 7: check caller に checker session 永続化＋checker_session_id を配線

**Files:**
- Modify: `apps/x-account-system/lib/check/run-check.ts`

- [ ] **Step 1: import を追加**

`apps/x-account-system/lib/check/run-check.ts` の import 群に追加:

```ts
import { insertSessionEvents, recordRunSession } from "../trace/session-event-store.js";
import type { SessionEventInput } from "../trace/types.js";
```

- [ ] **Step 2: onEvent バッファを runSession に配線**

`run-check.ts` の per-draft ループ内、`runSession({...})` 呼び出しに `onEvent` を追加:

```ts
    const sessionEvents: SessionEventInput[] = [];
    let res;
    try {
      res = await runSession({
        apiKey: deps.apiKey,
        agentRef: { id: agentRef.agentId, version: agentRef.version },
        environmentId: agentRef.environmentId,
        userMessage,
        customToolHandler,
        timeoutMs: cfg.timeoutMs,
        now: deps.now,
        onEvent: (e) => sessionEvents.push(e),
      });
    } catch (e) {
      res = { ok: false, terminal: "error" as const, error: String(e) } as Awaited<ReturnType<typeof runMaSession>>;
    }
    const maSessionId = res.ids?.session;
```

- [ ] **Step 3: session 永続化＋checker_session_id 書込を追加**

`run-check.ts`、`const maSessionId = res.ids?.session;` の直後に追加（verdict ルーティングより前。全 draft で 1 回・fail-open）:

```ts
    // 1B 観測: checker session を永続化＋draft に checker_session_id を相関（fail-open）。
    if (maSessionId) {
      await insertSessionEvents(maSessionId, "checker", sessionEvents);
      await recordRunSession({ runId: deps.runId ?? "", stageId: "check", sessionId: maSessionId, agentKey: "checker" });
      try {
        await sb.from("post_drafts").update({ checker_session_id: maSessionId }).eq("id", d.id);
      } catch {
        /* fail-open: 相関欠落でも点検本処理は継続 */
      }
    }
```

- [ ] **Step 4: 既存 check テスト緑を確認**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/check 2>&1 | tail -15`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/rikukudo/Projects/all-good-ops-xad-run-trace-ui
git add apps/x-account-system/lib/check/run-check.ts
git commit -m "feat(xad): check に checker session 永続化＋checker_session_id を配線"
```

---

## Task 8: dashboard queries（runSessions / sessionEvents / composeProvenance）

**Files:**
- Modify: `apps/xad-dashboard/lib/supabase.ts`
- Modify: `apps/xad-dashboard/lib/queries.ts`
- Test: `apps/xad-dashboard/lib/queries.composeProvenance.test.ts`

- [ ] **Step 1: supabase.ts にテスト注入口を追加**

`apps/xad-dashboard/lib/supabase.ts` を次の内容へ:

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _testClient: SupabaseClient | null = null;

/** テスト用に reader client を差し替える。 */
export function __setSupabaseForTest(c: SupabaseClient | null): void {
  _testClient = c;
}

export function serverSupabase(): SupabaseClient {
  if (_testClient) return _testClient;
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    db: { schema: "xad" },
    auth: { persistSession: false },
  });
}
```

- [ ] **Step 2: composeProvenance の失敗テストを書く**

`apps/xad-dashboard/lib/queries.composeProvenance.test.ts`:

```ts
import { describe, test, expect, afterEach } from "vitest";
import { composeProvenance } from "./queries";
import { __setSupabaseForTest } from "./supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

// from(table) ごとに返す行を差し替えできる最小 fake。
function fakeSb(data: Record<string, unknown>) {
  const sb = {
    from(table: string) {
      const builder = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        single: () => Promise.resolve({ data: (data[table] as { single?: unknown })?.single ?? null, error: null }),
        then: (resolve: (v: { data: unknown; error: null }) => unknown) =>
          resolve({ data: (data[table] as { list?: unknown })?.list ?? [], error: null }),
      };
      return builder;
    },
  } as unknown as SupabaseClient;
  return sb;
}

describe("composeProvenance", () => {
  afterEach(() => __setSupabaseForTest(null));

  test("draft→core_idea→materials を辿り各素材の collector_session を返す", async () => {
    __setSupabaseForTest(
      fakeSb({
        post_drafts: { single: { id: "d1", core_idea_id: "c1", writer_session_id: "ws1" } },
        core_ideas: { single: { id: "c1", source_material_ids: ["m1", "m2"] } },
        materials_store: {
          list: [
            { id: "m1", source_ref: "https://x.com/a", meta: { collector_session_id: "cs1" } },
            { id: "m2", source_ref: "https://x.com/b", meta: { collector_session_id: "cs2" } },
          ],
        },
      }),
    );
    const out = await composeProvenance("d1");
    expect(out.writerSessionId).toBe("ws1");
    expect(out.materials).toEqual([
      { id: "m1", sourceRef: "https://x.com/a", collectorSessionId: "cs1" },
      { id: "m2", sourceRef: "https://x.com/b", collectorSessionId: "cs2" },
    ]);
  });
});
```

- [ ] **Step 3: テストが落ちることを確認**

Run: `cd apps/xad-dashboard && npx vitest run lib/queries.composeProvenance.test.ts 2>&1 | tail -15`
Expected: FAIL（`composeProvenance` が export されていない）

- [ ] **Step 4: queries.ts に関数を追加**

`apps/xad-dashboard/lib/queries.ts` の末尾に追加し、`runTimeline` を run_session 同梱へ拡張:

```ts
export async function runSessions(runId: string) {
  const sb = serverSupabase();
  const { data } = await sb
    .from("run_session")
    .select("*")
    .eq("run_id", runId)
    .order("id", { ascending: true });
  return data ?? [];
}

export async function sessionEvents(sessionId: string) {
  const sb = serverSupabase();
  const { data } = await sb
    .from("session_event")
    .select("*")
    .eq("session_id", sessionId)
    .order("seq", { ascending: true });
  return data ?? [];
}

export interface ProvenanceMaterial {
  id: string;
  sourceRef: string | null;
  collectorSessionId: string | null;
}
export interface ComposeProvenance {
  writerSessionId: string | null;
  materials: ProvenanceMaterial[];
}

export async function composeProvenance(draftId: string): Promise<ComposeProvenance> {
  const sb = serverSupabase();
  const { data: draft } = await sb
    .from("post_drafts")
    .select("id,core_idea_id,writer_session_id")
    .eq("id", draftId)
    .single();
  const writerSessionId = (draft as { writer_session_id?: string } | null)?.writer_session_id ?? null;
  const coreIdeaId = (draft as { core_idea_id?: string } | null)?.core_idea_id;
  if (!coreIdeaId) return { writerSessionId, materials: [] };

  const { data: ci } = await sb
    .from("core_ideas")
    .select("source_material_ids")
    .eq("id", coreIdeaId)
    .single();
  const ids = ((ci as { source_material_ids?: string[] } | null)?.source_material_ids ?? []) as string[];
  if (ids.length === 0) return { writerSessionId, materials: [] };

  const { data: mats } = await sb
    .from("materials_store")
    .select("id,source_ref,meta")
    .in("id", ids);
  const materials: ProvenanceMaterial[] = (mats ?? []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    sourceRef: (m.source_ref as string | null) ?? null,
    collectorSessionId: ((m.meta as { collector_session_id?: string } | null)?.collector_session_id) ?? null,
  }));
  return { writerSessionId, materials };
}
```

`runTimeline` を次のように拡張（既存の return を差し替え）:

```ts
export async function runTimeline(runId: string) {
  const sb = serverSupabase();
  const run = await sb.from("run").select("*").eq("id", runId).single();
  const { data: traces } = await sb
    .from("run_trace")
    .select("*")
    .eq("run_id", runId)
    .order("started_at", { ascending: true })
    .order("id", { ascending: true });
  const { data: sessions } = await sb
    .from("run_session")
    .select("*")
    .eq("run_id", runId)
    .order("id", { ascending: true });
  return { run: run.data, traces: traces ?? [], sessions: sessions ?? [] };
}
```

- [ ] **Step 5: テストが通ることを確認**

Run: `cd apps/xad-dashboard && npx vitest run lib/queries.composeProvenance.test.ts 2>&1 | tail -15`
Expected: PASS（1 test）

- [ ] **Step 6: Commit**

```bash
cd /Users/rikukudo/Projects/all-good-ops-xad-run-trace-ui
git add apps/xad-dashboard/lib/supabase.ts apps/xad-dashboard/lib/queries.ts apps/xad-dashboard/lib/queries.composeProvenance.test.ts
git commit -m "feat(xad-dashboard): runSessions/sessionEvents/composeProvenance クエリ"
```

---

## Task 9: dashboard UI（SessionTrace / MaterialProvenance / runs 詳細統合）

**Files:**
- Create: `apps/xad-dashboard/lib/console-link.ts`
- Create: `apps/xad-dashboard/app/runs/[id]/SessionTrace.tsx`
- Create: `apps/xad-dashboard/app/runs/[id]/MaterialProvenance.tsx`
- Modify: `apps/xad-dashboard/app/runs/[id]/page.tsx`

> UI は `ui-ux-pro-max` スキルで可読性（密度・折りたたみ・等幅）を設計。既存 `app/runs/status.tsx` の色・StatusBadge を流用。

- [ ] **Step 1: Console link ヘルパを作成**

`apps/xad-dashboard/lib/console-link.ts`:

```ts
/** Console の session UI への link。base 未設定なら null（壊れリンクを出さない）。 */
export function consoleSessionUrl(sessionId: string | null | undefined): string | null {
  const base = process.env.XAD_CONSOLE_SESSION_BASE;
  if (!base || !sessionId) return null;
  return `${base.replace(/\/$/, "")}/${sessionId}`;
}
```

- [ ] **Step 2: SessionTrace コンポーネントを作成**

`apps/xad-dashboard/app/runs/[id]/SessionTrace.tsx`:

```tsx
"use client";

interface SessionEventRow {
  id: number;
  seq: number;
  type: string;
  payload: Record<string, unknown> | null;
}

const TYPE_LABEL: Record<string, string> = {
  thinking: "🧠 思考",
  text: "💬 出力",
  custom_tool_use: "🔧 ツール呼び出し",
  custom_tool_result: "📥 取得結果（出所）",
  model_request_end: "📊 モデル",
};

function payloadText(type: string, p: Record<string, unknown> | null): string {
  if (!p) return "";
  if (type === "thinking" || type === "text") return String(p.text ?? "");
  if (type === "custom_tool_use") return `${String(p.name ?? "")}(${JSON.stringify(p.input ?? {})})`;
  if (type === "custom_tool_result") return String(p.result ?? "");
  if (type === "model_request_end") return JSON.stringify(p.model_usage ?? {});
  return JSON.stringify(p);
}

export function SessionTrace({
  events,
  sessionId,
  consoleUrl,
}: {
  events: SessionEventRow[];
  sessionId: string;
  consoleUrl: string | null;
}) {
  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2">
      <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
        <span className="font-mono">session {sessionId.slice(0, 12)}…</span>
        {consoleUrl && (
          <a href={consoleUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
            Console ↗
          </a>
        )}
      </div>
      {events.length === 0 ? (
        <p className="text-xs text-slate-400">このセッションのイベントは記録されていません。</p>
      ) : (
        <ol className="space-y-1">
          {events.map((e) => (
            <li key={e.id} className="rounded bg-white p-1.5 text-xs">
              <span className="mr-2 font-medium text-slate-600">{TYPE_LABEL[e.type] ?? e.type}</span>
              <pre className="mt-0.5 whitespace-pre-wrap break-words font-mono text-[11px] text-slate-700">
                {payloadText(e.type, e.payload)}
              </pre>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
```

- [ ] **Step 3: MaterialProvenance コンポーネントを作成**

`apps/xad-dashboard/app/runs/[id]/MaterialProvenance.tsx`:

```tsx
"use client";

import { useState } from "react";

interface Material {
  id: string;
  sourceRef: string | null;
  collectorSessionId: string | null;
}
interface SessionEventRow {
  id: number;
  seq: number;
  type: string;
  payload: Record<string, unknown> | null;
}

export function MaterialProvenance({
  materials,
  loadEvents,
}: {
  materials: Material[];
  loadEvents: (sessionId: string) => Promise<SessionEventRow[]>;
}) {
  if (materials.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="mb-1 text-xs font-semibold text-slate-500">渡された素材（出所）</p>
      <ul className="space-y-1">
        {materials.map((m) => (
          <MaterialRow key={m.id} material={m} loadEvents={loadEvents} />
        ))}
      </ul>
    </div>
  );
}

function MaterialRow({
  material,
  loadEvents,
}: {
  material: Material;
  loadEvents: (sessionId: string) => Promise<SessionEventRow[]>;
}) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<SessionEventRow[] | null>(null);
  const cs = material.collectorSessionId;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && cs && events === null) setEvents(await loadEvents(cs));
  }

  return (
    <li className="rounded border border-slate-200 bg-white p-1.5 text-xs">
      <div className="flex items-center gap-2">
        <span className="truncate text-slate-700">{material.sourceRef ?? material.id}</span>
        {cs ? (
          <button onClick={toggle} className="ml-auto shrink-0 text-indigo-600 hover:underline">
            {open ? "閉じる" : "どう集めたか ↓"}
          </button>
        ) : (
          <span className="ml-auto shrink-0 text-slate-400">出所不明</span>
        )}
      </div>
      {open && cs && (
        <div className="mt-1">
          {events === null ? (
            <p className="text-slate-400">読み込み中…</p>
          ) : events.length === 0 ? (
            <p className="text-slate-400">collector イベントなし。</p>
          ) : (
            <ol className="space-y-0.5">
              {events
                .filter((e) => e.type === "thinking" || e.type === "custom_tool_use")
                .map((e) => (
                  <li key={e.id} className="font-mono text-[11px] text-slate-600">
                    {e.type === "thinking"
                      ? `🧠 ${String(e.payload?.text ?? "")}`
                      : `🔍 ${String(e.payload?.name ?? "")}(${JSON.stringify(e.payload?.input ?? {})})`}
                  </li>
                ))}
            </ol>
          )}
        </div>
      )}
    </li>
  );
}
```

- [ ] **Step 4: server action でイベント遅延ロードを用意し、runs 詳細を統合**

`apps/xad-dashboard/app/runs/[id]/page.tsx` を次のように改修。各 trace の下に「その stage の run_session」を出し、compose の writer session には provenance を付ける:

```tsx
import Link from "next/link";
import { runTimeline, sessionEvents, composeProvenance } from "@/lib/queries";
import { consoleSessionUrl } from "@/lib/console-link";
import { StatusBadge, statusTone } from "../status";
import { SessionTrace } from "./SessionTrace";
import { MaterialProvenance } from "./MaterialProvenance";

export const dynamic = "force-dynamic";

const TONE_BORDER: Record<string, string> = {
  ok: "#16a34a",
  error: "#dc2626",
  running: "#2563eb",
  skipped: "#475569",
  warn: "#ca8a04",
  idle: "#9ca3af",
};

// client から呼ぶ素材→collector イベントの遅延ロード（server action）。
async function loadCollectorEvents(sessionId: string) {
  "use server";
  const rows = await sessionEvents(sessionId);
  return rows as { id: number; seq: number; type: string; payload: Record<string, unknown> | null }[];
}

export default async function RunDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { run, traces, sessions } = await runTimeline(id).catch(() => ({
    run: null,
    traces: [] as any[],
    sessions: [] as any[],
  }));

  // 各 stage の session ごとに events と（compose は）provenance を事前取得。
  const sessionBlocks = await Promise.all(
    (sessions as any[]).map(async (s) => {
      const events = await sessionEvents(s.session_id);
      const provenance =
        s.stage_id === "compose"
          ? await (async () => {
              // この writer session に紐づく draft を辿る（writer_session_id 相関）。
              const { serverSupabase } = await import("@/lib/supabase");
              const sb = serverSupabase();
              const { data: d } = await sb
                .from("post_drafts")
                .select("id")
                .eq("writer_session_id", s.session_id)
                .single();
              return d ? await composeProvenance((d as { id: string }).id) : null;
            })()
          : null;
      return { session: s, events, provenance };
    }),
  );
  const blocksByStage = sessionBlocks.reduce<Record<string, typeof sessionBlocks>>((acc, b) => {
    (acc[b.session.stage_id] ??= []).push(b);
    return acc;
  }, {});

  return (
    <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-6">
      <Link
        href="/runs"
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 no-underline hover:text-slate-800"
      >
        <span aria-hidden>←</span> Runs 一覧へ戻る
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">{run?.job ?? "（不明な run）"}</h1>
        {run && <StatusBadge status={run.status} />}
        {run?.started_at && (
          <span className="font-mono text-xs tabular-nums text-slate-400">
            {new Date(run.started_at).toLocaleString("ja-JP")}
          </span>
        )}
      </div>

      {traces.length === 0 ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white py-16 text-center">
          <div className="mb-3 select-none text-4xl text-slate-300">○</div>
          <p className="text-sm text-slate-500">
            {run ? "この run には工程 trace がありません。" : "指定された run が見つかりません。"}
          </p>
        </div>
      ) : (
        <ol className="mt-5 space-y-3">
          {(traces as any[]).map((t) => {
            const tone = statusTone(t.status, t.outcome);
            const blocks = blocksByStage[t.stage_id] ?? [];
            return (
              <li
                key={t.id}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                style={{ borderLeftWidth: 4, borderLeftColor: TONE_BORDER[tone] }}
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-slate-800">{t.stage_id}</span>
                  <StatusBadge status={t.status} outcome={t.outcome} />
                  {t.input_json?.revision ? <span className="text-xs text-slate-500">🔁修正</span> : null}
                  <span className="ml-auto font-mono text-xs tabular-nums text-slate-400">
                    {new Date(t.started_at).toLocaleTimeString("ja-JP")} · {t.duration_ms ?? "-"}ms
                  </span>
                </div>

                {t.error && (
                  <pre className="mt-1 whitespace-pre-wrap rounded bg-rose-50 p-2 text-xs text-rose-700">{t.error}</pre>
                )}

                {/* この工程が起こした MA session 群（思考/ツール/出所/出力） */}
                {blocks.map((b) => (
                  <div key={b.session.id}>
                    <SessionTrace
                      events={b.events as any}
                      sessionId={b.session.session_id}
                      consoleUrl={consoleSessionUrl(b.session.session_id)}
                    />
                    {b.provenance && (
                      <MaterialProvenance materials={b.provenance.materials} loadEvents={loadCollectorEvents} />
                    )}
                  </div>
                ))}

                {/* session が無い工程（editor 等）は従来の trace 出力を残す */}
                {blocks.length === 0 && t.output_json != null && (
                  <pre className="mt-1 whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs text-slate-600">
                    out: {JSON.stringify(t.output_json, null, 2)}
                  </pre>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
```

- [ ] **Step 5: dashboard をビルドして型/描画エラーが無いか確認**

Run: `cd apps/xad-dashboard && npx vitest run 2>&1 | tail -8 && npm run build 2>&1 | tail -20`
Expected: vitest PASS、`next build` 成功（runs/[id] が型エラーなくビルド）

- [ ] **Step 6: Commit**

```bash
cd /Users/rikukudo/Projects/all-good-ops-xad-run-trace-ui
git add apps/xad-dashboard/lib/console-link.ts apps/xad-dashboard/app/runs/
git commit -m "feat(xad-dashboard): runs/[id] を工程タイムライン＋session trace＋素材 provenance に"
```

---

## Task 10: 統合検証（migration 適用＋E2E）

**Files:** なし（適用・検証のみ）

- [ ] **Step 1: 全 worker テスト緑＋typecheck**

Run: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/trace lib/ma lib/curation lib/check lib/ingest 2>&1 | tail -20 && npx tsc -p src/tsconfig.json --noEmit 2>&1 | head -5`
Expected: 全 PASS、tsc 新規エラーなし

- [ ] **Step 2: migration 0021 を本番 Supabase に適用（人間確認必須）**

`superpowers:verification-before-completion` 準拠。Supabase MCP `apply_migration`（name=`0021_session_trace`）で `migrations/0021_session_trace.sql` を適用。**DDL 前に `list_tables` で `xad.post_drafts` に `checker_session_id` が無いことを確認**（`feedback_db_migration_pre_inspect`）。適用後 `xad.session_event` / `xad.run_session` の存在を確認。

- [ ] **Step 3: 1 サイクル実行してデータ生成**

worker の collect→compose→check を 1 サイクル走らせる（本番 cron 待ち or 手動 enqueue）。`xad.run_session` に 3 stage 分、`xad.session_event` に各 session のイベントが入ることを SQL で確認:

Run（Supabase MCP execute_sql、1 文ずつ）:
```sql
select stage_id, count(*) from xad.run_session group by stage_id;
```
Expected: collect/compose/check の行がある。

- [ ] **Step 4: dashboard で E2E 目視**

`runs/[id]` を開き、spec の検証項目を確認:
- 各工程に session が出て、思考 / ツール呼び出し（クエリ）/ 取得結果（出所）/ 出力 / Console link が見える
- compose の draft から「渡された素材」→ 各素材「どう集めたか」→ collector の思考/クエリ（別 run）が展開できる
- redaction が効いている（PII 生データが出ない）

- [ ] **Step 5: 仕上げ**

`superpowers:finishing-a-development-branch` で PR を作成（merge/PR/discard を決定）。PR 本文に検証結果（Step 3-4 の出力）を添付。
```
