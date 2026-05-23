---
date: 2026-05-23
status: draft
type: integration-spec
parent:
  - docs/superpowers/specs/2026-05-22-money-bot-design.md
  - docs/superpowers/specs/2026-05-23-x-buzz-radar-design.md
  - docs/superpowers/specs/2026-05-20-publishing-pivot-design.md
---

# 2026-05-23 Publishing Engine Integration — money-bot + x-buzz-radar 統合設計

## 1. 背景・目的

発信ピボット (2026-05-20) で立ち上がった 2 サブシステムを **集客 → 収益化** の funnel として統合する。

### 役割分担

| サブシステム | レイヤー | KGI 寄与 |
|---|---|---|
| **x-buzz-radar** | **集客 (Top of Funnel)** | アカウント (X / IG) のフォロワー獲得・注目を集める。海外 X バズを 3 媒体で発信 |
| **money-bot** | **収益化 (Bottom of Funnel)** | 集まった注目を **note 購入** に変換。月 ¥10,000 を稼ぐ |
| **接合面** | x-buzz-radar の X / IG 投稿に money-bot 生成 note への導線を埋め込み | フォロワー → note 読者 → note 購入者 への CV ファネル |

### 全体方針

- **Plan-B 半自律** (money-bot spec §4 採用) を全体で維持: API 自動 + 人間 30-60 秒/日承認
- 既存 ofmeton 名義 + `_hagurin__` 名義 (旧 monetize-os 統合済) で 3 媒体運用
- 月予算: x-buzz-radar 約 $40 + money-bot ¥10,000 内 = 統合後 **約 ¥16,000/月** (どちらが KGI 達成しなければ撤退ライン発動)

## 2. ユーザー判断 (2026-05-23 セッション内 4 件確定)

1. ✅ **時間軸**: Phase 1 で money-bot 単独完走 → Phase 2 で統合
2. ✅ **コードベース**: 1 つの Vercel project に merge (money-bot/ に x-buzz-radar/ を取り込む)
3. ✅ **データフロー**: B 案 (x-buzz-radar と money-bot が直接 pipe)
4. ✅ **UI**: LINE bot 1 つ + 統合承認 UI (タブ切替で X / IG / note)

## 3. 段階的移行計画

### Phase 1: money-bot 単独完走 (2026-05-23 — 06末) ← 現在

**ゴール**: cron 1 日 1 回 → AI 動向シグナル → writer/visual/reviewer/sns → 承認 UI → publish が 1 週間連続稼働

