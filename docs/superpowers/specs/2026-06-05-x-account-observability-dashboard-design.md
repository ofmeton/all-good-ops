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
                      │   + 既存 14 tables                 │
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
  promptRef?: string;        // プロンプトの所在（ファイルパス or registry 内テキスト）
  sourcePath: string;        // GitHub リンク用相対パス（例: "apps/x-account-system/lib/writer/index.ts"）
  designDocAnchor?: string;  // consolidated 設計書のアンカー
  upstream: string[];        // 上流 stage id（辺の定義）
  downstream: string[];      // 下流 stage id
}
```

**MVP のノード一覧**（実ジョブ `src/queue.ts` 準拠）:

| group | stage id | 対応 | プロンプト有 |
|---|---|---|---|
| ingest | `buzz-ingest` | twitterapi.io → materials_store | - |
| ingest | `inspirations-ingest` | 週次 X/note seeds → materials_store | - |
| ideation | `ideation` | materials → core_ideas（LLM） | ✅ |
| generate | `writer` | core_idea → draft 本文 | ✅ |
| review | `hook-classifier` | hook 分類 | ✅ |
| review | `editor` | 6+5 DLP・業法判定（hard/soft） | ✅ |
| review | `dlp` | PII redact / lint | - |
| review | `safety` | brownout / kill-switch ゲート | - |
| approve | `line-approval` | LINE Flex 承認依頼・応答取込 | - |
| publish | `publisher` | X 投稿（OAuth refresh 込） | - |
| measure | `attribution` | UTM 計測 | - |
| learn | `optimizer` | Thompson Sampling 更新 | - |

> `writer`/`hook-classifier`/`editor`/`dlp` は `post-morning/noon/evening`（`runPostJob`）の内部サブ工程。run としては post-job 1 起動だが、trace は stage 単位で記録する。

**Phase 2 追加ノード**: `daily-digest` / `rollback-monitor` / `rotation-notice` / `oauth-refresh` / `interviewer`（ops group）。

### 4.2 Run Trace 計装（Worker 側）

**方針**: 各 stage 境界に薄い `trace()` ラッパを挿す。**fail-open**（トレース書込の失敗・例外は握りつぶし、パイプライン本体を絶対に止めない）。

```ts
// lib/trace/index.ts （新規）
export async function withTrace<T>(
  env: Env,
  ctx: { runId: string; stageId: string; input?: unknown },
  fn: () => Promise<{ result: T; output?: unknown; meta?: TraceMeta }>,
): Promise<T> {
  const started = Date.now();
  try {
    const { result, output, meta } = await fn();
    void recordTrace(env, { ...ctx, status: "ok", durationMs: Date.now() - started, output, ...meta });
    return result;
  } catch (e) {
    void recordTrace(env, { ...ctx, status: "error", durationMs: Date.now() - started, error: String(e) });
    throw e; // 本体のエラー伝播は変えない
  }
}
```

`recordTrace` は `try/catch` で Supabase insert 失敗を握る（fail-open）。`TraceMeta` に `promptText` / `model` / `tokensIn` / `tokensOut` / `costJpy` を含める。

**runId 採番**: `scheduled()` / `/admin/enqueue` / webhook で 1 起動につき UUID を発番し、`JobMessage` に載せて consumer まで引き回す（既存 `JobMessage` に `runId` を追加）。`xad.run` を起動時に 1 行 insert。

**計装ポイント**（MVP）: `handleJob()` の各 case 冒頭/末尾 + `runPostJob` 内の writer/hook/editor/dlp 呼び出し境界。LLM 呼び出しは既存のラッパ（あれば）で prompt/tokens を拾う。

### 4.3 Supabase schema（migration 0013）

```sql
-- xad.run: cron/手動/webhook 1 起動
create table xad.run (
  id            uuid primary key,
  job           text not null,          -- "post-morning" 等
  trigger       text not null,          -- "cron" | "manual" | "webhook"
  date          text not null,          -- JST 日付
  status        text not null default 'running', -- running|ok|error|partial
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  error         text
);

