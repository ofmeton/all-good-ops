# 人間キュレーションUI（ステージ2）設計

> 2026-06-06 / X発信システム新アーキ〈収集Ag → **人間UIで選抜** → 執筆Ag → チェックAg → 人間承認 → 予約投稿〉の **第2工程**。
> 第1工程（収集Ag）は出荷済（PR#112）。設計思想: agent=脳 / code=道具＋配管 / **人間=最終ゲート**。本工程はその「人間ゲート」の実体。

## 1. Context（なぜ作るか）

収集Agが毎朝 ~138 件の素材を `materials_store`（3軸スコア＋discovery＋media 付き）に貯める。だが **人間が選抜する窓口が無い**。このUIが「人間=最終ゲート」を具現化し、選抜結果を執筆Ag（次工程）へ渡す。

設計の二大要求:
1. **ユーザーシナリオを網羅** して選抜運用に必要な機能を検討し切る（後掲 §3）。
2. **後から改善できるようログを徹底** — 現在状態（`selection_status`）だけでなく、人間の意思決定を **追記型ログ** で残し、改善レバー L1(ソース)/L3(クエリ)/L5(スコア較正) の歩留まり分析を可能にする。これが `k-x-improvement-from-traces.md` の改善ループ（ログ→計測→分析→仮説→施策）の計測基盤になる（収集Ag spec §改善レバー の続き）。

## 2. 配置（確定）

本番稼働中の `apps/xad-dashboard/`（Next.js 16 / React 19 / Tailwind v4 / Basic認証[proxy.ts] / Vercel / Supabase service role）に **`/curation` ルート追加**。観測(read)専用だった所に初の **操作(write)経路** を持たせる。認証は proxy.ts の catch-all matcher で `/curation` も自動適用。

## 3. ユーザーシナリオ網羅 → 機能

| # | シナリオ | 必要機能 |
|---|---|---|
| S1 | 日次キュレーション（主動線）: 朝、未処理を overall降順で流し見→数件選抜→執筆へ | 未処理タブ・overallソート・カード・複数選択・「執筆へ送る」・送信後即時反映 |
| S2 | 溜まったプール消化(catch-up): 数百件を鮮度/スコアで絞り、雑を一括除外 | freshnessソート・スコア閾値&discoveryフィルタ・一括除外・件数表示 |
| S3 | ソース品質監査(L1): どのソースが良い球か | source handleフィルタ・discovery viaフィルタ・タブ別件数バッジ |
| S4 | スコア較正(L5・最重要): overall高なのに微妙/低なのに刺さる、のズレ記録 | score_reason表示・選抜/除外の行為がズレ信号・任意 note（違和感メモ） |
| S5 | 再キュレーション/取消(undo): 誤操作を戻す | 双方向遷移（collected↔selected↔rejected↔queued、全遷移ログ） |
| S6 | 送る前の最終確認: 選抜済を見直し→数件外す→確定送信 | 選抜済タブで deselect・送信 |
| S7 | 重複送信防止: 一度送った素材を再送しない | 送信済は `queued` 状態で未処理から除外・idempotent |
| S8 | 内容深掘り: スレ断片の全文/メディア/元ツイート | tweet_urlリンク・media表示・conversation_idスレリンク・score_reason折りたたみ・原文全文 |
| S9 | テキスト検索: 特定キーワードを含む素材 | raw_text 部分一致検索 |
| S10 | 空状態/エラー: collect前・全消化・Supabase未設定・enqueue失敗 | 各空状態メッセージ・enqueue失敗トースト（DB更新は成功・後で再送可） |
| S11 | 性能: プールが数百〜千件 | サーバ側 status別 limit(300)＋件数表示（超過は明示・silent truncation 禁止） |
| S12 | 改善分析（今ログを残す） | curation_events 追記ログ＋集計SQL（§8）＋タブ件数バッジ |
| S13 | 全操作のログ | 全状態遷移を curation_events に記録（snapshot付き） |

## 4. 状態モデル & アクション

`selection_status`（`materials_store.meta` jsonb 内、migration 0015 で index 済）を 4 値に拡張:

- `collected` 未処理 / `selected` 選抜済（執筆未送のステージング） / `queued` 執筆へ送信済（compose enqueue 済・重複防止） / `rejected` 除外

**タブ**: 未処理 / 選抜済 / 送信済 / 除外（各 label に件数バッジ）。

**カード複数選択 → 一括アクションバー**:
| アクション | 遷移 | 副作用 |
|---|---|---|
| 選抜 | → `selected` | curation_events(select) |
| 除外 | → `rejected` | curation_events(reject) |
| 未処理へ戻す | → `collected` | curation_events(reset) |
| 執筆へ送る | → `queued` | curation_events(send_to_compose) ＋ compose enqueue。未処理/選抜済どちらからも可（S1高速路） |

## 5. アーキテクチャ / データフロー

