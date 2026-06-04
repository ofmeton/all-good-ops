# x-account 工程可視化ダッシュボード Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** x-account 発信システムの各工程の入出力・ロジック・プロンプトを観測できる Web ダッシュボードを作り、改善ループの初速を上げる。

**Architecture:** 3 系統。(A) Worker に fail-open のトレース計装を追加し Supabase `xad.run`/`xad.run_trace` に記録、(B) 工程定義の宣言的レジストリ（コード co-locate → `registry.generated.json`）、(C) その JSON とトレースを読む Next.js+Vercel ダッシュボード（React Flow フローチャート + ノード詳細 + run タイムライン）。

**Tech Stack:** Cloudflare Workers (TypeScript) / Cloudflare Queues / Supabase (Postgres, service role) / Next.js App Router / React Flow / Tailwind / Jest (ts-jest CJS) / Playwright（スモーク）

**設計書:** `docs/superpowers/specs/2026-06-05-x-account-observability-dashboard-design.md`（Codex 4 ラウンド All Clear）

---

## スコープと前提

- 対象は **MVP = 投稿生成系パイプライン**（buzz/inspirations-ingest → ideation → post-job 内 writer/hook/editor → LINE 承認 → publisher）。`daily-digest`/`rollback-monitor`/`rotation-notice`/`optimizer` 計装は Phase 2。
- Worker 実装は `apps/x-account-system/`、ダッシュボードは `apps/xad-dashboard/`（新規）。
- 既存テスト（359）を壊さない。計装は加算のみ。
- DB は MCP `apply_migration` で適用（既存 0006〜0012 と同経路）。
- ts-jest CJS 制約: `import.meta` 不可 / `__dirname` 再定義不可 / `jest.config.js` でなく `jest.config.cjs`。

## File Structure

### Track A — Worker（`apps/x-account-system/`）

| ファイル | 責務 |
|---|---|
| `migrations/0013_run_trace.sql` | `xad.run` / `xad.run_trace` / `post_drafts.run_id` / RLS |
| `lib/trace/types.ts` | `TraceMeta` / `RunTrigger` / `RunStatus` / `StageOutcome` 型 |
| `lib/trace/trace-store.ts` | `getTraceSupabase()` + `insertRun` / `updateRun` / `insertTrace`（fail-open） |
| `lib/trace/with-trace.ts` | `withTrace()` / `recordTraceSafe()` / `schedule()` |
| `lib/trace/llm-trace.ts` | `callClaudeTraced()`（prompt+usage 捕捉） |
| `lib/trace/redact-io.ts` | trace 保存前に IO/prompt を DLP redact |
| `lib/registry/types.ts` | `StageMeta` 型 |
| `lib/registry/stages/*.ts` | 各工程の `StageMeta`（co-locate 集約先） |
| `lib/registry/index.ts` | 全 `StageMeta` 集約 + 整合バリデータ |
| `scripts/build-registry.ts` | `registry.generated.json` 出力 |
| `src/worker.ts`（改修） | `scheduled()`/`fetch()` で runId 発番・run insert、`handleJob(ctx, retry)` 配線 |
| `src/queue.ts`（改修） | `handleJob(msg, env, ctx, retryInfo)`、safety skip 記録、計装呼び出し |
| `src/jobs/post-job.ts`（改修） | writer/hook/editor/line-approval を `withTrace` で包む、editor outcome 導出 |
| `src/jobs/line-event.ts`（改修） | revise/publisher trace を元 run_id に追記 |

### Track B — Dashboard（`apps/xad-dashboard/`）

| ファイル | 責務 |
|---|---|
| `package.json` / `next.config.ts` / `tailwind.config.ts` / `tsconfig.json` | scaffold |
| `middleware.ts` | Basic 認証 |
| `lib/supabase.ts` | server 専用 service role クライアント |
| `lib/registry.ts` | `registry.generated.json` ロード + 型 |
| `lib/queries.ts` | run/trace クエリ（latest-by-stage / run timeline） |
| `lib/colors.ts` | status+outcome → 色マッピング |
| `app/layout.tsx` / `app/page.tsx` | フローチャート画面 |
| `app/components/Flowchart.tsx` | React Flow ノード/辺 |
| `app/components/NodePanel.tsx` | 定義 tab + 実行 tab |
| `app/runs/page.tsx` / `app/runs/[id]/page.tsx` | run 一覧 / タイムライン |
| `tests/smoke.spec.ts` | Playwright スモーク |

---

# Track A — Worker 計装

## Task A1: migration 0013（run / run_trace / 相関 / RLS）

**Files:**
- Create: `apps/x-account-system/migrations/0013_run_trace.sql`

- [ ] **Step 1: SQL を作成**

```sql
-- 0013_run_trace.sql — 観測ダッシュボード用 run/trace + 承認相関
-- 適用: MCP apply_migration（既存 0006〜0012 と同経路）

create table if not exists xad.run (
  id            uuid primary key,
  job           text not null,
  trigger       text not null,                    -- cron | manual | webhook
  date          text not null,
  status        text not null default 'running',  -- running | ok | error | skipped
  attempt       int  not null default 1,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  error         text
);

create table if not exists xad.run_trace (
  id            bigint generated always as identity primary key,
  run_id        uuid not null references xad.run(id) on delete cascade,
  stage_id      text not null,
  attempt       int  not null default 1,
  status        text not null,                    -- ok | error | skipped
  outcome       text,                             -- approved|rejected|warned|requested|brownout 等
  started_at    timestamptz not null default now(),
  duration_ms   int,
  input_json    jsonb,
  output_json   jsonb,
  prompt_text   text,
  model         text,
  tokens_in     int,
  tokens_out    int,
  cost_jpy      numeric,
  error         text,
  created_at    timestamptz not null default now()
);

create index if not exists run_trace_run_order_idx on xad.run_trace (run_id, started_at, id);
create index if not exists run_trace_stage_recent_idx on xad.run_trace (stage_id, started_at desc);

alter table xad.post_drafts add column if not exists run_id uuid;

alter table xad.run enable row level security;
alter table xad.run_trace enable row level security;
-- policy は付与しない（service role 専用、anon は読めない）
```

- [ ] **Step 2: MCP で適用**

`mcp__plugin_supabase_supabase__apply_migration` に上記 SQL を渡す（name=`0013_run_trace`）。1 文ずつでなく全体を 1 migration として適用。

- [ ] **Step 3: 適用検証**

`mcp__plugin_supabase_supabase__execute_sql` で:
```sql
select table_name from information_schema.tables where table_schema='xad' and table_name in ('run','run_trace');
```
Expected: 2 行（run, run_trace）。さらに `select column_name from information_schema.columns where table_schema='xad' and table_name='post_drafts' and column_name='run_id';` で run_id 列を確認。

- [ ] **Step 4: Commit**

```bash
git add apps/x-account-system/migrations/0013_run_trace.sql
git commit -m "feat(xad/db): 0013 run/run_trace + post_drafts.run_id + RLS"
```

---

## Task A2: trace 型 + trace-store（fail-open 書込）

**Files:**
- Create: `apps/x-account-system/lib/trace/types.ts`
- Create: `apps/x-account-system/lib/trace/trace-store.ts`
- Test: `apps/x-account-system/lib/trace/trace-store.test.ts`

- [ ] **Step 1: 型を定義**

```ts
// lib/trace/types.ts
export type RunTrigger = "cron" | "manual" | "webhook";
export type RunStatus = "running" | "ok" | "error" | "skipped";
export type TraceStatus = "ok" | "error" | "skipped";

export interface RunRow {
  id: string;
  job: string;
  trigger: RunTrigger;
  date: string;
  status: RunStatus;
  attempt: number;
}

export interface TraceMeta {
  promptText?: string;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  costJpy?: number;
}

export interface TraceRow extends TraceMeta {
  runId: string;
  stageId: string;
  attempt?: number;
  status: TraceStatus;
  outcome?: string;
  startedAt: Date;
  durationMs?: number;
  input?: unknown;
  output?: unknown;
  error?: string;
}
```

- [ ] **Step 2: 失敗テストを書く（fail-open）**

```ts
// lib/trace/trace-store.test.ts
import { insertTrace, __setTraceSupabaseForTest } from "./trace-store.js";

test("insertTrace は Supabase が null でも throw しない（fail-open）", async () => {
  __setTraceSupabaseForTest(null);
  await expect(
    insertTrace({ runId: "r1", stageId: "writer", status: "ok", startedAt: new Date() }),
  ).resolves.toBeUndefined();
});

test("insertTrace は insert が reject しても握りつぶす", async () => {
  __setTraceSupabaseForTest({
    from: () => ({ insert: async () => ({ error: { message: "boom" } }) }),
  } as never);
  await expect(
    insertTrace({ runId: "r1", stageId: "writer", status: "ok", startedAt: new Date() }),
  ).resolves.toBeUndefined();
});
```

- [ ] **Step 3: テスト失敗を確認**

Run: `npx jest lib/trace/trace-store.test.ts`
Expected: FAIL（`insertTrace` 未定義）

- [ ] **Step 4: trace-store を実装**