**着手**:
- money-bot/ E 案リファクタ (WDK DurableAgent + AI Gateway、Managed Agents 採用)
- system prompt を `.claude/agents/*.md` から workflows/prompts/*.ts に inline 化
- LINE 通知 → 軽量 Web 承認 UI → Instagram Graph API publish
- ai-radar.articles をデータソースとして mock からスタート
- dogfooding 1-2 週間 (実投稿の品質チェック + 改善)

**Phase 1 終了条件 (DoD)**:
- 7 日連続 cron が JST 14:00 に自走 → LINE 通知 → 承認 → publish 完了
- note 月 1 本 + X 月 7 本 + IG 月 3 本の実 publish 確認
- 月コスト ¥5,000 内

### Phase 2: x-buzz-radar 統合 (2026-07 — 08中)

**ゴール**: 1 つの Vercel project で集客 (x-buzz-radar) + 収益化 (money-bot) を統合運用

**作業項目**:
1. **コードベース merge** (money-bot/ に x-buzz-radar/ を吸収)
   - x-buzz-radar の `lib/twitter-fetch.ts` / `lib/relevance-judge.ts` / `lib/generate-variants.ts` などを money-bot/lib/ に移植
   - workflows/ に x-buzz-radar 用 workflow を追加 (例: `workflows/buzz-collect.ts` で twitterapi.io から取得)
   - x-buzz-radar の自走 cron (Phase 2 で計画) は同じ Vercel project の cron として登録
2. **Supabase project 統一**
   - money-bot は ai-radar project (jzlhzfdvaculblgwlkxz) に同居中
   - x-buzz-radar は Phase 1 で新規 project 作成済の想定 → Phase 2 で money-bot 同居 project に migration を merge
   - 必要 migration: `0002_buzz_collect.sql` (x-buzz-radar 由来テーブル統合)
3. **LINE bot 統一**
   - money-bot 用 LINE bot をそのまま使い、x-buzz-radar の通知も同じ bot から push
   - 通知メッセージに `tag: x-buzz | money-bot` を含めて識別
4. **統合承認 UI**
   - `/approval-queue/[runId]` を **タブ切替型** に拡張
     - タブ 1: X 投稿 (140 字テキスト + 添付画像プレビュー)
     - タブ 2: IG カルーセル (9 枚スライド + キャプション)
     - タブ 3: note 記事 (Markdown + 図解)
   - 1 つの runId で複数媒体の承認を一括処理 (個別却下も可)
5. **データ pipe (B 案実装)**
   - x-buzz-radar の workflow が「これ note 化したい」と判定 → Supabase `note_seed_queue` テーブルに insert
   - money-bot 側の cron 1 日 1 回 workflow が `note_seed_queue` を読みに行く
   - x-buzz-radar の SNS 投稿側 (X/IG) は note URL placeholder を含めて生成 → money-bot が note publish 後に Supabase 経由で URL を埋め戻し → 再承認なしで反映
6. **会計・KPI 統合**
   - `kpi_daily` テーブルを拡張 (channel: `x` / `instagram` / `note` / `buzz_collect` / `self_watch`)
   - 月次 ROI ダッシュボード: 集客 (フォロワー増) → CV (note 購入) のファネル可視化

**Phase 2 終了条件 (DoD)**:
- 統合 cron が連続 7 日稼働
- x-buzz-radar 由来の X バズ → IG カルーセル → note 記事 の 1 セット publish 完了
- 統合承認 UI で 3 媒体タブ切替動作確認
- 月コスト ¥16,000 内

### Phase 3: 自己改善ループ起動 (2026-09 — )

**ゴール**: x-buzz-radar の 2 軸自己改善 (Track A: 検索→採用 / Track B: 生成→反応) を money-bot の A/B テスト原資 (¥1,000/月) と統合

**作業項目**:
- self-watch (X owned reads / IG Graph API / note Playwright) を統合 cron に組み込み
- KPI 集計から Claude が「効いた構成」を分析 → 翌週 prompt を更新

## 4. 統合後アーキテクチャ (Phase 2 完了時)

```
                    ┌─────────────────────────────┐
                    │   Vercel Project (1個)        │
                    │   money-bot/                  │
                    │                               │
  cron 1日1回 ──→  │  /api/cron/buzz-collect       │   (x-buzz-radar 由来)
                    │    ↓                          │
                    │  workflows/buzz-collect.ts    │
                    │    ↓ twitterapi.io           │
                    │  judge (Haiku) → variants    │
                    │    ↓ note_seed_queue 投入    │
                    │                               │
  cron 1日1回 ──→  │  /api/cron/daily-publish      │   (money-bot 由来)
                    │    ↓                          │
                    │  workflows/daily-publish.ts   │
                    │    ↓ note_seed_queue 読込    │
                    │  writer/visual/reviewer/sns   │  (Managed Agents)
                    │    ↓ approval hook            │
                    │  publish_queue 保存           │
                    │                               │
                    └─────────────┬─────────────────┘
                                  ↓
                          LINE bot (1個) → push 通知
                                  ↓
                          統合承認 UI (タブ切替)
                                  ↓
                          publish (X / IG / note)
                                  ↓
                          kpi_daily (5 channel)
```

## 5. データフロー (B 案 直接 pipe の詳細)

### Supabase テーブル拡張

```sql
-- Phase 2 で apply (money-bot 0002_buzz_integration.sql)

-- note_seed_queue: x-buzz-radar → money-bot へのネタ pipe
create table public.note_seed_queue (
  id              uuid primary key default gen_random_uuid(),
  source_tweet_id text not null,      -- twitterapi.io 取得 ID
  buzz_score      int  not null,      -- x-buzz-radar 判定スコア
  topic_summary   text not null,      -- 関連度判定結果のサマリ
  themes          text[] not null,    -- 抽出テーマタグ
  picked_up_at    timestamptz,        -- money-bot が消化した時刻 (null = pending)
  publish_queue_id uuid references public.publish_queue(id),
  created_at      timestamptz not null default now()
);

create index note_seed_queue_pending_idx
  on public.note_seed_queue (created_at desc)
  where picked_up_at is null;

-- publish_queue.source を拡張 (どこ由来の publish か)
alter table public.publish_queue
  add column if not exists source text default 'money-bot-direct'
    check (source in ('money-bot-direct', 'x-buzz-radar', 'manual'));
```

### Pipe フロー

```
x-buzz-radar workflow (cron-A):
  twitterapi.io fetch → Haiku 関連度判定 → 高スコア tweet を抽出
    ↓
  note 化したい判定 (例: 関連度 ≥ 0.7 AND themes に "tip" or "case-study")
    ↓
  Supabase: insert into note_seed_queue
    ↓
  Sonnet 4.6 で 3 媒体 (X / IG / note) variant を生成
    ↓
  publish_queue に X / IG variant を投入 (source='x-buzz-radar')
    ↓
  LINE 通知 (タグ: x-buzz)

money-bot workflow (cron-B):
  signal fetch: note_seed_queue から pending を取り出す (picked_up_at = null)
    ↓
  writer/visual/reviewer agent で note 記事を生成
    ↓
  publish_queue に note variant を投入 (source='money-bot-direct'+ ref to x-buzz)
    ↓
  LINE 通知 (タグ: money-bot)
    ↓
  承認後 publish → note URL を Supabase 経由で x-buzz の SNS 投稿に埋め戻し
```

## 6. リスク・撤退ライン

### リスク

| リスク | 兆候 | 対応 |
|---|---|---|
| x-buzz-radar からの note ネタが筋悪 (転載風になる) | content-reviewer rubric F 評価増 | money-bot 側 writer prompt 強化、x-buzz-radar 判定閾値 0.7 → 0.85 へ |
| LINE 通知過多 (1 日 5 通超え) | ユーザーから「うるさい」フィードバック | 通知をダイジェスト化、低スコア item は LINE スキップ Supabase のみ |
| Vercel Function timeout 越え (workflow 1 サイクル > 60 分) | cron 失敗ログ増 | workflow を細かい step に分割、durable resume を活用 |
| 月予算超過 | コスト集計 > ¥16,000 | kill switch (`MONEY_BOT_KILL_SWITCH=1`) で停止 |
| x-buzz-radar 自走停止 (twitterapi.io 障害等) | crawl_runs 失敗続発 | money-bot は ai-radar.articles fallback で単独運用継続 |

### 撤退ライン

- **2026-10 末 (Phase 2 開始から 3 ヶ月)**: note 月 ¥3,000 未達 → 統合戦略 pivot
- **アカウント警告 / shadowban が 2 チャネル以上で発生** → 即停止
- **月予算超過 2 ヶ月連続** → 即停止

## 7. Phase 1 → Phase 2 移行時の作業チェックリスト (Phase 2 開始時に再評価)

- [ ] x-buzz-radar の Phase 1 dogfooding 1-2 週間完了 (3 媒体 self-watch + 改善ループ稼働確認)
- [ ] money-bot Phase 1 DoD 達成 (7 日連続 cron 自走)
- [ ] x-buzz-radar コード移植 (twitter-fetch / relevance-judge / generate-variants → money-bot/lib/)
- [ ] Supabase migration 0002_buzz_integration.sql 起草・apply
- [ ] x-buzz-radar 旧 Vercel project の deprecate 計画
- [ ] LINE bot 統一 (x-buzz-radar 旧 bot を deprecate or 統合)
- [ ] `/approval-queue/[runId]` UI をタブ切替型に拡張
- [ ] 統合 cron スケジュール最適化 (buzz-collect → daily-publish の起動順)
- [ ] KPI ダッシュボード統合 (channel 5 種対応)
- [ ] memory `project_money_bot.md` / `project_x_buzz_radar.md` を統合 ver に更新

## 8. 関連ドキュメント

### 親 spec
- `docs/superpowers/specs/2026-05-20-publishing-pivot-design.md` — 発信ピボット全体戦略
- `docs/superpowers/specs/2026-05-22-money-bot-design.md` — money-bot 単体 spec
- `docs/superpowers/specs/2026-05-23-x-buzz-radar-design.md` — x-buzz-radar 単体 spec (v7)

### Memory
- `memory/project_money_bot.md`
- `memory/project_x_buzz_radar.md`
- `memory/feedback_external_sdk_deploy_constraint_precheck.md` — SDK 採用前 deploy 環境検証
- `memory/feedback_parallel_session_branch_check.md` — 並行セッション事故対策

### Raw facts
- `raw/facts/situations/2026-05-23-money-bot-x-buzz-radar-integration-decision.md` (本セッションで生成)
- `raw/facts/situations/2026-05-23-monetize-os-archive-hagurin-money-bot.md` — はぐりんアカウント転用判断

## 9. 未確定事項 (Phase 2 開始時にユーザー判断必要)

1. **LINE 通知頻度の上限**: 1 日 5 通まで / 10 通まで / 無制限?
2. **x-buzz-radar 旧 Vercel project の処理**: deprecate (停止して残す) / 削除 / staging として残す?
3. **`_hagurin__` IG アカウント名の変更**: そのまま / ofmeton 系に rename?
4. **note 記事の価格設計**: x-buzz-radar 由来の note は無料、money-bot 単独 note は有料 という分岐?
5. **dogfooding 期間中の人間レビュー比重**: Phase 2 初期は全件人間レビュー / 一部自動承認?
