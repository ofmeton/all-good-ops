# 段階1-1B: 実行履歴の詳細トラッキングUI（観測）設計

> 親計画: `~/.claude/plans/41-magical-sketch.md` 段階1 Team 1B。土台 = 1A（永続 Managed Agents、PR#145）。
> memory: `project_x_ma_persistent_rearch`。

## 目的

過去の1実行（run）を開き、各工程（collect / compose / check）の **思考 / 入力素材 / 素材の出所 / アウトプット** を細かく追う。さらに draft から遡って「この素材は collector のどのクエリ・どの思考で集めたか」まで辿れるようにする。

現状（1A 出荷後）:
- ✅ `xad.run` / `xad.run_trace`（stage 単位の prompt/output/model/tokens/cost/error）
- ✅ provenance 相関キー仕込み済: `post_drafts.writer_session_id` / `materials_store.meta.collector_session_id`
- ✅ `lib/ma/run-session.ts` は drain ループで `agent.message` / `agent.custom_tool_use` / `custom_tool_result` / `span.model_request_end` を既に処理
- ❌ **session events を永続化していない**（`onTrace` は model/tokens だけ報告）
- ❌ run → その run が起こした MA session 群への一貫リンクが無い（collect: 無し / compose: `post_drafts.run_id`+`writer_session_id` / check: `run_trace.output_json.perDraft[].maSessionId` に埋没）
- ❌ dashboard は `run_trace` を読むだけ。session の思考/ツール詳細を出せない。`@anthropic-ai/sdk` も無い

## アーキテクチャ方針

**dashboard = 純 Supabase reader を維持する。** worker が drain 中に session events を `xad.session_event` へ永続化し、dashboard はそれを読むだけ。Anthropic SDK / API キーを dashboard に持ち込まない（課金は worker 側 1 回のみ、session 期限切れでも観測データが残る）。

```
[worker] runMaSession() drain ループ
  ├ agent.message(text/thinking) ─┐
  ├ custom_tool_use(name,input)   ─┼─► onEvent ─► insertSessionEvents()
  ├ custom_tool_result(result)    ─┤           ─► xad.session_event
  └ span.model_request_end(usage) ─┘
  + caller (collect/compose/check) ─► recordRunSession() ─► xad.run_session

[dashboard] runs/[id]  ──► Supabase のみ（run / run_trace / run_session / session_event
                              / post_drafts / core_ideas / materials_store）
```

## データ層（migration 0021_session_trace.sql）

### 1. `xad.session_event`（イベント実体）
| 列 | 型 | 説明 |
|---|---|---|
| id | bigint generated always identity PK | |
| session_id | text not null | MA session id（`runMaSession` の `ids.session`） |
| seq | int not null | session 内の順序（drain 受信順、0始まり） |
| type | text not null | `thinking` / `text` / `custom_tool_use` / `custom_tool_result` / `model_request_end` |
| agent_key | text | `collector` / `writer` / `checker`（どの agent が生んだか） |
| payload | jsonb not null | type 別の redact 済データ（下記） |
| created_at | timestamptz default now() | |

- `unique(session_id, seq)`、index `(session_id, seq)`
- payload は `redactForTrace()` 済:
  - `thinking`: `{ text }`
  - `text`: `{ text }`（agent の最終回答テキスト）
  - `custom_tool_use`: `{ tool_use_id, name, input }`（input=どのクエリで集めたか）
  - `custom_tool_result`: `{ tool_use_id, result, is_error }`（取得結果＝素材の出所）
  - `model_request_end`: `{ model, input_tokens, output_tokens }`

### 2. `xad.run_session`（run → session ブリッジ）
| 列 | 型 | 説明 |
|---|---|---|
| id | bigint generated always identity PK | |
| run_id | uuid not null | `xad.run.id`（FK は張らず fail-open。`run_trace` 同様 cascade 不要） |
| stage_id | text not null | `collect` / `compose` / `check` |
| session_id | text not null | 対応 session |
| agent_key | text | 同上 |
| ref_kind | text | `draft` / `material_batch` / null（この session が産んだ主成果物の種別） |
| ref_id | text | draft id 等（compose/check は draft id。collect は null か batch 識別） |
| created_at | timestamptz default now() | |

- index `(run_id)`、index `(session_id)`
- compose/check は 1 run → N session を素直に表現（1行/session）。collect は 1 run → 1 session。
- これで UI は `run_session WHERE run_id=?` 一発で run の全 session を取得できる。

### 既存テーブル（変更なし、provenance 用に読む）
- `post_drafts`: `run_id` / `writer_session_id` / `core_idea_id`
- `core_ideas`: `source_material_ids[]`
- `materials_store`: `meta.collector_session_id`
- 跨ぎ drill-down: compose の draft → `core_idea.source_material_ids` → `materials_store[]` → 各 `meta.collector_session_id` → その（別 run の）collector session の `session_event`。

## worker 計装

### `lib/trace/session-event-store.ts`（新規）
- `insertSessionEvents(sessionId, agentKey, events: SessionEventInput[])`: バッチ insert、fail-open（`trace-store.ts` と同じ作法・`__setSupabaseForTest` 注入口）。
- `recordRunSession(row: RunSessionRow)`: `xad.run_session` への fail-open insert。
- 型は `lib/trace/types.ts` に `SessionEventType` / `SessionEventInput` / `RunSessionRow` を追加。

