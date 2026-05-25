# Phase 0 v2 競合調査 — twitterapi.io query 設計書

> Phase 0 (2026-05-24) で query 文字列が永続化されていない欠陥を修正。  
> Phase 0 v2 は **query 永続化 + ターゲット適合フィルタつき** で再設計。  
> 実 API call は本ドキュメント merge 後、別セッションで実行。

---

## 1. 母集団取得方針

### 1.1 既存 4 アカ (data 流用、追加 call 不要)

`git show task/260524-jp-ai-publishers-research:outputs/publishing/research/2026-05-24-jp-ai-publishers/raw/posts/<handle>.json` で 90 日 raw を取得可能。

- Shimayus / SuguruKun_ai / masahirochaen / ClaudeCode_love

→ Phase 0 v2 で **追加 API call なし**、既存 data に新規 9 項目 (発信ネタ仕入れ方法分析) を後付けで実行。

### 1.2 ユーザー追加 20 アカ (新規取得、direct fetch)

`raw/publishing/inspirations/2026-05-26-reference-accounts.md` の 20 アカに対し、**handle 直接指定で 90 日 raw を取得**:

```
twitterapi.io advanced_search query:
  query: "from:<handle> since_time:<90d_ago_unix> until_time:<now_unix>"
  page_limit: 100 (上限 100 tweets/アカ)
  pacing: 2 sec/call

20 アカ × 100 tweets = 2,000 tweets
推定コスト: $0.30 = ¥47
```

### 1.3 追加発掘 query (5 個、ターゲット適合フィルタつき)

国内・海外で**非エンジニア経営者向け** AI 発信者を発掘するための query 5 個:

| Q# | query (例) | 想定 hit 種類 |
|---|---|---|
| Q1 | `"AI" ("中小" OR "経営者" OR "1人社長") -is:retweet lang:ja min_faves:50` | 中小経営者向け AI 発信 |
| Q2 | `"AI" ("士業" OR "税理士" OR "社労士" OR "行政書士") -is:retweet lang:ja min_faves:30` | 士業 × AI 発信 |
| Q3 | `("業務効率化" OR "業務自動化") "AI" -is:retweet lang:ja min_faves:50` | 業務効率化文脈の AI 発信 |
| Q4 | `"Claude" ("経理" OR "請求書" OR "見積") -is:retweet lang:ja min_faves:30` | 経理 × Claude 実践 |
| Q5 | `"AI automation" ("small business" OR "non-engineer" OR "non-coder") -is:retweet lang:en min_faves:100` | 海外 非エンジニア向け AI 自動化発信 |

各 query × 100 tweets = 500 tweets、推定コスト $0.075 = ¥12。

### 1.4 候補スコアリング (Phase 0 v2 改訂)

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

---

## 2. 永続化スキーマ (再現性確保)

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

### query-meta.json schema

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

---

## 3. 取得後の分析プロセス

### 3.1 50 項目集計 (既存)

`apps/x-account-system/scripts/relabel-tweets.py --posts-dir <new_dir>` を 24 アカで再実行。

### 3.2 9 項目新規分析 (発信ネタ仕入れ方法)

Sonnet 4.6 で各アカ top 20 投稿 × 24 アカ = 480 投稿を質的分析。詳細は `source-ingestion-analysis-template.md`。

### 3.3 引き出しストック生成 (所感骨格 + Hook + 画像 + 動画)

各アカの上位投稿パターンを 5-10 個ずつ抽出 → `opinion-patterns.md` / `hook-patterns.md` / `visual-patterns.md` にカテゴリ別ストック。

---

## 4. 実 API call 実行手順 (次セッションで)

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

---

## 5. 完了判定

- [ ] 本ドキュメント merge (v10.3 設計の一部として)
- [ ] `.claude/scripts/twitterapi_io.py` v0.2.0 化
- [ ] `fetch-phase0-v2.py` 実装
- [ ] dry run でコスト試算が ¥60 ±20% 内
- [ ] 本実行 → query-meta.json + 24 アカ posts を raw 永続化
- [ ] 50 + 9 項目集計 + opinion-patterns.md / hook-patterns.md / visual-patterns.md 出力
- [ ] `competitor-report-v2.md` 起草 → Style Guide v1.1 反映
- [ ] Phase 1 着手 (HUMAN_TASKS H-1〜H-5 + H-8 + H-10 完了後)