```ts
// lib/trace/trace-store.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { RunRow, TraceRow } from "./types.js";

let _client: SupabaseClient | null | undefined;
export function __setTraceSupabaseForTest(c: SupabaseClient | null): void { _client = c; }

// ※ スキーマは createClient の db.schema で一度だけ指定し、以降は plain .from() を使う
//   （lib/optimizer/state-store.ts 等 既存全モジュールの規約。.schema() を二重に chain しない）
function getTraceSupabase(): SupabaseClient | null {
  if (_client !== undefined) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  _client = url && key ? createClient(url, key, { db: { schema: "xad" } }) : null;
  return _client;
}

export async function insertRun(run: RunRow): Promise<void> {
  try {
    const sb = getTraceSupabase();
    if (!sb) return;
    await sb.from("run").insert({
      id: run.id, job: run.job, trigger: run.trigger, date: run.date,
      status: run.status, attempt: run.attempt,
    });
  } catch { /* fail-open */ }
}

export async function updateRun(
  id: string, patch: { status?: string; attempt?: number; error?: string; finished?: boolean },
): Promise<void> {
  try {
    const sb = getTraceSupabase();
    if (!sb) return;
    const row: Record<string, unknown> = {};
    if (patch.status) row.status = patch.status;
    if (patch.attempt != null) row.attempt = patch.attempt;
    if (patch.error != null) row.error = patch.error;
    if (patch.finished) row.finished_at = new Date().toISOString();
    await sb.from("run").update(row).eq("id", id);
  } catch { /* fail-open */ }
}

export async function insertTrace(t: TraceRow): Promise<void> {
  try {
    const sb = getTraceSupabase();
    if (!sb) return;
    await sb.from("run_trace").insert({
      run_id: t.runId, stage_id: t.stageId, attempt: t.attempt ?? 1,
      status: t.status, outcome: t.outcome ?? null,
      started_at: t.startedAt.toISOString(), duration_ms: t.durationMs ?? null,
      input_json: t.input ?? null, output_json: t.output ?? null,
      prompt_text: t.promptText ?? null, model: t.model ?? null,
      tokens_in: t.tokensIn ?? null, tokens_out: t.tokensOut ?? null,
      cost_jpy: t.costJpy ?? null, error: t.error ?? null,
    });
  } catch { /* fail-open */ }
}
```

- [ ] **Step 5: テスト通過を確認**

Run: `npx jest lib/trace/trace-store.test.ts`
Expected: PASS（2 件）

- [ ] **Step 6: Commit**

```bash
git add apps/x-account-system/lib/trace/types.ts apps/x-account-system/lib/trace/trace-store.ts apps/x-account-system/lib/trace/trace-store.test.ts
git commit -m "feat(xad/trace): fail-open trace store (run/run_trace)"
```

---

## Task A3: redact-io（IO/prompt を DLP redact）

**Files:**
- Create: `apps/x-account-system/lib/trace/redact-io.ts`
- Test: `apps/x-account-system/lib/trace/redact-io.test.ts`

- [ ] **Step 1: 既存 redact API を確認（確定済）**

`apps/x-account-system/lib/dlp/redact.ts` の export は **`redact(text: string): RedactionResult`**。戻り値は文字列でなく**オブジェクト** `{ redactedText, findings }`（`findings[].matched` に生 PII が入るので **絶対に findings ごと保存しない**）。redact 後文字列は **`.redactedText`** で取り出す。

- [ ] **Step 2: 失敗テストを書く**

```ts
// lib/trace/redact-io.test.ts
import { redactForTrace } from "./redact-io.js";

test("文字列内の email を redact する", () => {
  const out = redactForTrace({ body: "連絡は a@b.com まで" }) as { body: string };
  expect(out.body).not.toContain("a@b.com");
});

test("ネストした構造も再帰 redact する", () => {
  const out = redactForTrace({ x: { y: "tel 090-1234-5678" } }) as { x: { y: string } };
  expect(out.x.y).not.toContain("090-1234-5678");
});

test("プリミティブ非文字列はそのまま", () => {
  expect(redactForTrace(42)).toBe(42);
});
```

- [ ] **Step 3: テスト失敗を確認**

Run: `npx jest lib/trace/redact-io.test.ts`
Expected: FAIL（`redactForTrace` 未定義）

- [ ] **Step 4: 実装**

```ts
// lib/trace/redact-io.ts
import { redact } from "../dlp/redact.js"; // RedactionResult を返す（.redactedText を使う）

/** trace 保存前に文字列を再帰的に DLP redact する。raw PII を DB に残さない。 */
export function redactForTrace(value: unknown): unknown {
  if (typeof value === "string") return redact(value).redactedText; // findings は捨てる（生PII保護）
  if (Array.isArray(value)) return value.map(redactForTrace);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = redactForTrace(v);
    return out;
  }
  return value;
}
```

- [ ] **Step 5: テスト通過を確認**

Run: `npx jest lib/trace/redact-io.test.ts`
Expected: PASS（3 件）

- [ ] **Step 6: Commit**

```bash
git add apps/x-account-system/lib/trace/redact-io.ts apps/x-account-system/lib/trace/redact-io.test.ts
git commit -m "feat(xad/trace): redactForTrace (recursive DLP for trace IO)"
```

---

## Task A4: withTrace（ctx.waitUntil 完了保証 + fail-open）

**Files:**
- Create: `apps/x-account-system/lib/trace/with-trace.ts`
- Test: `apps/x-account-system/lib/trace/with-trace.test.ts`

- [ ] **Step 1: 失敗テストを書く**

```ts
// lib/trace/with-trace.test.ts
import { withTrace } from "./with-trace.js";
import * as store from "./trace-store.js";

test("成功時に status=ok の trace を記録し result を返す", async () => {
  const spy = jest.spyOn(store, "insertTrace").mockResolvedValue();
  const r = await withTrace(undefined, { runId: "r1", stageId: "writer" }, async () => ({
    result: 7, output: { body: "x" },
  }));
  expect(r).toBe(7);
  expect(spy).toHaveBeenCalledWith(expect.objectContaining({ stageId: "writer", status: "ok" }));
  spy.mockRestore();
});

test("fn が throw したら status=error を記録しつつ再 throw する", async () => {
  const spy = jest.spyOn(store, "insertTrace").mockResolvedValue();
  await expect(
    withTrace(undefined, { runId: "r1", stageId: "writer" }, async () => { throw new Error("boom"); }),
  ).rejects.toThrow("boom");
  expect(spy).toHaveBeenCalledWith(expect.objectContaining({ status: "error" }));
  spy.mockRestore();
});

test("ctx があれば waitUntil で書込を延命する", async () => {
  jest.spyOn(store, "insertTrace").mockResolvedValue();
  const waitUntil = jest.fn();
  await withTrace({ waitUntil } as unknown as ExecutionContext, { runId: "r1", stageId: "writer" },
    async () => ({ result: 1 }));
  expect(waitUntil).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: テスト失敗を確認**

Run: `npx jest lib/trace/with-trace.test.ts`
Expected: FAIL（`withTrace` 未定義）

- [ ] **Step 3: 実装**

```ts
// lib/trace/with-trace.ts
import { insertTrace } from "./trace-store.js";
import { redactForTrace } from "./redact-io.js";
import type { TraceMeta, TraceStatus } from "./types.js";

function schedule(ctx: ExecutionContext | undefined, p: Promise<void>): void {
  if (ctx) ctx.waitUntil(p);
  else void p; // テスト/非Queue経路。insertTrace 自体が fail-open
}

export interface WithTraceCtx {
  runId: string;
  stageId: string;
  attempt?: number;
  input?: unknown;
}

export interface WithTraceResult<T> {
  result: T;
  output?: unknown;
  outcome?: string;
  status?: TraceStatus; // 省略時 ok
  meta?: TraceMeta;
}

export async function withTrace<T>(
  ctx: ExecutionContext | undefined,
  c: WithTraceCtx,
  fn: () => Promise<WithTraceResult<T>>,
): Promise<T> {
  const startedAt = new Date();
  try {
    const r = await fn();
    schedule(ctx, insertTrace({
      runId: c.runId, stageId: c.stageId, attempt: c.attempt,
      status: r.status ?? "ok", outcome: r.outcome, startedAt,
      durationMs: Date.now() - startedAt.getTime(),
      input: c.input == null ? undefined : redactForTrace(c.input),
      output: r.output == null ? undefined : redactForTrace(r.output),
      promptText: r.meta?.promptText ? String(redactForTrace(r.meta.promptText)) : undefined,
      model: r.meta?.model, tokensIn: r.meta?.tokensIn,
      tokensOut: r.meta?.tokensOut, costJpy: r.meta?.costJpy,
    }));
    return r.result;
  } catch (e) {
    schedule(ctx, insertTrace({
      runId: c.runId, stageId: c.stageId, attempt: c.attempt,
      status: "error", startedAt, durationMs: Date.now() - startedAt.getTime(),
      input: c.input == null ? undefined : redactForTrace(c.input),
      error: String(e),
    }));
    throw e;
  }
}

