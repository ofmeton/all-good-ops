# ai-radar Pivot Plan

**作成日**: 2026-05-22
**改訂**: 2026-05-22 (v2: ハイブリッド構成採用 — 全面撤廃を見直し、市況シグナル機能を縮小形で維持)
**ステータス**: ドラフト（ユーザーレビュー待ち）
**前提**: `raw/facts/situations/2026-05-22-ai-radar-purpose-pivot.md` のピボット決定

---

## 0. ピボット要旨

### 旧目的（廃止）
- AI エコシステム機会発見（Skills/Workflow 市場参入機会の検知）
- Skills/Workflow 販売事業の防衛シグナル検知（R1リスク・D機会・vertical急増・BMシフト）
- Tier1 即時 Gmail 通知 / 日次・週次・月次ダイジェスト

### 新目的
1. **自分（ユーザー）の Claude 活用ネタ集め**
   - Claude 活用 Tips（プロンプト・ワークフロー・MCP 連携・新機能の試し方）
   - 自分の業務で試したい・取り入れたいパターンの抽出
2. **3 媒体発信（X / Instagram / note）のネタ集め**
   - 発信戦略（2026-05-20 ピボット）の「コンテンツ 4 本柱」のうち「Claude 活用事例」「tips」の元ネタ自動収集
   - 各ネタを 3 媒体別に投稿案化する加工パイプラインまでセットで提供
3. **市況シグナル監視（縮小版）** — v2 で追加
   - **vertical_surge**: 発信ターゲット業界（税理士AI / 行政書士AI / 工務店AI / 介護AI 等）の AI 化動向。発信記事の「業界別 Tips」素材源 + ターゲット動向把握
   - **bm_shift**: 収益化プラットフォーム動向（note / Stripe Japan / Stan Store / Gumroad / Brain）。note 有料記事戦略の前提崩壊検知
   - **r1_risk**: Anthropic Skills/Workflow 公式商品化検知。Skills Marketplace 構想（`project_skills_marketplace.md`）の早期警報装置として最小コストで維持
   - **撤廃するシグナル**: D機会（エンタープライズ）/ 競合プラットフォーム監視（n8n / LangChain Hub の直接競合視点）/ Tier1 即時 Gmail 通知

### 関連戦略との接続
- 発信ピボット設計（`docs/superpowers/specs/2026-05-20-publishing-pivot-design.md`）の §7 wiki 連携ループに合流
- ai-radar が深掘りした記事 → `raw/publishing/inspirations/` 投入 → `wiki/publishing/` に ingest される導線

### 開発スタイル
- Claude（私）と Codex MCP のタッグ運用
- Codex は「深掘り調査」「3媒体投稿案生成」「Claude試行プロンプト案」の 3 モードで稼働（既存 codex-worker.mjs 拡張）
- トークン節約のため、Codex が独立完結できる粒度の作業（新規 ingester / 新規プロンプト草案 / 外部 API 仕様調査）を委譲

---

## 1. 撤廃マップ (v2: ハイブリッド)

### 1.1 コード

| 対象 | 種別 | 処理 (v2) |
|---|---|---|
| `src/lib/prompts/score-business.ts` | プロンプト | **縮小改訂** — D機会 / 競合プラットフォーム判定を削除、vertical_surge / bm_shift / r1_risk の 3 シグナル判定のみに絞る。出力スキーマも縮小 (`market_signal_type` / `reasoning` / `strength` の 3 フィールド) |
| `src/lib/prompts/search-jp-services.ts` | プロンプト | **削除** |
| `src/lib/prompts/opportunity-tag.ts` | プロンプト | **削除**（新 `extract-claude-tip` / `extract-content-seed` で置換） |
| `src/lib/prompts/score-opportunity.ts` | プロンプト | **削除**（新 `score-content-seed` で置換） |
| `src/lib/prompts/classify-pipeline.ts` | プロンプト | **全置換**（新分類: claude_tip / content_seed / **market_signal** / both / noise） |
| `src/lib/tier1-alert.ts` | ライブラリ | **削除**（Gmail 即時通知撤廃。market_signal は朝夜ダイジェストで強調表示） |
| `src/lib/scoring.ts` の `businessImpactScore` | 関数 | **削除** |
| `src/lib/scoring.ts` の `opportunityScore` | 関数 | **削除**（新 `claudeTipScore` / `contentSeedScore` / `marketSignalStrength` に置換） |
| `src/lib/pipeline.ts` の `runBusiness` / `runOpportunity` 分岐 | ロジック | **削除・新分岐実装** (claude_tip / content_seed / **market_signal**) |
| `src/components/AlertCard.tsx` | UI | **転用** — Tier1 即時 alert 表示は撤廃、ただし市況シグナル `r1_risk` / `bm_shift` の banner として再利用 |
| `src/components/TriggerBadge.tsx` | UI | **改修** — 旧 R1_risk/D_opportunity/vertical_surge/bm_shift 表示から、新 market_signal_type (3種) のみに絞る |

### 1.2 DB スキーマ（migration 0003 で破壊的変更）