```
[一覧]  serverSupabase(service role) で materials_store(x_inspirations) を status別 limit 取得
   ▼   client: overall降順default ＋ 全軸ソート切替 ＋ discovery/media/lang/source フィルタ ＋ テキスト検索 ＋ 複数選択
[操作]  一括アクション → POST /api/curation/select { ids[], action, note? }
   ▼
[書込]  RPC set_selection_status(ids, status) で meta.selection_status を jsonb_set 一括更新（原子的・updated_at更新）
   ▼
[ログ]  curation_events に 1 行/素材 追記（action / from→to / scores・discovery snapshot / source_ref / note? / compose_run_id?）
   ▼  （send_to_compose の場合のみ↓）
[起動]  Worker GET /admin/enqueue?job=compose&key=OAUTH_ADMIN_SECRET → runId 取得 → events に compose_run_id 追記
   ▼
[配管stub] queue consumer case "compose": withTrace(stageId="compose") で selection_status='queued' を読み、件数＋ID を trace.output_json に記録して ok 返す
            （実 writer 本体は次ステージで埋める）
```

ダッシュボード(Vercel)は Cloudflare Queue を直接叩けない → Worker の既存 `/admin/enqueue`（OAUTH_ADMIN_SECRET ゲート、`src/worker.ts:227`）を HTTP 経由で叩く。compose ジョブは payload を持たず、consumer が DB の `queued` を読む（既存 ideation 工程の claim パターン `lib/ideation/ideate.ts:191-294` に倣う）。

## 6. ログ設計（最重要・追記型 `xad.curation_events`）

run_trace 相乗りではなく **専用テーブル**。理由: run_trace は run_id FK 必須でパイプライン実行単位の設計、人間のキュレーション意思決定（material 単位・スコア/discovery の snapshot 付き）とは粒度が違い、`discovery.via 別採用率` や `スコア vs 選抜の相関` の分析 SQL が書きやすい。

```sql
create table xad.curation_events (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  material_id uuid not null references xad.materials_store(id),
  action text not null check (action in ('select','reject','reset','send_to_compose')),
  from_status text,
  to_status text not null,
  scores jsonb,            -- 決定時点の {freshness,velocity,target_fit,overall} コピー（後でスコア変化しても drift しない）
  discovery jsonb,         -- {via, query} コピー
  source_ref text,         -- author handle
  note text,               -- 任意: 人間メモ（スコア違和感等。L5 シグナル）
  compose_run_id uuid,     -- send_to_compose 時の enqueue runId（収集→選抜→執筆の貫通）
  actor text not null default 'ofmeton'
);
create index curation_events_material_idx on xad.curation_events(material_id);
create index curation_events_action_created_idx on xad.curation_events(action, created_at);
create index curation_events_via_idx on xad.curation_events((discovery->>'via'));
```

**snapshot を持つ理由**: 決定時のスコア/discovery を固定保存 → 後で素材が更新・再採点されても歩留まり分析が壊れない。これが「後から改善」の土台。

## 7. コンポーネント / ファイル

**dashboard 新規**
- `app/curation/page.tsx` — server component。タブ(status)別 `listCurationMaterials(status, limit)` 取得 → client へ props（`app/runs/page.tsx` 流儀、`export const dynamic = "force-dynamic"`）
- `app/curation/CurationClient.tsx` — `"use client"`。ソート/フィルタ/検索/複数選択 state、一括アクションバー、タブ切替（`app/components/NodePanel.tsx` の `border-b-2` タブUI流用）
- `app/curation/MaterialCard.tsx` — Xライクカード（著者/本文/media/3軸スコア＋overallバッジ/score_reason折りたたみ/discoveryバッジ/collected_at/tweet_urlリンク/lang）。色は `lib/colors.ts` 流儀
- `app/api/curation/select/route.ts` — `POST`（`app/api/stage/[id]/route.ts` 流儀）。{ids,action,note?} → RPC → events 追記 →(send時)worker enqueue。serverSupabase はサーバ側のみ
- `lib/curation-queries.ts` — `listCurationMaterials(status, limit)` / `tabCounts()` / `recordCurationEvents()` / `setSelectionStatus()`（RPC 呼び）

**dashboard 修正**
- `app/layout.tsx`（header nav、現状 工程図 / Runs）に `<a href="/curation">Curation</a>` 追加
- `.env.example` に `WORKER_BASE_URL` / `OAUTH_ADMIN_SECRET` 追加（Vercel env にも投入）

**worker 修正（配管）**
- `src/worker.ts` — `JobMessage` union に `"compose"` 追加 / `ADMIN_ENQUEUEABLE` に `compose` 追加
- `src/queue.ts` — `case "compose":` stub（`queued` 素材を読み件数/ID を withTrace 記録、ok 返す）
- `lib/registry/stages/index-stages.ts` — `compose` ノード追加（group "compose" / logicKind "llm" placeholder / upstream=["curation"] / downstream=["check"]）→ `npm run build:registry` 再生成

