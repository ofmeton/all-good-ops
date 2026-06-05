# x-account 工程可視化ダッシュボード 設計書

> 作成: 2026-06-05 / 対象システム: `apps/x-account-system`（Worker `ofmeton-x-account` + Supabase `xad` schema）
> ステータス: 設計確定待ち（brainstorming → design）
> 関連: [ファネル段階別 専門化 設計判断](../../../outputs/improvements/x-account-design-consolidated/funnel-stage-specialization-design.md) / `outputs/improvements/x-account-design-consolidated/INDEX.md`

## 0. 目的（なぜ作るか）

x-account システムの**改善速度を上げるための観測装置**。各工程の入出力・ロジック・プロンプト・変数を人間が一目で確認でき、cron 実行時に「どこで何が起きたか」を追える状態を作る。

人間（陸）が初速で改善テコ入れ → ある程度回ったら自己改善ループに移譲、という流れの**前半を支える基盤**。「見えない物は直せない」を解消する。

### 成功条件

1. パイプライン全工程がフローチャートで一望でき、各ノードの**直近の実行状態（成功/失敗/スキップ）が色でわかる**
2. ノードを開くと **定義**（目的・入出力・主要変数・使用プロンプト・ソース・設計書リンク）が読める
3. ノードを開くと **実行**（直近 run の input / output / prompt / tokens / duration / error）が読める
4. cron 1 起動を「run」として一覧でき、1 run を開くと**全工程の IO が時系列で並ぶ**
5. 自分のスマホ/PC からパスワード 1 つでアクセスできる

## 1. 非目標（YAGNI）

- **UI からのプロンプト/定義の編集**（観測専用。改善はコード編集 → PR で行う）。将来 Phase 2+ で検討。
- リアルタイムストリーミング（cron は周期実行。最新を都度クエリで十分）
- 多人数認証・ロール管理（1 人用。簡易パスワード）
- 汎用 APM / OpenTelemetry 基盤への載せ替え（ドメイン特化の方が要求に合う）
- 既存 Worker の機能変更（**追加するのは fail-open のトレース計装のみ**）

## 2. 用語

| 用語 | 定義 |
|---|---|
| **stage（工程）** | パイプライン上の 1 単位処理。`lib/<stage>/` に対応（ingest / ideation / writer / editor / publisher 等） |
| **run（実行）** | cron または手動トリガ 1 回 = 1 起動。例: 朝の `post-morning` 1 回 |
| **trace（トレース）** | 1 run の中で 1 stage が実行された 1 レコード。run に複数 trace がぶら下がる |
| **registry（レジストリ）** | 工程の宣言的定義。フローチャート構造と「定義」パネルの SSOT |

## 3. アーキテクチャ全体像

```
┌─────────────────────────────────────────────────────────┐
│ Cloudflare Worker (ofmeton-x-account)  ※既存 + 薄い計装追加 │
│                                                           │
│  cron/queue → handleJob() → 各 stage 実行                  │
│                  │                                         │
│                  └─ trace.record() ──┐ fail-open          │
└──────────────────────────────────────┼───────────────────┘
                                        ▼
                      ┌──────────────────────────────────┐
                      │ Supabase  xad schema              │
                      │   xad.run        (1起動=1行)       │
                      │   xad.run_trace  (1工程実行=1行)    │
                      │   + 既存 xad テーブル群             │
                      └──────────────────────────────────┘
                                        ▲ service role (server only)
┌───────────────────────────────────────┼───────────────────┐
│ Next.js dashboard (Vercel)   ※新規     │                   │
│                                                            │
│  Stage Registry (bundle, Worker リポから生成/共有)          │
│  / ────── 工程フローチャート (React Flow)                   │
│  ├ ノード詳細パネル: [定義] tab + [実行] tab               │
│  /runs ── run 一覧 → 1 run の全工程タイムライン             │
│                                                            │
│  簡易パスワード (middleware / BASIC_AUTH env)              │
└────────────────────────────────────────────────────────────┘
```

**設計判断の中心**: 「定義」は **registry**（コード由来の静的真実）、「実行」は **run_trace**（動的記録）の 2 系統。両方あって初めて「開けば全部見える」が成立する。

## 4. コンポーネント設計

### 4.1 Stage Registry（工程レジストリ）

