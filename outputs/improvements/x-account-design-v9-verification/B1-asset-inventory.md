# B-1: 既存資産棚卸し

> v9 起草の前提として ai-radar / x-buzz-radar / publishing research の 3 資産を「取り込み / 改変 / 撤廃 / 要再生成」で判定。観測ベース。

## サマリ

- **取り込み**: 2 件 (x-buzz-radar 本体、publishing research REPORT.md)
- **改変**: 1 件 (ai-radar — claude_tip + market_signal pipeline のみ残存。X 取得部は migration 0008 apply で物理撤廃)
- **撤廃**: 0 件 (3 つとも v9 で何らかの形で活用)
- **要再生成**: 0 件 (publishing REPORT.md は本日 commit de16523 で実在確認)

**v9 全体方針の推奨**: ゼロ build ではなく **x-buzz-radar をベースに v9 へ拡張** を推奨。理由は §2「Build 戦略比較」参照。

---

## 1. ai-radar

### 現状

- 配置: `/Users/rikukudo/Projects/ai-radar/`
- Stack: Next.js 16 / Supabase / Vercel + Codex MCP worker
- 現ブランチ: `task/260523-prepare-x-removal` (X 削除 migration 0008 commit 済、未 apply)
- Supabase project_id: `jzlhzfdvaculblgwlkxz` (region ap-northeast-1、ACTIVE_HEALTHY)
- Migration: 0001-0008 完了。0008 は **未 apply** (`apply_migration` 待ち)

### Pipeline 分布 (articles テーブル、観測値)

```
noise          30
both           17
market_signal  17
content_seed    9
claude_tip      8
合計           81 records
```

### Source 内訳 (実投入実績がある source のみ抜粋、計 15 active source)

| source | type | pipeline | article_count | latest |
|---|---|---|---|---|
| Anthropic Claude Plugins Official | github_releases | claude_tip | 18 | 05-22 |
| dev.to Claude tag | rss | claude_tip | 15 | 05-23 |
| Anthropic News | scraping | claude_tip | 8 | 05-22 |
| Reddit r/ClaudeAI | rss | both | 5 | 05-22 |
| X @simonw | **twitter_api** | claude_tip | 5 | 05-22 |
| Anthropic Cookbook | github_releases | claude_tip | 5 | 05-22 |
| Claude Code GitHub | github_releases | both | 5 | 05-23 |
| X @AnthropicAI | **twitter_api** | claude_tip | 4 | 05-23 |
| Qiita Claude tag | rss | claude_tip | 4 | 05-23 |
| HackerNews Show HN | rss | content_seed | 3 | 04-22 |
| X @ClaudeCode_UT | **twitter_api** | claude_tip | 2 | 05-23 |
| Anthropic Engineering Blog | scraping | claude_tip | 2 | 05-23 |
| Anthropic Skills repo | github_releases | claude_tip | 2 | 05-22 |
| Claude Code Docs | scraping | claude_tip | 2 | 05-22 |
| Claude Platform Docs | scraping | claude_tip | 1 | 05-23 |

**X 系の実投入実績**: twitter_api 4 source で計 11 records。twitter_syndication source は 40+ 件登録されているが投入実績 0 (perSourceLimit 5 + 7 日窓 + 公式 API ピボットで syndication 経路は事実上死蔵)。

### v9 統合方針

v8 §3.1「素材レイヤー」のうち、ai-radar は次のレイヤーで部分採用する:

| v9 素材レイヤー要素 | ai-radar 残存機能 | 統合方式 |
|---|---|---|
| Anthropic 公式アナウンス | Anthropic News / Cookbook / Skills repo / Plugins Official / Engineering Blog / Code Docs / Platform Docs (8 source、claude_tip 39 records 投入実績) | **そのまま継続**。Claude 活用ネタの一次ソースとして v9 の素材レイヤーに直結 |
| Claude/AI 業界トレンド (Reddit / dev.to / Qiita / HN) | rss 系 6 source (content_seed/claude_tip/both 計 27 records) | **そのまま継続**。話題密度の地盤指標として活用 |
| 市況シグナル (vertical_surge / bm_shift / r1_risk) | market_signal pipeline (17 records) | **そのまま継続**。v9 では Optimizer 側で「今避けるべきテーマ」の入力として参照 |
| X バズ取得 | twitter_api 4 source / twitter_syndication 40+ source | **x-buzz-radar に完全移管** (migration 0008 apply 必須) |