**collector 修正（エンゲージソート S3 のデータ手当て）**
- `lib/ingest/collector-persist.ts` `buildMaterialRow` の meta に `engagement{like,retweet,reply,quote,view,bookmark}` 追加（次回 collect 分から有効）。既存138件は engagement 無し → カードは「—」表示・engagementソートで末尾。`lib/ingest/twitterapi-client.ts` の Tweet が該当 count を持つか確認し、欠ける物のみ補完。

**migration**
- `migrations/0016_curation.sql` — ① `xad.curation_events` テーブル＋index ② `xad.set_selection_status(p_ids uuid[], p_status text) returns int`（`update materials_store set meta=jsonb_set(meta,'{selection_status}',to_jsonb(p_status)), updated_at=now() where id = any(p_ids)`、status を `in ('collected','selected','queued','rejected')` で関数内検証、更新件数を返す）

## 8. 改善分析 SQL（レバー効果の計測・付録）

各レバーに「動かすとこの数字が動く」を 1:1 対応:

- **L1 ソース別採用率**: `curation_events` を `source_ref` で group、`count(*) filter (where action='select')` / `count(*) filter (where action in ('select','reject'))`。
- **L3 discovery.via・query別採用率**: `discovery->>'via'` / `discovery->>'query'` で group。探索クエリが良ネタを引くか。
- **L5 スコア vs 選抜の相関（最重要）**: `(scores->>'overall')::numeric` を 0-20/20-40/.../80-100 に bucket 化 × action。「高overallなのに reject」「低overallなのに select」を抽出 → スコアの人間一致度を診断。
- **歩留まりファネル**: collected → selected → queued の件数推移（source/日付別）。

## 9. エラー処理 / 不変条件

- service role は **サーバ側 route のみ**（client 非公開。`serverSupabase()` 流儀厳守）。
- 順序保証: RPC で status 更新＋events 追記が成功 → その後 enqueue。**enqueue 失敗時も DB 更新は成功扱い**（`queued` のまま）、UI にトースト「執筆ジョブ起動失敗・再送可」。再送は status 更新せず enqueue だけ再実行（compose stub は全 `queued` を読む＝idempotent）。
- RPC 失敗時は enqueue しない（中途半端な送信を防ぐ）。
- 空状態: Supabase 未設定/0件/全消化を各タブで明示メッセージ（`x-buzz-radar/src/app/posts/page.tsx` の未設定ガード流儀）。
- limit 超過は件数を表示（silent truncation 禁止）。

## 10. テスト戦略（TDD）

- `lib/curation-queries.ts`: status→クエリ構築・tabCounts・events row 構築のユニット（決定的）。
- migration 0016: ローカル Supabase で apply → `set_selection_status` の不正 status reject・jsonb_set が他 meta を壊さない・件数戻り値・curation_events insert を検証。
- compose stub: `queued` 素材を読む不変条件テスト（0件でも ok）。
- route `/api/curation/select`: action 別に「status 更新＋events 追記が両方走る」「send時のみ enqueue が呼ばれる」「enqueue失敗でも 200＋warning」をモックで検証。
- 既存 worker テスト緑（`npm test` IN_MEMORY_FALLBACK=true）＋ `npm run worker:typecheck` ＋ `npm run build:registry`。dashboard `npm run build` 緑。

## 11. スコープ / YAGNI

- 今回 = 一覧/タブ/ソート/フィルタ/検索/4アクション選抜書込/curation_events ログ/分析SQL/compose配管stub/engagement追記 まで。
- **実 writer 本体・check Ag・予約投稿は対象外**（後続ステージ）。
- 歩留まり可視化はタブ件数バッジ＋§8 SQL まで（専用ダッシュボードパネルは後日）。
- actor は当面 `'ofmeton'` 固定（マルチユーザー化は YAGNI）。
- 4軸目スコア(差別化)・get_article は収集側スコープ外のまま。

## 12. 検証（E2E）

1. ローカル: `npm run worker:typecheck` / `npm test` / `npm run build:registry` 緑。dashboard `npm run build` 緑。
2. migration 0016 を本番(ofmeton-apps ref=hofvvcvhjslevymhbcqj)へ適用（人間確認後）。`set_selection_status` と `curation_events` 存在確認。
3. worker 再デプロイ（compose ジョブ登録）。
4. dashboard を Vercel デプロイ（`WORKER_BASE_URL`/`OAUTH_ADMIN_SECRET` env 投入後）。
5. 実データE2E: `/curation` で実 ~138 件表示 → ソート/フィルタ/検索動作 → 数件「選抜」→ selected タブ移動 → 「執筆へ送る」→ queued 化＋compose run が `xad.run`/`run_trace` に記録 → `curation_events` に snapshot 付き行 → §8 SQL が走る。
6. push 前 `git log --oneline main..HEAD`。1セッション=1 task ブランチ・worktree 隔離・PR squash。