**v2 で drop するカラム (12 個)**:
- `opportunity_tag`
- `score_marketplace_fit` / `score_japan_entry_fit` / `score_wedge`
- `tam_size` / `entry_barrier` / `novelty_score` / `engagement_hint`
- `similar_jp_services_count` / `similar_jp_services` / `opportunity_reasoning`
- `business_tier` / `business_axis`
- `business_impact` / `business_impact_strength` / `business_recommended_action`
- `business_reasoning` / `business_impact_score`

**v2 で残すカラム + 新規追加 (3 個追加 / 1 個転用)**:
- `business_trigger_flag` → **転用**: 名前は維持。新 check 制約 `('vertical_surge', 'bm_shift', 'r1_risk')` に絞る (旧 `R1_risk` / `D_opportunity` から D機会撤廃 + 命名統一)
  - 旧データの `R1_risk` → `r1_risk` に migration で書き換え
  - 旧データの `D_opportunity` → NULL に書き換え
- `market_signal_strength int` (0-100) **新規** — vertical_surge/bm_shift/r1_risk の強度
- `market_signal_reasoning text` **新規** — シグナル判定の根拠 (40字以内)
- `market_signal_vertical text` **新規** — vertical_surge の場合のみ業界名（税理士 / 行政書士 / 工務店 / 介護 等）

**drop するインデックス**:
- `articles_opportunity_score_idx`
- `articles_business_impact_score_idx`

**維持するインデックス**:
- `articles_trigger_idx` (旧 `business_trigger_flag` → 新意味で継続使用)
- 追加: `articles_market_signal_strength_idx`

`articles.pipeline` check 制約変更:
- 旧: `('opportunity', 'business_defense', 'both', 'noise')`
- 新: `('claude_tip', 'content_seed', 'market_signal', 'both', 'noise')`

`sources.pipeline` check 制約変更:
- 旧: `('opportunity', 'business_defense', 'both')`
- 新: `('claude_tip', 'content_seed', 'market_signal', 'both')`

`notifications_sent.kind` check 制約変更:
- `'tier1_immediate'` を削除

`crawl_runs.kind` check 制約:
- `'tier1_hourly'` → `'daily_morning'` にリネーム検討（互換のため両方許容期間設ける）
- `'biannual'` → `'daily_evening'` にリネーム検討

**既存 articles レコード（過去データ）の扱い**:
- 撤廃カラムの値は NULL になる
- `pipeline` 値の書換ルール:
  - 旧 `opportunity` → 新 `content_seed` (デフォルト) または `claude_tip` (Simon Willison 等から来た記事は手動 reclassify)
  - 旧 `business_defense` → `business_trigger_flag` が NULL でないものは `market_signal`、それ以外は `noise`
  - 旧 `both` → `market_signal` (一旦) or 個別判定
  - 旧 `noise` → `noise` (変更なし)
- 過去レコード自体は履歴として残す

### 1.3 設定・ドキュメント

| 対象 | 処理 |
|---|---|
| `vercel.json` の cron path（`/api/cron/tier1-hourly` / `/api/cron/biannual`） | route ファイル名変更に合わせて更新 |
| `supabase/seed.sql` | 全 25 ソースを再分類（claude_tip / content_seed） + 新ソース追加 |
| `outputs/documents/ai-radar/04-sources.md` | 全面改訂 |
| `outputs/documents/ai-radar/03-prompts.md` | 新プロンプト群に置換 |
| `outputs/documents/ai-radar/01-implementation-plan.md` | 旧目的の記述を archived 化 |
| `outputs/documents/ai-radar/07-ad-ops-tab-design.md` | **archived 化**（広告運用タブ構想は廃止） |
| `outputs/documents/ai-radar/08-ad-ops-implementation-plan.md` | **archived 化** |
| `.claude/agents/ai-radar.md` | 役割定義更新 |
| `CLAUDE.md` の ai-radar 関連記述 | 外部スポーク説明・ルーティングキーワード更新 |

---

## 2. 維持・転用マップ

### 2.1 そのまま流用

- `src/lib/crawlers/` 全体（rss / github-releases / scraping）
- `src/lib/prompts/summarize.ts`
- `src/lib/hash.ts`（重複検知）
- `src/lib/cron-auth.ts`
- `src/lib/digest-builder.ts`（朝夜ダイジェスト、内容は新カラムに合わせて改修）
- `src/lib/gmail.ts`（ダイジェスト送信は維持。即時通知は撤廃）
- `src/lib/retry.ts`
- `src/lib/crawl-run.ts`
- `src/app/api/manual/*`（手動クロール・ダイジェスト確認用）
- `src/app/actions/deep-dive.ts`（深掘り要求 Server Action）
- `scripts/codex-worker.mjs` のキュー消費基盤
- `launchd/jp.ofmeton.ai-radar-codex.plist`
- Vercel Cron 基盤
- Anthropic Design ベース UI 全体（color tokens / KpiCard / Panel など）
- Supabase RLS / sources / scraping_states / deep_dive_queue / crawl_runs テーブル

### 2.2 転用（意味を再解釈）