**配置**: 各工程の `meta.ts` を `lib/<stage>/meta.ts` に co-locate し、`lib/registry/index.ts` で集約。コードの隣に置くことで、stage を変えた時に定義も自然に更新され drift を抑える。

**ノード型**:

```ts
export interface StageMeta {
  id: string;                 // "writer", "editor" 等（trace の stage_id と一致）
  label: string;              // 表示名「Writer（本文生成）」
  group: "ingest" | "ideation" | "generate" | "review" | "approve" | "publish" | "measure" | "learn" | "ops";
  purpose: string;            // 1-2 文の役割
  inputs: string[];          // 入力の型/出所（例: "core_ideas (xad.core_ideas)"）
  outputs: string[];         // 出力（例: "post_drafts.body"）
  keyVariables: { name: string; desc: string }[]; // 主要変数・閾値（例: max_tokens, funnel_stage）
  logicKind: "llm" | "deterministic" | "io"; // 定義 tab の出し分け（llm=prompt表示 / deterministic=rule・score表示 / io=外部取得）
  promptRef?: string;        // logicKind=llm の時のプロンプト所在（ファイルパス or registry 内テキスト）
  sourcePaths: string[];     // GitHub リンク用相対パス（複数可。orchestrator は src/jobs/、ロジックは lib/<stage>/ に分かれるため）
  designDocAnchor?: string;  // consolidated 設計書のアンカー
  upstream: string[];        // 上流 stage id（辺の定義）
  downstream: string[];      // 下流 stage id
}
```

**MVP スコープ = 投稿生成系パイプライン**（buzz/inspirations-ingest → ideation → post-job 内 writer/hook/editor → LINE 承認 → publisher）。`src/queue.ts` の `JobMessage` には他に `daily-digest`/`rollback-monitor`/`rotation-notice` も実在し cron 登録済みだが、これらは MVP では**扱わない**（Phase 2）。

`trace` 列 = MVP で計装するか（✅）/ 定義のみで実行は灰色表示（定義）。`logic` 列 = 定義 tab の出し分け:

| group | stage id | 対応 | logic | trace |
|---|---|---|---|---|
| ingest | `buzz-ingest` | twitterapi.io → materials_store | io | ✅ |
| ingest | `inspirations-ingest` | 週次 X/note seeds → materials_store | io | ✅ |
| ideation | `ideation` | materials → core_ideas（Claude） | llm | ✅ |
| generate | `writer` | core_idea → draft 本文（Claude） | llm | ✅ |
| review | `hook-classifier` | hook 分類（**純 TS regex/scoring、LLM でない**） | deterministic | ✅ |
| review | `editor` | 6+5 判定（決定的ルール + LLM judge + factuality judge）。hard 却下 / soft 警告 | llm | ✅ |
| review | `dlp` | PII redact / lint（editor 内の決定的処理） | deterministic | 定義 |
| review | `safety` | brownout / kill-switch ゲート（handleJob 冒頭） | deterministic | ✅(skip記録) |
| approve | `line-approval` | LINE Flex 承認依頼・応答取込 | io | ✅ |
| publish | `publisher` | X 投稿（OAuth refresh 込） | io | ✅ |
| learn | `optimizer` | Thompson Sampling 更新（`optimizer-update` cron） | deterministic | 定義 |

> - `writer`/`hook-classifier`/`editor` は `post-morning/noon/evening`（`runPostJob`）の内部サブ工程。run としては post-job 1 起動だが、trace は stage 単位で記録する。
> - `hook-classifier` は `lib/hook-classifier/classify.ts` の規則ベース（device/score）。定義 tab には**プロンプトでなく分類ルールとスコアリング**を表示する。
> - `editor` の判定は「正常実行だが business 上 rejected」が起こる。trace では `status=ok`（実行成功）と `outcome`（approved/rejected/warned）を**分離**して持つ（§4.3）。UI の editor ノード色は `outcome` 基準。なお現行 `EditorOutput.decision` は approved/rejected の2値で `warned` は無いため、`outcome=warned` は **`decision=approved && warnings.length>0`** から計装側で導出する。
> - `safety`（brownout）は handleJob 冒頭で allowedJobs 外なら job を skip する（[queue.ts]）。この skip は `run.status=skipped` + `run_trace(stage_id=safety, status=skipped, outcome=brownout理由)` として**必ず記録**する（成功条件「スキップが色でわかる」のため）。
> - `dlp` は editor 内包の決定的処理。MVP は**定義ノード**として図に出すが trace は editor に含める（独立計装は Phase 2）。
> - `optimizer` は MVP では**定義のみ**（役割・8 パラメータを表示）。trace 計装と posterior 可視化は Phase 2。
> - **attribution（UTM）は独立工程ではない**: リンク生成時の関数で、`lib/optimizer/reward-extractor` が計測に使う。ノード化せず optimizer 定義内に「reward 源」として記述する。