### `lib/ma/run-session.ts`
- `MaRunDeps` に `onEvent?(ev: SessionEventInput): void` を追加（`onTrace` と同型の opt-in、default no-op）。
- drain ループの各分岐で `onEvent` を発火し、seq を採番:
  - `agent.message`: text ブロックは `type:"text"`、thinking ブロック（`b.type==="thinking"`）は `type:"thinking"` で発火。※thinking content block の正確な形は実装時に `shared/managed-agents-events.md` で確認し TDD で固定。
  - `custom_tool_use`: `type:"custom_tool_use"`（id/name/input）。
  - result 送信直後: `type:"custom_tool_result"`（同 id / result / is_error）。
  - `span.model_request_end`: `type:"model_request_end"`（model_usage）。
- `runMaSession` 自体は Supabase 非依存のまま（テスト容易性維持）。永続化は caller が `onEvent` を `insertSessionEvents` に配線する。

### caller 配線（collect / compose / check）
- 各 caller は session ごとに `onEvent` を渡し、収集したイベントを session 終了時に `insertSessionEvents(sessionId, agentKey, events)` で一括永続化、かつ `recordRunSession({ runId, stageId, sessionId, agentKey, refKind, refId })`。
- `run-compose.ts`: per-material ループ内（agent_key=`writer`、ref=draft）。
- `lib/ingest/collector.ts`: explore session（agent_key=`collector`、ref_kind=null）。
- `lib/check/run-check.ts`: per-draft（agent_key=`checker`、ref=draft）。
- runId は queue が既に各 caller に渡している（`deps.runId`）。fail-open なので未配線/失敗でも本処理は止めない。

## dashboard UI

### `lib/queries.ts`
- `runSessions(runId)`: `run_session WHERE run_id` → stage_id でグルーピング。
- `sessionEvents(sessionId)`: `session_event WHERE session_id ORDER BY seq`。
- `composeProvenance(draftId)`: `post_drafts → core_ideas.source_material_ids → materials_store[]` を引き、各 material の `meta.collector_session_id` と表層情報（source_ref/score 等）を返す。
- `runTimeline(id)` は従来の run_trace に加え run_session を同梱。

### `app/runs/[id]/page.tsx`（工程タイムライン化）
- 各工程（run_trace stage）の下に、その stage の `run_session` 群を展開。
- session ごとに `SessionTrace`（client component, `<details>` ベース）:
  - 思考（thinking ブロック）
  - custom_tool_use=「どのクエリで集めたか」＋ custom_tool_result=「取得結果＝出所」をペア表示
  - model_request_end（model / tokens）
  - Console session link（下記）
- compose の session は `ref_id`=draft → `MaterialProvenance`:
  - 「渡された素材」一覧（source_material_ids）
  - 各素材クリック → その素材の `collector_session_id` の `session_event` を遅延展開（別 run の collect 思考/クエリ）。
- redaction は保存時に済（`redactForTrace`）。UI は追加 redact 不要。

### Console session link
- `https://platform.claude.com/workspaces/<ws>/sessions/<session_id>`。
- workspace 部の base を env `XAD_CONSOLE_SESSION_BASE`（例: `https://platform.claude.com/workspaces/<ws>/sessions`）で可変化。未設定ならリンク非表示（壊れリンクを出さない）。

### UI スタック
- 既存に倣う: Next.js 16 / React 19 / Tailwind v4 / 独自コンポーネント（shadcn なし）。`app/runs/status.tsx` の StatusBadge と色トークンを流用。`ui-ux-pro-max` で観測UIとして可読性（密度・折りたたみ・等幅フォント）を設計。

## テスト（TDD）

- `session-event-store.test.ts`: insert / fail-open / redaction 適用 / `recordRunSession`。
- `run-session.test.ts`（既存拡張）: drain 中に `onEvent` が各 type を正しい seq・payload で発火（thinking/text/tool_use/tool_result/model_request_end）。
- caller テスト（compose/collector/check 既存）: `onEvent`→`insertSessionEvents` と `recordRunSession` が session_id/agent_key/ref で呼ばれる（store をモック注入）。
- `queries` 形状テスト（dashboard 側、vitest）: `sessionEvents` 並び順 / `composeProvenance` の素材→collector_session 連結。
- E2E（手動検証）: 下記。

## 検証（end-to-end・手動）

1. collect→compose→check を 1 サイクル実行（ローカル or 本番 worker）。
2. `runs/[id]` を開く → 各工程に session が出て、思考 / custom_tool_use（クエリ）/ result（出所）/ アウトプット / Console link が見える。
3. compose の draft から「渡された素材」→ 各素材 → その collector session の思考/クエリ（別 run）まで drill-down できる。
4. redaction が効いている（PII 生データが出ない）。

## スコープ外（YAGNI）

- 既存 run の backfill（`sessions.events.list` 遡及取得）。検証は新サイクルで生成すれば足りる。必要なら後日 1 回限りスクリプト。
- 1C（定義編集UI）/ 段階2・3。本 spec は観測のみ。
- editor 工程は MA 非対象（1A で除外）。run_trace に従来通り出る。

## リスク / 注意

- `session_event` は drain 中の追加 DB 書込。fail-open かつ session 終了時の一括 insert で hot path 影響を最小化。
- thinking content block の形は SDK 依存 → 実装時に events doc で確認し TDD で固定（不明なら `agent.message` の text のみでも最低限の観測は成立）。
- イベント量が多い session（collector の web_search 多用）で `session_event` 行が増える → index と stage 折りたたみで UI 負荷を抑制。
