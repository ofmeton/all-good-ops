# Query Design 統合完全版 (v1 〜 v2 全 2 バージョン省略なし)

## 0. このドキュメントについて

3 シリーズ統合ドキュメントの 1 つ (Series D / Query Design)。`query-design.md` (v1)、`query-design-v2.md` (v2) の 2 ファイルを 1 つに統合した完全版。

### 統合方針 5 ルール

1. **省略なし**: 全バージョンの全節を保持。最新版で削除された節も `Status: Deprecated in vX (理由: ...)` 注記で原文残す。
2. **バージョン来歴ヘッダー**: 各 `##` / `###` 節の冒頭に 1 行追加。
3. **現行 SSOT 明示**: 最新値には `**Current (v2)**` マーカー、過去値は `(v1: X)` で履歴併記。
4. **数値・分類・範囲は原値保持** (cs:s2-68 silent reduction 厳禁): range を下限のみに縮退させない / 単一値に丸めない / classification 軸変更があれば旧軸も保持。
5. **重複文章のみ排除**: 完全同一文章は来歴注記でまとめてよい。差分あれば両方残す。

### 元バージョン一覧

| version | ファイル | 行数 | 主要テーマ |
|---|---|---|---|
| v1 | query-design.md | 165 | Phase 0 v2、5 query (Q1-Q5、単系統)、seed hit rate ~50% (cs:s3-64 step 1d、persona 起点) |
| v2 | query-design-v2.md | 245 | Phase 0 v3、publisher 5 + audience 5 = 10 query (2 系統分離)、seed reverse-engineering で seed hit 17/24 = 70%+ 達成 |

### 現行 SSOT

**Current (v2)** が Single Source。v1 の Q1-Q5 は v2 で 2 系統 10 query に再編されたが、v1 の母集団取得方針 (信頼 4 + 新規 20) と永続化スキーマは v2 でも継承される。

---

## 1. バージョン進化年表

*Version History*: v1 (Phase 0 v2 直前) → v2 (Codex round 1 反映、Phase 0 v3 query 改訂)