**Phase 2 追加ノード**: `daily-digest` / `rollback-monitor` / `rotation-notice` / `oauth-refresh` / `interviewer`（ops group）+ `optimizer`/`dlp` の独立 trace 計装。

### 4.2 Run Trace 計装（Worker 側）

**方針**: 各 stage 境界に薄い `trace()` ラッパを挿す。**fail-open**（トレース書込の失敗・例外は握りつぶし、パイプライン本体を絶対に止めない）。

**⚠️ Queue での書込完了保証**: 現状 `queue()` は `ctx`（`ExecutionContext`）を持つが `handleJob(m.body, env)` に渡していない（[worker.ts] `queue()` / [queue.ts] `handleJob`）。trace 書込を `void recordTrace(...)` の floating promise にすると、job ack 後に isolate が終了して**書込が落ちる**。そこで:
- `handleJob(msg, env, ctx)` に `ctx` を渡すよう変更し、trace 書込は `ctx.waitUntil(recordTraceSafe(...))` で**ライフタイムを延長**する。
- `recordTraceSafe` は内部 try/catch で Supabase insert 失敗を握る（fail-open）。`ctx` が無い経路（テスト等）は `await recordTraceSafe()` にフォールバック。

```ts
// lib/trace/index.ts （新規）
export async function withTrace<T>(
  env: Env,
  ctx: ExecutionContext | undefined,
  meta: { runId: string; stageId: string; input?: unknown },
  fn: () => Promise<{ result: T; output?: unknown; outcome?: string; trace?: TraceMeta }>,
): Promise<T> {
  const startedAt = new Date();
  try {
    const { result, output, outcome, trace } = await fn();
    schedule(ctx, recordTraceSafe(env, { ...meta, status: "ok", outcome, startedAt, durationMs: Date.now() - startedAt.getTime(), output, ...trace }));
    return result;
  } catch (e) {
    schedule(ctx, recordTraceSafe(env, { ...meta, status: "error", startedAt, durationMs: Date.now() - startedAt.getTime(), error: String(e) }));
    throw e; // 本体のエラー伝播は変えない
  }
}
// schedule(ctx, p) = ctx ? ctx.waitUntil(p) : await p （fail-open は recordTraceSafe 内）
```

`TraceMeta` に `promptText` / `model` / `tokensIn` / `tokensOut` / `costJpy`。`outcome` は editor の business 判定（approved/rejected/warned）や safety skip 理由を入れる（status=実行成否、outcome=業務結果、の二層）。

**Workers からの Supabase 書込手段**: 既存 lib が使う Supabase アクセス経路（service role REST / supabase-js）を踏襲する（新規依存を増やさない）。`recordTraceSafe` はその共通クライアントを再利用。

**runId 採番と相関**:
- **cron run**: `scheduled()` で 1 起動につき UUID を発番し `JobMessage.runId` に載せ consumer へ引き回す（既存 `JobMessage` に `runId?: string` 追加）。起動時に `xad.run` を 1 行 insert（status=running）。
- **`/admin/enqueue`（手動）**: 同様に発番（trigger=manual）。
- **LINE 承認の相関（CRITICAL対応）**: webhook の `line-event` は別起動だが、承認/投稿を**元の post run に繋ぐ**必要がある。`post_drafts` に `run_id` 列を追加（draft 生成時の post run を記録）。承認 webhook → publisher の trace は、対象 draft の `run_id` を引いて**同じ run に trace 追記**する（`/runs/[id]` で writer→editor→approval-request→approval-response→publish が started_at 順に一続きに並ぶ）。webhook 自体の受信は別途 `trigger=webhook` の軽量 run として残す。