### 推奨判定: **改変 (X 取得部のみ撤廃、それ以外は素材レイヤーとして取り込み継続)**

根拠:
1. X 以外のソースは v9 §3.1 の素材レイヤーで再構築するより既存資産を流用する方が早い (Codex MCP worker / digest builder / scoring も流用可)
2. X 取得部は x-buzz-radar の検索 API ベース設計 (取得時点 min_faves フィルタ) の方が課金効率が桁違いに良い (95% を捨てる旧設計の解消)
3. migration 0008 apply は人間タスク (destructive のため)。apply 後に X 系 11 records + syndication 40 sources が物理削除される
4. v9 §3.4 Managed Agents 一本化の判断: ai-radar 既存実装は Vercel Cron + Server Action ベースで MA を使っていないため、v9 で MA に切り替える場合は ai-radar 内のジョブを徐々に MA に置換する形になる (一気に切らない)

---

## 2. x-buzz-radar

### 実装済み機能 (T1-T20、commit 83df5df、43 files / 7811 insertions)

| 機能 | 実装ファイル | 状態 |
|---|---|---|
| T1: bootstrap (Next.js 16 / TS / Vitest / Vercel cron) | `next.config.ts` / `vercel.json` / `package.json` | done |
| T2: Supabase migration (8 テーブル + seed query 3 + seed variant 18) | `supabase/migrations/0001-0003.sql` | **未 apply** (新規 project 作成も人間タスク) |
| T4: 型 + Supabase wrapper | `src/lib/types.ts` / `src/lib/supabase.ts` | done |
| T5: twitterapi.io adapter | `src/lib/fetchers/twitterapi.ts` + 4 unit tests | done |
| T6: Anthropic wrapper + Haiku 関連度判定 (0-100 + category) | `src/lib/anthropic.ts` / `src/lib/enrichment/relevance.ts` | done |
| T7: Haiku 型抽出 (buzz_pattern / hook_structure / visual_hint) | `src/lib/enrichment/pattern.ts` | done |
| T8: /api/cron/fetch (検索→dedup→relevance→pattern→DB) | `src/app/api/cron/fetch/route.ts` | done |
| T9: LINE Notify (relevance >= 80) | `src/lib/notify/line.ts` | done |
| T10: variant 期待値推定 | `src/lib/variant-selector.ts` | done |
| T11: Sonnet 4.6 媒体別ドラフト生成 | `src/lib/enrichment/draft.ts` | done |
| T13: REST API (/api/generate, /api/adopt, /api/post-record, /api/manual-engagement) | `src/app/api/*` 4 routes | done |
| T14: Dashboard MVP (バズ一覧 / adopt review / 投稿管理) | `src/app/page.tsx` / `src/app/adopt/[id]/page.tsx` / `src/app/posts/page.tsx` | done |
| T16-T19: self-watch (X owned reads / IG Graph API / note Playwright) + /api/cron/self-watch | `src/lib/self-watch/{x,instagram,note}.ts` | done |
| T20: 2 軸自己改善ループ (Track A 検索 + Track B 生成、媒体別 z-score 正規化) | `src/lib/improve/track-{a,b}.ts` + /api/cron/weekly-improve | done |

**人間タスク残**: Supabase 新規 project / twitterapi.io アカ + key / IG Business + FB ページ + long-lived token / LINE Notify token / .env / ai-radar 旧 X crawler 物理削除 (dogfooding 後)

### Supabase スキーマ (8 テーブル、commit 83df5df から確認)

```
query_pool              -- 検索クエリ pool (active / 採用率 / parent_query_id で改善派生)
x_buzz_tweets           -- 取得バズツイート (relevance / category / buzz_pattern / status)
prompt_variants         -- 発信ドラフト variant pool (platform / hook_template / tone / format / parent_variant_id)
our_posts               -- 自投稿 (source_buzz_tweet_id + variant_id 紐付け)
post_engagement_snapshots  -- self-watch 結果 (24h/72h/7d、likes/RT/impressions 等 14 metric)
variant_weights         -- Track B output (avg_engagement_z + exploration_weight)
config                  -- adoption_threshold / notify_threshold / per_query_limit
enrichment_drafts       -- 生成済みドラフト cache (jsonb payload)
```