/** 計装外から直接 1 行記録したい時（safety skip / line-approval skip 等） */
export async function recordSkip(
  ctx: ExecutionContext | undefined,
  c: { runId: string; stageId: string; outcome: string },
): Promise<void> {
  schedule(ctx, insertTrace({
    runId: c.runId, stageId: c.stageId, status: "skipped",
    outcome: c.outcome, startedAt: new Date(), durationMs: 0,
  }));
}
```

- [ ] **Step 4: テスト通過を確認**

Run: `npx jest lib/trace/with-trace.test.ts`
Expected: PASS（3 件）

- [ ] **Step 5: Commit**

```bash
git add apps/x-account-system/lib/trace/with-trace.ts apps/x-account-system/lib/trace/with-trace.test.ts
git commit -m "feat(xad/trace): withTrace (waitUntil完了保証 + fail-open) + recordSkip"
```

---

## Task A5: llm-trace（prompt + usage 捕捉）

**Files:**
- Create: `apps/x-account-system/lib/trace/llm-trace.ts`
- Test: `apps/x-account-system/lib/trace/llm-trace.test.ts`

- [ ] **Step 1: 既存 Anthropic 呼び出しの形を確認（確定済 — 2 系統あるので両対応必須）**

- `lib/writer/writer-x.ts`: **text 完了**（`response.content.find(b => b.type === "text")?.text`）
- `lib/ideation/ideate.ts`: **tool_use**（`tool_choice: {type:"tool", name:"core_ideas"}` → `content.find(b => b.type === "tool_use")`）

→ ヘルパは `messages.create` 引数を**パススルー**し、応答から text と tool_use の両方を取り出せる形にする（片方しか扱わないと ideation で空 trace になる）。`cost_jpy` は既存 `lib/cost/cost-model` で tokens から算出して埋める。

- [ ] **Step 2: 失敗テストを書く**

```ts
// lib/trace/llm-trace.test.ts
import { callClaudeTraced } from "./llm-trace.js";

test("text 応答: text と usage を返す", async () => {
  const fakeClient = {
    messages: { create: async () => ({
      content: [{ type: "text", text: "hello" }],
      usage: { input_tokens: 10, output_tokens: 3 },
    }) },
  };
  const out = await callClaudeTraced(fakeClient as never, {
    params: { model: "claude-haiku-4-5", max_tokens: 100, system: "sys",
              messages: [{ role: "user", content: "user-prompt" }] },
    promptText: "sys\n\nuser-prompt",
  });
  expect(out.text).toBe("hello");
  expect(out.toolUse).toBeUndefined();
  expect(out.meta.tokensIn).toBe(10);
  expect(out.meta.tokensOut).toBe(3);
  expect(out.meta.promptText).toContain("user-prompt");
});

test("tool_use 応答: toolUse の input を捕捉する", async () => {
  const fakeClient = {
    messages: { create: async () => ({
      content: [{ type: "tool_use", name: "core_ideas", input: { ideas: [1, 2] } }],
      usage: { input_tokens: 5, output_tokens: 8 },
    }) },
  };
  const out = await callClaudeTraced(fakeClient as never, {
    params: { model: "claude-sonnet-4-5", max_tokens: 100,
              tool_choice: { type: "tool", name: "core_ideas" },
              messages: [{ role: "user", content: "p" }] },
    promptText: "p",
  });
  expect(out.text).toBe("");
  expect(out.toolUse).toEqual({ ideas: [1, 2] });
  expect(out.meta.tokensOut).toBe(8);
});
```

- [ ] **Step 3: テスト失敗を確認**

Run: `npx jest lib/trace/llm-trace.test.ts`
Expected: FAIL

- [ ] **Step 4: 実装**

```ts
// lib/trace/llm-trace.ts
import type { TraceMeta } from "./types.js";