**run lifecycle と Queue retry（MAJOR対応）**: `handleJob()` 例外時は `m.retry()` され（[worker.ts] queue() catch）、`wrangler.toml` の `max_retries=3` まで再試行される。lifecycle 判定には試行回数が必要なので、**queue handler 側が `m.attempts` / `max_retries` を渡す**:
- 配線: `handleJob(msg, env, ctx, { attempt: m.attempts, maxAttempts })`。`xad.run` の attempt をこの値で更新。
- **off-by-one 注意**: Cloudflare の `max_retries=3`（[wrangler.toml]）は「リトライ上限」で、初回配信を含めた**総試行回数は `maxAttempts = 1 + max_retries = 4`**（4 回目失敗で DLQ）。`m.attempts` は 1 始まり。
- 判定: 成功 → `status=ok`。失敗かつ `attempt < maxAttempts` → `status=running` のまま attempt 更新・error テキスト更新（再試行に委ねる）。失敗かつ `attempt >= maxAttempts`（=最終失敗）→ `status=error`。brownout skip → `status=skipped`。
- **`xad.run_trace` にも `attempt int not null default 1`** を持たせる（同一 run_id・stage_id が attempt 違いで複数行になるため）。UI は `max(attempt)` の行を主表示し、過去 attempt は折りたたみ。

> `maxRetries` は wrangler.toml の値とソース二重管理になる。実装計画で env もしくは定数 1 箇所に集約する。

**trace の順序（seq 採番、MAJOR対応）**: post-job は直列+並列混在（editor 内は LLM/factuality judge が `Promise.all`）。連番カウンタは競合するため **`started_at`（timestamptz）+ identity `id` で順序付け**し、`seq` 必須列は持たない。並列 stage は started_at が近接しても id で安定ソート。

**計装ポイント**（MVP）: `handleJob()` の各 case 冒頭/末尾（safety skip 含む）+ `runPostJob` 内の writer/hook/editor/line-approval 呼び出し境界 + publisher。editor rejected で `line-approval` が呼ばれない場合は `line-approval status=skipped, outcome=editor_rejected` を明示記録（タイムライン欠落回避）。

**LLM の prompt/tokens 捕捉**: 現状 LLM 呼び出しの**共通ラッパは存在せず**、`lib/ideation/ideate.ts` / `lib/writer/writer-x.ts` / `lib/editor/llm-judge.ts` / `factuality-judge.ts` 等が各自 Anthropic SDK を直叩きしている。そこで `lib/trace/llm-trace.ts` に薄い `callClaudeTraced()` ヘルパ（messages.create を包み、prompt と `usage.input_tokens/output_tokens` を返す）を追加し、計装対象 stage の呼び出し箇所を段階的に差し替える。未差し替えの LLM 呼び出しは tokens=null（prompt は別途 trace の `promptText` に渡せば表示可）。コストは既存 `lib/cost/cost-model` で tokens から算出。

### 4.3 Supabase schema（migration 0013）

既存 migration 規約に合わせる: `create table if not exists`、新規 table ごとに RLS enable、`xad` schema は MCP `apply_migration` 適用（既存 0006〜0012 と同経路。[feedback-prefer-cli-over-mcp] の例外として ofmeton-apps の migration は MCP 継続）。

```sql
-- migration 0013_run_trace.sql

-- xad.run: cron/手動/webhook 1 起動
create table if not exists xad.run (
  id            uuid primary key,
  job           text not null,          -- "post-morning" 等
  trigger       text not null,          -- "cron" | "manual" | "webhook"
  date          text not null,          -- JST 日付
  status        text not null default 'running', -- running|ok|error|skipped
  attempt       int  not null default 1, -- Queue retry の試行回数（m.attempts 由来）
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  error         text
);

-- xad.run_trace: run 内の 1 stage 実行（attempt ごとに行が増える）
create table if not exists xad.run_trace (
  id            bigint generated always as identity primary key,
  run_id        uuid not null references xad.run(id) on delete cascade,
  stage_id      text not null,          -- registry の id と一致
  attempt       int  not null default 1, -- Queue retry の試行回数（同一 run_id・stage_id が複数行になり得る）
  status        text not null,          -- ok|error|skipped（実行成否）
  outcome       text,                   -- 業務結果: approved|rejected|warned|brownout 等（status と二層）
  started_at    timestamptz not null default now(),  -- 順序キー
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
-- 順序付けは started_at + id（連番 seq は並列実行と競合するため持たない）
create index if not exists run_trace_run_order_idx on xad.run_trace (run_id, started_at, id);
create index if not exists run_trace_stage_recent_idx on xad.run_trace (stage_id, started_at desc);

-- 既存テーブルへの相関列追加（LINE 承認→publisher を元 post run に接続）
alter table xad.post_drafts add column if not exists run_id uuid;

-- RLS: 既存 table と同様に enable。読みは service role（RLS バイパス）で server からのみ。
alter table xad.run enable row level security;
alter table xad.run_trace enable row level security;
-- anon/authenticated 向け policy は付与しない（server service role 専用）。
```