| 旧 | 新 |
|---|---|
| sage = 機会 (opportunity) | sage = **学べる**（Claude 活用 Tips、自分の業務適用が見える） |
| amber = 脅威 (warning) | amber = **論争・要注意**（Claude 関連で議論を呼んでいる話題、誇張ぎみ） |
| dusty = 需要 / 中立 | dusty = **発信ネタ**（content_seed） |
| rose = 即時リスク | rose = **トレンドピーク**（直近 48h で急浮上、発信タイミング◎） |
| Tier 1 Anthropic 公式系 5 ソース | そのまま **claude_tip** ソースとして継続 |
| Tier 3 HN / Simon Willison / Latent Space / Indie Hackers | **content_seed** + **claude_tip** 両方の素材源 |

---

## 3. 新アーキテクチャ

### 3.1 パイプライン全体

```
Crawler (RSS/GitHub/Scraping)
  ↓
重複検知 (external_id / body_hash)
  ↓
P1: 要約 (Gemini) — 既存流用
  ↓
P2: 分類 (Gemini) — 新 classify-pipeline
  pipeline ∈ {claude_tip, content_seed, both, noise}
  ↓
┌─────────────────────┬────────────────────┐
│ claude_tip / both    │ content_seed / both │
├─────────────────────┼────────────────────┤
│ extract-claude-tip   │ extract-content-seed│
│  (Claude Haiku)      │  (Claude Haiku)     │
│ → tip_summary        │ → seed_summary      │
│ → applicable_to[]    │ → buzz_elements[]   │
│ → tools_mentioned[]  │ → target_personas[] │
│ → try_prompt         │                     │
│                      │ score-content-seed  │
│ score-claude-tip     │  (Claude Haiku)     │
│  (Claude Haiku)      │ → score_x (0-100)   │
│ → score_relevance    │ → score_ig (0-100)  │
│ → score_novelty      │ → score_note (0-100)│
│ → score_applicability│ → recommended_media │
│ → total (0-100)      │ → total (max)       │
└─────────────────────┴────────────────────┘
  ↓
articles INSERT
  ↓
ダッシュボード表示 + Codex deep_dive キュー投入（手動 or 自動）
  ↓
Codex worker (3モード)
  - deep_dive: 既存（詳細調査）
  - content_seed_drafts: X/IG/note 投稿案 3 種生成
  - claude_tip_recipe: 試行プロンプト + 期待効果のレシピ化
  ↓
深掘り結果 → wiki/publishing/ ingest 候補として通知
```

### 3.2 新 pipeline 種別 (v2: 5 分類)

| pipeline | 意味 | 主な対象 |
|---|---|---|
| `claude_tip` | Claude 活用 Tips の元ネタ | Anthropic 公式 / Cookbook / dev.to(Claude) / Zenn(Claude) / Qiita(Anthropic) / Simon Willison |
| `content_seed` | 発信ネタの元ネタ | HN front / Product Hunt / Indie Hackers / X インフルエンサー / note AI タグ / r/ClaudeAI |
| `market_signal` | 市況シグナル (3種) | vertical_surge / bm_shift / r1_risk の **どれか**を含む記事 |
| `both` | claude_tip + content_seed の両方 | Anthropic 新機能発表 / 注目 Claude プロジェクト |
| `noise` | 残しておくが評価しない | フィルタを通過するが対象外 |

**market_signal の 3 サブ種別** (`business_trigger_flag` カラムに格納):
- `vertical_surge`: 発信ターゲット業界 (税理士 / 行政書士 / 社労士 / 工務店 / 介護 / 物流 / 不動産 / 教育 / 塾 / 医療事務 等) の AI 化動向
- `bm_shift`: 収益化プラットフォーム動向 (note 有料記事改定 / Stan Store / Stripe Japan / Gumroad 手数料 / Brain 動向)
- `r1_risk`: Anthropic Skills/Workflow 公式商品化 (TOS 改訂 / marketplace 開設 / plugin commerce)

### 3.3 新スコアリング軸

**claude_tip スコア（0-100）**:
- `score_relevance` (0-40): 自分の業務（コード生成・LP制作・データ分析・コンテンツ制作・自動化）への適合度
- `score_novelty` (0-30): 既存 wiki/memory に無い新しさ
- `score_applicability` (0-30): 試行・実装の容易さ

**content_seed スコア（媒体別 0-100、最大値を total に）**:
- `score_x` (0-100): X 拡散適性（Before-After 数値見出し化・短文化適性）
- `score_ig` (0-100): Instagram カルーセル適性（9 枚分解可能性・図解化適性）
- `score_note` (0-100): note 記事化適性（深堀り価値・有料記事素材適性）
- `recommended_media`: 最高スコア媒体

**market_signal スコア (0-100)**:
- `market_signal_strength` (0-100): シグナル強度
  - r1_risk: 公式リリース直接的なら 80+、関連動向の示唆なら 30-50
  - bm_shift: 既存課金プラットフォームの仕様変更なら 70+、新規参入なら 50-70
  - vertical_surge: 該当業界の AI 化事例 1 件で 40-60、複数事例同時報道で 70+

---

## 4. 新規データソース (v2.1: ソース戦略 = コミュニティ・SNS 重視に振替)

### v2.1 ソース戦略の根幹