config 初期値: `adoption_threshold=60` / `notify_threshold=80` / `per_query_limit=50`

### v9 との重複マトリクス

| v9 セクション | x-buzz-radar 対応箇所 | 重複度 |
|---|---|---|
| §3.1 素材レイヤー (twitterapi.io 海外バズ) | T5: `fetchers/twitterapi.ts` + T8: `/api/cron/fetch` | **高** (完全一致) |
| §3.1 素材レイヤー (Claude Code 履歴 / Git commit / Voice Memo) | 未実装 | なし (v9 で新規) |
| §3.1 素材レイヤー (Anthropic 公式 RSS) | 未実装 (ai-radar 側) | 低 (ai-radar 統合で対応) |
| §3.2 インデックス層 (pgvector embedding) | 未実装 | なし (v9 で新規) |
| §3.3 Interviewer (5 ターン会話、Claude Code 経由) | 未実装 | なし (v9 で新規) |
| §4.2 選別レイヤー (翻案候補スコア式 / 重複検出) | T6/T7/T10: relevance + pattern + variant_selector | **中** (スコア式は別物だが「採用判定 → 期待値推定」の骨格は流用可能) |
| §4.3 Writer (マルチプラットフォーム派生 + フォーマット選択) | T11: `enrichment/draft.ts` (X thread / note outline / IG carousel 同時生成) | **高** (x-buzz-radar は 1 アイデア → 3 媒体派生済み。v8 の「内容量適性 + 期待 PCR + 過去類似実績」のフォーマット選択ロジックは未実装) |
| §4.4 Visualizer (3 モード、Mann-Whitney 自動切替) | 未実装 (visual_hint カラムのみ) | 低 |
| §4.5 Videographer (Remotion + VOICEVOX) | 未実装 (visual_brief.type=video まで) | 低 |
| §4.6 Editor (6+1 ルール) | 未実装 (content-reviewer エージェント連携想定だが未統合) | 低 |
| §4.7 Hook Analyzer (動的拡張 / HDBSCAN) | T7: 静的 pattern 抽出のみ。HDBSCAN なし | 中 (固定 enum なので動的拡張は v9 で追加) |
| §4.8 Optimizer (3 フェーズサイクル、自動反映 + 安全装置) | T20: Track A (検索改善) + Track B (生成改善、媒体別 z-score) | **高** (2 軸自己改善ループは Optimizer の中核機能を先取りで実装済み。Phase 1/2/3 分離はないが本質は同じ) |
| §5 自動反映 + 事後報告 (LINE Daily Digest / 安全装置) | T9: LINE Notify あり。Daily Digest / 変更幅キャップ / ロールバック未実装 | 中 |
| §6 競合調査 50 項目 / §7 Style Guide v1/v2/v3 | 未実装 | なし (v9 で新規) |
| §8 Phase 計画 (Phase 0 Foundation 4-6 週間) | スキップ設計 (一気通貫 Sprint) | 衝突 (v9 で要再設計) |

### Build 戦略比較

| 案 | 工数 | 既存資産活用 | 設計の自由度 | リスク |
|---|---|---|---|---|
| **A. v9 ゼロ build** | 4-6 週間 (Phase 0 + Phase 1) | 0% (x-buzz-radar 全廃棄) | 高 (v8 設計通りに作れる) | x-buzz-radar の 7811 行 + Supabase スキーマ + 2 軸改善ループを捨てる。MA + Cloudflare Workers + GitHub Actions の新スタック検証コスト |
| **B. x-buzz-radar を v9 ベースに拡張** | 2-3 週間 (差分実装) | 70% (検索 / 関連度 / 型抽出 / draft 生成 / self-watch / 2 軸改善ループは流用) | 中 (Next.js/Vercel/Supabase スタック固定。MA は別レイヤーとして追加) | T11a/b/c (ai-radar X 削除) + 人間タスク 5 件が前提条件。スキーマ拡張で migration が増える |

### 推奨判定: **B (x-buzz-radar をベースに v9 へ拡張)**