- **RLS**: `xad` schema は service role 経由読取。Next.js は **server 側のみ** service role key を保持しクライアントに露出しない。anon ロールには policy を与えない（読めない）。
- **保持**: 90 日。掃除は Phase 2（`maintenance` 系 job で `created_at < now() - 90d` を削除）。MVP は未実装で可（量が小さい）。
- **PII**: trace は draft 本文・素材を含む。重要な訂正 → **`prompt_text` も PII 保持対象**。実コードでは ideation/factuality の prompt に素材本文が `redacted_text ?? raw_text` で入り（[ideate.ts] / [post-job.ts]）、redacted が無いと raw_text（PII 含む可能性）が prompt に混ざる。したがって:
  - `input_json` / `output_json` / `prompt_text` の**いずれも保存前に DLP redact を通す**（既存 `lib/dlp/redact` を再利用）。trace 保存経路では raw_text フォールバックを使わない（redacted 必須、無ければ redact してから格納）。
  - real PII（email/phone/カード/住所/APIキー等）は記録しない。
  - プロンプトのテンプレート部分（指示文・ルール）は秘匿でないが、**素材を差し込んだ最終 prompt は redact 後**を格納する。

### 4.4 Next.js ダッシュボード（Vercel）

**配置**: `apps/xad-dashboard/`（all-good-ops モノレポ内、Worker と同居）。理由: registry・Supabase `xad` schema・型を Worker と共有するため、別リポより同居が自然。ただし all-good-ops は JS workspace 化されていないため、**cross-package の TS 直 import は避ける**。Worker 側に `npm run build:registry` を用意し `lib/registry/registry.generated.json`（meta.ts から生成）を出力、dashboard はこの JSON を読む。meta.ts が authoring SSOT、JSON が配布物。

**スタック**: Next.js（App Router）+ React Flow（工程図）+ Supabase JS（server component / route handler で service role 読取、独自 package.json で自己完結）+ Tailwind。既存 `hidamari-cms`（別リポ）と同パターン。`frontend-design` スキル常時起動で実装。

**ルート**:

| route | 画面 | データ源 |
|---|---|---|
| `/` | 工程フローチャート | registry（bundle）+ 各 stage の直近 trace status（Supabase） |
| `/` ノードクリック | 右パネル: [定義] tab + [実行] tab | 定義=registry / 実行=run_trace（stage_id で直近 N 件） |
| `/runs` | run 一覧（新しい順、job/status/duration） | xad.run |
| `/runs/[id]` | 1 run の全 stage タイムライン（started_at + id 順に IO 展開） | xad.run + run_trace |

**ノード詳細パネル — [定義] tab**: purpose / inputs / outputs / keyVariables 表 / promptText（折りたたみ）/ GitHub ソースリンク / 設計書リンク。
**[実行] tab**: 直近 run のリスト → 選択で input_json / output_json（JSON viewer）/ prompt_text / model・tokens・cost・duration / error。

**色規則**: ノード枠 = 直近 trace の状態。基本は `status`（緑=ok / 赤=error / 灰=未実行）。ただし `outcome` を持つ stage は **outcome 優先**（editor: rejected=赤系 / warned=黄 / approved=緑、safety: brownout skip=灰青）。「実行は成功したが業務判定で却下」を緑で誤魔化さない。run 単位では status=skipped を灰青、最終失敗(error)を赤。