interface ClaudeLike {
  messages: { create: (args: Record<string, unknown>) => Promise<{
    content: Array<{ type: string; text?: string; input?: unknown; name?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  }> };
}

export interface CallArgs {
  /** messages.create にそのまま渡す引数（model/max_tokens/system/messages/tools/tool_choice 等） */
  params: Record<string, unknown>;
  /** trace に残す最終プロンプト文字列（system+user を結合したもの。呼び出し側が組む） */
  promptText: string;
}

export async function callClaudeTraced(
  client: ClaudeLike, args: CallArgs,
): Promise<{ text: string; toolUse?: unknown; meta: TraceMeta }> {
  const res = await client.messages.create(args.params);
  const text = res.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
  const tu = res.content.find((c) => c.type === "tool_use");
  const tokensIn = res.usage?.input_tokens;
  const tokensOut = res.usage?.output_tokens;
  const model = String(args.params.model ?? "");
  return {
    text,
    toolUse: tu?.input,
    meta: {
      promptText: args.promptText,
      model,
      tokensIn,
      tokensOut,
      // costJpy はここでは算出しない（tokens のみ記録）。
      // コスト換算はダッシュボード側 cost-report / 既存 lib/cost/cost-model-data.ts に委ねる。
    },
  };
}
```

> `lib/cost/cost-model.ts` は存在しない（あるのは `cost-model-data.ts`）。MVP では trace に tokens_in/out のみ記録し、円換算はダッシュボードで行う（cost_jpy 列は null のまま可）。コスト換算を trace 側で持たせたい場合は別タスクで `cost-model-data.ts` ベースのヘルパを定義してから注入する。

- [ ] **Step 5: テスト通過を確認**

Run: `npx jest lib/trace/llm-trace.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/x-account-system/lib/trace/llm-trace.ts apps/x-account-system/lib/trace/llm-trace.test.ts
git commit -m "feat(xad/trace): callClaudeTraced (prompt+usage 捕捉)"
```

---

## Task A6: Stage Registry（型 + meta + 集約 + 整合テスト）

**Files:**
- Create: `apps/x-account-system/lib/registry/types.ts`
- Create: `apps/x-account-system/lib/registry/stages/index-stages.ts`（全 StageMeta を 1 ファイルに列挙。各 lib への co-locate は Phase 2 で分割）
- Create: `apps/x-account-system/lib/registry/index.ts`
- Test: `apps/x-account-system/lib/registry/index.test.ts`

> 設計書は各 `lib/<stage>/meta.ts` co-locate が理想だが、MVP は循環 import や各 lib 改変を避けるため**集約 1 ファイル**で開始する（YAGNI）。Phase 2 で分割。

- [ ] **Step 1: 型を定義**

```ts
// lib/registry/types.ts
export type StageGroup =
  | "ingest" | "ideation" | "generate" | "review" | "approve" | "publish" | "learn";
export type LogicKind = "llm" | "deterministic" | "io";

export interface StageMeta {
  id: string;
  label: string;
  group: StageGroup;
  purpose: string;
  inputs: string[];
  outputs: string[];
  keyVariables: { name: string; desc: string }[];
  logicKind: LogicKind;
  promptRef?: string;
  sourcePaths: string[];
  designDocAnchor?: string;
  upstream: string[];
  downstream: string[];
}
```

- [ ] **Step 2: 失敗テスト（整合バリデータ）を書く**

```ts
// lib/registry/index.test.ts
import { STAGES, validateRegistry } from "./index.js";

test("stage id は一意", () => {
  const ids = STAGES.map((s) => s.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test("upstream/downstream は対称（A.downstream に B があれば B.upstream に A）", () => {
  expect(validateRegistry()).toEqual([]); // エラー無し
});

test("各 stage の logicKind は許可値", () => {
  for (const s of STAGES) expect(["llm", "deterministic", "io"]).toContain(s.logicKind);
});
```

- [ ] **Step 3: テスト失敗を確認**

Run: `npx jest lib/registry/index.test.ts`
Expected: FAIL

- [ ] **Step 4: stages 定義と index を実装**

```ts
// lib/registry/stages/index-stages.ts
import type { StageMeta } from "../types.js";

export const STAGES: StageMeta[] = [
  {
    id: "buzz-ingest", label: "Buzz Ingest", group: "ingest",
    purpose: "twitterapi.io の seed アカウントから日次 buzz を取得し materials_store へ。",
    inputs: ["twitterapi.io seed accounts"], outputs: ["xad.materials_store (x_inspirations)"],
    keyVariables: [{ name: "seed accounts", desc: "取得対象アカウント群" }],
    logicKind: "io", sourcePaths: ["apps/x-account-system/lib/ingest/"],
    upstream: [], downstream: ["ideation"],
  },
  {
    id: "inspirations-ingest", label: "Inspirations Ingest", group: "ingest",
    purpose: "週次で X/note seeds を取得し materials_store へ。",
    inputs: ["X seeds", "note seeds"], outputs: ["xad.materials_store"],
    keyVariables: [{ name: "overseas≥6 / domestic≥18 / note≥3", desc: "取得本数下限" }],
    logicKind: "io", sourcePaths: ["apps/x-account-system/lib/ingest/"],
    upstream: [], downstream: ["ideation"],
  },
  {
    id: "ideation", label: "Ideation", group: "ideation",
    purpose: "materials_store から core_ideas を LLM 生成。",
    inputs: ["xad.materials_store"], outputs: ["xad.core_ideas"],
    keyVariables: [{ name: "batch limit", desc: "1 回の claim 対象数" }],
    logicKind: "llm", promptRef: "apps/x-account-system/lib/ideation/ideate.ts",
    sourcePaths: ["apps/x-account-system/lib/ideation/ideate.ts"],
    upstream: ["buzz-ingest", "inspirations-ingest"], downstream: ["writer"],
  },
  {
    id: "writer", label: "Writer", group: "generate",
    purpose: "core_idea から draft 本文を生成（funnel_stage で目的関数を着せ替える将来拡張あり）。",
    inputs: ["xad.core_ideas"], outputs: ["xad.post_drafts.body"],
    keyVariables: [
      { name: "max_tokens", desc: "format 別（medium/long/thread/article/note）" },
      { name: "format", desc: "短文/中尺/長文/スレッド/記事" },
    ],
    logicKind: "llm", promptRef: "apps/x-account-system/lib/writer/writer-x.ts",
    sourcePaths: ["apps/x-account-system/lib/writer/", "apps/x-account-system/src/jobs/post-job.ts"],
    upstream: ["ideation"], downstream: ["hook-classifier"],
  },
  {
    id: "hook-classifier", label: "Hook Classifier", group: "review",
    purpose: "hook を規則ベース(regex/scoring)で分類。LLM ではない。",
    inputs: ["draft body"], outputs: ["primary_hook (4分類)"],
    keyVariables: [{ name: "classifyRules", desc: "device/score 規則" }],
    logicKind: "deterministic",
    sourcePaths: ["apps/x-account-system/lib/hook-classifier/classify.ts"],
    upstream: ["writer"], downstream: ["editor"],
  },
  {
    id: "editor", label: "Editor (6+5)", group: "review",
    purpose: "6+5 ルール判定。hard 却下 / soft 警告。LLM judge + factuality judge を含む。",
    inputs: ["draft body", "materials (出典)"], outputs: ["decision(approved/rejected)", "warnings"],
    keyVariables: [
      { name: "hard rules", desc: "R3/R4/X2/X3/X5(real PII)" },
      { name: "soft rules", desc: "R1/R2/R5/R6/X1/X4/X6 → warnings" },
    ],
    logicKind: "llm", promptRef: "apps/x-account-system/lib/editor/llm-judge.ts",
    sourcePaths: ["apps/x-account-system/lib/editor/pipeline.ts"],
    upstream: ["hook-classifier"], downstream: ["line-approval"],
  },
  {
    id: "line-approval", label: "LINE Approval", group: "approve",
    purpose: "LINE Flex で承認依頼を push し、承認/却下/修正の応答を取り込む。",
    inputs: ["post_drafts"], outputs: ["承認状態", "publish トリガ"],
    keyVariables: [{ name: "LINE_USER_ID", desc: "承認者限定" }],
    logicKind: "io",
    sourcePaths: ["apps/x-account-system/src/jobs/line-event.ts", "apps/x-account-system/src/jobs/post-job.ts"],
    upstream: ["editor"], downstream: ["publisher"],
  },
  {
    id: "publisher", label: "Publisher (X)", group: "publish",
    purpose: "承認後に X へ投稿。OAuth token 自動 refresh 込み。",
    inputs: ["承認済 post_drafts"], outputs: ["X 投稿", "xad.posts_performance"],
    keyVariables: [{ name: "AUTONOMOUS_PUBLISH", desc: "Phase1=false(承認制)" }],
    logicKind: "io", sourcePaths: ["apps/x-account-system/lib/publisher/"],
    upstream: ["line-approval"], downstream: [],
  },
  // --- ゲート/横断ノード（パイプライン辺は持たず、図に独立表示。spec §4.1） ---
  {
    id: "safety", label: "Safety (brownout)", group: "review",
    purpose: "handleJob 冒頭の brownout 4段階ゲート。許可外 job を skip する。",
    inputs: ["当月コスト (cost_ledger)"], outputs: ["allowedJobs 判定", "skip"],
    keyVariables: [{ name: "brownout status", desc: "4段階(normal→…)" }],
    logicKind: "deterministic",
    sourcePaths: ["apps/x-account-system/lib/safety/brownout-handler.ts", "apps/x-account-system/src/queue.ts"],
    upstream: [], downstream: [],
  },
  {
    id: "dlp", label: "DLP", group: "review",
    purpose: "editor 内包の PII redact / lint（決定的）。MVP は定義のみ（trace は editor 内）。",
    inputs: ["draft body"], outputs: ["redacted text", "PII findings"],
    keyVariables: [{ name: "REDACTION_PATTERNS", desc: "PII 検出パターン" }],
    logicKind: "deterministic", sourcePaths: ["apps/x-account-system/lib/dlp/redact.ts"],
    upstream: [], downstream: [],
  },
  {
    id: "optimizer", label: "Optimizer", group: "learn",
    purpose: "Thompson Sampling で 8 パラメータ posterior を更新（optimizer-update cron）。MVP は定義のみ。",
    inputs: ["posts_performance (reward)"], outputs: ["optimizer_state"],
    keyVariables: [{ name: "8 parameters", desc: "段階別 posterior は Phase 2" }],
    logicKind: "deterministic", sourcePaths: ["apps/x-account-system/lib/optimizer/"],
    upstream: [], downstream: [],
  },
];
```

```ts
// lib/registry/index.ts
import { STAGES } from "./stages/index-stages.js";
export { STAGES };
export type { StageMeta } from "./types.js";

/** upstream/downstream 対称性を検証。エラー文字列の配列を返す（空＝正常）。 */
export function validateRegistry(): string[] {
  const byId = new Map(STAGES.map((s) => [s.id, s]));
  const errors: string[] = [];
  for (const s of STAGES) {
    for (const d of s.downstream) {
      const t = byId.get(d);
      if (!t) { errors.push(`${s.id}.downstream 未知: ${d}`); continue; }
      if (!t.upstream.includes(s.id)) errors.push(`${d}.upstream に ${s.id} が無い`);
    }
    for (const u of s.upstream) {
      const t = byId.get(u);
      if (!t) { errors.push(`${s.id}.upstream 未知: ${u}`); continue; }
      if (!t.downstream.includes(s.id)) errors.push(`${u}.downstream に ${s.id} が無い`);
    }
  }
  return errors;
}
```

- [ ] **Step 5: テスト通過を確認**

Run: `npx jest lib/registry/index.test.ts`
Expected: PASS（3 件）

- [ ] **Step 6: Commit**

```bash
git add apps/x-account-system/lib/registry/
git commit -m "feat(xad/registry): StageMeta + 投稿生成系8ノード + ゲート3(safety/dlp/optimizer) + 整合バリデータ"
```

---

## Task A7: build-registry スクリプト（registry.generated.json 出力）

**Files:**
- Create: `apps/x-account-system/scripts/build-registry.ts`
- Modify: `apps/x-account-system/package.json`（scripts に `build:registry` 追加）
- Test: `apps/x-account-system/scripts/build-registry.test.ts`

- [ ] **Step 1: 失敗テストを書く**

```ts
// scripts/build-registry.test.ts
import { buildRegistryJson } from "./build-registry.js";
import { STAGES } from "../lib/registry/index.js";

test("生成 JSON は version と stages を持つ", () => {
  const json = buildRegistryJson();
  expect(json.stages).toHaveLength(STAGES.length);
  expect(json.version).toBe(1);
});
```

- [ ] **Step 2: テスト失敗を確認**

Run: `npx jest scripts/build-registry.test.ts`
Expected: FAIL

- [ ] **Step 3: 実装**

```ts
// scripts/build-registry.ts
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { STAGES, validateRegistry } from "../lib/registry/index.js";

export function buildRegistryJson() {
  const errors = validateRegistry();
  if (errors.length) throw new Error("registry 不整合: " + errors.join("; "));
  return { version: 1 as const, stages: STAGES };
}

// CLI 実行時のみ書き出し（import 時は副作用なし）
if (process.argv[1] && process.argv[1].endsWith("build-registry.ts")) {
  const out = join(process.cwd(), "lib/registry/registry.generated.json");
  writeFileSync(out, JSON.stringify(buildRegistryJson(), null, 2));
  console.log("wrote", out);
}
```

- [ ] **Step 4: package.json に script 追加**

`apps/x-account-system/package.json` の `"scripts"` に追記:
```json
"build:registry": "tsx scripts/build-registry.ts"
```

- [ ] **Step 5: テスト通過 + 生成を確認**

Run: `npx jest scripts/build-registry.test.ts` → PASS
Run: `cd apps/x-account-system && npm run build:registry`
Expected: `lib/registry/registry.generated.json` 生成、8 stages。

- [ ] **Step 6: Commit**

```bash
git add apps/x-account-system/scripts/build-registry.ts apps/x-account-system/scripts/build-registry.test.ts apps/x-account-system/package.json apps/x-account-system/lib/registry/registry.generated.json
git commit -m "feat(xad/registry): build:registry → registry.generated.json"
```

---

## Task A8: run lifecycle 配線（runId 発番 + handleJob に ctx/retry を渡す）

**Files:**
- Modify: `apps/x-account-system/src/worker.ts`（`JobMessage` に `runId`、`scheduled()`/`/admin/enqueue` で run insert、`queue()` で `handleJob(msg, env, ctx, retryInfo)`）
- Modify: `apps/x-account-system/src/queue.ts`（`handleJob` 署名拡張 + lifecycle update + safety skip 記録）
- Test: `apps/x-account-system/src/queue.test.ts`（既存に追記 or 新規 `src/queue-lifecycle.test.ts`）

- [ ] **Step 1: 失敗テストを書く（lifecycle）**

```ts
// src/queue-lifecycle.test.ts
import { decideRunStatus } from "./queue.js";

test("成功は ok", () => {
  expect(decideRunStatus({ ok: true, attempt: 1, maxAttempts: 4 })).toBe("ok");
});
test("失敗かつ attempt<maxAttempts は running（再試行に委ねる）", () => {
  expect(decideRunStatus({ ok: false, attempt: 2, maxAttempts: 4 })).toBe("running");
});
test("失敗かつ attempt>=maxAttempts は error（最終失敗）", () => {
  expect(decideRunStatus({ ok: false, attempt: 4, maxAttempts: 4 })).toBe("error");
});
```

- [ ] **Step 2: テスト失敗を確認**

Run: `npx jest src/queue-lifecycle.test.ts`
Expected: FAIL（`decideRunStatus` 未定義）

- [ ] **Step 3: queue.ts に lifecycle ヘルパと配線を実装**

`apps/x-account-system/src/queue.ts`:
```ts
// 追加（先頭付近）
import { insertRun, updateRun } from "../lib/trace/trace-store.js";
import { recordSkip } from "../lib/trace/with-trace.js";

export const MAX_ATTEMPTS = 4; // = 1 + wrangler.toml max_retries(3)。単一ソース化（A8 Step6 参照）

export function decideRunStatus(
  a: { ok: boolean; attempt: number; maxAttempts: number },
): "ok" | "running" | "error" {
  if (a.ok) return "ok";
  return a.attempt >= a.maxAttempts ? "error" : "running";
}

// handleJob は「skip したか」を返す（queue 側が ok 上書きしないため）
export interface HandleJobResult { skipped: boolean }

export async function handleJob(
  msg: JobMessage, env: Env, ctx?: ExecutionContext,
): Promise<HandleJobResult> {
  const runId = (msg as { runId?: string }).runId;
  // …既存 brownout guard ブロック（下記 return を skip シグナルに変更）…
  // …既存 switch(msg.job) 本体…
  return { skipped: false }; // 通常完了
}
```

**brownout 分岐の修正（具体）**: `src/queue.ts` の brownout 早期 return（`if (!decision.allowedJobs.includes(msg.job)) { …console.log…; return; }`）を以下に変える:
```ts
      // 観測: brownout skip を trace に残す（成功条件「スキップが色でわかる」）
      if (runId) await recordSkip(ctx, { runId, stageId: "safety", outcome: `brownout:${decision.status}` });
      // ACK: リトライしない (予算回復まで次の cron 発火を待つ)
      return { skipped: true }; // ← queue 側で status=skipped に確定させる
```

> `run.status` は queue() 側で確定させる（CRITICAL: handleJob 内で skipped にしても直後の成功 return で ok に上書きされるため）。handleJob 本体の他の `return;` も `return { skipped: false };` に揃える。`runPostJob(slot, env)` 呼び出しは `runPostJob(slot, env, ctx, runId)` に変える（Task A9）。

- [ ] **Step 4: worker.ts に runId 発番と run insert を配線**

`src/worker.ts`:
```ts
// JobMessage 各 variant に runId?: string を追加（型定義）
//   { job: "post-morning" | ...; date: string; slot: string; manual?: boolean; runId?: string }
//   { job: "ideation" | "buzz-ingest" | ...; date: string; runId?: string }
//   { job: "line-event"; date: string; payload: unknown; runId?: string }

// scheduled() 内（msg 生成後、send 前）:
// ⚠️ FK: run_trace.run_id → run。consumer が trace insert する前に run insert を完了させる必要がある。
//   insertRun と send を 1 つの waitUntil で「insert→send」順に直列化する（別々の waitUntil は race）。
const runId = crypto.randomUUID();
const withId = { ...msg, runId } as JobMessage;
ctx.waitUntil((async () => {
  await insertRun({ id: runId, job, trigger: "cron", date, status: "running", attempt: 1 });
  await env.JOBS.send(withId);
})());

// /admin/enqueue 内も同様（trigger: "manual"、insert→send 順）。

// queue() consumer:
async queue(batch: MessageBatch<JobMessage>, env: Env, ctx: ExecutionContext): Promise<void> {
  for (const m of batch.messages) {
    const runId = (m.body as { runId?: string }).runId;
    try {
      const r = await handleJob(m.body, env, ctx);
      // skip は ok で上書きしない（brownout 等）
      if (runId) await updateRun(runId, r.skipped
        ? { status: "skipped", finished: true }
        : { status: "ok", finished: true });
    } catch (e) {
      const status = decideRunStatus({ ok: false, attempt: m.attempts, maxAttempts: MAX_ATTEMPTS });
      if (runId) await updateRun(runId, {
        status, attempt: m.attempts, error: String(e), finished: status === "error",
      });
      console.error("job failed", m.body, e);
      m.retry();
    }
  }
}
```

需要 import: `import { insertRun, updateRun } from "../lib/trace/trace-store.js";` と `import { MAX_ATTEMPTS, decideRunStatus, type HandleJobResult } from "./queue.js";`。lifecycle 判定（attempt/maxAttempts）は **queue() catch 側**で行い、handleJob には渡さない。

- [ ] **Step 5: テスト通過 + 既存テスト緑を確認**

Run: `npx jest src/queue-lifecycle.test.ts` → PASS
Run: `npx jest src/` → 既存 queue/worker テスト緑（署名変更で壊れたら呼び出し側を追従）

- [ ] **Step 6: MAX_ATTEMPTS 単一ソース化メモ**

`wrangler.toml` の `max_retries = 3` の隣にコメント `# MAX_ATTEMPTS(=1+max_retries)=4 は src/queue.ts と二重管理。変更時は両方` を追加。

- [ ] **Step 7: Commit**

```bash
git add apps/x-account-system/src/worker.ts apps/x-account-system/src/queue.ts apps/x-account-system/src/queue-lifecycle.test.ts apps/x-account-system/wrangler.toml
git commit -m "feat(xad/trace): run lifecycle 配線 (runId発番/insert/ctx/retry判定/brownout skip)"
```

---

## Task A9: post-job 計装（writer/hook/editor/line-approval + outcome 導出）

**Files:**
- Modify: `apps/x-account-system/src/jobs/post-job.ts`（`runPostJob(slot, env, ctx?, runId?)`、各サブ工程を `withTrace` で包む、editor rejected で line-approval skip 記録）
- Test: `apps/x-account-system/src/jobs/post-job.test.ts`（既存に追記）

- [ ] **Step 1: editor outcome 導出ヘルパの失敗テストを書く**

```ts
// src/jobs/post-job.test.ts に追記
import { editorOutcome } from "./post-job.js";

test("rejected は rejected", () => {
  expect(editorOutcome({ decision: "rejected", warnings: [] } as never)).toBe("rejected");
});
test("approved + warnings>0 は warned", () => {
  expect(editorOutcome({ decision: "approved", warnings: [{ rule: "R1", reason: "x" }] } as never)).toBe("warned");
});
test("approved + warnings0 は approved", () => {
  expect(editorOutcome({ decision: "approved", warnings: [] } as never)).toBe("approved");
});
```

- [ ] **Step 2: テスト失敗を確認**

Run: `npx jest src/jobs/post-job.test.ts -t editor`
Expected: FAIL（`editorOutcome` 未定義）

- [ ] **Step 3: post-job.ts に outcome ヘルパと計装を実装**

```ts
// src/jobs/post-job.ts
import { withTrace, recordSkip } from "../../lib/trace/with-trace.js";
import type { EditorOutput } from "../../lib/editor/types.js";

export function editorOutcome(e: Pick<EditorOutput, "decision" | "warnings">): string {
  if (e.decision === "rejected") return "rejected";
  return e.warnings.length > 0 ? "warned" : "approved";
}
```

`runPostJob` を以下のパターンで計装（既存ロジックを `withTrace` の `fn` 内に移すだけ。本文は既存呼び出しを流用）:
```ts
export async function runPostJob(
  slot: string, env: Env, ctx?: ExecutionContext, runId?: string,
): Promise<void> {
  const rid = runId ?? "";
  if (!rid) { /* 既存挙動（trace 無し）にフォールバック */ }

  // Writer
  const draft = await withTrace(ctx, { runId: rid, stageId: "writer", input: { /* core_idea 要約 */ } },
    async () => {
      const d = await /* 既存 writer 呼び出し */;
      return { result: d, output: { body: d.body, format: d.format } };
    });

  // Hook
  const hooked = await withTrace(ctx, { runId: rid, stageId: "hook-classifier", input: { body: draft.body } },
    async () => {
      const h = await /* 既存 hook 分類（classify.ts） */;
      return { result: h, output: { primary_hook: h.primary_hook } }; // 実 API は primary_hook
    });

  // Editor
  const edited = await withTrace(ctx, { runId: rid, stageId: "editor", input: { body: draft.body } },
    async () => {
      const e: EditorOutput = await /* 既存 runEditor */;
      return { result: e, output: { decision: e.decision, warnings: e.warnings }, outcome: editorOutcome(e) };
    });

  // 保存（run_id を必ず付与）
  await /* 既存 post_drafts upsert に run_id: rid を追加 */;

  if (edited.decision === "rejected") {
    await recordSkip(ctx, { runId: rid, stageId: "line-approval", outcome: "editor_rejected" });
    return;
  }

  // LINE 承認 push
  await withTrace(ctx, { runId: rid, stageId: "line-approval", input: { draftId: edited.draftId } },
    async () => {
      await /* 既存 pushApproval */;
      return { result: undefined, outcome: "requested" };
    });
}
```

> 既存の writer/hook/editor/pushApproval 呼び出しコードはそのまま `fn` 内へ移植する。`runId` が空（旧経路）の場合は trace を諦め既存挙動を維持（後方互換）。

- [ ] **Step 4: テスト通過 + 既存緑を確認**

Run: `npx jest src/jobs/post-job.test.ts` → PASS（outcome 3 件 + 既存）

- [ ] **Step 5: Commit**

```bash
git add apps/x-account-system/src/jobs/post-job.ts apps/x-account-system/src/jobs/post-job.test.ts
git commit -m "feat(xad/trace): post-job 計装 (writer/hook/editor/line-approval + outcome導出 + run_id付与)"
```

---

## Task A10: ingest/ideation 計装 + revise/publisher 相関

**Files:**
- Modify: `apps/x-account-system/src/queue.ts`（ideation/buzz-ingest/inspirations-ingest を `withTrace`）
- Modify: `apps/x-account-system/src/jobs/line-event.ts`（revise/publisher を対象 draft の run_id に追記）
- Test: `apps/x-account-system/src/jobs/line-event.test.ts`（既存に追記）

- [ ] **Step 1: ideation/ingest 計装**

`src/queue.ts` の各 case を `withTrace` で包む。例（ideation）:
```ts
case "ideation": {
  const rid = (msg as { runId?: string }).runId ?? "";
  const count = rid
    ? await withTrace(ctx, { runId: rid, stageId: "ideation" }, async () => {
        const c = await runIdeation(env);
        return { result: c, output: { inserted: c } };
      })
    : await runIdeation(env);
  break;
}
```
`buzz-ingest` / `inspirations-ingest` も同様（stageId をそれぞれに）。

- [ ] **Step 2: revise/publisher 相関の失敗テストを書く**

```ts
// src/jobs/line-event.test.ts に追記
import { resolveRunIdForDraft } from "./line-event.js";

test("draft の run_id を引いて相関に使う", async () => {
  const fakeFetch = async () => ({ run_id: "R1" });
  expect(await resolveRunIdForDraft("draft-1", fakeFetch as never)).toBe("R1");
});
```

- [ ] **Step 3: テスト失敗を確認**

Run: `npx jest src/jobs/line-event.test.ts -t run_id`
Expected: FAIL

- [ ] **Step 4: line-event.ts に相関ヘルパと計装を実装**

```ts
// src/jobs/line-event.ts
import { withTrace } from "../../lib/trace/with-trace.js";

/** 対象 draft の post_drafts.run_id を返す（承認/修正/投稿を元 post run に接続するため）。 */
export async function resolveRunIdForDraft(
  draftId: string, fetchDraft: (id: string) => Promise<{ run_id?: string } | null>,
): Promise<string | undefined> {
  const d = await fetchDraft(draftId);
  return d?.run_id;
}
```

**ctx 伝播（MAJOR対応）**: 実コードの `handleLineEvent(payload, env)` と内部 `handleApprove`/`handleReviseFeedback` には `ctx` が無い。`withTrace(ctx, …)` を使うため署名に `ctx?: ExecutionContext` を足し、`src/queue.ts` の `case "line-event"` を `await handleLineEvent(msg.payload, env, ctx);` に変える。内部 handler へも `ctx` を引き回す。

**webhook 軽量 run（MAJOR対応）**: `src/worker.ts` の `/line/webhook` で各 event を enqueue する際、webhook run を 1 件 insert し `webhookRunId` を `line-event` メッセージに載せる（spec §4.2「webhook 自体の受信は trigger=webhook の軽量 run」）。ただし**承認/修正/投稿の trace は対象 draft の `run_id`（元 post run）に追記**する（webhook run には webhook 受信自体のみ）。

```ts
// worker.ts /line/webhook（既存 enqueue を包む）
const webhookRunId = crypto.randomUUID();
ctx.waitUntil((async () => {
  await insertRun({ id: webhookRunId, job: "line-event", trigger: "webhook", date, status: "running", attempt: 1 });
  await env.JOBS.send({ job: "line-event", date, payload: ev, runId: webhookRunId } as JobMessage);
})());
```

**承認/却下応答の line-approval trace（MAJOR対応）**: approve/reject postback 処理（`handleApprove` 等）で、対象 draft の run_id に `line-approval` trace を追記する（outcome=`approved`|`rejected`）。これで `/runs/R1` に approval-request →（時間差）approval-response → publish が並ぶ。

```ts
// handleApprove 内（承認確定時）
const runId = await resolveRunIdForDraft(draftId, fetchDraft);
if (runId) {
  await withTrace(ctx, { runId, stageId: "line-approval", input: { draftId, response: true } },
    async () => ({ result: undefined, outcome: "approved" }));
  // 続けて publisher を trace で包んで投稿
  await withTrace(ctx, { runId, stageId: "publisher", input: { draftId } },
    async () => { await /* 既存投稿処理 */; return { result: undefined }; });
}
// reject 時は outcome="rejected" の line-approval trace のみ（publisher 無し）
```

- `修正:` → `handleReviseFeedback`: revise writer/editor/line-approval を `withTrace` で包み、`stageId` は `writer`/`editor`/`line-approval` のまま、`input` に `{ revision: true, ... }` を入れる（registry に新ノードを足さない）。`runId` は対象 draft の run_id。

```ts
// 例: handleReviseFeedback 内 writer 再生成
const revised = await withTrace(ctx, { runId, stageId: "writer", input: { revision: true } },
  async () => {
    const d = await /* 既存 reviseDraftForX */;
    return { result: d, output: { body: d.body }, outcome: undefined };
  });
```

- [ ] **Step 5: テスト通過 + 既存緑を確認**

Run: `npx jest src/jobs/line-event.test.ts` → PASS
Run: `npx jest` → 全テスト緑（既存 359 + 追加分）

- [ ] **Step 6: Commit**

```bash
git add apps/x-account-system/src/queue.ts apps/x-account-system/src/jobs/line-event.ts apps/x-account-system/src/jobs/line-event.test.ts
git commit -m "feat(xad/trace): ingest/ideation計装 + revise/publisher を元run_idに相関"
```

---

## Task A11: typecheck + bundle 確認 + 本番 deploy

- [ ] **Step 1: typecheck**

Run: `cd apps/x-account-system && npm run typecheck`（または `npx tsc --noEmit`）
Expected: PASS

- [ ] **Step 2: 全テスト**

Run: `npx jest`
Expected: 全緑（既存 + 新規）

- [ ] **Step 3: registry 再生成**

Run: `npm run build:registry`（`registry.generated.json` 更新）

- [ ] **Step 4: deploy（wrangler CLI + token）**

Run: `npx wrangler deploy`（token は main repo `.env.local`）
Expected: 新バージョン公開。`/health` 200。

- [ ] **Step 5: live smoke（1 run トレース確認）**

`/admin/enqueue?job=ideation&key=<OAUTH_ADMIN_SECRET>` を叩き、数十秒後に MCP execute_sql:
```sql
select stage_id, status, outcome from xad.run_trace order by started_at desc limit 5;
```
Expected: ideation の trace 行が記録されている。

- [ ] **Step 6: Commit（registry 更新分があれば）**

```bash
git add apps/x-account-system/lib/registry/registry.generated.json
git commit -m "chore(xad/registry): regenerate registry.generated.json"
```

---

# Track B — Next.js ダッシュボード

## Task B1: Next.js scaffold + Basic 認証 + Supabase server client

**Files:**
- Create: `apps/xad-dashboard/package.json` / `next.config.ts` / `tsconfig.json` / `tailwind.config.ts` / `postcss.config.mjs` / `app/globals.css`
- Create: `apps/xad-dashboard/middleware.ts`
- Create: `apps/xad-dashboard/lib/supabase.ts`
- Create: `apps/xad-dashboard/.env.example`

- [ ] **Step 1: scaffold**

```bash
cd apps && npx create-next-app@latest xad-dashboard --ts --app --tailwind --eslint --no-src-dir --import-alias "@/*"
cd xad-dashboard && npm i @supabase/supabase-js reactflow
```

- [ ] **Step 2: Basic 認証 middleware**

```ts
// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = "Basic " + btoa(`${process.env.BASIC_AUTH_USER}:${process.env.BASIC_AUTH_PASS}`);
  if (auth !== expected) {
    return new NextResponse("Auth required", {
      status: 401, headers: { "WWW-Authenticate": 'Basic realm="xad"' },
    });
  }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
```

- [ ] **Step 3: Supabase server client（service role, server only）**

```ts
// lib/supabase.ts — server component / route handler 専用
import { createClient } from "@supabase/supabase-js";

export function serverSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    db: { schema: "xad" }, auth: { persistSession: false },
  });
}
```

- [ ] **Step 4: .env.example**

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
BASIC_AUTH_USER=
BASIC_AUTH_PASS=
```

- [ ] **Step 5: 起動確認**

Run: `npm run dev`、`http://localhost:3000` で 401 → Basic 認証後にデフォルトページ表示。

- [ ] **Step 6: Commit**

```bash
git add apps/xad-dashboard
git commit -m "feat(xad-dashboard): Next.js scaffold + Basic認証 + Supabase server client"
```

---

## Task B2: registry ローダ + クエリ層 + 色マッピング

**Files:**
- Create: `apps/xad-dashboard/lib/registry.ts`
- Create: `apps/xad-dashboard/lib/queries.ts`
- Create: `apps/xad-dashboard/lib/colors.ts`
- Create: `apps/xad-dashboard/lib/registry.generated.json`（A7 の出力をコピー or ビルド時取得）
- Test: `apps/xad-dashboard/lib/colors.test.ts`（jest 導入）

- [ ] **Step 1: registry をコピー**

A7 が出力した `apps/x-account-system/lib/registry/registry.generated.json` を `apps/xad-dashboard/lib/registry.generated.json` にコピーする（MVP は手動コピー。連動は §9 オープン事項）。

- [ ] **Step 2: registry ローダ**

```ts
// lib/registry.ts
import data from "./registry.generated.json";
export interface StageMeta {
  id: string; label: string; group: string; purpose: string;
  inputs: string[]; outputs: string[]; keyVariables: { name: string; desc: string }[];
  logicKind: "llm" | "deterministic" | "io"; promptRef?: string;
  sourcePaths: string[]; designDocAnchor?: string; upstream: string[]; downstream: string[];
}
export const STAGES = (data as { stages: StageMeta[] }).stages;
export const stageById = (id: string) => STAGES.find((s) => s.id === id);
```

- [ ] **Step 3: 色マッピングの失敗テストを書く**

```ts
// lib/colors.test.ts
import { nodeColor } from "./colors.js";
test("editor rejected は赤", () => {
  expect(nodeColor({ status: "ok", outcome: "rejected" })).toBe("red");
});
test("editor warned は黄", () => {
  expect(nodeColor({ status: "ok", outcome: "warned" })).toBe("yellow");
});
test("ok approved は緑", () => {
  expect(nodeColor({ status: "ok", outcome: "approved" })).toBe("green");
});
test("skipped は灰青", () => {
  expect(nodeColor({ status: "skipped" })).toBe("slate");
});
test("trace 無しは灰", () => {
  expect(nodeColor(null)).toBe("gray");
});
```

- [ ] **Step 4: テスト失敗を確認**

Run: `npx jest lib/colors.test.ts`（jest 未導入なら `npm i -D jest ts-jest @types/jest` + `jest.config.cjs`）
Expected: FAIL

- [ ] **Step 5: 実装**

```ts
// lib/colors.ts
export type Trace = { status: "ok" | "error" | "skipped"; outcome?: string } | null;
export function nodeColor(t: Trace): "green" | "yellow" | "red" | "slate" | "gray" {
  if (!t) return "gray";
  if (t.outcome === "rejected") return "red";
  if (t.outcome === "warned") return "yellow";
  if (t.status === "skipped") return "slate";
  if (t.status === "error") return "red";
  return "green";
}
```

```ts
// lib/queries.ts
import { serverSupabase } from "./supabase.js";
import type { Trace } from "./colors.js";

// 戻り値は colors.ts の Trace（status は union）に揃える。DB の status:string を union に narrow。
export async function latestTraceByStage(): Promise<Record<string, NonNullable<Trace>>> {
  const sb = serverSupabase();
  const { data } = await sb.from("run_trace")
    .select("stage_id,status,outcome,started_at")
    .order("started_at", { ascending: false }).limit(200);
  const out: Record<string, NonNullable<Trace>> = {};
  for (const r of data ?? []) {
    if (!out[r.stage_id]) out[r.stage_id] = { status: r.status as NonNullable<Trace>["status"], outcome: r.outcome ?? undefined };
  }
  return out;
}

export async function recentTracesForStage(stageId: string, limit = 20) {
  const sb = serverSupabase();
  const { data } = await sb.from("run_trace").select("*")
    .eq("stage_id", stageId).order("started_at", { ascending: false }).limit(limit);
  return data ?? [];
}

export async function listRuns(limit = 50) {
  const sb = serverSupabase();
  const { data } = await sb.from("run").select("*").order("started_at", { ascending: false }).limit(limit);
  return data ?? [];
}

export async function runTimeline(runId: string) {
  const sb = serverSupabase();
  const run = await sb.from("run").select("*").eq("id", runId).single();
  const { data: traces } = await sb.from("run_trace").select("*")
    .eq("run_id", runId).order("started_at", { ascending: true }).order("id", { ascending: true });
  return { run: run.data, traces: traces ?? [] };
}
```

- [ ] **Step 6: テスト通過を確認**

Run: `npx jest lib/colors.test.ts`
Expected: PASS（5 件）

- [ ] **Step 7: Commit**

```bash
git add apps/xad-dashboard/lib
git commit -m "feat(xad-dashboard): registry ローダ + run/trace クエリ + 色マッピング"
```

---

## Task B3: フローチャート画面（React Flow）

**Files:**
- Create: `apps/xad-dashboard/app/components/Flowchart.tsx`
- Create: `apps/xad-dashboard/app/page.tsx`

- [ ] **Step 1: Flowchart コンポーネント**

```tsx
// app/components/Flowchart.tsx
"use client";
import ReactFlow, { Background, Controls, type Node, type Edge } from "reactflow";
import "reactflow/dist/style.css";
import { STAGES } from "@/lib/registry";
import { nodeColor, type Trace } from "@/lib/colors";

const COLOR: Record<string, string> = {
  green: "#16a34a", yellow: "#ca8a04", red: "#dc2626", slate: "#475569", gray: "#9ca3af",
};
const GROUP_X: Record<string, number> = {
  ingest: 0, ideation: 220, generate: 440, review: 660, approve: 880, publish: 1100, learn: 1320,
};

export function Flowchart({
  latest, onSelect,
}: { latest: Record<string, Trace>; onSelect: (id: string) => void }) {
  const seen: Record<string, number> = {};
  const nodes: Node[] = STAGES.map((s) => {
    const y = (seen[s.group] = (seen[s.group] ?? -1) + 1) * 110;
    return {
      id: s.id, position: { x: GROUP_X[s.group] ?? 0, y },
      data: { label: s.label }, style: {
        border: `3px solid ${COLOR[nodeColor(latest[s.id] ?? null)]}`,
        borderRadius: 10, padding: 8, background: "#fff", width: 180,
      },
    };
  });
  const edges: Edge[] = STAGES.flatMap((s) =>
    s.downstream.map((d) => ({ id: `${s.id}-${d}`, source: s.id, target: d, animated: false })));
  return (
    <div style={{ height: "70vh" }}>
      <ReactFlow nodes={nodes} edges={edges} onNodeClick={(_, n) => onSelect(n.id)} fitView>
        <Background /><Controls />
      </ReactFlow>
    </div>
  );
}
```

- [ ] **Step 2: page.tsx（server で latest 取得 → client へ）**

```tsx
// app/page.tsx
import { latestTraceByStage } from "@/lib/queries";
import { HomeClient } from "./HomeClient";

export default async function Page() {
  const latest = await latestTraceByStage();
  return <HomeClient latest={latest} />;
}
```

```tsx
// app/HomeClient.tsx
"use client";
import { useState } from "react";
import { Flowchart } from "./components/Flowchart";
import { NodePanel } from "./components/NodePanel";
import type { Trace } from "@/lib/colors";

export function HomeClient({ latest }: { latest: Record<string, Trace> }) {
  const [sel, setSel] = useState<string | null>(null);
  return (
    <main className="flex">
      <div className="flex-1"><Flowchart latest={latest} onSelect={setSel} /></div>
      {sel && <div className="w-[480px] border-l p-4"><NodePanel stageId={sel} onClose={() => setSel(null)} /></div>}
    </main>
  );
}
```

- [ ] **Step 3: 起動確認**

Run: `npm run dev` → トップに工程図が表示され、ノード枠が trace 状態色になる。

- [ ] **Step 4: Commit**

```bash
git add apps/xad-dashboard/app
git commit -m "feat(xad-dashboard): React Flow 工程図 + ノード状態色"
```

---

## Task B4: ノード詳細パネル（定義 tab + 実行 tab）

**Files:**
- Create: `apps/xad-dashboard/app/components/NodePanel.tsx`
- Create: `apps/xad-dashboard/app/api/stage/[id]/route.ts`（実行 trace を返す）

- [ ] **Step 1: 実行 trace API**

```ts
// app/api/stage/[id]/route.ts
// ※ create-next-app@latest = Next.js 15。params は Promise なので await 必須。
import { NextResponse } from "next/server";
import { recentTracesForStage } from "@/lib/queries";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await recentTracesForStage(id, 20));
}
```

- [ ] **Step 2: NodePanel（定義=registry / 実行=API）**

```tsx
// app/components/NodePanel.tsx
"use client";
import { useEffect, useState } from "react";
import { stageById } from "@/lib/registry";

const GH = "https://github.com/ofmeton/all-good-ops/blob/main/";

export function NodePanel({ stageId, onClose }: { stageId: string; onClose: () => void }) {
  const s = stageById(stageId);
  const [tab, setTab] = useState<"def" | "run">("def");
  const [traces, setTraces] = useState<any[]>([]);
  useEffect(() => { if (tab === "run") fetch(`/api/stage/${stageId}`).then((r) => r.json()).then(setTraces); }, [tab, stageId]);
  if (!s) return null;
  return (
    <div>
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-lg">{s.label}</h2>
        <button onClick={onClose}>×</button>
      </div>
      <div className="flex gap-2 my-2">
        <button className={tab === "def" ? "font-bold" : ""} onClick={() => setTab("def")}>定義</button>
        <button className={tab === "run" ? "font-bold" : ""} onClick={() => setTab("run")}>実行</button>
      </div>
      {tab === "def" ? (
        <div className="text-sm space-y-2">
          <p>{s.purpose}</p>
          <p><b>logic:</b> {s.logicKind}</p>
          <p><b>入力:</b> {s.inputs.join(", ")}</p>
          <p><b>出力:</b> {s.outputs.join(", ")}</p>
          <div><b>主要変数:</b><ul className="list-disc pl-5">{s.keyVariables.map((v) => <li key={v.name}>{v.name}: {v.desc}</li>)}</ul></div>
          {s.promptRef && <p><b>prompt:</b> <a className="text-blue-600" href={GH + s.promptRef.replace("apps/x-account-system/", "apps/x-account-system/")}>{s.promptRef}</a></p>}
          <div><b>source:</b><ul className="list-disc pl-5">{s.sourcePaths.map((p) => <li key={p}><a className="text-blue-600" href={GH + p}>{p}</a></li>)}</ul></div>
        </div>
      ) : (
        <div className="text-xs space-y-3">
          {traces.map((t) => (
            <details key={t.id} className="border rounded p-2">
              <summary>{new Date(t.started_at).toLocaleString("ja-JP")} — {t.status}{t.outcome ? `/${t.outcome}` : ""} {t.input_json?.revision ? "🔁修正" : ""} ({t.duration_ms}ms)</summary>
              {t.prompt_text && <pre className="whitespace-pre-wrap bg-gray-50 p-2">prompt: {t.prompt_text}</pre>}
              {t.input_json && <pre className="whitespace-pre-wrap bg-gray-50 p-2">in: {JSON.stringify(t.input_json, null, 2)}</pre>}
              {t.output_json && <pre className="whitespace-pre-wrap bg-gray-50 p-2">out: {JSON.stringify(t.output_json, null, 2)}</pre>}
              <p>{t.model} / in {t.tokens_in} / out {t.tokens_out} / ¥{t.cost_jpy ?? "-"}</p>
              {t.error && <pre className="text-red-600">{t.error}</pre>}
            </details>
          ))}
          {traces.length === 0 && <p>まだ実行記録がありません</p>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 動作確認**

ノードクリック → 定義タブで registry 情報 + GitHub リンク、実行タブで直近 trace の IO/prompt/tokens が表示される。修正 trace に 🔁 バッジ。

- [ ] **Step 4: Commit**

```bash
git add apps/xad-dashboard/app/components/NodePanel.tsx apps/xad-dashboard/app/api
git commit -m "feat(xad-dashboard): ノード詳細パネル (定義tab + 実行tab)"
```

---

## Task B5: run 一覧 + run タイムライン

**Files:**
- Create: `apps/xad-dashboard/app/runs/page.tsx`
- Create: `apps/xad-dashboard/app/runs/[id]/page.tsx`

- [ ] **Step 1: run 一覧**

```tsx
// app/runs/page.tsx
import Link from "next/link";
import { listRuns } from "@/lib/queries";

export default async function Runs() {
  const runs = await listRuns(50);
  return (
    <main className="p-4">
      <h1 className="font-bold text-xl mb-3">Runs</h1>
      <table className="text-sm w-full">
        <thead><tr><th>started</th><th>job</th><th>trigger</th><th>status</th><th>attempt</th></tr></thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id} className="border-t">
              <td><Link className="text-blue-600" href={`/runs/${r.id}`}>{new Date(r.started_at).toLocaleString("ja-JP")}</Link></td>
              <td>{r.job}</td><td>{r.trigger}</td><td>{r.status}</td><td>{r.attempt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
```

- [ ] **Step 2: run タイムライン（started_at+id 順）**

```tsx
// app/runs/[id]/page.tsx
// ※ Next.js 15: params は Promise。await 必須。
import { runTimeline } from "@/lib/queries";

export default async function RunDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { run, traces } = await runTimeline(id);
  return (
    <main className="p-4">
      <h1 className="font-bold text-xl">{run?.job} <span className="text-sm">({run?.status})</span></h1>
      <ol className="mt-4 space-y-3">
        {traces.map((t) => (
          <li key={t.id} className="border-l-4 pl-3" style={{ borderColor: t.status === "error" ? "#dc2626" : t.status === "skipped" ? "#475569" : "#16a34a" }}>
            <div className="text-sm font-semibold">
              {t.stage_id}{t.outcome ? ` — ${t.outcome}` : ""} {t.input_json?.revision ? "🔁修正" : ""}
              <span className="font-normal text-gray-500"> {new Date(t.started_at).toLocaleTimeString("ja-JP")} ({t.duration_ms}ms)</span>
            </div>
            {t.prompt_text && <pre className="text-xs whitespace-pre-wrap bg-gray-50 p-2">prompt: {t.prompt_text}</pre>}
            {t.output_json && <pre className="text-xs whitespace-pre-wrap bg-gray-50 p-2">out: {JSON.stringify(t.output_json, null, 2)}</pre>}
          </li>
        ))}
      </ol>
    </main>
  );
}
```

- [ ] **Step 3: 動作確認**

`/runs` → 一覧、行クリックで `/runs/[id]` に writer→editor→(line-approval)→publisher が時系列で並ぶ。editor rejected run は line-approval が skipped 表示。

- [ ] **Step 4: Commit**

```bash
git add apps/xad-dashboard/app/runs
git commit -m "feat(xad-dashboard): run 一覧 + run タイムライン (started_at+id順)"
```

---

## Task B6: Vercel デプロイ + live スモーク

**Files:**
- Create: `apps/xad-dashboard/tests/smoke.spec.ts`

- [ ] **Step 1: Playwright スモーク**

```ts
// tests/smoke.spec.ts
import { test, expect } from "@playwright/test";
const A = { username: process.env.BASIC_AUTH_USER!, password: process.env.BASIC_AUTH_PASS! };

test("トップに工程図が描画される", async ({ page }) => {
  await page.context().setHTTPCredentials(A);
  await page.goto(process.env.SMOKE_URL ?? "http://localhost:3000");
  await expect(page.locator(".react-flow")).toBeVisible();
});
test("/runs が開ける", async ({ page }) => {
  await page.context().setHTTPCredentials(A);
  await page.goto((process.env.SMOKE_URL ?? "http://localhost:3000") + "/runs");
  await expect(page.getByText("Runs")).toBeVisible();
});
```

- [ ] **Step 2: ローカルスモーク**

Run: `npx playwright test tests/smoke.spec.ts`
Expected: 2 件 PASS

- [ ] **Step 3: Vercel デプロイ**

`apps/xad-dashboard` を Vercel project に紐付け、env（SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / BASIC_AUTH_USER / BASIC_AUTH_PASS）を設定して deploy。

- [ ] **Step 4: 本番スモーク**

`SMOKE_URL=<vercel url>` で `npx playwright test`。Basic 認証通過 → 工程図 + /runs 表示。A11 で記録した実 trace がノード/タイムラインに反映されることを目視。

- [ ] **Step 5: Commit**

```bash
git add apps/xad-dashboard/tests
git commit -m "test(xad-dashboard): Playwright スモーク + Vercel deploy"
```

---

## 完了条件（設計書 成功条件と対応）

1. 工程図で全ノードの直近状態が色でわかる → B3 + B2(latestTraceByStage) + colors
2. ノードを開くと定義が読める → B4 定義 tab + A6 registry
3. ノードを開くと実行 IO/prompt/tokens が読める → B4 実行 tab + A2/A4/A5 trace
4. cron 1 起動を run として一覧 → B5 + A8 run
5. 1 run を開くと全工程が時系列 → B5 timeline + A9/A10 相関
6. パスワード 1 つでアクセス → B1 Basic 認証

---

## Self-Review（writing-plans スキル）

**Spec coverage:** spec §4.1 registry→A6/A7、§4.2 計装(ctx.waitUntil/runId/lifecycle/llm)→A4/A5/A8、§4.3 schema→A1、§4.4 dashboard→B1-B5、§5 相関(修正/承認)→A9/A10、PII redact→A3、色規則→B2。全 §に対応タスクあり。
**Placeholder scan:** コード未確定の「既存呼び出しを fn 内へ移植」箇所（A9/A10）は、既存関数を呼ぶだけで新規ロジックでないため明示。redact 実関数名(A3 Step1)と Anthropic client 形(A5 Step1)は実装者が実コードで確認する明示ステップを置いた。
**Type consistency:** `withTrace(ctx, c, fn)` 署名は A4 定義 → A9/A10 使用で一致。`insertTrace`/`insertRun`/`updateRun` は A2 定義 → A8 使用で一致。`StageMeta` は A6 定義 → B2 で再宣言（JSON 経由のため意図的二重定義、フィールド一致）。`nodeColor`/`Trace` は B2 定義 → B3 使用で一致。`MAX_ATTEMPTS`/`decideRunStatus` は A8 で定義・使用。