根拠:
1. **機能重複が想像以上に深い**: §4.8 Optimizer の中核「2 軸自己改善ループ + 媒体別 z-score 正規化 + variant の親子関係保持」が既に実装済み。これは v9 でゼロから書くと数日かかる
2. **媒体派生も完了**: 「1 core_idea → X thread + note outline + IG carousel」の派生生成は draft.ts で既に動く。v8 §4.3 Writer は「適性スコア + ε-greedy」のフォーマット選択ロジックを追加するだけで済む
3. **スタック統一**: x-buzz-radar も money-bot も ai-radar も Next.js + Vercel + Supabase。v8 が掲げる「Cloudflare Workers + MA + GitHub Actions」の 3 つ目スタック追加は学習コスト + 障害点増加 + 月予算 ¥10,000 を超えるリスクが現実的
4. **未実装要素は加算しやすい**: pgvector / Interviewer / Visualizer 3 モード / Editor 6+1 / Hook 動的拡張 / Daily Digest / 安全装置は **後付け可能なモジュール**。x-buzz-radar の現コードを壊さず追加できる
5. **人間タスク 5 件は B でも A でも同じく必要** (Supabase / twitterapi.io / IG / LINE / .env)。A だと「x-buzz-radar 全廃棄 + v9 新規 setup」で人間タスクが二重発生

注意点:
- v8 §3.4「Managed Agents 一本化」採用 → x-buzz-radar の Vercel Cron + Server Action 構造と矛盾する。**MA は Interviewer / Optimizer (週次) など長時間バッチに限定採用** し、定常 cron は Vercel に残す折衷が妥当
- T11a/b/c (ai-radar X 削除) を v9 起草と同期させる必要あり。x-buzz-radar dogfooding を待たずに v9 では「ai-radar X 系は撤廃前提」で書く

---

## 3. publishing research (REPORT.md)

### 所在確認結果

- **見つかった**: `/Users/rikukudo/Projects/private-agents/all-good-ops/outputs/publishing/research/2026-05-24-jp-ai-publishers/REPORT.md` (136 行)
- 由来: commit de16523 (本日 2026-05-24 15:14、`feat(publishing): 日本Claude/AI業務自動化発信者 上位10アカウント調査`)
- メイン担当者の find 不発の原因は推測 (検索条件 or commit timing) だが、現時点では確実に存在

### 内容 (要約)

twitterapi.io 経由で **日本の Claude/AI 業務自動化発信者 上位 10 アカウント** を抽出 → 直近 90 日 **928 tweets** を取得 → テーマ × フォーマットの 2 軸マトリクスで「書かれていない領域」を Tier1/2/3 に分類。コスト: 約 ¥45。

主要な空白領域 (Tier1):
- 業種別 Claude 活用 SOP (士業・小売・建設等の中小現場)
- 非エンジニア経営者向けの「AI 委託」フロー (要件・見積・契約)
- 数字付き Cost / ROI 開示
- 失敗談先行型コンテンツ

副産物:
- `.claude/scripts/twitterapi_io.py` (retry/pacing/cursor 内蔵 wrapper)
- スキル #41 `external-api-cost-disclosure.md`
- improvement-log 2 件

### v9 統合方針

v8 §7「Style Guide v1 (初期) — 競合調査 65 アカウント分析 (外部データのみ)」の **日本市場向け一次原料** として直結。

- v8 では「65 アカウント × 3 ヶ月 = 1,300 投稿」を Phase 0 で実施する計画 → 既に 10 アカウント × 928 tweets が完了している
- 残作業: 残り 55 アカウント or **10 アカウントを精緻化して Style Guide v1 を起草** のどちらか
- Tier1 空白領域 4 つはそのまま v9 §1.4 「コンテンツバランス初期方針」と §4.2 「topic_relevance スコア式」のターゲット領域として採用可能
- ofmeton 発信戦略 Phase 4 (CLAUDE.md §発信戦略) の競合ベンチマーク土台としても既に活用中

### 推奨判定: **取り込み (v9 Phase 0 の 8 割を消化済みとして扱う)**