**認証**: `middleware.ts` で Basic 認証（`BASIC_AUTH_USER` / `BASIC_AUTH_PASS` env）。Vercel 環境変数。

## 5. データフロー（投稿 run の例）

```
06:00 cron "post-morning" 発火
  → scheduled(): runId(R1) 発番, xad.run insert(R1, status=running), queue.send({job, runId:R1, slot, date})
  → consumer handleJob(msg, env, ctx):
      [safety] brownout 判定
         └ 投稿許可外 → run(R1) status=skipped + trace(safety, status=skipped, outcome=brownout) → 終了
      withTrace(ctx, writer)  → core_idea 読込 / 本文生成 / prompt+tokens 記録
      withTrace(ctx, hook)    → 分類（rule/score）
      withTrace(ctx, editor)  → 6+5 判定 → status=ok, outcome=approved|rejected|warned
         ├ rejected → post_drafts 保存(run_id=R1) / pushApproval 呼ばない
         │             → trace(line-approval, status=skipped, outcome=editor_rejected)
         └ approved/warned → post_drafts 保存(run_id=R1)
      withTrace(ctx, line-approval) → LINE Flex push（approved/warned 時のみ実行）
  → xad.run(R1) update(status=ok, finished_at)

（時間差）人間が LINE で承認タップ
  → webhook: line-event 受信。runId(R2, trigger=webhook) で軽量 run、対象 draft の run_id=R1 を引く
  → withTrace(ctx, publisher) → X 投稿。trace は run_id=R1 に追記（元 post run に接続）
```

ダッシュボードは `/runs/R1` を開くと writer→editor→(line-approval)→publisher が **started_at 順**に一続きで並ぶ（承認の時間差を跨いで同一 run に集約）。editor が rejected の run は line-approval が `skipped` 表示で欠落に見えない。

**`修正:` 再生成フローの相関（MAJOR対応）**: LINE で `修正: <指示>` が来ると `handleLineEvent` → `handleReviseFeedback` が同じ draft を読み、`reviseDraftForX` + `runEditor` を再実行し**同じ `post_drafts` 行を上書き**して再度承認を出す（[line-event.ts]）。このとき投稿される body は revised 版なので、`/runs/R1` の writer/editor IO が古いままだと実投稿と不一致になる。対策:
- `修正:` も webhook 起動（trigger=webhook）だが、その trace は対象 draft の `run_id`(=R1) を引いて**元 post run に追記**する（publisher と同じ相関規則）。
- **stage_id は registry と一致必須**: 再生成は新ノードを作らず `stage_id='writer'`（および `editor`/`line-approval`）のまま、**`input_json.revision=true` のみで初回と区別**する（registry に `revise-writer` 等は追加しない）。`outcome` は **revision 判別に使わない**（衝突回避）。`outcome` は各 stage の業務結果のまま: writer=（基本 null）/ editor=`approved|rejected|warned` / line-approval=`requested|skipped`。
- 結果、`/runs/R1` は started_at 順で「初回 writer→editor→approval-req →（修正）writer(revision)→editor→approval-req →publish」と再生成も含めた全履歴が時系列で並ぶ。最新 body は最後の revision trace の output で確認できる。UI は `input_json.revision` で「修正」バッジを出す。
- `post_drafts` 自体は上書き運用のまま（version 化はしない＝YAGNI）。履歴は run_trace 側が時系列で保持する。

## 6. 段階計画

### MVP（Phase 1）

1. `lib/registry/` + 主要工程の `meta.ts`（投稿生成系ノード）+ `build:registry` で `registry.generated.json` 出力
2. `JobMessage` に `runId` 追加 / `handleJob(msg, env, ctx)` に `ctx` を渡す配線変更（worker.ts queue()）/ `post_drafts.run_id` で承認相関
3. `lib/trace/` + `withTrace`（ctx.waitUntil 完了保証・fail-open）+ `llm-trace.ts` 計装（ingest/ideation/post-job 内 writer・hook・editor・line-approval/publisher、safety skip 記録）
4. migration 0013（run / run_trace + post_drafts.run_id + RLS、MCP apply）
5. Next.js `apps/xad-dashboard/`: `/`（フローチャート + ノード詳細 2 tab）+ `/runs` + `/runs/[id]` + Basic 認証
6. Vercel デプロイ + 本番 Worker に計装込み再 deploy + 1 run 実データで疎通確認（editor rejected run と brownout skip run も表示確認）