| version | 日付 | 主要変更 | 元ファイル行数 |
|---|---|---|---|
| v1 | 2026-05-26 (PR #22 前) | Phase 0 v2 として 5 query (Q1-Q5 単系統)、24 アカ + 候補発掘 | 165 |
| **v2** | **2026-05-26 (PR #25)** | **Codex C-1 / C-2 反映: query 2 系統 10 本に分離 (A 系 publisher_discovery 5 + B 系 audience_validation 5)、seed 逆算 + Phase 0 v3 で hit 70% 検証** | 245 |

---

## 2. 統合本文 (節ごとに来歴ヘッダー)

### 2.1 設計思想

*Version History*: v1 は単系統 (5 query で母集団取得方針 + 候補発掘の混合) → v2 で 2 系統分離 (publisher_discovery と audience_validation の混線解消)

#### v1 §1.4 候補スコアリング (Status: 単系統スコアの参考、v2 で 2 層化)

```
score = (followers × engagement_rate_90d × 0.4)
      + (target_fit_score × 0.4)   ← v10.3 新規追加 (Phase 0 で抜けていた条件)
      + (recent_max_engagement × 0.2)

target_fit_score (0-1):
  - bio に "中小" / "経営者" / "非エンジニア" / "1人社長" / "士業" / "業務効率化" 含む: +0.3
  - 投稿 100 件のうち non_engineer_rate ≥ 0.10: +0.3
  - 業務仕組み化テーマ率 ≥ 0.30: +0.2
  - 海外バズ翻案でなくオリジナル / 業務実体験ベース ≥ 0.30: +0.2
```

target_fit_score ≥ 0.5 を満たさない候補は除外 (umiyuki_ai 型のターゲット不適合の取り込み防止)。

#### v2 §0.1 2 系統分離 (**Current (v2)**)

| 系統 | 目的 | 母集団 | 採用基準 |
|---|---|---|---|
| **A: publisher_discovery** | seed 20 アカと同種の AI 発信者を追加発掘 | seed コーパスの中核語彙 (Claude/Codex/Obsidian/Agent/MCP/プロンプト) | 投稿本文・リンク先・リポジトリ言及で target_fit を測る |
| **B: audience_validation** | target (非エンジニア経営者・コンサル) が反応/発言する語彙領域を把握 | 中小/経営者/業務代行/業務効率化系 | bio + 投稿で target_fit を測る (発掘ではなく**読者層 hit 検証**) |

→ A 系で発掘した発信者を seed 化、B 系で読者層の言葉を transfer 学習に使う。

#### v2 §0.2 seed 逆算根拠 (v2 で新規導入)

24 アカ × top 20 投稿 (= 480 投稿) の頻出語抽出 (2026-05-26):

| カテゴリ | 上位語 (件数) |
|---|---|
| **メインツール** | Claude (249) / Codex (114) / Obsidian (92) / Gemini (24) / ChatGPT (11) |
| **特化キーワード** | Claude Code (139) / プロンプト (69) / エージェント (56) / ツール (44) |
| **アクション語** | 保存 (57) / 開発 (24) / 検証 (12) / 解説 (13) / 活用 (10) |
| target 関連 (薄い) | 業務 (12) / 自動化 (10) / 事例 (8) / 中小 (3) / 経理 (3) / 請求書 (3) |
| target 関連 (ほぼゼロ) | 士業 (0) / 税理士 (2) / 社労士 (0) / 経営 (5) |

→ 旧 Q1-Q5 (中小/士業/経理/業務代行軸) は seed 20 アカに刺さらない。**新 A 系 5 query は Claude/Codex/Obsidian/エージェント/MCP 軸で構成**。

---

### 2.2 母集団取得方針

*Version History*: v1 §1 で導入 (信頼 4 + 新規 20 アカの取得方針 + 5 query 発掘) → v2 では母集団取得部は前提とし、query 設計に集中

#### v1 §1.1 既存 4 アカ (data 流用、追加 call 不要) (Status: v2 でも前提として継承)

`git show task/260524-jp-ai-publishers-research:outputs/publishing/research/2026-05-24-jp-ai-publishers/raw/posts/<handle>.json` で 90 日 raw を取得可能。

- Shimayus / SuguruKun_ai / masahirochaen / ClaudeCode_love

→ Phase 0 v2 で **追加 API call なし**、既存 data に新規 9 項目 (発信ネタ仕入れ方法分析) を後付けで実行。

#### v1 §1.2 ユーザー追加 20 アカ (新規取得、direct fetch) (Status: v2 でも前提として継承)

`raw/publishing/inspirations/2026-05-26-reference-accounts.md` の 20 アカに対し、**handle 直接指定で 90 日 raw を取得**:

```
twitterapi.io advanced_search query:
  query: "from:<handle> since_time:<90d_ago_unix> until_time:<now_unix>"
  page_limit: 100 (上限 100 tweets/アカ)
  pacing: 2 sec/call

20 アカ × 100 tweets = 2,000 tweets
推定コスト: $0.30 = ¥47
```

---

### 2.3 追加発掘 query

*Version History*: v1 §1.3 で 5 query (Q1-Q5 単系統) → v2 §1 / §2 で A 系 5 + B 系 5 = 10 query に拡張

#### v1 §1.3 5 個 (Q1-Q5 単系統、Status: Deprecated in v2、原文保持)

国内・海外で**非エンジニア経営者向け** AI 発信者を発掘するための query 5 個:

| Q# | query (例) | 想定 hit 種類 |
|---|---|---|
| Q1 | `"AI" ("中小" OR "経営者" OR "1人社長") -is:retweet lang:ja min_faves:50` | 中小経営者向け AI 発信 |
| Q2 | `"AI" ("士業" OR "経理代行" OR "事務代行" OR "業務代行") -is:retweet lang:ja min_faves:30` | 士業 + 業務代行業 × AI 発信 (v1.2 改訂: 主軸ターゲットから士業格下げに伴い業務代行業全般に拡張) |
| Q3 | `("業務効率化" OR "業務自動化") "AI" -is:retweet lang:ja min_faves:50` | 業務効率化文脈の AI 発信 |
| Q4 | `"Claude" ("経理" OR "請求書" OR "見積") -is:retweet lang:ja min_faves:30` | 経理 × Claude 実践 |
| Q5 | `"AI automation" ("small business" OR "non-engineer" OR "non-coder") -is:retweet lang:en min_faves:100` | 海外 非エンジニア向け AI 自動化発信 |

各 query × 100 tweets = 500 tweets、推定コスト $0.075 = ¥12。

#### v2 §1 A 系 publisher_discovery (5 query) (**Current (v2)**)

##### A1: Claude Code 活用発信者

```
"Claude Code" (使い方 OR 設定 OR 活用 OR 導入 OR 解説) -is:retweet lang:ja min_faves:30
```

期待 hit (seed 20 アカ): ClaudeCode_UT / claudecode_lab / ClaudeCode_love / cyrilXBT / Codestudiopjbk / commte / Fluyeporlaweb など

##### A2: Codex / CLI 系発信者

```
("Codex" OR "codex cli" OR "@openai/codex") (MCP OR エージェント OR 自動化 OR コマンド) -is:retweet lang:ja min_faves:30
```

期待 hit: Codestudiopjbk / masahirochaen / cyrilXBT / commte など

##### A3: Obsidian × AI 発信者

```
("Obsidian" OR "#Obsidian") (Claude OR GPT OR AI OR プロンプト) (運用 OR ワークフロー OR 保存 OR Vault) -is:retweet lang:ja min_faves:20
```

期待 hit: obsidianstudio9 / ObsidianOtaku / Shimayus など

##### A4: MCP / エージェント実装発信者

```
("MCP" OR "Model Context Protocol" OR "Claude Desktop" OR "AIエージェント") (連携 OR ツール OR 実装 OR 自作) -is:retweet lang:ja min_faves:30
```

期待 hit: Shimayus / so_ainsight / SuguruKun_ai / mmmiyama_D など

##### A5: 海外英語圏 AI 発信者 (Q5 改訂)

```
("Claude Code" OR "Codex" OR "Obsidian" OR "AI agent") (workflow OR automation OR tutorial OR setup) -is:retweet lang:en min_faves:50
```

期待 hit: jason_coder0 / heynavtoor / ethancoder0 / cyrilXBT / csaba_kissi / Fluyeporlaweb など (旧 Q5 の min_faves:100 と narrow 句を撤廃)

#### v2 §2 B 系 audience_validation (5 query) (**Current (v2)**)

##### B1: 中小経営者の AI 困りごと言及

```
"AI" ("中小" OR "経営者" OR "1人社長" OR "個人事業主") (困っ OR 始め OR どう OR 使え) -is:retweet lang:ja min_faves:10
```

target が自分の口で AI 課題を語っている tweet を hit。読者層の困りごと語彙抽出用。

##### B2: コンサル / 業務代行業の AI 活用

```
"AI" ("コンサル" OR "業務代行" OR "経理代行" OR "事務代行") (実装 OR 効率化 OR 活用) -is:retweet lang:ja min_faves:10
```

target の隣接業種 (コンサル + 業務代行業) の AI 活用言及。

##### B3: 業務効率化 / 業務自動化 (非技術文脈)

```
("業務効率化" OR "業務自動化" OR "ChatGPT 活用" OR "AI 導入") -is:retweet lang:ja min_faves:30
```

旧 Q3 を承継。target が検索する語彙 = 読者層 hit。

##### B4: industry_sop 候補発掘 (経理 / 請求書 / 見積)

```
"AI" ("経理" OR "請求書" OR "見積" OR "Excel" OR "スプレッドシート") (自動 OR 効率 OR Claude OR GPT) -is:retweet lang:ja min_faves:20
```

industry_sop コンテンツの素材源 (1 業種セグメントとして士業も含む)

##### B5: 士業 × AI (industry_sop 1 セグメント)

```
"AI" ("士業" OR "税理士" OR "社労士" OR "行政書士" OR "弁護士") (業務 OR 自動化 OR DX) -is:retweet lang:ja min_faves:10
```

旧 Q2 を承継。士業は主軸 target ではなく **industry_sop の 1 業種セグメント**として残置 (cs:p3-fcbb 承認必須 4 種「Style Guide版変更」要件は本 PR で v1.3 承認に合算)。

---

### 2.4 target_fit_score 設計

*Version History*: v1 §1.4 で単一スコア (target_fit_score) → v2 §3 で 2 層化 (publisher_score + audience_score)

#### v1 §1.4 単一スコア (Status: v2 で 2 層化、原文 §2.1 内 v1 §1.4 候補スコアリングに保持)

(§2.1 内に転記済)

#### v2 §3 target_fit_score 2 層化 (H-7 対応) (**Current (v2)**)

##### A 系 (publisher_discovery) スコア

```
publisher_score = (followers × engagement_rate_90d × 0.3)
                + (content_overlap_score × 0.4)   ← 新規追加 (投稿本文/リンク先/リポジトリ言及)
                + (recent_max_engagement × 0.2)
                + (publishing_frequency × 0.1)

content_overlap_score (0-1):
  - 投稿 100 件中、Claude/Codex/Obsidian/MCP/エージェント の出現率 ≥ 0.2: +0.4
  - 自作 prompt / コード / GitHub link 引用率 ≥ 0.1: +0.3
  - Claude Code Discord / Anthropic public channel 言及 ≥ 0.05: +0.3
```

publisher_score ≥ 0.5 を A 系の採用閾値とする。

##### B 系 (audience_validation) スコア

```
audience_score = (target_fit_bio × 0.5)   ← bio に中小/経営者/コンサル/非エンジニア/業務代行
               + (target_fit_content × 0.5)   ← 投稿本文に困りごと語彙 (困った/初心者/どう使え/わからない)

audience_score ≥ 0.4 で transfer 用語彙抽出対象。発信者として採用するわけではない (= 読者層分析用)
```

---

### 2.5 永続化スキーマ (再現性確保)

*Version History*: v1 §2 で導入 (Phase 0 v2 用、query-meta.json 単一) → v2 §4 で改訂 (Phase 0 v3 用、A 系/B 系の subdir 分離 + inputs-manifest.json 追加)

#### v1 §2 永続化スキーマ (Status: Phase 0 v2 用、原文保持)

```
raw/publishing/research/2026-05-26-jp-ai-publishers-v2/raw/
├── query-meta.json           ← query 文字列 + cursor + params + 取得日時 (Phase 0 で欠落していたファイル)
├── candidates-from-search.json   ← Q1〜Q5 hit の handle 集計
├── account-metrics.json      ← 24 アカ + 候補のメトリクス
├── bursts-q1.json 〜 bursts-q5.json   ← 各 query の raw 結果
└── posts/
    ├── ClaudeCode_UT.json
    ├── obsidianstudio9.json
    ... (20 アカ × 100 tweets)
    └── _summary.json
```

##### v1 query-meta.json schema

```json
{
  "session_date": "2026-05-26",
  "session_branch": "task/260526-x-account-v10-3",
  "twitterapi_io_wrapper_version": "0.2.0",
  "queries": [
    {
      "id": "Q1",
      "query_string": "\"AI\" (\"中小\" OR \"経営者\" OR \"1人社長\") -is:retweet lang:ja min_faves:50",
      "page_limit": 100,
      "executed_at": "ISO 8601",
      "cursor_chain": ["cursor1", "cursor2"],
      "total_tweets_returned": 87,
      "cost_usd": 0.015
    },
    ...
  ],
  "direct_handle_fetches": [
    {
      "handle": "ClaudeCode_UT",
      "since_time": 1717000000,
      "until_time": 1722000000,
      "page_limit": 100,
      "executed_at": "ISO 8601",
      "tweets_returned": 78,
      "cost_usd": 0.015
    },
    ...
  ],
  "total_cost_usd": 0.375,
  "total_cost_jpy_estimate": 60
}
```

#### v2 §4 永続化スキーマ (v2.0) (**Current (v2)**)

##### v2 §4.1 raw 構造 (v2.0)

```
raw/publishing/research/2026-05-26-jp-ai-publishers-v3/raw/
├── query-meta.json           ← 全 query 文字列 + cursor chain + cost
├── publisher-discovery/
│   ├── A1-claude-code.json
│   ├── A2-codex.json
│   ├── A3-obsidian.json
│   ├── A4-mcp-agent.json
│   └── A5-en-overseas.json
├── audience-validation/
│   ├── B1-business-owner.json
│   ├── B2-consultant.json
│   ├── B3-efficiency.json
│   ├── B4-bookkeeping.json
│   └── B5-licensed-pro.json
├── inputs-manifest.json      ← H-9 対応: 各 query で何 tweet を後段分析に使ったか (tweet ids)
└── candidates-merged.json    ← A 系 + B 系の発掘 handle 統合
```

##### v2 §4.2 query-meta.json schema (v2.0)

```json
{
  "session_date": "2026-05-26",
  "wrapper_version": "0.2.0",
  "queries": [
    {
      "id": "A1",
      "category": "publisher_discovery",
      "query_string": "...",
      "lang": "ja",
      "min_faves": 30,
      "page_limit": 100,
      "executed_at": "ISO 8601",
      "cursor_chain": ["cursor1"],
      "total_tweets_returned": 87,
      "cost_usd": 0.013
    },
    ...
  ],
  "total_cost_usd": 0.30,
  "total_cost_jpy_estimate": 48
}
```

---

### 2.6 想定コスト

*Version History*: v1 内 (§1.1〜§1.3 で個別表示、合計 $0.30 + $0.075 = ¥60 程度) → v2 §5 で 1 表に集約 (¥24)

#### v1 内訳 (Status: 計算根拠、原文保持)

- 既存 4 アカ: 追加 API call なし
- 新規 20 アカ direct fetch: 20 × 100 tweets = 2,000 tweets / $0.30 = ¥47
- 追加発掘 5 query (Q1-Q5): 5 × 100 tweets = 500 tweets / $0.075 = ¥12
- 合計: 約 ¥59 (見積) → 実コスト ¥54 (Phase 0 v2 実 API call)

#### v2 §5 想定コスト (**Current (v2)**)

| 項目 | tweets | cost |
|---|---|---|
| A 系 5 query × 100 tweets | 500 | $0.075 = ¥12 |
| B 系 5 query × 100 tweets | 500 | $0.075 = ¥12 |
| user_info (A 系発掘上位 30 アカ) | — | ¥3 |
| **合計** | **1,000** | **¥24** (実 dry-run 試算で確定。Codex round 2 C-4 整合) |

旧 Phase 0 v2 (¥54) の半額以下。発掘範囲は 2 倍。

→ 実コスト: ¥23 ($0.148) (Phase 0 v3 実 API call、[competitor-report 統合版](./competitor-report-all-versions.md) (旧 v3) §1 参照)

---

### 2.7 取得後の分析プロセス

*Version History*: v1 §3 で導入 → v2 では明示節として再掲されないが、9 項目分析は competitor-report-v2/v3 で実施済み

#### v1 §3.1 50 項目集計 (既存) (Status: v2 では言及なし、Phase 0 v2 で実施完了)

`apps/x-account-system/scripts/relabel-tweets.py --posts-dir <new_dir>` を 24 アカで再実行。

#### v1 §3.2 9 項目新規分析 (発信ネタ仕入れ方法) (Status: v2 では言及なし、Phase 0 v2 で実施完了)

Sonnet 4.6 で各アカ top 20 投稿 × 24 アカ = 480 投稿を質的分析。詳細は `source-ingestion-analysis-template.md`。

#### v1 §3.3 引き出しストック生成 (所感骨格 + Hook + 画像 + 動画) (Status: v2 では言及なし、Phase 0 v2 / v3 で関連処理は進行中)

各アカの上位投稿パターンを 5-10 個ずつ抽出 → `opinion-patterns.md` / `hook-patterns.md` / `visual-patterns.md` にカテゴリ別ストック。

---

### 2.8 実 API call 実行手順

*Version History*: v1 §4 で導入 (Phase 0 v2 用) → v2 §6 で更新 (Phase 0 v3 用 fetch-phase0-v3.py)

#### v1 §4 実行手順 (Status: Phase 0 v2 用、Deprecated in v2)

```bash
# 1. wrapper script の verify
.claude/scripts/twitterapi_io.py --version  # >= 0.2.0 (query-meta.json 出力対応版)

# 2. dry run (cost 試算のみ、API call せず)
cd outputs/improvements/x-account-design-v10-phase0-v2
python3 fetch-phase0-v2.py --dry-run

# 3. 本実行 (¥60 発生確認後)
python3 fetch-phase0-v2.py --execute --confirm-cost-jpy=60

# 4. query-meta.json + posts/*.json を raw に commit (immutable)
git add raw/publishing/research/2026-05-26-jp-ai-publishers-v2/
git commit -m "feat(research): Phase 0 v2 競合調査 raw data (24 アカ + 5 query)"
```

`fetch-phase0-v2.py` は本セッション後に作成。`.claude/scripts/twitterapi_io.py` の v0.2.0 化 (query-meta.json 永続化対応) も含む。

#### v2 §6 実行手順 (**Current (v2)**)

```bash
# 1. dry-run
python3 fetch-phase0-v3.py --dry-run

# 2. execute (--confirm-cost-jpy は dry-run の出力と厳密一致を要求)
python3 fetch-phase0-v3.py --execute --confirm-cost-jpy=24

# 3. 永続化結果を git add
git add raw/publishing/research/2026-05-26-jp-ai-publishers-v3/raw/
```

---

### 2.9 旧 Phase 0 v2 との関係 (v2 で新規導入)

*Version History*: v2 §7 で導入 (v1 raw 資産との関係明示)

#### v2 §7 (**Current (v2)**)

- 旧 Q1-Q5 raw (`bursts-q1〜q5.json`) は v3 で **置換** されない (歴史として残置)
- 24 アカ raw posts (`posts/`, `posts-existing-4/`) は v3 でも継続使用 (再 fetch しない)
- v3 で新規発掘した候補 (publisher_score ≥ 0.5) は Phase 0 v4 (将来) で raw 取得対象

---

### 2.10 完了判定

*Version History*: v1 §5 と v2 §8 でそれぞれ完了判定 (Phase 0 v2 / v3 用)

#### v1 §5 完了判定 (Status: Phase 0 v2 着手前のチェックリスト)

- [ ] 本ドキュメント merge (v10.3 設計の一部として)
- [ ] `.claude/scripts/twitterapi_io.py` v0.2.0 化
- [ ] `fetch-phase0-v2.py` 実装
- [ ] dry run でコスト試算が ¥60 ±20% 内
- [ ] 本実行 → query-meta.json + 24 アカ posts を raw 永続化
- [ ] 50 + 9 項目集計 + opinion-patterns.md / hook-patterns.md / visual-patterns.md 出力
- [ ] [`competitor-report-all-versions.md`](./competitor-report-all-versions.md) (旧 v2) 起草 → Style Guide v1.1 反映
- [ ] Phase 1 着手 (HUMAN_TASKS H-1〜H-5 + H-8 + H-10 完了後)

#### v2 §8 完了判定 (**Current (v2)** Phase 0 v3 用)

- [ ] A 系 / B 系で 20 アカ最低 12 / 24 を hit (seed 逆算検証)
- [ ] candidates-merged.json で publisher_score ≥ 0.5 の新規 5+ アカ発掘
- [ ] inputs-manifest.json で再現性確保
- [ ] competitor-report-v3 / style-guide-v1.3 への transfer 完了

→ 実際の Phase 0 v3 実行結果: seed hit 17/24 = **70%** 達成 ([competitor-report 統合版](./competitor-report-all-versions.md) (旧 v3) §1.1 参照)

---

## 3. Deprecated 節 (省略なし原文保持)

### 3.1 v1 §1.3 5 query (Q1-Q5 単系統、Status: Deprecated in v2、§2.3 内に原文保持)

v1 §1.3 のオリジナル Q1-Q5 単系統 query は §2.3 内に転記済。v1.2 改訂で Q2 query が士業 + 業務代行業に拡張された patch も併せて保持。

#### v1.2 改訂前の Q2 (オリジナル、Style Guide v1.2 でも参照)

`Q2 | "AI" ("士業" OR "税理士" OR "社労士" OR "行政書士") -is:retweet lang:ja min_faves:30`

#### v1.2 改訂後の Q2 (Status: v2 で B5 として 1 セグメント化)

`Q2 | "AI" ("士業" OR "経理代行" OR "事務代行" OR "業務代行") -is:retweet lang:ja min_faves:30`

→ 士業を主軸ターゲットから外したため、Q2 を「士業 + 業務代行業」に拡張。中小経営者向けの "業務代行業" カテゴリ (経理代行 / 事務代行 / 業務代行) を併合して候補プールを広げる。

### 3.2 v1 §1.4 target_fit_score 単一スコア (Status: v2 §3 で 2 層化、§2.1 / §2.4 に原文保持)

### 3.3 v1 §2 永続化スキーマ (Phase 0 v2 用、Status: §2.5 内に原文保持)

### 3.4 v1 §3 取得後の分析プロセス (Status: §2.7 内に原文保持、v2 では明示節として再掲なし)

### 3.5 v1 §4 実 API call 実行手順 (Phase 0 v2 用、Status: §2.8 内に原文保持、Deprecated in v2)

### 3.6 v1 Q5 0 件 (海外英語圏) (Status: v2 で A5 として min_faves:50 緩和 + キーワード拡張)

v1 オリジナル Q5: `"AI automation" ("small business" OR "non-engineer" OR "non-coder") -is:retweet lang:en min_faves:100`

→ Phase 0 v2 実行結果は 0 tweets。v2 で A5 として再設計済 (§2.3 #A5 参照)。

詳細な原因仮説と再設計は [competitor-report 統合版](./competitor-report-all-versions.md) (旧 v2 §1.4 / 旧 v3 §1.1) ゼロ hit 分析を参照。

---

## 4. 数値・分類軸の進化マトリクス

*Version History*: 本マトリクスは統合版での新規追加 (cs:s1-66 に従い数値・分類軸の cross-version 比較表をまとめる)

### 4.1 query 数・構造の進化

| 概念 | v1 | v2 |
|---|---|---|
| 系統数 | **1 系統 (単系統)** | **2 系統 (publisher_discovery + audience_validation)** |
| query 数 | 5 (Q1-Q5) | 10 (A1-A5 + B1-B5) |
| 1 query あたり tweets | 100 | 100 |
| 合計 tweets | 500 | 1,000 |
| seed 起点 | persona (中小経営者・士業・コンサル + 業務代行業) | seed 24 アカ × top 20 投稿 = 480 投稿の頻出語抽出 (Claude 249 / Codex 114 / Obsidian 92) |
| seed hit rate (検証) | ~50% (cs:s3-64 step 1d で推定) | **17/24 = 70%** (実 API call で検証) |

### 4.2 query 内容の進化 (主要 query の対応関係)

| v1 Q# | v1 query 概要 | v2 対応 Q# | v2 改訂内容 |
|---|---|---|---|
| Q1 | 中小経営者 (lang:ja min_faves:50) | B1 (audience_validation) | キーワード追加 (1人社長/個人事業主/困っ/始め/どう/使え)、min_faves:10 緩和 |
| Q2 | 士業 + 業務代行業 (lang:ja min_faves:30、v1.2 patch 後) | B5 (士業) + B2 (コンサル/業務代行業) に分離 | 士業は B5 へ、業務代行業は B2 へ独立 |
| Q3 | 業務効率化 (lang:ja min_faves:50) | B3 | キーワード追加 (ChatGPT 活用/AI 導入)、min_faves:30 維持 |
| Q4 | Claude 経理/請求書/見積 (lang:ja min_faves:30) | B4 | キーワード追加 (Excel/スプレッドシート/自動/効率/GPT)、min_faves:20 緩和 |
| Q5 | AI automation 海外 (lang:en min_faves:100) | A5 | キーワード拡張 (Claude Code/Codex/Obsidian/AI agent + workflow/automation/tutorial/setup)、min_faves:50 緩和 |
| (なし) | — | A1 (Claude Code 活用発信者) | 新規追加 (publisher_discovery) |
| (なし) | — | A2 (Codex / CLI 系) | 新規追加 |
| (なし) | — | A3 (Obsidian × AI) | 新規追加 |
| (なし) | — | A4 (MCP / エージェント実装) | 新規追加 |

### 4.3 target_fit_score の進化

| 概念 | v1 | v2 |
|---|---|---|
| スコア構造 | **単一 score** | **2 層化 (publisher_score + audience_score)** |
| publisher_score | (なし) | (followers × engagement × 0.3) + (content_overlap × 0.4) + (recent_max_engagement × 0.2) + (publishing_frequency × 0.1) |
| audience_score | (なし) | (target_fit_bio × 0.5) + (target_fit_content × 0.5) |
| 採用閾値 | target_fit_score ≥ 0.5 | publisher_score ≥ 0.5 / audience_score ≥ 0.4 |
| bio 評価要素 | 中小/経営者/非エンジニア/1人社長/士業/業務効率化 + 0.3 | (B 系のみ) 中小/経営者/コンサル/非エンジニア/業務代行 × 0.5 |
| 投稿評価要素 | non_engineer_rate ≥ 0.10 + 0.3、業務仕組み化テーマ率 ≥ 0.30 + 0.2、オリジナル/業務実体験 ≥ 0.30 + 0.2 | (A 系) Claude/Codex/Obsidian/MCP/エージェント出現率 ≥ 0.2 + 0.4、自作 prompt/コード/GitHub 引用 ≥ 0.1 + 0.3、Discord/Anthropic 言及 ≥ 0.05 + 0.3 / (B 系) 困りごと語彙 (困った/初心者/どう使え/わからない) × 0.5 |

### 4.4 コスト・規模の進化

| 概念 | v1 (Phase 0 v2 見積) | v2 (Phase 0 v3 見積) |
|---|---|---|
| query 数 | 5 | 10 |
| 合計 tweets | 500 (query) + 2,000 (direct fetch) = 2,500 | 1,000 (query 単独) |
| 推定コスト (USD) | $0.375 (¥60) | $0.30 (¥48) |
| 推定コスト (JPY) | ¥60 | ¥24 (上限 ¥27) |
| 実コスト (検証) | ¥54 (Phase 0 v2 実 call) | **¥23** ($0.148、Phase 0 v3 実 call) |
| 発掘 unique handles | 244 (Q1-Q5) | 455 (publisher 215 + audience 275、重複あり) |

### 4.5 永続化スキーマの進化

| 概念 | v1 | v2 |
|---|---|---|
| ディレクトリ構造 | flat (bursts-q1〜q5.json + posts/) | subdir 分離 (publisher-discovery/ + audience-validation/) |
| query-meta.json schema | session_branch / direct_handle_fetches | category field (publisher_discovery / audience_validation) 追加 |
| 再現性 inputs-manifest.json | (なし) | **新規追加 (H-9 対応)**: 各 query で何 tweet を後段分析に使ったか (tweet ids) |
| candidates 出力 | candidates-from-search.json | candidates-merged.json (A 系 + B 系統合) |

### 4.6 士業の位置づけの進化 (cs:s3-65 cascade update)

| 概念 | v1 (Initial) | v1.2 patch (Style Guide v1.2 連動) | v2 (Current) |
|---|---|---|---|
| 士業の位置 | Q2 = 士業 4 語 (主軸 target の一部) | Q2 = 士業 + 業務代行業 (混合) | B5 = 士業 5 語 (industry_sop の 1 業種セグメント、audience_validation 用) |
| min_faves | 30 | 30 | 10 (緩和) |
| 主軸 target との関係 | 主軸 target に含まれる | 主軸 target から外す patch 進行中 | **主軸 target 外、industry_sop の 1 業種セグメント** |

---

## 5. 統合プロセスメモ

### 5.1 観察された進化パターン

- **v1 → v2 の最大変更**: query を 1 系統 5 本 → 2 系統 10 本に再構築。v1 では publisher discovery (発信者発掘) と target hit 検証 (audience validation) が混在していたため、seed 24 アカが query に hit せず、target_fit_score 計算で発掘プールが歪んだ。v2 で 2 系統に分離し、seed 24 アカの hit rate を 70% まで引き上げ。
- **seed 逆算根拠の導入** (v2 §0.2): v1 では persona ベース (中小経営者・士業・コンサル) で query を設計したが、seed 20 アカが現実には Claude/Codex/Obsidian 軸で発信していたため hit しなかった。v2 では実 raw 投稿 480 件の頻出語抽出を逆算根拠として A 系 query を設計し直し、seed-query 整合性を確保。

### 5.2 silent reduction 検出

v2 では v1 から「Q2 → B5 (士業 1 セグメント化)」「Q5 → A5 (min_faves:100 → 50 緩和)」「Q1 → B1 (min_faves:50 → 10 緩和)」など複数の閾値緩和がある。本統合版では各 query の min_faves 値を v1 / v2 で並列保持し、緩和方向の変更であることを明示 (§2.3 / §4.2 参照)。

### 5.3 数値定義 cross-document 整合性 (cs:s1-66 適用)

| 概念 | v1 | v2 | Style Guide v1.3 / v1.4 | Competitor Report v3 |
|---|---|---|---|---|
| query 数 | 5 (Q1-Q5) | 10 (A 系 5 + B 系 5) | 同 v2 (§2.9) | 同 v2 (§3.1 / §3.2) |
| seed hit rate | (検証なし) | 17/24 = 70% | 同 v2 (§2.9) | 同 v2 (§1.1) |
| target_fit_score | 単一 score | 2 層化 (publisher_score + audience_score) | 同 v2 (§2.9) | (記述なし) |
| 推定コスト (JPY) | ¥60 (v1 query 単独 ¥12) | ¥24 | (記述なし) | 実コスト ¥23 (§1) |

→ v2 / Style Guide v1.3 / Competitor Report v3 で完全一致。

### 5.4 Phase 1 着手時の Single Source

- **Query Design**: 本統合版 (= [`query-design-all-versions.md`](./query-design-all-versions.md)) を Single Source。原版 v2 (Phase 0 v3 publisher 5 + audience 5 = 10 query) の確定値を保持
- **Style Guide**: [`style-guide-all-versions.md`](./style-guide-all-versions.md) (原 v1.4 が Current SSOT)
- **Competitor Report**: [`competitor-report-all-versions.md`](./competitor-report-all-versions.md) (原 v3 が Current SSOT)

### 5.5 統合作業中に発見した文書間矛盾 (本ドキュメント作成時)

- **v1.2 patch の解釈**: v1 ファイル §1.3 では Q2 を「士業 + 業務代行業」と表記しているが、v1.2 改訂前のオリジナル v1 では士業 4 語のみだった。Style Guide v1.2 連動 patch が v1 ファイル内に inline 適用されている (本ドキュメントでは Style Guide v1.2 の §1.1 / §3.1 で旧 / 新を比較として保持)。
- **Q5 と A5 の関係**: v1 Q5 (lang:en min_faves:100) は 0 hits だった。v2 A5 で改訂したが、Phase 0 v3 実行結果でも残り 30% 海外英語圏 (Atenov_D / Fluyeporlaweb / ai_explorer25 / csaba_kissi / ethancoder0 / jason_coder0) は引き続き 0 hit ([`competitor-report-all-versions.md`](./competitor-report-all-versions.md) (旧 v3) §1.1 参照)。Phase 0 v4 で更に緩和予定。