根拠:
1. 日本市場の空白領域分類が **既に Tier1/2/3 で構造化済み** → v9 Style Guide v1 の Day 1 から投入可能
2. twitterapi.io wrapper (`.claude/scripts/twitterapi_io.py`) は x-buzz-radar の adapter (`fetchers/twitterapi.ts`) と二重実装になる懸念 → v9 では「Claude Code 経由の探索的調査は Python wrapper、本番運用は TS adapter」と棲み分け
3. 65 アカウント分析を Phase 0 で機械的にこなす必要はなく、10 アカウント精緻化 + 海外バズ (x-buzz-radar) の継続観測で代替可能 → v9 Phase 0 期間を 4-6 週間 → 2-3 週間に短縮できる

---

## v9 起草への影響まとめ

### §3.1 素材レイヤーへの影響

- **海外 X バズ**: x-buzz-radar 既存実装 (twitterapi.io adapter + Haiku relevance + pattern) を採用。設計章で「素材レイヤーは x-buzz-radar に委譲」と明示
- **Claude/AI 業界ニュース + Anthropic 公式**: ai-radar 既存実装を継続。設計章で「ai-radar の claude_tip / content_seed / market_signal pipeline を素材レイヤーの一部として参照」と明示
- **Claude Code 履歴 / Git commit / Voice Memo**: 完全新規実装。pgvector インデックスも新規

### §3.4 Managed Agents 採用判断への影響

- 「全部 MA」採用は撤回推奨。x-buzz-radar の定常 cron (fetch / self-watch / weekly-improve) は Vercel Cron に残す
- **MA は次の限定用途に絞る**: Interviewer (5 ターン会話の state 管理) / Optimizer Phase 2 仮説検証 (長時間バッチ) / Videographer (パイプライン)
- これにより v8 §3.3 のコスト試算 ¥4,510/月 (MA トークン + session-hour) はおおよそ半減見込み → 余裕枠が増える

### §4.2 選別レイヤーへの影響

- x-buzz-radar の **adoption_threshold=60 / notify_threshold=80** が既に運用可能 → v8 のスコア式 (raw_engagement × normalized × freshness × hook_score × topic_relevance) は **adoption_threshold への代替 or 後段の precision フィルタ** として位置付け
- 重複検出 (90 日 cos 類似度) は x-buzz-radar の `tweet_id` 完全 dedup + thread 統合のみ。v9 で投稿側 90 日 cos 類似度を追加実装する必要あり

### §7 Style Guide v1 主原料への影響

- 「65 アカウント × 3 ヶ月」 → 「10 アカウント精緻 (済) + x-buzz-radar 海外バズ継続観測」に置換
- Phase 0 期間 4-6 週間 → **2-3 週間に短縮** (publishing research 既完済分を差し引き)

### 全体: ゼロ build vs x-buzz-radar 拡張 のどちらを推奨するか

**B (x-buzz-radar を v9 ベースに拡張) を強く推奨**。理由:

1. 機能重複度が想像以上 (検索 / 関連度 / 型抽出 / 派生生成 / 2 軸自己改善ループ / self-watch が **既に動く**)
2. スタック統一 (Next.js + Vercel + Supabase) を保てる → 学習コスト + 障害点を増やさない
3. 月予算 ¥10,000 の縛りに対して、ゼロ build (MA + Cloudflare Workers + GitHub Actions) は超過リスクが高い
4. publishing research の Tier1 空白領域がそのまま v9 のコンテンツ方針に直結 → ゼロ build で同じ材料を再収集する意味がない
5. ai-radar の素材レイヤー機能 (Anthropic 公式 8 source / RSS 6 source) も既存資産として価値が高い

ゼロ build を選ぶ正当事由は **「v8 §3.4 で MA 全部入りを譲れない」** ケースのみ。だがそれも Interviewer / Optimizer 限定の段階導入で代替できる。

---

## 要追加調査 (この B-1 では未確認)

- x-buzz-radar の Sonnet 4.6 draft.ts が実際に生成するアウトプット品質 (生成テストは 0 件、人間タスクの dogfooding 待ち)
- ai-radar `Codex MCP worker` (3 モード: deep_dive / content_seed_drafts / claude_tip_recipe) の稼働実態 (出力サンプルは未確認)
- Managed Agents 実コスト測定 (B-3 で別途実施予定)