### Phase 2（MVP 稼働後）

- 周期ジョブノード（digest/rollback/rotation/oauth/interviewer）
- UI から「この工程を再実行」ボタン（既存 `/admin/enqueue` を叩く）
- optimizer posterior の可視化（8 パラメータ・段階別）
- コスト推移グラフ（既存 `lib/dashboard/cost-report` と接続）
- trace 90 日 retention の自動掃除 job

## 7. テスト方針

- **Worker 計装**: `withTrace` の fail-open（recordTrace が throw しても本体結果が返る）を単体テスト。runId の引き回しを post-job テストに追加。
- **registry**: 全 stage_id が一意 / upstream-downstream が対称 / trace の stage_id が registry に存在することを検証するテスト。
- **Next.js**: run_trace のクエリ層を fixture でテスト。フローチャートは Playwright で 1 run 描画スモーク。
- 既存 359 tests を壊さないこと（計装は加算のみ）。

## 8. リスクと対策

| リスク | 対策 |
|---|---|
| 計装が本番パイプラインを壊す | fail-open 徹底 + 既存テスト全緑維持 + 1 stage ずつ追加 |
| trace に real PII が載る | DLP redact 後の値のみ格納 / email・phone 等は記録しない |
| registry がコードと乖離 | meta.ts をコード隣に co-locate + registry↔trace stage_id 整合テスト |
| Supabase 書込増によるコスト | Phase 1 は 3投稿/日 + 数ジョブ = 1 日数十 trace。無視できる規模 |
| service role key 露出 | Next.js server 限定 / クライアントへ渡さない / middleware で全 route 保護 |

## 9. オープン事項（実装計画で確定）

- `registry.generated.json` の生成・連動（Worker prebuild で生成 → dashboard が読む。CI/Vercel build での連動方法。MVP は手動再生成でも可）
- `recordTraceSafe` が再利用する Supabase 共通クライアントの特定（lib 内の既存アクセス層）
- `max_retries` の単一ソース化（wrangler.toml と lifecycle 判定の二重管理を env/定数で解消）
- 遅延 publisher / revision が失敗した場合に元 post run の `status` をどう更新するか（既に ok の run を error に戻すか、最新 attempt のみ反映か）を実装計画で明文化

> 解決済（セルフ + Codex レビュー反映）:
> - 計装の完了保証 → `ctx.waitUntil`（floating promise 回避、§4.2）
> - LINE 承認の相関 → `post_drafts.run_id` で元 post run に接続（§4.2/§4.3/§5）
> - run lifecycle と Queue retry → `attempt` 列 + 最終失敗のみ error（§4.2/§4.3）
> - brownout skip / editor rejected の可視化 → `run.status=skipped` + `run_trace.outcome` 二層（§4.1/§4.3/§5）
> - retry lifecycle → attempt を queue handler から伝播 + run_trace.attempt。最終失敗判定は `maxAttempts=1+max_retries=4`（off-by-one 回避、§4.2/§4.3）
> - `修正:` 再生成の相関 → revise の trace も元 run_id に追記。stage_id は registry 準拠（`writer` のまま）、revision 判別は `input_json.revision=true` のみ（outcome は業務結果を維持＝衝突回避）、post_drafts は上書きのまま履歴は trace 側（§5）
> - prompt_text の PII → input/output/prompt すべて DLP redact 後に格納、raw_text フォールバック禁止（§4.3）
> - seq 競合 → `started_at`+id 順序（seq 列廃止、§4.2/§4.3）
> - hook-classifier はプロンプト無し（規則ベース）→ logicKind で定義 tab 出し分け（§4.1）
> - MVP スコープを「投稿生成系」に明示（digest/rollback/rotation は Phase 2、§4.1）
> - DDL を `if not exists` + RLS enable + MCP apply 規約準拠（§4.3）
> - sourcePath 複数化（orchestrator は src/jobs/、§4.1）
> - LLM 共通ラッパ非存在 → `lib/trace/llm-trace.ts`（§4.2）／ 配置 → `apps/xad-dashboard/` + registry.json 方式（§4.4）／ attribution 非ノード化（§4.1）