- **既存ソースを薄く** (15 件削除): 公式メディア重複・低 SN 比・低更新頻度・他で代替可能なものを切る
- **Reddit を厚く** (5 → 13 サブ): Claude / AI コミュニティ実用情報の主軸
- **X を厚く** (8 → ~36): **Claude 活用バズ系の個人** を主軸、公式・有名研究者も追加で乗せる。日本人アカウントを別途厚化
- **RSS は最小構成**: Anthropic 公式系 + Claude 活用コミュニティ最小 + 日本語 vertical 1 件のみ

### 4.1 グループ A: Anthropic 公式 (継続維持 + 微増)

| 名前 | URL | 方式 | pipeline | trust |
|---|---|---|---|---|
| Anthropic News | https://www.anthropic.com/news | scraping (link_prefix) | claude_tip + r1_risk watch | 10 |
| Anthropic Skills repo | https://github.com/anthropics/skills | github_releases | claude_tip + r1_risk watch | 10 |
| Anthropic Claude Plugins Official | https://github.com/anthropics/claude-plugins-official | github_releases | claude_tip + r1_risk watch | 10 |
| Claude Code Docs | https://code.claude.com/docs | scraping (diff) | claude_tip | 10 |
| Claude Platform Docs | https://platform.claude.com/docs | scraping (diff) | claude_tip + r1_risk watch | 10 |
| **Anthropic Cookbook** (新規) | https://github.com/anthropics/anthropic-cookbook | github_releases | claude_tip | 10 |
| **Anthropic Engineering Blog** (新規) | https://www.anthropic.com/engineering | scraping | claude_tip | 10 |
| **Claude Code GitHub** (新規) | https://github.com/anthropics/claude-code | github_releases | both | 10 |

**8 ソース**

### 4.2 グループ B: Claude 活用コミュニティ RSS (最小)

| 名前 | URL | 方式 | pipeline | trust |
|---|---|---|---|---|
| dev.to Claude タグ | https://dev.to/feed/tag/claude | RSS | claude_tip | 7 |
| Zenn Claude トピック | https://zenn.dev/topics/claude/feed | RSS | claude_tip | 7 |
| Qiita Claude タグ | https://qiita.com/tags/claude/feed | RSS | claude_tip | 6 |

**3 ソース**（dev.to Anthropic / Qiita Anthropic / Zenn LLM は重複として削除）

### 4.3 グループ C: 日本語 vertical 動向 (最小)

| 名前 | URL | 方式 | pipeline | trust |
|---|---|---|---|---|
| ITmedia AI | https://www.itmedia.co.jp/rss/2.0/aiplus.xml | RSS | content_seed + vertical_surge watch | 8 |

**1 ソース**（日経 xtech / Ledge / AINOW / PR Times / 経産省は重複・低 SN 比として削除）

### 4.4 グループ D: HN + Product Hunt (継続)

| 名前 | URL | 方式 | pipeline | trust |
|---|---|---|---|---|
| HackerNews Front | https://news.ycombinator.com/rss | RSS | both | 8 |
| HackerNews Show HN | https://hnrss.org/show | RSS | content_seed | 7 |
| Product Hunt | https://www.producthunt.com/feed | RSS | content_seed | 7 |

**3 ソース**

### 4.5 グループ E: Reddit (5 → 13 サブに厚化)

すべて RSS で取得可能。

| サブ | URL | pipeline | trust |
|---|---|---|---|
| r/ClaudeAI | https://www.reddit.com/r/ClaudeAI/.rss | both | 6 |
| r/AnthropicAI | https://www.reddit.com/r/AnthropicAI/.rss | claude_tip | 6 |
| r/Anthropic | https://www.reddit.com/r/Anthropic/.rss | claude_tip | 5 |
| r/LocalLLaMA | https://www.reddit.com/r/LocalLLaMA/.rss | both | 6 |
| r/SideProject | https://www.reddit.com/r/SideProject/.rss | content_seed | 5 |
| r/EntrepreneurRideAlong | https://www.reddit.com/r/EntrepreneurRideAlong/.rss | content_seed + bm_shift watch | 5 |
| r/MachineLearning | https://www.reddit.com/r/MachineLearning/.rss | claude_tip | 7 |
| r/LLMDevs | https://www.reddit.com/r/LLMDevs/.rss | claude_tip | 6 |
| r/PromptEngineering | https://www.reddit.com/r/PromptEngineering/.rss | claude_tip | 6 |
| r/aiagents | https://www.reddit.com/r/aiagents/.rss | claude_tip | 6 |
| r/CursorIDE | https://www.reddit.com/r/CursorIDE/.rss | claude_tip | 6 |
| r/ChatGPTPromptGenius | https://www.reddit.com/r/ChatGPTPromptGenius/.rss | claude_tip | 5 |
| r/IndieDev | https://www.reddit.com/r/IndieDev/.rss | content_seed | 5 |

**13 ソース**

### 4.6 グループ F: X インフルエンサー — 海外 (Phase 4 で実装)

**取得方式**: syndication API (`cdn.syndication.twimg.com`)。1 アカウント 6h ごと、UA 偽装なし。

**主軸**: Claude 活用バズ系の個人 (副軸: 公式・著名研究者)

**Claude 活用バズ系（主軸 16）**:

| アカウント | 観測価値 |
|---|---|
| @simonw | Claude 活用バズ代表格、毎週実用 Tips バズ |
| @alexalbert__ | Anthropic DevRel、中の人だが実用 Tips 中心 |
| @swyx | AI Engineer Summit 主催、Claude 活用ハブ |
| @nutlope | Together AI / AI ツール作りで連続バズ |
| @geoffreylitt | MIT、Claude × 思考実験系の高品質バズ |
| @mattshumer_ | Build Better Prompts、Claude バズ常連 |
| @amasad | Replit CEO、AI コーディング × Claude |
| @amix3k | Cursor CEO、Claude モデル評価バズ |
| @hwchase17 | LangChain、Claude 活用フロー設計 |
| @rauchg | Vercel CEO、Vercel × Claude |
| @jasonzhou1993 | YT 連動、Claude Code ハウツーバズ |
| @sh_reya | Berkeley、Claude ユースケース研究 |
| @minchoi | AI YouTuber、Claude 活用 tips バズ |
| @mattppal | Claude Code 活用バズ |
| @bilawalsidhu | Claude 実用、Gen AI 系バズ |
| @hojonathanho | AI startup、Claude 活用 |

**公式・著名研究者（副軸 8）**:

| アカウント | 観測価値 |
|---|---|
| @AnthropicAI | 公式アナウンス |
| @karpathy | AI 業界全体 |
| @AndrewYNg | AI 教育 |
| @cwolferesearch | ML / Claude 比較 |
| @osanseviero | HuggingFace |
| @rasbt | ML 教育 |
| @ema_in_paris | 海外スタートアップ動向 |
| @ofmeton（自分） | 自身の反応観測 (self-watch) |

**海外 24 アカウント**

### 4.7 グループ G: X インフルエンサー — 日本 (Phase 4 で実装) — 確定

**取得方式**: 同上 (syndication API)

**ユーザー指定アカウント 10 件 (2026-05-22 受領)**:

| アカウント | メモ |
|---|---|
| @ClaudeCode_UT | Claude Code 活用発信 |
| @obsidianstudio9 | Obsidian × AI |
| @Shin_Engineer | エンジニア × AI |
| @SuguruKun_ai | AI 系個人 |
| @MakeAI_CEO | AI 起業 |
| @designkenkyujo | デザイン × AI |
| @mmmiyama_D | 個人発信 |
| @usutaku_channel | YouTuber 系 AI |
| @tetumemo | AI 活用・学習 |
| @masahirochaen | 個人発信 |

**10 アカウント**

### 4.8 既存ソース 15 件 削除リスト

| 削除ソース | 旧 pipeline | 削除理由 |
|---|---|---|
| AINOW | business_defense | ITmedia / 日経 xtech と重複 |
| Ledge.ai | business_defense | 同上 |
| 日経クロステック | business_defense | 有料記事率高、ITmedia で代替 |
| PR Times AI | both | 広告色強く SN 比悪い |
| 経産省プレスリリース | business_defense | 頻度低、market_signal 用 vertical は ITmedia で代替 |
| GitHub Trending | opportunity | Claude 文脈限定でない、ノイズ多い |
| Indie Hackers | opportunity | r/EntrepreneurRideAlong で代替 |
| Latent Space Podcast | opportunity | 月数回、X で言及拾えれば十分 |
| Anthropic Courses | claude_tip (新規予定だった) | 更新頻度低、Anthropic News でアナウンスされる |
| ClaudeSkills.ai | business_defense | 競合観測は X で代替可 |
| Simon Willison blog | opportunity | 本人 X (@simonw) で十分 |
| Gumroad Discover AI | opportunity | スクレイピング不安定、bm_shift は X / Reddit で拾える |
| dev.to Anthropic タグ | claude_tip (新規予定だった) | dev.to Claude でカバー |
| Qiita Anthropic タグ | claude_tip (新規予定だった) | Qiita Claude でカバー |
| Zenn LLM トピック | both (新規予定だった) | Zenn Claude に集中、LLM 全般はノイズ |

n8n / LangChain Hub は v2 で既に削除済（合計 17 件削除）。

### 4.9 ソース合計 (v2.1 確定)

| グループ | 件数 |
|---|---|
| A. Anthropic 公式 | 8 |
| B. Claude コミュニティ RSS | 3 |
| C. 日本語 vertical 動向 | 1 |
| D. HN + Product Hunt | 3 |
| E. Reddit | 13 |
| F. X 海外 | 24 |
| G. X 日本 | 10 |
| **合計** | **62 ソース (v2.1)** |

旧 25 ソース → v2.1 で **62 ソース** (公式メディア重視 → コミュニティ・SNS 重視に振替、X 主軸厚化)