-- xad.run_trace: run 内の 1 stage 実行
create table xad.run_trace (
  id            bigint generated always as identity primary key,
  run_id        uuid not null references xad.run(id) on delete cascade,
  stage_id      text not null,          -- registry の id と一致
  seq           int not null,           -- run 内の実行順
  status        text not null,          -- ok|error|skipped
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
create index on xad.run_trace (run_id, seq);
create index on xad.run_trace (stage_id, created_at desc);
```

- **RLS**: 既存方針に従い `xad` schema は service role 経由読取。Next.js は **server 側のみ** service role key を保持し、クライアントに露出しない。
- **保持**: 90 日。`rollback-monitor` または別 maintenance job で `created_at < now() - 90d` を削除（Phase 2）。MVP は手動/未実装で可。
- **PII**: trace は draft 本文・素材を含む。Editor の DLP を経る前の素材に PII が混じる可能性 → `input_json`/`output_json` は **DLP redact 後 or 本文のみ**を入れる方針。real PII（email/phone 等）は記録しない。プロンプトは秘匿情報でないため格納可。

### 4.4 Next.js ダッシュボード（Vercel）

**スタック**: Next.js（App Router）+ React Flow（工程図）+ Supabase JS（server component / route handler で service role 読取）+ Tailwind。既存 `minpaku` / `hidamari-cms` と同パターン。`frontend-design` スキル常時起動で実装。

**ルート**:

| route | 画面 | データ源 |
|---|---|---|
| `/` | 工程フローチャート | registry（bundle）+ 各 stage の直近 trace status（Supabase） |
| `/` ノードクリック | 右パネル: [定義] tab + [実行] tab | 定義=registry / 実行=run_trace（stage_id で直近 N 件） |
| `/runs` | run 一覧（新しい順、job/status/duration） | xad.run |
| `/runs/[id]` | 1 run の全 stage タイムライン（seq 順に IO 展開） | xad.run + run_trace |

**ノード詳細パネル — [定義] tab**: purpose / inputs / outputs / keyVariables 表 / promptText（折りたたみ）/ GitHub ソースリンク / 設計書リンク。
**[実行] tab**: 直近 run のリスト → 選択で input_json / output_json（JSON viewer）/ prompt_text / model・tokens・cost・duration / error。

**色規則**: ノード枠 = 直近 trace status（緑=ok / 赤=error / 灰=未実行 or skipped / 黄=partial）。

**認証**: `middleware.ts` で Basic 認証（`BASIC_AUTH_USER` / `BASIC_AUTH_PASS` env）。Vercel 環境変数。

## 5. データフロー（投稿 run の例）

```
06:00 cron "post-morning" 発火
  → scheduled(): runId 発番, xad.run insert(status=running), queue.send({job, runId, slot, date})
  → consumer handleJob():
      withTrace(writer)   → core_idea 読込 / 本文生成 / prompt+tokens 記録
      withTrace(hook)     → 分類
      withTrace(editor)   → 6+5 判定 / hard却下 or soft警告
      withTrace(line-approval) → LINE Flex push
  → xad.run update(status=ok, finished_at)
（人間が LINE 承認 → webhook line-event run → publisher trace）
```

ダッシュボードは `/runs` でこの run を見つけ、開くと writer→hook→editor→line-approval の IO が seq 順に並ぶ。

## 6. 段階計画

### MVP（Phase 1）

1. `lib/registry/` + 主要工程の `meta.ts`（12 ノード）
2. `lib/trace/` + `withTrace` 計装（ingest/ideation/post-job 内 writer・hook・editor/publisher）
3. migration 0013（run / run_trace）+ RLS
4. Next.js: `/`（フローチャート + ノード詳細 2 tab）+ `/runs` + `/runs/[id]` + Basic 認証
5. Vercel デプロイ + 本番 Worker に計装込み再 deploy + 1 run 実データで疎通確認

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

- LLM 呼び出しから prompt/tokens を拾う既存ラッパの有無 → 無ければ trace 用に薄い計測ヘルパを追加
- `JobMessage` への `runId` 追加が webhook line-event 経路に与える影響の確認
- Next.js リポの配置（all-good-ops モノレポ内 `apps/xad-dashboard/` か、別リポか）→ モノレポ内 `apps/` を第一候補
