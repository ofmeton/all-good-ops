# Phase 0 v3 競合調査 — query 2 系統分離設計書 (v2.0)

> Codex round 1 critical C-1 / C-2 反映版。  
> Q1-Q5 の混線 (発信者発掘 + target hit 検証) を 2 系統 10 query に分離。  
> 20 アカ raw 頻出語抽出結果 (Claude 249 / Codex 114 / Obsidian 92 件) を逆算根拠に。

---

## 0. 設計思想

### 0.1 2 系統分離

| 系統 | 目的 | 母集団 | 採用基準 |
|---|---|---|---|
| **A: publisher_discovery** | seed 20 アカと同種の AI 発信者を追加発掘 | seed コーパスの中核語彙 (Claude/Codex/Obsidian/Agent/MCP/プロンプト) | 投稿本文・リンク先・リポジトリ言及で target_fit を測る |
| **B: audience_validation** | target (非エンジニア経営者・コンサル) が反応/発言する語彙領域を把握 | 中小/経営者/業務代行/業務効率化系 | bio + 投稿で target_fit を測る (発掘ではなく**読者層 hit 検証**) |

→ A 系で発掘した発信者を seed 化、B 系で読者層の言葉を transfer 学習に使う。

### 0.2 seed 逆算根拠

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

## 1. A 系: publisher_discovery (5 query)

### A1: Claude Code 活用発信者

```
"Claude Code" (使い方 OR 設定 OR 活用 OR 導入 OR 解説) -is:retweet lang:ja min_faves:30
```

期待 hit (seed 20 アカ): ClaudeCode_UT / claudecode_lab / ClaudeCode_love / cyrilXBT / Codestudiopjbk / commte / Fluyeporlaweb など

### A2: Codex / CLI 系発信者

```
("Codex" OR "codex cli" OR "@openai/codex") (MCP OR エージェント OR 自動化 OR コマンド) -is:retweet lang:ja min_faves:30
```

期待 hit: Codestudiopjbk / masahirochaen / cyrilXBT / commte など

### A3: Obsidian × AI 発信者

```
("Obsidian" OR "#Obsidian") (Claude OR GPT OR AI OR プロンプト) (運用 OR ワークフロー OR 保存 OR Vault) -is:retweet lang:ja min_faves:20
```

期待 hit: obsidianstudio9 / ObsidianOtaku / Shimayus など

### A4: MCP / エージェント実装発信者

```
("MCP" OR "Model Context Protocol" OR "Claude Desktop" OR "AIエージェント") (連携 OR ツール OR 実装 OR 自作) -is:retweet lang:ja min_faves:30
```

期待 hit: Shimayus / so_ainsight / SuguruKun_ai / mmmiyama_D など

### A5: 海外英語圏 AI 発信者 (Q5 改訂)

```
("Claude Code" OR "Codex" OR "Obsidian" OR "AI agent") (workflow OR automation OR tutorial OR setup) -is:retweet lang:en min_faves:50
```

期待 hit: jason_coder0 / heynavtoor / ethancoder0 / cyrilXBT / csaba_kissi / Fluyeporlaweb など (旧 Q5 の min_faves:100 と narrow 句を撤廃)

---

## 2. B 系: audience_validation (5 query)

### B1: 中小経営者の AI 困りごと言及

```
"AI" ("中小" OR "経営者" OR "1人社長" OR "個人事業主") (困っ OR 始め OR どう OR 使え) -is:retweet lang:ja min_faves:10
```

target が自分の口で AI 課題を語っている tweet を hit。読者層の困りごと語彙抽出用。

### B2: コンサル / 業務代行業の AI 活用

```
"AI" ("コンサル" OR "業務代行" OR "経理代行" OR "事務代行") (実装 OR 効率化 OR 活用) -is:retweet lang:ja min_faves:10
```

target の隣接業種 (コンサル + 業務代行業) の AI 活用言及。

### B3: 業務効率化 / 業務自動化 (非技術文脈)

```
("業務効率化" OR "業務自動化" OR "ChatGPT 活用" OR "AI 導入") -is:retweet lang:ja min_faves:30
```

旧 Q3 を承継。target が検索する語彙 = 読者層 hit。

### B4: industry_sop 候補発掘 (経理 / 請求書 / 見積)

```
"AI" ("経理" OR "請求書" OR "見積" OR "Excel" OR "スプレッドシート") (自動 OR 効率 OR Claude OR GPT) -is:retweet lang:ja min_faves:20
```

industry_sop コンテンツの素材源 (1 業種セグメントとして士業も含む)

### B5: 士業 × AI (industry_sop 1 セグメント)

```
"AI" ("士業" OR "税理士" OR "社労士" OR "行政書士" OR "弁護士") (業務 OR 自動化 OR DX) -is:retweet lang:ja min_faves:10
```

旧 Q2 を承継。士業は主軸 target ではなく **industry_sop の 1 業種セグメント**として残置 (cs:p3-fcbb 承認必須 4 種「Style Guide版変更」要件は本 PR で v1.3 承認に合算)。

---

## 3. target_fit_score 2 層化 (H-7 対応)

### A 系 (publisher_discovery) スコア

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

### B 系 (audience_validation) スコア

```
audience_score = (target_fit_bio × 0.5)   ← bio に中小/経営者/コンサル/非エンジニア/業務代行
               + (target_fit_content × 0.5)   ← 投稿本文に困りごと語彙 (困った/初心者/どう使え/わからない)

audience_score ≥ 0.4 で transfer 用語彙抽出対象。発信者として採用するわけではない (= 読者層分析用)
```

---

## 4. 永続化 (再現性確保)

### 4.1 raw 構造 (v2.0)

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

### 4.2 query-meta.json schema (v2.0)

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

## 5. 想定コスト

| 項目 | tweets | cost |
|---|---|---|
| A 系 5 query × 100 tweets | 500 | $0.075 = ¥12 |
| B 系 5 query × 100 tweets | 500 | $0.075 = ¥12 |
| user_info (A 系発掘上位 30 アカ) | — | ¥3 |
| **合計** | **1,000** | **¥24** (実 dry-run 試算で確定。Codex round 2 C-4 整合) |

旧 Phase 0 v2 (¥54) の半額以下。発掘範囲は 2 倍。

---

## 6. 実行手順

```bash
# 1. dry-run
python3 fetch-phase0-v3.py --dry-run

# 2. execute (--confirm-cost-jpy は dry-run の出力と厳密一致を要求)
python3 fetch-phase0-v3.py --execute --confirm-cost-jpy=24

# 3. 永続化結果を git add
git add raw/publishing/research/2026-05-26-jp-ai-publishers-v3/raw/
```

---

## 7. 旧 Phase 0 v2 との関係

- 旧 Q1-Q5 raw (`bursts-q1〜q5.json`) は v3 で **置換** されない (歴史として残置)
- 24 アカ raw posts (`posts/`, `posts-existing-4/`) は v3 でも継続使用 (再 fetch しない)
- v3 で新規発掘した候補 (publisher_score ≥ 0.5) は Phase 0 v4 (将来) で raw 取得対象

---

## 8. 完了判定

- [ ] A 系 / B 系で 20 アカ最低 12 / 24 を hit (seed 逆算検証)
- [ ] candidates-merged.json で publisher_score ≥ 0.5 の新規 5+ アカ発掘
- [ ] inputs-manifest.json で再現性確保
- [ ] competitor-report-v3 / style-guide-v1.3 への transfer 完了