**取得頻度設計**:
- 公式系 (グループ A): 朝夜 2 回 / 日 (r1_risk watch は将来 6h ごとに上げる検討、未決事項 #7)
- RSS / Reddit (グループ B-E): 朝夜 2 回 / 日
- X (グループ F-G): 6h ごと / アカウント (1 日 4 回、計 24 × 4 = 96 + 10 × 4 = 40 = 136 API call/日。syndication API なので無料。レート制限注意)

---

## 5. UI 改修 (v2: 5 タブ)

### 5.1 タブ構成

| 旧タブ | 新タブ (v2) |
|---|---|
| 全件 / 機会 / 事業防衛 / Tier1 | **全件 / Claude活用Tips / 発信ネタ / 市況シグナル / 深掘り済** |

### 5.2 カード要素

ArticleCard に追加するアクション:
- **「note 記事化」ボタン**: 深掘りキュー (mode=content_seed_drafts, target_media=note) 投入
- **「X ポスト化」ボタン**: 深掘りキュー (mode=content_seed_drafts, target_media=x) 投入
- **「Claude で試す」ボタン**: 深掘りキュー (mode=claude_tip_recipe) 投入
- **媒体別 fit スコア表示**: content_seed 記事のみ、X/IG/note 各 0-100 を pill 表示
- **市況シグナルバッジ** (v2): market_signal 記事のみ、vertical_surge(sage) / bm_shift(dusty) / r1_risk(rose) のいずれかを pill 表示

KPI Row 改修 (4 → 4 で維持):
- 旧: 機会 / 事業防衛 / Tier1 即時 / 登録ソース
- 新 (v2): **Claude Tips 候補 / 発信ネタ候補 / 市況シグナル (24h) / 登録ソース**

### 5.3 Rail（右カラム）

- 旧: Tier1 アラート / 直近検出トピック / ソース健全性
- 新 (v2): **本日の Tips Top 3 / 本日の発信ネタ Top 3 / 市況シグナル直近 / ソース健全性**

### 5.4 AlertCard 転用 (v2)

`src/components/AlertCard.tsx` は削除でなく、`market_signal_strength >= 80` の記事を **市況シグナル banner** として表示する。

- r1_risk: rose (即時要観察)
- bm_shift: dusty (収益化方針影響)
- vertical_surge: sage (発信ネタ機会)

---

## 6. Codex タッグ 3 モード化

### 6.1 既存 worker の拡張ポイント

`scripts/codex-worker.mjs` の `buildPrompt` をモード分岐させる。`deep_dive_queue` テーブルに `mode` カラム追加。

```sql
alter table deep_dive_queue add column mode text default 'deep_dive'
  check (mode in ('deep_dive', 'content_seed_drafts', 'claude_tip_recipe'));
alter table deep_dive_queue add column target_media text
  check (target_media in ('x', 'ig', 'note') or target_media is null);
```

`articles` テーブル拡張:
```sql
alter table articles add column codex_drafts_x text;
alter table articles add column codex_drafts_ig text;
alter table articles add column codex_drafts_note text;
alter table articles add column codex_tip_recipe text;
```

### 6.2 3 モード仕様

**mode=deep_dive**（既存維持）:
- 既存 buildPrompt そのまま
- 結果は `articles.deep_dive_result_markdown` に保存（既存）

**mode=content_seed_drafts**（新規）:
- 入力: 記事 + `target_media` + brand-publisher の voice ガイドライン（`.claude/skills/content-quality-rubric.md` 参照）
- 出力: 対象媒体の投稿案 3 種（フック違い 3 パターン）
- 結果保存先: `target_media` に応じて `codex_drafts_x` / `codex_drafts_ig` / `codex_drafts_note`
- Codex プロンプトに含める: 媒体別フォーマット制約（X=280字、IG=カルーセル9枚構成、note=見出し+リード+本文）

**mode=claude_tip_recipe**（新規）:
- 入力: 記事 + ユーザーの業務コンテキスト（CLAUDE.md / wiki/self/goals.md / 直近 raw/publishing/）
- 出力: 「自分の業務でこう試せる」レシピ Markdown
  - 試行プロンプト（コピペで Claude に貼れる）
  - 期待効果（具体的に何が短縮 / 改善されるか）
  - 試行コスト（トークン目安・MCP 必要 / 不要）
  - 失敗パターン（注意点）
- 結果保存先: `codex_tip_recipe`

### 6.3 ユーザー操作フロー

1. ダッシュボードで記事カードの「note 記事化」を押す
2. deep_dive_queue に `mode=content_seed_drafts, target_media=note` で投入
3. Codex worker が pick up → ~3-5 分で結果書込み
4. ダッシュボード refresh で `codex_drafts_note` を展開表示
5. 採用なら手動で `raw/publishing/inspirations/note-YYYY-MM-DD-<slug>.md` にコピー → wiki ingest 候補に

---

## 7. wiki 連携

### 7.1 自動 ingest 提案フロー

セッション開始時、brand-publisher（または ai-radar 経由秘書）が以下をチェック:
- `articles` テーブルから `codex_drafts_*` または `codex_tip_recipe` が NULL でなく、まだ wiki ingest されていない記事 (直近 7 日) を抽出
- 上位 5 件をユーザーに提示
- Y/N で承認 → `raw/publishing/inspirations/` 投入 → `wiki/publishing/` ingest（既存 `publishing-wiki-ingest.md` skill 利用）

### 7.2 Claude Tips 専用 wiki クラスタ新設

`wiki/domain/claude-usage/` を新設:
- `index.md`
- `tips-by-task/`（コード生成 / LP制作 / データ分析 / コンテンツ制作 / 自動化）
- `tips-by-feature/`（プロンプト / MCP / Skills / Subagent / Hooks）
- `log.md`

`articles.codex_tip_recipe` が NULL でない記事 → 該当タスク / 機能カテゴリに ingest 候補化。

---

## 8. 実装フェーズ分割

### Phase 0: 計画書レビュー（このドキュメント） — **本タスク**
- ユーザーレビュー
- 撤廃範囲・新ソース・タッグ仕様の確定
- 合意後 Phase 1 着手

### Phase 1: 破壊的撤廃 + DB migration (v2 で範囲縮小)
**担当**: Claude / **Codex 委譲**: なし（リポ規約整合が重要）

タスク:
- migration 0003: 撤廃カラム drop (12個) + 新規追加 (3個: market_signal_strength / market_signal_reasoning / market_signal_vertical) + check 制約変更 + 旧 pipeline 値 / trigger_flag 値の v2 mapping 書換
- 撤廃ファイル削除 (`tier1-alert.ts` / `search-jp-services.ts` / `opportunity-tag.ts` / `score-opportunity.ts`)
- **転用ファイル改修** (`score-business.ts` → 縮小版 / `AlertCard.tsx` → 市況シグナル banner / `TriggerBadge.tsx` → market_signal_type 3 種のみ)
- pipeline.ts の big-bang リライト（一旦 noise 以外を弾く最小実装に）
- seed.sql の旧シード再分類 (削除 2 件 + 救済 3 件の re-pipeline)
- ダッシュボードの旧表示要素削除（タブ・KPI は v2 構成にスタブで置換）
- 既存 cron は止めずに最小動作維持

人間ゲート: migration 適用前に SQL を見せて承認

### Phase 2: 新分類パイプライン (v2: market_signal 含む)
**担当**: Claude（プロンプト設計） / **Codex 委譲**: 新プロンプト草案（壁打ち）

タスク:
- `classify-pipeline-v2.ts` 実装 (claude_tip / content_seed / **market_signal** / both / noise)
- `extract-claude-tip.ts` 実装
- `extract-content-seed.ts` 実装
- `score-claude-tip.ts` 実装
- `score-content-seed.ts` 実装
- `score-market-signal.ts` 実装 (v2 新規 — 縮小版 score-business.ts のリネーム実装)
- `scoring.ts` に `claudeTipScore` / `contentSeedScore` / `marketSignalStrength` 追加
- pipeline.ts の本実装 (3 系統分岐: claude_tip / content_seed / market_signal)
- migration 0004: 新スコアカラム追加 (score_relevance / score_novelty / score_applicability / score_x / score_ig / score_note / recommended_media)

人間ゲート: プロンプト草案レビュー（特に分類基準と market_signal vs noise の閾値）

### Phase 3: 新規ソース投入
**担当**: Claude / **Codex 委譲**: 新ソース動作確認・取得サンプル取得

タスク:
- Group A (Claude活用コミュニティ): RSS 8 ソース追加 → seed
- Group B (Anthropic公式追加): GitHub/scraping 4 ソース追加 → seed
- Group D (日本語 AI 発信): スクレイピング 4 ソース追加 → seed
- Group C (X インフルエンサー) は Phase 4 に分離（syndication API 実装要）
- 04-sources.md 全面改訂

人間ゲート: Group D のスクレイピング対象は note の TOS 確認後 → 公開タイムラインの取得は OK だが頻度抑制

### Phase 4: X / インフルエンサー対応
**担当**: Codex 委譲多め（syndication API 仕様調査） + Claude（実装統合）

タスク:
- syndication API でユーザータイムラインを取得する scraper 実装
- 取得頻度設定（rate limit 配慮、1 アカウント / 6h など）
- crawlers/twitter-syndication.ts 新設
- seed に Group C 8 ソース追加

人間ゲート: アカウントリスト最終確認

### Phase 5: Codex 3 モード化
**担当**: Claude（worker 改修） / **Codex 委譲**: モード別プロンプト草案

タスク:
- migration 0005: deep_dive_queue に mode / target_media カラム / articles に codex_drafts_* / codex_tip_recipe カラム追加
- codex-worker.mjs 改修（mode 分岐 + 結果保存先振り分け）
- buildPrompt の 3 モード分岐実装
- launchd plist の再ロード（変更なしのはず）

人間ゲート: 各モードプロンプトレビュー

### Phase 6: UI 改修
**担当**: Claude / **Codex 委譲**: コンポーネント実装の草案

タスク:
- タブ構成変更
- KpiCard 4 種改修
- ArticleCard にアクションボタン 3 種追加
- Rail（右カラム）改修
- 媒体別 fit スコア pill 追加

人間ゲート: スクショレビュー（local dev 起動して目視）

### Phase 7: wiki 連携
**担当**: Claude

タスク:
- ai-radar の Server Action「wiki ingest 候補抽出」追加
- brand-publisher の session start hook と統合（ai-radar 側 article ID + drafts/recipe を渡す）
- wiki/domain/claude-usage/ ディレクトリ + index.md 新設
- raw/publishing/inspirations/ の命名規約を ai-radar 由来用に拡張

人間ゲート: 1 件目の ingest を手動で実施して動作確認

### Phase 8: CLAUDE.md / memory / agent 定義更新
**担当**: Claude

タスク:
- CLAUDE.md の外部スポーク記述更新（事業防衛 → Claude 活用 + 発信ネタ）
- ルーティングキーワード更新（事業防衛系キーワード除去、発信ネタ系追加）
- .claude/agents/ai-radar.md 役割定義改訂
- memory に project_ai_radar_pivot.md 新設

人間ゲート: なし（org-designer 通常運用）

---

## 9. リスク・人間ゲート

### 9.1 リスク

| リスク | 緩和策 |
|---|---|
| migration 0003 で既存 articles のカラム drop → 過去深掘り結果も間接的に活用不可 | `deep_dive_result_markdown` は維持。落とすのは business_* / opportunity_* のみ |
| Gmail tier1 通知 撤廃で意図せず重要シグナル取りこぼし | 新分類で `claude_tip` かつ `score_relevance >= 80` を朝ダイジェスト上位に出して補完 |
| 新分類の精度が低く noise 過多 | Phase 2 でプロンプト改善ループ。1 週間モニタしてプロンプト調整 |
| Codex 3 モード化で worker のレイテンシ増・タイムアウト | mode ごとに CODEX_TIMEOUT_MS を変える。content_seed_drafts は 5 分、claude_tip_recipe は 5 分 |
| X syndication API の TOS / レート制限 | 1 アカウント 6h ごと、UA 偽装なし、エラー時即 backoff。問題ありなら撤退 |
| note スクレイピングの TOS | robots.txt + ガイドライン確認。公開ページのみ、低頻度（24h ごと）、UA 明示 |

### 9.2 人間ゲート（Phase 着手前承認必須）

- Phase 1: migration SQL レビュー
- Phase 2: 新プロンプト 5 種レビュー
- Phase 3: Group D のスクレイピング対象 TOS 確認
- Phase 4: X アカウントリスト確定
- Phase 5: 3 モードプロンプトレビュー
- Phase 6: UI スクショレビュー
- Phase 7: 1 件目 ingest 手動確認

### 9.3 緊急停止条件

- Codex worker が暴走（コスト急増）→ launchd unload で即停止
- ダッシュボードが壊れて閲覧不可 → Phase 1 の旧コード commit に revert
- 新分類の精度が著しく悪い → pipeline.ts を「全件 noise」モードに切替（temporary）

---

## 10. 直近 1 週間の打ち手（提案）

| 日 | やること | 担当 |
|---|---|---|
| 2026-05-22 (今日) | 計画書レビュー + Phase 0 完了 + Phase 1 migration 0003 SQL ドラフト | Claude |
| 2026-05-23 | Phase 1 完遂（migration 適用 + 撤廃ファイル削除 + UI 旧表示削除）+ commit + PR | Claude |
| 2026-05-24 | Phase 2 着手: 新プロンプト 5 種草案（Codex に壁打ち） | Claude + Codex |
| 2026-05-25 | Phase 2 完遂: pipeline.ts 本実装 + migration 0004 | Claude |
| 2026-05-26 | Phase 3 着手: Group A + B 新ソース追加 + 04-sources.md 改訂 | Claude |
| 2026-05-27 | Phase 3 完遂 + 24h 動作観察 | Claude |
| 2026-05-28 | Phase 5 着手（UI 改修より Codex 3 モード化を先行する案） | Claude |

X インフルエンサー対応 (Phase 4) と UI 改修 (Phase 6) と wiki 連携 (Phase 7) は来週以降。

---

## 11. 未決事項（ユーザー判断待ち）

1. **過去 articles レコードの扱い**: business_* / opportunity_* カラム drop で履歴情報が失われる。**バックアップを Supabase の dump として取ってから drop するか？** (v2 では `business_trigger_flag` の値だけは新 mapping で書換維持)
2. **既存 cron スケジュールの維持**: 朝 8:00 / 夜 20:00 のままで良いか？（Phase 1 では維持予定）
3. **Codex のコスト上限**: ChatGPT Plus サブスクリプション枠で運用しているが、3 モード化で呼び出し回数増。**上限を設けるか？**（例: 1 日 20 ジョブまで）
4. **Tier 区分の継続**: tier 1/2/3 の概念は維持（クロール頻度の区分として）。命名だけ「即時 / 朝夜 / 朝夜」に意味づけ直す
5. **Group D（note スクレイピング）の優先度**: TOS 問題があれば後回し。先送り判断は？
6. **market_signal の通知方針 (v2)**: Tier1 即時 Gmail 通知は撤廃したが、`market_signal_strength >= 80` の記事を見つけた時の通知をどうするか？
   - 案A: 朝夜ダイジェストの冒頭で強調するだけ
   - 案B: 別途「市況シグナル即時通知」を Slack / メールで小さく送る
   - 案C: ダッシュボード閲覧時のみ banner で気づかせる
7. **r1_risk 検知の頻度 (v2)**: Anthropic 公式系 5 ソースは現状毎日 1 回クロール。**r1_risk は重要度が高いので 6h ごとに上げるか？** (Hobby 制約は cron 別パスで回避可能だが、`tier1-hourly` route の path 名と整合させる必要あり)
