# Initial Values Design — x-account-design Optimizer & Writer & Strategy

> 競合 65 項目分析 + 34 アカ empirical stats から逆算した、Optimizer / Writer / 戦略テンプレート集の初期値設計書 (v1, 2026-05-27)

---

## 0. このドキュメントについて

### 目的

x-account-design の Optimizer (改善対象 8 パラメータ)・Writer (X / Instagram / note の全領域)・戦略テンプレート集 (集客→収益化導線、ファネル、フォロワー言語ライブラリ、pinned / bio URL / メンバーシップ配置、媒体間連動) の **初期値を競合分析から逆算で設計する**。

これは「先入観の skeleton を持ち込まず、競合 65 項目分析から逆算する」という方針 (cs:s3-54 / cs:s1-54) の実装にあたる。Optimizer は **bootstrap (初期値)** + **observation (実投稿の反応)** + **update (Thompson Sampling 等で逐次更新)** という構造で動くが、bootstrap が雑だと最初の数十投稿の試行が無駄になる。本書は「初期値そのものが競合分析でグラウンディングされている」状態を作る。

### 母集団

**34 アカ最終リスト** (信頼 4 + 追加 20 + publisher 上位 10)。

- うち **24 アカは 65 項目 Sonnet 4.6 分析済** (1,560 cells)
- publisher 10 アカは **empirical-stats のみ** で次フェーズで Sonnet 戦略分析を実施予定

### 分析手法

| データ | 件数 | 手法 | source |
|---|---|---|---|
| Sonnet 4.6 65 項目分析 | 24 アカ × 65 items = 1,560 cells | Claude Opus 4.6 (Sonnet 系列) で構造分析 | `65-item-analysis.jsonl` |
| Empirical structure stats | 34 アカ × 25 cols | Python aggregate (tweet 数 3,238) | `empirical-stats.csv` |
| Article 本文 | 37 件 | twitterapi.io `/twitter/article` | `articles/*.json` |
| User info (bio/URL/metrics) | 34 件 | twitterapi.io `/twitter/user/info` | `users/*.json` |
| Pinned tweet 本文 | 30 件 | twitterapi.io `/twitter/tweets` (id 指定) | `pinned/*.json` |
| Publisher top10 raw | 10 アカ × ~100 tweet | twitterapi.io `/twitter/tweet/advanced_search` | `posts-publisher-top10/*.json` |

### コスト実績

| Phase | コスト | 内訳 |
|---|---|---|
| 2026-05-27 twitterapi.io 追加取得 (Users + Pinned + Article + Publisher 10) | ¥24 | 151 calls × $0.001/call 換算 ≒ $0.1533 |
| Sonnet 65 項目分析 (24 アカ) | 前 sub-agent 実績値で集計 (本 sub-agent では Sonnet 呼び出しなし) | `[要検証]` 引継ぎ報告から確認 |
| **本 sub-agent (initial-values-design 作成)** | ¥0 | Read + Write のみ、API call なし |

### 版数

- **v1**: 2026-05-27 初版 (本書)
- 改訂タイミング: Optimizer Phase 1 終了 (30 投稿) 時点で実測値と initial value の乖離レビュー、その後 90 投稿時点で再学習

### 上流ドキュメントとの関係

| 文書 | 関係 |
|---|---|
| `main-design-all-versions.md` §7.2.1 | Optimizer 改善対象 8 パラメータ定義 (本書 §3 の対象) |
| `style-guide-all-versions.md` §3 | X 投稿の hard rule (本書 §4.1 が遵守) |
| `competitor-report-all-versions.md` | 競合分析の方法論 (本書 §1, §6 の上流) |
| `query-design-all-versions.md` | 母集団選定の query 設計 (本書 §1 の上流) |
| `65-item-analysis.jsonl` | 24 records の生データ (本書全節の根拠) |
| `empirical-stats.csv` | 34 records の構造統計 (本書 §2, §6 の根拠) |

---

## 1. 母集団 (34 アカ) + データ source

### 1.1 構成

| 区分 | 件数 | 選定根拠 | Sonnet 65 項目 | empirical stats |
|---|---|---|---|---|
| 信頼 4 (人間 manual cohort) | 4 | 人間が手動で「参考になる」と確定 | ✅ | ✅ |
| 追加 20 (Phase 0 v2 burst-detected) | 20 | twitterapi.io 90 日窓で burst パターン検出 | ✅ | ✅ |
| publisher 10 (Phase 0 v3) | 10 | publisher top target_fit_score 5 query 上位 | ⏳ (次フェーズ) | ✅ |
| **合計** | **34** | | **24** | **34** |

### 1.2 信頼 4 (cohort)

人間が「自分のロールモデル候補」として手動評価で確定。以下はすべて Claude Code / AI 活用文脈で発信。

- `@Shimayus` — 自動化実装 26 個・ハッカソン優勝・医師免許の権威付け
- `@SuguruKun_ai` — AI 研修事業 (105K followers)、Claude Code 個別指導
- `@masahirochaen` — 194K followers、AI スクール・Google I/O 取材
- `@ClaudeCode_love` — Claude Code × Obsidian 組織導入企業 (31K)

### 1.3 追加 20 (Phase 0 v2 burst-detected)

twitterapi.io advanced_search で query: `Claude Code OR Anthropic` 系を 90 日窓で実行し、impression bursts を検出した上位 20 件。

ハンドル一覧:

```
@Atenov_D, @ClaudeCode_UT, @Codestudiopjbk, @Fluyeporlaweb,
@MakeAI_CEO, @ObsidianOtaku, @ai_explorer25, @claudecode_lab,
@commte, @csaba_kissi, @cyrilXBT, @daifukujinji,
@ethancoder0, @exploraX_, @heynavtoor, @jason_coder0,
@mmmiyama_D, @obsidianstudio9, @so_ainsight, @tetumemo
```

### 1.4 追加 10 (publisher top target_fit_score)

Phase 0 v3 で「publisher 5 query × target_fit_score 上位」を抽出。audience query 5 query は除外 (engagement quality と bio non-engineer signal weight を最大化するための設計上の選択)。

| rank | handle | followers | avg_engagement | target_fit_score |
|---|---|---|---|---|
| 1 | @ebikani_hasami | 838 | 3,881 | 463.13 |
| 2 | @saeroyi_ican | 1,876 | 8,542 | 455.33 |
| 3 | @sekine_1234 | 846 | 3,528 | 417.02 |
| 4 | @yura_ai123 | 1,191 | 4,785 | 401.76 |
| 5 | @Kh_Yabu | 1,159 | 3,613 | 311.73 |
| 6 | @carverfomo | 16,136 | 28,188 | 174.69 |
| 7 | @kenfjt | 2,131 | 2,148 | 100.80 |
| 8 | @TensyokuRmla | 575 | 543.5 | 94.52 |
| 9 | @hqmank | 4,689 | 4,132 | 88.12 |
| 10 | @worldnetworkjp | 1,757 | 1,356 | 77.18 |

target_fit_score 設計:

```
target_fit_score = (avg_engagement / max(followers, 100)) * 100  # engagement quality
                 + non_eng_fit * 3                                # bio non-engineer signal weight

非エンジニア keywords (bio): 経営 / 中小 / 業務 / 自動化 / 効率化 / 業界 / 現場 / 実務 / 活用 / 導入 / 解説
エンジニア keywords (bio): エンジニア / プログラマ / Developer / プログラミング / コード / 実装
non_eng_fit = #(非エンジニア kw) - #(エンジニア kw), clamped >= 0
```

### 1.5 データ source (file 一覧)

| 種別 | path | 件数 |
|---|---|---|
| 既 24 アカ tweet raw | `raw/publishing/research/2026-05-26-jp-ai-publishers-v2/raw/posts*/` | 既存 (~2,400 tweet) |
| publisher 10 tweet raw | `raw/publishing/research/2026-05-27-initial-values/posts-publisher-top10/` | ~800 tweet |
| 全 34 アカ user_info | `raw/publishing/research/2026-05-27-initial-values/users/` | 34 |
| pinned tweet 本文 | `raw/publishing/research/2026-05-27-initial-values/pinned/` | 30 (4 件は no pinned) |
| Article 本文 | `raw/publishing/research/2026-05-27-initial-values/articles/` | 37 |
| query-meta (reproducibility) | `raw/publishing/research/2026-05-27-initial-values/query-meta.json` | 151 calls record |
| consolidated dataset | `raw/publishing/research/2026-05-27-initial-values/consolidated-dataset.json` | まとめ |

### 1.6 query reproducibility (cs:s1-51 遵守)

`query-meta.json` に以下を記録済:

- すべての API call の path / params / cursor_in / cursor_out / has_next_page / tweets_returned
- session_date / wrapper_version / total_calls / total_tweets_returned / estimated_cost_usd
- 主要 query 例:
  - `from:<handle> since:2026-02-26 queryType:Latest` (publisher 10 で各 ~100 tweet 取得、since は 90 日前)
  - `/twitter/user/info?userName=<handle>` (34 アカ)
  - `/twitter/tweets?tweet_ids=<pinned_tweet_id>` (30 件)
  - `/twitter/article?tweet_id=<article_tweet_id>` (37 件)

---

## 2. 母集団の特性サマリ

### 2.1 X 投稿フォーマット分布 (empirical 34 アカ)

**source**: `empirical-stats.csv` (3,238 tweet 集計)

| フォーマット | min | Q1 | median | Q3 | max | 全体平均 (※) |
|---|---|---|---|---|---|---|
| 短文 (<140 chars) | 0% | 30% | **50.1%** | 81.1% | 98% | 49% |
| 中文 (140-279) | 0% | 9.2% | 18.0% | 33% | 64% | 21% |
| 長文 (280-699) | 0% | 2.0% | 8.8% | 26% | 68.9% | 16% |
| 超長文 (≥700) | 0% | 0.0% | 2.0% | 4.3% | 99% | 9% |
| Article | 0% | 0.0% | 0.0% | 1.2% | 11.5% | 1.5% |
| **avg_chars (1 投稿)** | 47 | 89 | **180** | 282 | 2,301 | — |

(※) 母集団全体の平均 (mean) ではなく中央値 (median) を基準にしている。`carverfomo` の avg_chars=2,301 のような outlier に引きずられないため。

#### Sonnet 24 アカ分析との対比 (構造ベース)

| フォーマット | Sonnet 24 median | empirical 34 median | 差分 |
|---|---|---|---|
| 短文 (<140) | 12% | 50.1% | empirical >> Sonnet (Sonnet は意味解析、empirical は単純文字数) |
| 中文 (140-279) | 12.5% | 18.0% | ほぼ一致 |
| 長文 (280-699) | 35.5% | 8.8% | Sonnet >> empirical (Sonnet は thread 累積も含む？) |
| 超長文 (≥700) | 27% | 2.0% | Sonnet >> empirical (同上) |
| Article | 0% | 0% | 一致 |
| **avg_chars** | 380 | 180 | Sonnet 系列は thread 全体を 1 単位、empirical は tweet 単位 |

**重要な解釈**: empirical は **1 ツイート単位**、Sonnet 系列は **意味のかたまり (thread 含む)** を 1 単位として測っている。Writer 設計時は、**Optimizer の format 軸は empirical ベース** (短文 50%/中文 18%/長文 9%/超長文 2%/article 0%) を採用し、**thread / 引用 RT chain は別軸 (H_x_format)** で扱う。

### 2.2 フォロワー分布 (34 アカ)

| 指標 | 値 |
|---|---|
| min | 574 (@TensyokuRmla) |
| Q1 | 2,133 |
| median | 13,782 |
| Q3 | 31,071 |
| max | 255,118 (@csaba_kissi) |

ofmeton 開始時 (~50 followers 想定) は **Q1 以下のレンジ**。比較対象として「2,000 followers 帯」(`@ebikani_hasami=838` / `@yura_ai123=1,191` / `@TensyokuRmla=575`) の戦略を重視する。

### 2.3 投稿時間帯分布 (empirical 34 アカ)

| 時間帯 | min | Q1 | median | Q3 | max |
|---|---|---|---|---|---|
| morning (5-11) | 0% | 7% | **20.8%** | 33% | 62% |
| noon (11-14) | 0% | 6% | 16.5% | 25% | 49% |
| afternoon (14-17) | 0% | 15% | **25.5%** | 33% | 92% |
| evening (17-21) | 2% | 14% | **21.0%** | 31% | 69% |
| midnight (21-5) | 0% | 0% | 5.5% | 18% | 52% |

primary_time_band 分布 (34 アカ):

```
afternoon: 13 (38%)
morning:    8 (24%)
midnight:   5 (15%)
evening:    5 (15%)
noon:       3 ( 9%)
```

**実用解釈**: 母集団の 6 割が `afternoon` または `morning` を primary としている。`midnight` 採用者は 15% (海外 EN 系 + 一部の night-bird、@cyrilXBT / @heynavtoor 等)。

### 2.4 engagement 関連指標

| 指標 (34 アカ empirical) | min | Q1 | median | Q3 | max |
|---|---|---|---|---|---|
| image_rate (画像添付率) | 0% | 2% | 12.5% | 32.3% | 100% |
| video_rate (動画添付率) | 0% | 0% | 1.4% | 16.3% | 97% |
| reply_rate (リプ起源率) | 0% | 33% | 71.9% | 90% | 98.4% |
| quote_rate (引用 RT 率) | 0% | 1.6% | 8.0% | 29% | 95% |
| self_thread_rate (自己 thread 率) | 0% | 1.6% | 7.5% | 23% | 77% |
| url_rate (URL 含有率) | 1.1% | 8% | 21.5% | 53% | 87% |
| emoji_per_post | 0 | 0.05 | 0.22 | 0.61 | 3.17 |
| hashtag_per_post | 0 | 0 | **0** | 0 | 0.18 |
| mention_per_post | 0 | 0.11 | 0.49 | 0.81 | 1.87 |
| weekend_rate | 0% | 19% | 25% | 40% | 64% |

**重要な finding**:

- **hashtag は median 0** — 34 アカ中 過半が hashtag を全く使わない (`#` をつけると engagement が落ちる現象が日本 X で観測されている、と整合的)
- **reply_rate median 72%** — これは「単発投稿」「投稿」と「リプライ起源 (in_reply_to)」を含む数字。@Atenov_D が 98% で最頻のリプライ参加型、@Codestudiopjbk が 7% で最も独立投稿型
- **video 採用率は中央値 1.4%** — 多数派は静止画ベース。動画特化は @ClaudeCode_UT (65%) / @carverfomo (97%) / @ObsidianOtaku (52%) など少数派
- **weekend_rate median 25%** — つまり「平日 5 日 + 週末 2 日」を均等配分すれば weekend_rate=28.6% になるが、median は 25% で「平日寄り」運用が主流

---

## 3. Optimizer 改善対象 8 パラメータ初期値 (A〜H Sonnet 24 アカ由来)

> 上流: `main-design-all-versions.md §7.2.1` で 8 パラメータ定義済。本節は競合分析からの初期値 (bootstrap) を確定する。

### 3.1 投稿時間帯 (E_temporal) — 初期値 + Thompson Sampling 事前分布

**bootstrap 採用値** (ofmeton Phase 1 初期):

| 時間帯 | 採用比率 | Thompson Sampling α/β (prior) | 根拠 |
|---|---|---|---|
| morning (5-11) | **30%** | α=3, β=7 | 34 median 20.8% + 競合 morning primary 24% を引き上げ。日本人非エンジニア決裁者の朝の情報収集タイム |
| noon (11-14) | 15% | α=1.5, β=8.5 | empirical median 16.5%。昼休み |
| afternoon (14-17) | **30%** | α=3, β=7 | empirical median 25.5% + 競合 38% が primary。業務中盤 |
| evening (17-21) | **20%** | α=2, β=8 | empirical median 21%。仕事終わり |
| midnight (21-5) | 5% | α=0.5, β=9.5 | empirical median 5.5%。X 海外 EN 系のみ多用するため日本 ofmeton では低 |

合計 = 100%。

**bootstrap 設計の意図**:

- ofmeton は「非エンジニア経営者・士業」狙い → 業務時間帯 (morning + afternoon) を重視
- midnight は competitor のうち海外 EN 系 + 個人趣味派 (@cyrilXBT 42% / @heynavtoor 45% / @Atenov_D 52%) のみが採用しており、日本 BtoB ofmeton のターゲット行動と整合性低
- [推定] noon の noon-primary 採用者は 3/34 = 9% でマイノリティだが、「ランチ間に X を見る」層を捕捉するため 15% は確保 (= ターゲット行動推定、Phase 1 後半に non_public_metrics で要検証)

**Optimizer の動作**:

```
Reward 設計: 各時間帯で投稿 × Z = (impressions or url_link_clicks) を観測
Thompson Sampling: time_band_i ~ Beta(α_i + success_i, β_i + failure_i)
Phase 1 で 30 tweet 投稿 → 各 band で平均 6 tweet → posterior 更新後に分布見直し
```

### 3.2 Hook 配分 (G_hook) — 7 種 + ofmeton 差別化レバー

**Sonnet 24 アカ集計**:

| Hook 種別 | min | Q1 | median | Q3 | max | 競合 median |
|---|---|---|---|---|---|---|
| number_lead (数字フック) | 4% | 20% | 27.5% | 35% | 65% | **27.5%** |
| negation_lead (否定形「〇〇しない」) | 0% | 4% | 4.5% | 5% | 15% | 4.5% |
| question_lead (問いかけ) | 4% | 5% | 8% | 10% | 20% | 8% |
| emotion_lead (感情語) | 4% | 20% | 45% | 65% | 90% | **45%** |
| authority_lead (権威付け) | 4% | 15% | 22% | 39% | 70% | 22% |
| promise_lead (約束) | 4% | 20% | 25% | 35% | 50% | 25% |
| failure_story (失敗談) | 0% | 4% | **5%** | 8% | 20% | **5%** (空白) |

**ofmeton 採用初期値** (verified failure_story を最大差別化レバーに、比率 KPI ではなく **質と verified 数**で差別化):

| Hook 種別 | 採用率 | 競合 median 比 | 差別化意図 |
|---|---|---|---|
| number_lead | **25%** | 91% (近似) | 競合並み。「3 つの方法」「5 分で」等は非エンジニア層にも刺さるため維持 |
| negation_lead | 5% | 111% | 競合並み |
| question_lead | 10% | 125% | 競合より若干上。決裁者層は「あなたの会社、まだ手作業？」型の問いかけに反応 |
| emotion_lead | **15%** | 33% | **意図的に下げる** (競合 45% は「えぐい」「ガチで神」hype 過多で AI 感漂う) |
| authority_lead | **10%** | 45% | **下げる** (Anthropic CEO / Karpathy 引用は競合で多用、ofmeton は実体験ベース) |
| promise_lead | 15% | 60% | 下げる ([誇大広告風減らす]) |
| **failure_story (verified)** | **月 ≤ 4 投稿 上限** (比率 KPI 撤回) | — | **★最大差別化レバー** (供給制約由来 / 質で差別化、main-design v10.3 §2.4 + style-guide v1.3 §2.2 SSOT) |
| その他 hook (合計) | 20% | — | failure_story 月 ≤ 4 を確保した上で残り枠を充当 |

合計 = 100% (number 25% + negation 5% + question 10% + emotion 15% + authority 10% + promise 15% + その他 20% = 100%、failure_story は **比率に乗らない上限制約**)。

**重要 — 比率 KPI 撤回 (v10.3 SSOT 整合)**:

- 旧設計 (v9.2 / 旧本書 v0) では `failure_story 20%` を比率 KPI で死守していたが、main-design v10.3 §2.4 / style-guide v1.3 §2.2 で **比率 KPI 撤回 → verified_failure_story 月 ≤ 4 投稿 上限** に変更 (C-13 fail-rate threshold 反転、cs:p3-5ed8 の補完作業由来)
- 理由 (style-guide v1.3 §2.2 供給制約より引用): 「実際の失敗事実 (案件 commit log / 案件メモ / 音声メモから) + 公開許諾 gate 通過 + DLP redaction 適用済 + 業法ガード OK」を満たす failure_story は実運用で月 4 本程度が上限、無理に 6 本/月 (= 20%) で出すと verification 担保が崩れる
- 差別化は **比率ではなく `verified` の質**で取る (= 嘘失敗・捏造を防ぎ、誠実な専門家ポジションを担保)
- Phase 1 目標: verified_failure_story 月 4 本確保。月によって 0-4 本で変動、月 4 本を出せない月は first_hand × industry_sop / before_after で代替
- 比率は **結果値** (運用後に集計、初期値で固定しない)

**failure_story の競合分析根拠**:

competitor で failure_story を多用しているのは `@mmmiyama_D (20%)` のみで、彼女は「Antigravity 2.0 大惨事」「トラブル事件 + 解決策まとめ」を主軸にしている。それ以外の 23/24 アカは 10% 以下。

**ofmeton の failure_story 採用例パターン**:

1. 「Claude Code に確定申告コードを書かせて、計算式ミスで税理士に怒られた話」
2. 「Anthropic API のレート制限で、本番リリース当日に止まった話」
3. 「Skill 設計ミスで、Sonnet が永遠に同じ作業を繰り返した夜」

→ failure_story が刺さる理由 **[推定 / Phase 1 で要検証]**: ターゲット (非エンジニア経営者) は「AI 導入で失敗したくない」恐怖が大きいと推定 (cs:s3-72 原典 verify 不可、競合 24 アカ failure_story **median 5% (実測 65-item-analysis.jsonl 由来)** から「市場で証拠が出ていないだけ」or「ターゲット仮説が外れ」のどちらか判別不能、ofmeton 推奨は competitor median 比 4 倍の verified ≤ 4 本/月で上位帯狙い)。事前に失敗を見せる発信は信頼形成と専門性証明を同時に達成する可能性が高いが、Phase 1 で PCR / qualified_lead で実証する。

**Hook 16 種体系との対応 (トレーサビリティ)**: 本 §3.2 で扱う `failure_story` は [main-design 統合版 §6.5.1 Hook Analyzer 初期 13 類型 + §2.4 Hook 16 種類](./main-design-all-versions.md) の primary_hook 4 種の 1 つ (failure_story / business_repro / opinion 数字 / first_hand)。Hook 16 種 = primary_hook 4 × devices 13 のクロス分類軸。

**Thompson Sampling 事前分布**:

```
Phase 1 開始時の prior は「観測薄い Hook には弱い prior、観測ある Hook には empirical Bayes」の混合戦略を採用する:

(a) 観測 N_obs ≥ 5 の Hook (24 アカ × 25 posts = 600 観測ベースで 5 例以上集計可能):
    empirical Bayes 起点 → α = N_obs + 1, β = (N_total - N_obs) + 1
    例: number_lead は 24 アカ median 27.5% × 25 = ~6.9 / アカ。
        集計 N_obs ≒ 165 / 600 → α=166, β=435 (mean ≒ 0.275)
        ofmeton 採用率 25% は posterior update で自然収束

(b) 観測 N_obs < 5 の Hook (例: ofmeton 採用 20% でも母集団観測薄い場合):
    Beta(1, 1) 一様分布 prior を採用 (= uninformative prior)
    最初の 5-10 投稿の observation で posterior が形成される

(c) verified_failure_story (Hook 軸 2 主軸):
    比率 KPI 撤回のため Thompson Sampling 適用外 (上限制約のみ)
    Optimizer は「failure_story = on/off」を月 ≤ 4 上限で出すかどうかだけ判断

(d) 旧設計 [推定] (v0 で採用していた `α = 採用率_i × 20, β = (1-採用率_i) × 20`):
    各 Hook 5 例以上の観測前提だが Phase 1 開始時には満たさない場合あり
    → 撤回し、(a)+(b) のハイブリッドに変更

update logic (毎週):
  for hook in [number_lead, negation_lead, ...]:
    successes = count(投稿 where primary_hook=this AND reward ≥ median)
    failures  = count(投稿 where primary_hook=this AND reward < median)
    α_post = α_prior + successes
    β_post = β_prior + failures
    sample = Beta(α_post, β_post).sample()
  next_hook = argmax(samples)
```

[推定] (b) 一様分布 prior の発動条件は Optimizer 実装時に「観測 N_obs」をどう定義するか (24 アカ集計 vs ofmeton 自アカ集計) で挙動が変わる。Phase 1 開始前に確定が必要。

### 3.3 publishing_lag (B + E) — 速報性 vs 熟成

**Sonnet 24 アカ集計**:

```
publishing_lag dist (24 アカ): immediate=21, next_day=2, few_days=1
```

つまり **88% が即時投稿**。Atenov_D / Codestudiopjbk / cyrilXBT は「日本語圏で最速級」を意識している。

**ofmeton 採用初期値** (4 排他軸別、style-guide v1.4 §2.3 SSOT):

| 軸 | publishing_lag 採用初期値 | 根拠 |
|---|---|---|
| translation (海外 EN ニュース翻訳) | **1-6h** | 競合 90% が即時、ofmeton は精度優先で若干遅らせる |
| paraphrase (公式発表の言い換え) | **6-12h** | 競合 60% が即時、ofmeton は「自社で試した結果」を追記してから投稿 |
| opinion (主観的意見) | **24-48h** | 即時投稿は誤情報リスク。1-2 日寝かせる |
| first_hand (一次情報・実体験) | **即時〜数日 (固定値なし)** | 一次体験は本人の作業時間依存、固定値設定すると silent reduction (cs:s3-68) になるため style-guide v1.4 §2.3 SSOT に従い範囲指定なし。Optimizer 改善対象には含めるが lag 数値は推奨しない |

**注記** (cs:s3-68 silent reduction 防止):

- 旧本書 v0 で `first_hand: 0-24h (柔軟)` と書いていたが、style-guide v1.4 §2.3 の SSOT は `即時〜数日 (固定値なし)` であり、`0-24h` への縮退は silent reduction に該当
- 一次体験 (Claude Code 実行ログ / 案件メモ / 失敗談) は **発信タイミングが本人の業務時間 + 整理時間に依存** するため、固定値で縛らない
- Optimizer は `first_hand_lag` を改善対象には含めるが、初期 prior は「観測ベースで posterior 更新」のみで、推奨値を持たない (= explicit "no recommendation" state)

### 3.4 4 排他軸 (translation / paraphrase / opinion / first_hand) — content classification

**Sonnet 24 アカ集計** (B_content_tone):

| 軸 | min | Q1 | median | Q3 | max |
|---|---|---|---|---|---|
| primary_info_rate (一次情報) | 5% | 10% | **15%** | 25% | 60% |
| paraphrase_rate (パラフレーズ) | 20% | 40% | **65%** | 70% | 90% |
| opinion_rate (意見) | 5% | 15% | **20%** | 25% | 52% |

**ofmeton 採用初期値**:

| 軸 | 採用率 | 競合 median 比 | 差別化意図 |
|---|---|---|---|
| translation (translation_rate) | **10%** | 50% (paraphrase 系列の中の翻訳割合) | 競合 65% は paraphrase 全般、ofmeton は翻訳を 10% 程度に抑える |
| paraphrase (paraphrase_rate) | **20%** | 31% | 競合 65% から大幅下方修正 (差別化) |
| opinion (opinion_rate) | **30%** | 150% | **競合より高い**。実体験ベース意見を主軸 |
| **first_hand (primary_info_rate)** | **40%** | **267%** | **★最大差別化レバー** 競合 median 15% → ofmeton 40%。「自分で試した一次情報」 |

合計 = 100%。

**first_hand を 40% にできる根拠**:

- ofmeton は **all-good-ops** という Claude Code を主軸とした半自律エージェントチームを既に運用中。日常業務全体が「Claude 活用ネタの宝庫」
- 競合の primary_info_rate top 3 は @mmmiyama_D (60%) / @daifukujinji (55%) / @tetumemo (45%) で、いずれも「自分で実機検証して投稿」スタイル。ofmeton も同型可能
- failure_story の母艦としても機能 (失敗談 = 一次情報の一部)

### 3.5 citation_explicit_rate (B) — 出典明示率

**Sonnet 24 アカ集計**:

```
citation_explicit_rate: min=5% Q1=30% median=55% Q3=70% max=95%
top 3: @ai_explorer25 (95%) / @ClaudeCode_UT (85%) / @ClaudeCode_love (75%)
```

**ofmeton 採用初期値**: **65%+**

根拠:

- 競合 Q3 (=70%) 帯に位置取り。median (55%) より上に置く
- 非エンジニア決裁者は「ソース不明の AI 情報」を最も警戒する層
- 失敗談 + 出典明示で「誠実な専門家」のポジション確立
- 競合 @ai_explorer25 が 95% で高いが、彼/彼女は資料リスト系のため自動的に source 多数。ofmeton は意見比率高いので 65% が現実的

### 3.6 X format 比率 (H_x_format) — empirical ベース

> **SSOT との関係**: main-design v10.3 §6.4.2 + Style Guide v1.3 §2 が **Current SSOT** であり、本書 §3.6.1 はこの SSOT を直接引く。v9.2 §2.5 で設計された旧比率 (短文 60% / スレッド 30% / 長文 10%) は v10.3 で改訂され、現行 SSOT は **短文 50% / 中文 25% / 長文 10% / スレッド 10-15%** + Beta(2,8) 弱い prior。v9.2 設計値は §3.6.X 歴史節で保持する (silent reduction 防止 cs:s3-68 / SSOT 衝突防止 cs:s3-78 整合)。

#### 3.6.1 Current SSOT (v10.3 + Style Guide v1.3、Beta(2,8) 弱い prior) — **採用軸**

main-design v10.3 §6.4.2 + Style Guide v1.3 §2 の正本:

| 区分 | 採用比率 (v10.3) | Thompson Sampling 事前分布 |
|---|---|---|
| **短文単発 (≤140 字)** | **50%** | Beta(2, 8) |
| **中文単発 (141-280 字)** | **25%** | Beta(2, 8) |
| **長文単発 (281-1000 字)** | **10%** | Beta(2, 8) |
| **スレッド (self-reply chain 2-7 本)** | **10-15%** (月 8-10 本相当) | Beta(2, 8) |

合計 = 95-100% (スレッド側の幅で 5% 弾性、main-design v10.3 §6.4.2 表より引用)。

**Beta(2,8) 弱い prior の含意** (main-design v10.3 §6.4.2 / v9.2 §1.2 / v10 §4.3.2 ★★★★★):

```
α=2, β=8 の弱い事前分布 = サンプル 10 件相当の弱い prior
mean = 2/(2+8) = 0.2 (= 20% 弱い prior)
実運用データ 30 件超で prior の影響が薄まり、posterior が実測に追従
PCR / url_link_clicks / qualified_lead を report として観測
各カテゴリ毎に Beta 分布を独立に更新 (fmat 間の独立性仮定)

更新ロジック (毎週):
  for fmat in [短文, 中文, 長文, スレッド]:
    successes = count(投稿 where fmat=this AND PCR ≥ 0.3%)
    failures = count(投稿 where fmat=this AND PCR < 0.3%)
    α_post = α + successes
    β_post = β + failures
    sample = Beta(α_post, β_post).sample()
  next_fmat = argmax(samples)
```

**v10.3 でのスレッド比率復元理由** (main-design v10.3 §6.4.2 G-1 より引用): 「v10.1 で 5% に縮減したが、Phase 0 v2 24 アカ分析で『業種別 SOP の概要 / 段階型 / 比較解説の解説力はスレッドが最適』と判明。月 8-10 本 (10-15%) で復元。」

#### 3.6.2 歴史節 — v9.2 §2.5 の旧設計値 (cs:p1-acca / cs:p2-acca、撤回済)

> **status**: v10.3 で改訂、撤回済。本節は silent omission 防止 (cs:s2-74) のために保持。

v9.2 §2.5 で設計されていた旧比率と Thompson Sampling 事前分布:

| 区分 | v9.2 採用比率 | v9.2 Thompson Sampling 事前分布 |
|---|---|---|
| 短文 (≤140 chars 単発) | 60% | Beta(6, 4) |
| スレッド (self-reply chain) | 30% | Beta(3, 7) |
| 長文 (280+ 字 単発) | 10% | Beta(1, 9) |

**v9.2 → v10.3 改訂の差分** (両軸の関係):
- **v9.2 (Phase 0 前)**: 短文 60 / スレッド 30 / 長文 10、強い prior (Beta(6,4) 等で α+β=10 = "10 件観測相当の強い prior")
- **v10.3 (Phase 0 後 = Current)**: 短文 50 / 中文 25 / 長文 10 / スレッド 10-15、弱い prior (Beta(2,8) で α+β=10 だが mean=0.2 で全 fmat 均一の "agnostic" prior)
- 改訂理由 (main-design v10.3 §2.4 + §6.4.2 より引用): 「Style Guide v1.3 確定により、軸 1 (排他、4 区分) = translation 10% / paraphrase 20% / opinion 30% / first_hand 40%」 + 「Phase 0 v2 24 アカ分析でスレッド比率復元 (G-1)」
- v9.2 では「短文 60 + スレッド 30 + 長文 10 = 100%」の 3 区分排他、v10.3 では「短文 50 + 中文 25 + 長文 10 + スレッド 10-15」の 4 区分 (中文を独立軸に格上げ)

#### 3.6.3 empirical 4 区分粒度 (本書 §2.1 由来、補助軸 / orthogonal)

empirical 34 アカ分析で得た文字数 4 区分は、Writer がより細かい粒度で format を選ぶための補助軸 (Current SSOT §3.6.1 の 4 区分とは別 layer の `super_long` + `article` の精緻化):

| フォーマット (文字数) | empirical median (24 アカ) | ofmeton 採用 (補助軸) |
|---|---|---|
| 短文 (<140) | 12% | §3.6.1 の「短文単発 50%」に対応 |
| 中文 (140-279) | 12.5% | §3.6.1 の「中文単発 25%」に対応 |
| 長文 (280-699) | 35.5% | §3.6.1 の「長文単発 10%」に対応 (ofmeton は competitor より長文比率低め) |
| 超長文 (≥700) | 27% | ofmeton 5% 上限 (cs: s3-78 引き出し 1 番、過剰回避) |
| Article (X Article) | 0% | ofmeton 月 1 本 (note 連動 Article 化、cs:s3-78 引き出し 3 番) |

#### 3.6.4 Phase 1 月 30 投稿の組成 (Current SSOT §3.6.1 の 50/25/10/10-15 を採用)

| 構造 (Current SSOT) | 月内本数 | format 内訳 (補助軸) |
|---|---|---|
| **短文単発 (≤140 字)** | **15 (= 50%)** | 全て短文 |
| **中文単発 (141-280 字)** | **7-8 (= 25%)** | 結論先出 + 経験談 |
| **長文単発 (281-1000 字)** | **3 (= 10%)** | 業界批評 / 失敗談 |
| **スレッド (self-reply chain)** | **3-5 (= 10-15%、月 8-10 本相当を月 30 投稿換算)** | 失敗談 + 学び / 業界 SOP ステップ展開 |
| **合計** | **28-30 (95-100%)** | スレッド側 10-15% 弾性のため幅 |

注: 旧本書 v0 では「短文 18 (60%) / スレッド 9 (30%) / 長文 3 (10%) = 30」だったが、v10.3 SSOT に整合させるため「短文 15 (50%) / 中文 7-8 (25%) / 長文 3 (10%) / スレッド 3-5 (10-15%)」に変更。

#### 3.6.5 設計上の注意

- thread (29% 採用) と quote_rt_chain (5.9 で別軸、§5.9.3 で W=mixed に統合) は別レイヤ。本節 §3.6.1 の「スレッド 10-15%」は self-reply chain のみを指す
- 競合 empirical median は短文 12% (24 アカ) だが、これは「投稿 1 本あたりの分布」、ofmeton は「月内本数比率」なので直接比較不可
- main-design v10.3 §6.4.2 の Beta(2,8) 弱い prior をそのまま採用 (v9.2 §2.5 の Beta(6,4)/(3,7)/(1,9) は撤回済)
- 軸 1 (排他 4 区分: translation/paraphrase/opinion/first_hand) と軸 2 (Hook 類型) と本節 (X format 比率 = 文字数 + 構造) は **3 つの異なる orthogonal axis**。投稿 1 本は 3 軸全てに紐づく

### 3.7 Visualizer モード (C + D) — 画像 / 動画 / hybrid

**Sonnet 24 アカ集計**:

| C/D 指標 | min | Q1 | median | Q3 | max |
|---|---|---|---|---|---|
| image_attach_rate (C) | 5% | 12% | **44.5%** | 88% | 100% |
| ai_gen_image_rate (C) | 0% | 5% | 5% | 10% | 60% |
| text_overlay_rate (C) | 4% | 20% | **30%** | 35% | 70% |
| image_type_primary | screenshot=23/24 (96%), screencast=1 | | | | |
| color_scheme | light=18 (75%), dark=6 (25%) | | | | |
| video_attach_rate (D) | 0% | 4% | 10% | 52% | 72% |
| hook_strength_first_3s | medium=12, none=7, strong=4, weak=1 | | | | |

**ofmeton 採用初期値** (Phase 1):

| モード | 採用比率 | 月 30 投稿のうち | 採用 visual type |
|---|---|---|---|
| **画像 (screenshot/Claude UI)** | **50%** | 15 投稿 | Claude Code 実行画面 + before/after コード |
| **画像 (text overlay tile)** | **20%** | 6 投稿 | Noto Sans Heavy で「3 行 + 数字」型 |
| **動画 (15-30秒)** | **10%** | 3 投稿 | Claude Code 自動実行のスクリーンキャスト |
| **動画 (≥30秒) または hybrid** | **5%** | 1-2 投稿 | thread 補強用 |
| **テキストのみ** | **15%** | 4-5 投稿 | 失敗談・主観意見 (画像なし真摯トーン) |

合計 = 100%。

**設計の意図**:

- 競合 image_attach_rate median 44.5% → ofmeton **70%** (50% + 20%) で上回り、視覚的訴求強化
- ai_gen_image_rate は 5% 以下に抑える (`非エンジニア決裁者` 層は AI 生成画像で「AI 感」を嫌がる) → ofmeton 0-5%
- text_overlay は Noto Sans Heavy 統一 (visual-design-system.md SSOT)、color_scheme=light を主軸 (競合 75%)
- video は競合 median 10% に合わせる。動画特化アカ (@ClaudeCode_UT 65% / @carverfomo 97%) と差別化、ofmeton は「画像主軸」を維持

### 3.8 industry_sop 投稿率 (B) — 業界ベストプラクティス系

**競合分析**: industry_sop (法律・税務・人事系の「業務 SOP の Claude 化」) は 24 アカでほぼゼロ。`@MakeAI_CEO` が法人 AI 研修絡みで部分言及 (~10%)、それ以外は技術寄り。

**ofmeton 採用初期値**: **月 20%** (月 30 投稿のうち 6 投稿)

根拠:

- 非エンジニア決裁者の「自分の業務領域」に AI を当てはめる文脈は競合で空白セル (= unwritten territory)
- 例: 「請求書発行を Claude にやらせる手順」「契約書レビューに Claude を使う 3 ステップ」「採用面接の議事録 → Claude で構造化」
- failure_story と組み合わせると最強 (「請求書発行を Claude にやらせて、税率を 8% で計算ミスした話」等)

---

## 4. Writer 全領域初期値 (派生)

### 4.1 X 投稿 (1/日 = 30/月) — bootstrap 設計

**前提 (style-guide-all-versions.md §3 遵守)**:

- 1 投稿 = 1 日 (silent reduction 厳禁: cs:s3-68)
- avg_chars 200-300 字 (中文主軸)
- hashtag 0
- 絵文字 0-2 個 (`emoji_density` median 0.8)
- 改行 3-5 個 (`linebreak_density` median 3.35)

**月 30 投稿の組成 (§3 諸軸の積、§3.6.1 Current SSOT v10.3 50/25/10/10-15 を採用)**:

| 区分 | 月内本数 | 例 |
|---|---|---|
| **構造別 (§3.6.1 Current SSOT v10.3、main-design v10.3 §6.4.2)** | | |
| 短文単発 (≤140 字) | **15 (= 50%)** | 「Claude Code で 30 分かかってた請求書発行が 3 分になりました。」+ 画像 |
| 中文単発 (141-280 字) | **7-8 (= 25%)** | 結論先出 + 経験談 |
| 長文単発 (281-1000 字) | **3 (= 10%)** | 業界批評 / 失敗談 |
| スレッド (self-reply chain 2-7 本) | **3-5 (= 10-15%)** | 「失敗談 + 学び」「業界 SOP ステップ」展開 |
| **文字数別 (§3.6.3 補助軸、empirical)** | | |
| 短文 (<140) | 15 内訳 | 単発 短文 |
| 中文 (140-279) | 7-8 | 単発 中文 |
| 長文 (280-699) | 1-2 | 失敗談 + 学び |
| 超長文 (≥700) | 1 | 月 1 の「決定版」 |
| Article (X Article) | 0-1 | 月 0-1 の note 連動 Article |
| **content type 別 (4 軸排他、style-guide v1.3)** | | |
| translation | 3 | Anthropic Eng Blog の意訳 |
| paraphrase | 6 | Claude Code 公式 release notes の言い換え |
| opinion | 9 | 自分の意見・考え |
| first_hand | 12 | 自分で試した結果・失敗談 |
| **Hook 別 (§3.2)** | | |
| number_lead | 7-8 | 「3 つの理由」 |
| negation_lead | 1-2 | 「Claude を使わない方がいい場面」 |
| question_lead | 3 | 「あなたの会社、まだ手作業で〇〇していますか？」 |
| emotion_lead | 4-5 | (節度ある感情語) |
| authority_lead | 3 | Anthropic 公式・著名エンジニア引用 |
| promise_lead | 4-5 | 「これで毎月 5 時間節約できます」 |
| **failure_story (verified)** | **≤ 4 (上限制約、比率 KPI 撤回)** | main-design v10.3 §2.4 / style-guide v1.3 §2.2 SSOT 整合、月 4 本確保できない月は first_hand × industry_sop で代替 |
| **visual mode 別 (§3.7)** | | |
| 画像 (screenshot) | 15 | Claude 実行画面 |
| 画像 (text overlay) | 6 | Noto Sans Heavy デザイン |
| 動画 (15-30秒) | 3 | スクキャス |
| 動画 (≥30秒) or hybrid | 1-2 | thread 補強 |
| テキストのみ | 4-5 | 失敗談 |
| **industry_sop (§3.8、Hook 軸 2 主軸 20%)** | **6 (= 月 20%)** | 業種別 SOP の Claude 化、competitor 観測ゼロの "unwritten territory" |

### 4.2 Instagram (カルーセル週 2 + リール週 1 = 月 12) — visual-designer skill 連動

**前提 (visual-design-system.md SSOT 遵守)**:

- カルーセル 9 枚構成 (本書 §5.1.2 参照)
- Noto Sans Heavy、4 色限定
- 文字サイズ最小値: 24pt 以上

**月 12 本の組成**:

| 種別 | 月内本数 | 内容例 |
|---|---|---|
| カルーセル (9 枚) | 8 | 月 2/週 × 4 週 |
| - "Claude 活用 1 トピック深掘り" | 4 | 1 トピックを 9 枚で展開 (背景 → 課題 → 手順 → 失敗 → 解決 → Before/After → 数値 → 学び → CTA) |
| - "今月の Claude Tips 5 選" | 2 | 1 月分の Tips を 9 枚に集約 |
| - "失敗談 + 学び" | 2 | failure_story 系 |
| リール (15-30秒) | 4 | 月 1/週 |
| - "Claude Code 自動化デモ" | 3 | 動画キャプチャ + 字幕 |
| - "1 分で分かる Tips" | 1 | 軽量 short form |

**Instagram の役割**: 「ブランド構築・保存型認知 → note + プロフ送客」(CLAUDE.md publishing pivot §3 媒体役割分担)。

### 4.3 note (無料 3-5 + 有料 1 = 月 **4-6 本**) — note-revenue-playbook 連動

> **silent reduction 厳禁 (cs:s3-68 / cs:s1-68)**: 本範囲 "4-6/月" は CLAUDE.md publishing pivot §3 で明示された目標値であり、Optimizer / Writer 共に **下限 4 を下回ってはならず、上限 6 を超えてもよい**。本書では計画的に「**Phase 1 = 4 本/月から開始、慣れたら 6 本に拡大**」と段階的設計とする。

**前提 (note-revenue-playbook.md SSOT 遵守)**:

- 無料記事 = 3-5 本/月、4,000-6,000 字
- 有料記事 = 月 1 本以上、8,000-12,000 字、価格 500/980/1,480 円のいずれか
- マガジン = 月 1 回更新

**Phase 1a (~2026-06, 立ち上げ期): 月 4 本最小構成**:

| 種別 | 月内 | 字数 | 価格 | 内容例 |
|---|---|---|---|---|
| 無料: Tips 集約 | 1 | 5,000 | 0 | 「今月の Claude Code Tips 5 選」 |
| 無料: 失敗談 + 学び | 1 | 4,000 | 0 | failure_story を深掘り |
| 無料: 業界別 industry_sop | 1 | 5,000 | 0 | 「経理を Claude に任せる手順」等 |
| **有料: 決定版** | 1 | **10,000** | **980 円** | 「Claude Code で〇〇を完全自動化する 7 ステップ (失敗込み)」 |

**Phase 1b (~2026-07, 拡大期): 月 6 本フル構成**:

| 種別 | 月内 | 字数 | 価格 | 内容例 |
|---|---|---|---|---|
| 無料: Tips 集約 | 1 | 5,000 | 0 | 「今月の Claude Code Tips 5 選」 |
| 無料: 失敗談 + 学び | 1 | 4,000 | 0 | failure_story を深掘り |
| 無料: 制作事例 | 1 | 6,000 | 0 | portfolio リポ連動の作例集 |
| 無料: 業界別 industry_sop | 1 | 5,000 | 0 | 「経理を Claude に任せる手順」等 |
| 無料: 月次振り返り | 1 | 4,000 | 0 | 月次レビュー + 来月予告 |
| **有料: 決定版** | 1 | **10,000** | **980 円** | 「Claude Code で〇〇を完全自動化する 7 ステップ (失敗込み)」 |
| マガジン | 1 (新規 + 月次まとめ) | - | 480 円/月 | 上記 6 記事 + 限定追記 |

**note 月売上目標 (Phase 1)**: 3 万円。逆算: 980 円 × 30 部 = 29,400 円、または 1,480 円 × 20 部 = 29,600 円。Phase 1b の月 6 本構成で達成しやすくなる。

---

## 5. 戦略テンプレート集 (I〜W 由来、24 アカ Sonnet 分析)

> 本節は **publisher 10 アカ追加戦略分析は次フェーズで実施** (sub-agent socket error で停止、24 アカで母集団分析十分な統計力を確保)。

### 5.1 集客 → 収益化導線 (I + O + P)

#### 5.1.1 primary_destination 分布 (Sonnet 24 アカ)

```
own_site     : 10 アカ (42%)
note         :  6 アカ (25%)
line         :  4 アカ (17%)
membership   :  2 アカ ( 8%)
youtube      :  1 アカ ( 4%)
none         :  1 アカ ( 4%)
```

#### 5.1.2 4 パターン分類

| pattern | 採用者数 | 説明 | ofmeton Phase 別推奨度 |
|---|---|---|---|
| **A: bio URL (note 直送)** | 6 + bio_url が note (~25%) | bio に note のメインページを置き、毎ツイート末尾で「詳しくは note に👇」 | Phase 1: **推奨** |
| **B: pinned (note 告知 / Lit.link)** | 20/30 pinned が note_link or mixed (~67%) | pinned で「最大の note 記事」を固定、bio URL は補助 | Phase 1-2: **推奨** |
| **C: 引用 RT chain で告知** | quote-rt-chain=7 (29%) | 自ツイートを quote RT して連投、最後の RT で URL を提示 | Phase 2: 検討 |
| **D: DM 個別相談募集** | 4 アカ (17%) | 全投稿末尾に「相談 DM 募集」、有料 LP は持たない | Phase 3: ofmeton では非推奨 (note があるため) |

#### 5.1.3 ofmeton Phase 別採用

| Phase | 採用 pattern | 移行条件 |
|---|---|---|
| **Phase 1** (~2026-07 末、follower 500-2000) | **A + B 併用** (bio = note URL、pinned = 月の決定版記事) | note 月売上 1 万円達成 |
| **Phase 2** (~2026-10 末、follower 2,000-5,000) | A + B + **マガジン CTA tweet 月 5 回** | マガジン購読 100 名達成 |
| **Phase 3** (~2027-02 末、follower 5,000+) | 全部 + **C (引用 RT chain) を活用** | コンサル LP に切替 (上位事業設計確定後) |

#### 5.1.4 frequency_of_link_share (Sonnet 24)

```
median: 44%, Q3: 82%, max: 98%
```

ofmeton 採用初期値: **40-50%** (median 帯、毎ツイート URL ではないが半分以上)。

### 5.2 目的分類別配分 (J_purpose_mix)

#### 5.2.1 Sonnet 24 アカ集計

| 目的 | min | Q1 | median | Q3 | max |
|---|---|---|---|---|---|
| follower_acquisition | 20% | 30% | 35% | 40% | 55% |
| lead_acquisition | 10% | 25% | 30% | 35% | 45% |
| brand_building | 20% | 25% | 30% | 35% | 40% |
| instant_revenue | 5% | 5% | 5% | 10% | 10% |

#### 5.2.2 ofmeton Phase 別配分

| Phase | follower_acquisition | lead_acquisition | brand_building | instant_revenue |
|---|---|---|---|---|
| Phase 1 | **40%** | 15% | **35%** | 10% |
| Phase 2 | 35% | **30%** | 25% | 10% |
| Phase 3 | 25% | **35%** | 20% | 20% |

**設計意図**:

- Phase 1: フォロワー 0 → 500 を最優先 (follower_acquisition 40%) + 信頼蓄積 (brand_building 35%)
- Phase 2: lead_acquisition を急上昇 (note 有料記事 + メンバーシップ売上獲得)
- Phase 3: instant_revenue 比率を倍に (有料コンサル LP / 商品化)

### 5.3 ファネル設計 (K_funnel_structure + L_tier_approach)

#### 5.3.1 Sonnet 24 アカ集計

```
primary_tier: 全 24 アカが TOFU (100%)
tofu_ratio: median 65%
mofu_ratio: median 26.5%
bofu_ratio: median 7%
```

#### 5.3.2 ofmeton 採用配分

| Phase | TOFU | MOFU | BOFU |
|---|---|---|---|
| Phase 1 | **65%** | 25% | 10% |
| Phase 2 | 55% | 35% | 10% |
| Phase 3 | 50% | 35% | 15% |

#### 5.3.3 各層 Hook × format 組合せ

**TOFU (Top of Funnel)**:

- Hook: number_lead / emotion_lead / authority_lead
- format: 短文 / 中文
- 例: 「Claude Code で 30 分かかってた業務が 3 分に。3 つのコツを共有します。」+ screenshot

**MOFU (Middle of Funnel)**:

- Hook: failure_story / promise_lead / industry_sop
- format: 長文 / 超長文 / Article
- 例: 「Claude Code で確定申告コードを書かせて失敗した話 (税理士に怒られた)」+ 詳細記事リンク

**BOFU (Bottom of Funnel)**:

- Hook: promise_lead / authority_lead
- format: 長文 + 強い CTA
- 例: 「月 5 時間節約したい経理担当者向け note 完全版を公開しました」+ 価格 + 既購入者の声

#### 5.3.4 competitor tofu_approach 抜粋 (24 アカ)

ofmeton は competitor の良いところを抽出して採用。以下は Sonnet 24 から直接抜粋。

| competitor | tofu_approach (要約) |
|---|---|
| @ClaudeCode_love | 【速報】【衝撃】等の感情ラベルで海外バズ・公式発表ニュースを速報パラフレーズ |
| @Shimayus | 最新 AI エージェント・ツール速報を感情的 hype で紹介 (実機検証強調) |
| @SuguruKun_ai | 「すごい」「有益だった」など感情リード + スレッド形式で情報量を多く見せる |
| @masahirochaen | 速報・最新 AI 情報を【速報】【朗報】【保存版】タグで短〜中文に |
| @Codestudiopjbk | 海外バズ・速報・新機能アップデートをハイプ調 + 【海外で話題】 |
| @ObsidianOtaku | 【保存版】タグ・絵文字フック・驚き数字で拡散狙い |
| @MakeAI_CEO | 「消される前に」「99%が知らない」センセーショナル hook + 5 項目スレッド |
| @mmmiyama_D | 最新 AI ツールの即試しデモ動画・画像でバズ狙い、感情フック (😱🤣😳) |
| @daifukujinji | バズ狙いネタ投稿 + Gemini 活用 Tips、プロンプトをリプに置く構造 |
| @tetumemo | AI 最新ニュース・海外話題トレンドの即日図解・要約投稿 |

**ofmeton 採用方針**: 上記から「失敗談 + 一次情報 + 業界 SOP」3 軸を主軸化。「速報パラフレーズ + hype」は意図的に避ける (差別化)。

### 5.4 フォロワー働きかけ言語ライブラリ (M_follower_language)

#### 5.4.1 Sonnet 24 アカ集計

| 言語類型 | min | Q1 | median | Q3 | max |
|---|---|---|---|---|---|
| imperative (命令形「保存して」) | 8% | 20% | 35% | 45% | 50% |
| empathic (共感「分かりますよね」) | 4% | 20% | 20% | 30% | 45% |
| question (問いかけ「あなたはどう？」) | 5% | 5% | 10% | 15% | 44% |
| invitation (誘い「一緒に〇〇しませんか」) | 4% | 25% | 30% | 40% | 50% |
| one_way_vs_two_way (1:単方向 / 0:双方向) | 0.2 | 0.75 | **0.80** | 0.85 | 0.9 |

**重要 finding**: 24 アカ median = 0.80 → **80% が単方向 (= プレゼン / 講義型)**。双方向 (= 質問返答 / コミュニケーション型) は 20% にとどまる。

#### 5.4.2 ofmeton 採用配分

| 類型 | 採用率 | 例 |
|---|---|---|
| imperative | 25% | 「保存しておくと後で効きます」「コピーしてそのまま使えます」 |
| empathic | **35%** (median 比 175%) | 「経理担当者の方なら分かりますよね、月末の請求書発行の苦しみ」 |
| question | 15% | 「あなたの会社、まだ手作業で〇〇してますか？」 |
| invitation | 25% | 「note のマガジン、月 480 円で月 5 記事読めます」 |
| **one_way_vs_two_way** | **0.6** (median 比 75%) | 双方向比率を競合より上げる |

#### 5.4.3 30+ フレーズ集 (competitor から抽出)

**imperative 系 (10 件)**:

1. 「保存しておくと後で効きます👇」 (`@so_ainsight` Q 由来)
2. 「ブックマーク必須」「永久保存版」 (`@claudecode_lab`)
3. 「Save this / Bookmark this list」 (`@heynavtoor`)
4. 「Build it once. It compounds forever.」 (`@cyrilXBT`)
5. 「The people who set this up today will wonder how they ever worked without it」 (`@cyrilXBT`)
6. 「保存して、自分の Vault 設計の参考に」 (`@ObsidianOtaku`)
7. 「Bookmark this for later」 (`@cyrilXBT`)
8. 「Free. Available tonight. No excuses.」 (`@cyrilXBT`)
9. 「Set up notifications for my account so you don't miss it」 (`@Atenov_D`)
10. 「Comment 'Learning'」 (`@ai_explorer25`)

**empathic / connection 系 (5 件)**:

11. 「個人では Claude も AI エージェントも使い倒してるのに、会社では一切使えない。この状況、めちゃくちゃストレスじゃないですか？」 (`@MakeAI_CEO` pinned)
12. 「経理担当者なら分かりますよね、月末の苦しみ」 (ofmeton 採用案)
13. 「同じことで悩んでる方は多いと思います」 (ofmeton 採用案)
14. 「私も最初は失敗しました」 (failure_story 連動)
15. 「これ、見たくなかった人すみません」 (negation_lead 系)

**question / invitation 系 (10 件)**:

16. 「あなたの会社、まだ〇〇していますか？」 (ofmeton 採用案)
17. 「下記の記事も一緒に読んで理解を深めるといい👇」 (`@ObsidianOtaku`)
18. 「この記事でもっと詳しく👇」 (`@ClaudeCode_love`)
19. 「完全版はこちら👇」 (`@ClaudeCode_love`)
20. 「9 割が知らない〜完全版はこちら👇」 (`@ClaudeCode_love`)
21. 「組織全体への導入は下の HP からご相談ください」 (`@ClaudeCode_love`)
22. 「この下の記事を読むと理解が一気に深まる。マジでおすすめ👇」 (`@Codestudiopjbk` / `@obsidianstudio9` 共通)
23. 「記事に全文貼り出してます⏬」 (`@ObsidianOtaku`)
24. 「40 種以上のプロンプトがあります。興味ある方はぜひ！」 (`@mmmiyama_D`)
25. 「実務で使える AI 情報を毎日発信。フォロー👉」 (`@SuguruKun_ai`)

**社会的証明 / 権威付け系 (5 件)**:

26. 「500 いいね以上獲得」 (`@ClaudeCode_love`)
27. 「2,000 人超の方に参加いただきました」 (`@SuguruKun_ai`)
28. 「満足度 90%/93%」 (`@SuguruKun_ai`)
29. 「上場企業と AI エージェント共同開発中」 (`@Codestudiopjbk`)
30. 「合計フォロワー 8 万人以上」 (`@daifukujinji`)

**ofmeton 採用方針**: 上記 30 件から「失敗談 + 一次情報の信頼性」を組み合わせて使う。
- 採用: 1, 11, 12, 13, 14, 16, 22, 25, 28, 29 (10 件)
- 非採用 (誇大広告風): 4, 5, 8, 26 (4 件)

### 5.5 pinned post 設計 (N_pinned_design)

#### 5.5.1 Sonnet 24 アカ集計

```
type 分布 (24):
  note_link    : 10 (42%)
  mixed        : 10 (42%) ※ note リンク含む長文 or 告知
  none         :  2 ( 8%)
  event        :  1 ( 4%)
  achievements :  1 ( 4%)
```

#### 5.5.2 type 別 best practice

**note_link (URL のみ)** — `@ClaudeCode_love` / `@Shimayus` / `@masahirochaen` / `@ObsidianOtaku` / `@obsidianstudio9` / `@so_ainsight` / `@exploraX_` / `@cyrilXBT`

例:
- `@masahirochaen`: 「【note 公開】Claude Code Desktop アプリ完全解説マニュアル／5.5 万文字超え／無料部分だけでも約 1 万文字」 + URL
- `@so_ainsight`: 「【Claude Code 完全攻略ロードマップ】完全無料公開！約 42,000 文字、画像 90 枚、全 45 章」 + URL

**mixed (告知 + 説得文)** — `@SuguruKun_ai` / `@MakeAI_CEO` / `@daifukujinji` / `@mmmiyama_D` / `@ai_explorer25` / `@heynavtoor` / `@tetumemo`

例:
- `@MakeAI_CEO`: 「個人では Claude も AI エージェントも使い倒してるのに、会社では一切使えない。この状況、めちゃくちゃストレスじゃないですか？」 + LINE 誘導
- `@daifukujinji`: 「🔥 重大発表 🔥 オンラインサロン『アイサロ』正式オープン。合計フォロワー 8 万人以上」 + URL

#### 5.5.3 ofmeton Phase 1 推奨

**type**: `mixed` (告知文 + note URL)
**長さ**: 中文 (200-280 字)
**構成**:

```
[1 行目] 感情フック (failure_story 系): "Claude Code を使いこなせず、3 ヶ月で 100 回失敗しました。"
[2-3 行目] 約束: "そこから学んだ、非エンジニアでも実装できる業務自動化の手順を note にまとめました。"
[4 行目] 数値証明: "失敗パターン 7 種類 / 解決策 12 個 / 5,000 字 / 完全無料"
[5 行目] CTA + URL: "👇 こちらから読めます (定期更新)"
```

**Phase 2-3 への進化**:

- Phase 2: 有料 note 売上 1 万円達成後、mixed → "achievements + 告知" 型に切替
- Phase 3: マガジン購読者数突破後、有料 LP 直リンクへ

### 5.6 bio URL 設計 (O_bio_url_destination)

#### 5.6.1 Sonnet 24 アカ集計

primary_destination 別 (重複あり):

```
own_site (法人 HP / Lit.link 系まとめページ) : 10 (42%)
LINE 公式アカウント                          :  3 (13%)
note 直リンク                               :  3 (13%)
Telegram channel                          :  2 ( 8%)
Email / DM 専用                           :  3 (13%)
none / 空                                  :  3 (13%)
```

#### 5.6.2 主要 destination 詳細

| destination | 採用者 | 用途 |
|---|---|---|
| **note 直** | `@claudecode_lab` / `@so_ainsight` | 唯一の収益化先 |
| **Lit.link / 集約ページ** | `@masahirochaen` / `@cyrilXBT` / `@exploraX_` / `@daifukujinji` | 複数 destination の hub |
| **LINE 公式** | `@ClaudeCode_UT` / `@MakeAI_CEO` / `@daifukujinji` | リード獲得 (無料相談) → 法人研修 |
| **法人 HP** | `@ClaudeCode_love` / `@SuguruKun_ai` / `@Codestudiopjbk` | B2B 商談 |
| **メール / DM** | `@ai_explorer25` / `@ethancoder0` / `@jason_coder0` | 海外 EN 系 collab |
| **Newsletter / Beehiiv** | `@mmmiyama_D` / `@tetumemo` | リスト構築 |

#### 5.6.3 ofmeton Phase 1 推奨

**bio URL**: **note プロフィール直リンク** (`https://note.com/ofmeton`)

根拠:

- Phase 1 (~2026-07 末) の唯一の収益源は note 有料記事
- LINE / 法人 HP は時期尚早 (商材未確定)
- Lit.link 等の集約ページは月売上 5 万円突破後に検討

**Phase 2 → 3 移行**:

- Phase 2: note + Newsletter (Beehiiv 等) の hub に変更
- Phase 3: 商材確定後、LP 直リンク

### 5.7 メンバーシップ / 有料 link 配置 (P + Q)

#### 5.7.1 P_membership_url_placement (Sonnet 24)

| 位置 | min | Q1 | median | Q3 | max |
|---|---|---|---|---|---|
| in_body (本文に直接 URL) | 0% | 70% | **80%** | 85% | 95% |
| in_reply (self-reply に URL) | 0% | 5% | 15% | 25% | 90% |
| in_quote_rt (引用 RT に URL) | 0% | 0% | 5% | 10% | 20% |

**重要 finding**: 競合は **本文埋込が圧倒的主流 (median 80%)**。self-reply 主軸は `@tetumemo (90%)` / `@daifukujinji` のみ。

#### 5.7.2 ofmeton 採用初期値

| 位置 | 採用率 |
|---|---|
| in_body | **70%** (median 比 88%) |
| in_reply | **25%** (median 比 167%) |
| in_quote_rt | 5% |

**設計意図**: [推定] self-reply 採用率を競合平均より高めるのは、X の本文文字数制限 (280 字) で「失敗談 + 詳細」を本文に詰めるとリンクを置くスペースがないため。失敗談本文 → self-reply に note 詳細リンク。[要検証] Phase 1 で in_body / in_reply 別の url_link_clicks reward を比較計測。

#### 5.7.3 Q_free_to_paid_signal (CTA tweet パターン 5 種、ofmeton 採用案)

**競合 30+ 例から抽出した CTA tweet 5 パターン**:

| pattern | 例 | 競合採用者 |
|---|---|---|
| **A: 失敗談 → 解決法へ誘導** | "Claude Code で確定申告コードを書かせて、計算式ミスで税理士に怒られた話 → 失敗パターン全 7 個を note にまとめました 👇" | (ofmeton オリジナル、competitor `@mmmiyama_D` 派生) |
| **B: 完全版 / 決定版 誘導** | "この記事でもっと詳しく👇" / "完全版はこちら👇" / "9 割が知らない〜完全版はこちら👇" | `@ClaudeCode_love` / `@Codestudiopjbk` |
| **C: 無料部分提示 → 有料へ** | "無料部分だけでも約 1 万文字" → "全文は note で (980 円)" | `@masahirochaen` |
| **D: 数値証明 + CTA** | "500 いいね以上獲得した記事を note で完全公開しました (3,000 字)" | `@ClaudeCode_love` |
| **E: 希少性 + 限定** | "24 時間で消します" / "消される前に" | `@MakeAI_CEO` (ただし誇大広告風で ofmeton 非推奨) |

**ofmeton 採用**: **A + B + C を主軸**、D は補助、E は使わない。

### 5.8 媒体間連動 (T_cross_platform_linkage)

#### 5.8.1 Sonnet 24 アカ集計

主要 linked platform (重複あり、24 アカ集計):

```
note          : 13/24 (54%)  ※「note」「note (X Article)」「note (要約記事)」含む
YouTube       :  7/24 (29%)  ※「youtube」「YouTube (動画引用)」含む
LINE          :  6/24 (25%)
own_site      :  6/24 (25%)
GitHub        :  4/24 (17%)
Telegram      :  2/24 ( 8%)
Newsletter    :  2/24 ( 8%)
Spotify       :  1/24 ( 4%)
Substack      :  1/24 ( 4%)
```

#### 5.8.2 ofmeton 採用配分 (Phase 1)

| 連動先 | 採用 | 用途 |
|---|---|---|
| **X ↔ note** | ✅ 主軸 | X 投稿の長尾 → note 詳細記事 |
| **X ↔ Instagram** | ✅ 主軸 | X 短文 ↔ IG カルーセル (1 トピック 3 媒体展開) |
| YouTube | ❌ Phase 1 | Phase 2 で検討 |
| GitHub | ✅ 補助 | portfolio リポ連動 (作例集として) |
| Newsletter | ❌ Phase 1 | Phase 2 で検討 (note maga が代替) |
| LINE 公式 | ❌ Phase 1 | Phase 3 で検討 (商材確定後) |
| Substack | ❌ | 採用見送り |

#### 5.8.3 1 トピック × 3 媒体展開 (publishing-wiki-ingest の標準フロー)

| 媒体 | 役割 | 投稿時間ラグ | 例 |
|---|---|---|---|
| **X** | 拡散 → note 送客 | T (基準) | "Claude Code で確定申告コードを書かせて失敗した話 (note 詳細あり)" |
| **note** | 詳細・収益化 | T-12h (X より早く公開して X で予告) | "Claude Code 確定申告失敗パターン 7 種 + 学び (5,000 字無料)" |
| **Instagram** | ブランド・保存 | T+24h (X 投稿の翌日) | 9 枚カルーセル "Claude 確定申告失敗 9 ステップ" |

### 5.9 ブランド type (U) + 投稿パターン (V) + Thread 利用 (W)

#### 5.9.1 U_brand_type (Sonnet 24)

```
individual : 15 (63%)
pseudonym  :  6 (25%)
company    :  3 (13%)
```

**ofmeton 採用**: `individual` (ofmeton 名義は個人ブランド、本名公開はしない、ペルソナでもない)

#### 5.9.2 V_posting_pattern (Sonnet 24)

```
distributed : 18 (75%)
morning     :  4 (17%)
burst       :  2 ( 8%)
```

**ofmeton 採用**: `distributed` (時間帯バランス) + Phase 2 で `morning` 偏重を試行

#### 5.9.3 W_thread_usage (Sonnet 24)

```
mixed           : 13 (54%)
quote-rt-chain  :  7 (29%)
single-tweet    :  2 ( 8%)
thread          :  2 ( 8%)
```

**ofmeton 採用**: `mixed` (=「単発投稿 + 月数本の thread + たまの quote_rt_chain」を組み合わせる)

詳細:
- 月 30 投稿のうち、自己 thread = 4 投稿 (week 1 本)、quote_rt_chain = 2-3 投稿、single-tweet = 23-24 投稿
- thread は「failure_story + 学び」「業界別 industry_sop ステップ展開」で活用
- quote_rt_chain は「自分の過去ツイートを再評価 / 続編」用

#### 5.9.4 S_disagreement_handling (Sonnet 24)

```
ignore : 18 (75%)
engage :  6 (25%)
```

**ofmeton 採用**: 基本 `ignore`、ただし「事実誤認に対する訂正」「Claude API 等の技術的誤情報」だけは `engage` する (= ハイブリッド)

### 5.10 独自視点 / 発信トリガー (R_unique_perspective_trigger、Sonnet 24)

> **データ source**: `65-item-analysis.jsonl` の `R_unique_perspective_trigger` フィールド (24 アカ全件)。各アカの「何を見て発信を起動するか + 独自視点の取り方」を構造化。

#### 5.10.1 24 アカ R 値カテゴリ化

24 アカの R_unique_perspective_trigger を主成分でカテゴリ化:

| カテゴリ | 件数 (24 中) | 代表アカ | トリガー源 |
|---|---|---|---|
| **A. 海外速報パラフレーズ型** | **9 (38%)** | @ClaudeCode_love / @ClaudeCode_UT / @Codestudiopjbk / @claudecode_lab / @commte / @cyrilXBT / @obsidianstudio9 / @tetumemo / @SuguruKun_ai | Anthropic 公式 / GitHub trending / 海外 X / Reddit r/ClaudeAI 等を即時翻訳 |
| **B. 海外コミュニティ発掘型** | **3 (13%)** | @Shimayus / @ObsidianOtaku / @so_ainsight | Reddit / GitHub OSS / 海外 X バズで「日本語未検証 / 日本語コンテンツゼロ」を発掘者ポジション |
| **C. 実機検証 + 一次情報型** | **4 (17%)** | @mmmiyama_D / @daifukujinji / @tetumemo (重複) / @SuguruKun_ai (重複) | 自分で実際に動かす + screenshot + 検証ログを軸に |
| **D. 著名人発言 / 権威付け型** | **3 (13%)** | @cyrilXBT / @exploraX_ / @ai_explorer25 | Altman / Pichai / Karpathy / Anthropic CEO の発言・取材を fook に |
| **E. ニュース速報 + 取材型** | **2 (8%)** | @masahirochaen / @MakeAI_CEO | 現地取材 (Google I/O / NVIDIA / シリコンバレー) + 海外格差煽り |
| **F. 業界 / セクター特化型** | **2 (8%)** | @Atenov_D (Crypto / Polymarket) / @Fluyeporlaweb (Spanish 圏 OSS) | 特定セクター (Crypto / Spanish / NFT) のニッチ深掘り |
| **G. ライフハック / 収益化型** | **2 (8%)** | @ethancoder0 / @jason_coder0 | ライフハック / 就職活動 / 健康 + 数字でバイラル狙い |
| **H. 隠れた問題発掘型** | **1 (4%)** | @heynavtoor | Big Tech の意図的設計への疑念 + 査読論文引用 |

**重要 finding**: **A (海外速報パラフレーズ) が圧倒的主流 (38%)** で、24 アカの 1/3 以上が「海外即時翻訳」をトリガーにしている。これは competitor `paraphrase_rate median 65%` (§6.2) と整合する。

#### 5.10.2 ofmeton 採用案 (差別化レバー)

**ofmeton の独自視点 / 発信トリガー定義**:

| 採用軸 | 採用率 | 24 アカ カテゴリ比 | 差別化意図 |
|---|---|---|---|
| **C. 実機検証 + 一次情報型 (主軸)** | **50%** | 17% に対し **+194%** | first_hand 40% 軸と整合 (§3.4)。all-good-ops 業務全体が「Claude 活用ネタの宝庫」 |
| **A. 海外速報パラフレーズ型** | **15%** | 38% に対し **-61%** | 競合飽和カテゴリのため意図的に下げる。海外速報は paraphrase 20% 軸に限定 (§3.4) |
| **業種別 SOP 発掘型 (★unwritten)** | **20%** | **0%** | competitor 観測ゼロ。industry_sop 月 20% (§3.8) と整合 |
| **D. 著名人発言 / 権威付け型** | **0-5%** | 13% に対し **-62%** | Anthropic CEO / Karpathy 引用は競合多用、ofmeton は実体験ベース (Hook 配分 authority_lead 10% §3.2 と整合) |
| **B + H. 発掘者 / 隠れた問題型** | **10%** | 17% (B+H 合計) に対し近似 | 「非エンジニア経営者が知らない隠れた業務効率化」を発掘 |

合計 = 100%。

#### 5.10.3 ofmeton 独自視点ステートメント (Writer プロンプト固定)

Writer プロンプトに以下を固定要素として注入:

```
あなたは ofmeton (個人ブランド、X 発信者) として投稿する。
独自視点 / 発信トリガー (R 軸) は以下の優先順位:

1. [主軸] 自分の業務 (Claude Code / 案件 commit log / 失敗ログ) で「実際に動かして得た一次情報」
   → screenshot + 検証ログ + 数値証明を必須
2. [副軸] 業種別 SOP の Claude 化 (経理 / 製造 / 教育 / 小売 / 士業)
   → competitor 観測ゼロの "unwritten territory"
3. [副副軸] 海外速報 (Anthropic 公式 / GitHub trending) のパラフレーズ
   → publishing_lag 1-6h で翻訳のみ、独自視点は実体験で補強
4. [絶対やらない] hype 系翻訳 (「えぐい」「ガチで神」)、AI 生成画像、誇大広告風 promise
```

#### 5.10.4 R 軸 Optimizer 改善対象としての扱い

- R 軸は 3.2 (Hook 配分) と整合性を持つ (実機検証型 = failure_story / first_hand と相性 ◎)
- Phase 1 で「C: 実機検証」50% を死守、A/B/D は posterior 更新で配分調整
- Reward 定義: R 軸別 PCR / url_link_clicks / qualified_lead を別 dimension で集計
- 30 投稿後に R カテゴリ別 reward 分布を比較 → 上位 2 カテゴリに集中

---

## 6. 競合 65 項目 × 24 アカ分析結果サマリ (詳細)

> 上流: `competitor-report-all-versions.md` の 65 項目分析結果。本節は §3-5 の根拠を distribution table に集約する。

### 6.1 A_structure (構造、9 項目)

(母集団 24 アカ、Sonnet 4.6 分析、各 25 posts/account)

| 指標 | min | Q1 | median | Q3 | max | IQR |
|---|---|---|---|---|---|---|
| short_lt140 | 2% | 8% | **12%** | 18% | 72% | 10% |
| medium_140_279 | 5% | 8% | 12.5% | 18% | 22% | 10% |
| long_280_699 | 16% | 35% | **35.5%** | 45% | 55% | 10% |
| super_long_gte700 | 4% | 12% | **27%** | 49% | 60% | 37% |
| article | 0% | 0% | 0% | 5% | 32% | 5% |
| thread_rate | 0% | 4% | 13.5% | 35% | 72% | 31% |
| reply_rate | 0% | 0% | 16.5% | 40% | 84% | 40% |
| quote_rate | 0% | 4% | 12.5% | 68% | 92% | 64% |
| **avg_chars** | 98 | 310 | **380** | 520 | 820 | 210 |

### 6.2 B_content_tone (5 項目)

| 指標 | min | Q1 | median | Q3 | max |
|---|---|---|---|---|---|
| primary_info_rate | 5% | 10% | 15% | 25% | 60% |
| paraphrase_rate | 20% | 40% | **65%** | 70% | 90% |
| opinion_rate | 5% | 15% | 20% | 25% | 52% |
| citation_explicit_rate | 5% | 30% | 55% | 70% | 95% |

tone 分布: `hype=12, educator=10, casual=2`

### 6.3 C_image (6 項目)

| 指標 | min | Q1 | median | Q3 | max |
|---|---|---|---|---|---|
| image_attach_rate | 5% | 12% | **44.5%** | 88% | 100% |
| ai_gen_image_rate | 0% | 5% | 5% | 10% | 60% |
| text_overlay_rate | 4% | 20% | 30% | 35% | 70% |

image_type_primary: `screenshot=23/24 (96%)`
color_scheme: `light=18 (75%), dark=6 (25%)`

### 6.4 D_video (5 項目)

| 指標 | min | Q1 | median | Q3 | max |
|---|---|---|---|---|---|
| video_attach_rate | 0% | 4% | 10% | 52% | 72% |

- hook_strength_first_3s: `medium=12, none=7, strong=4, weak=1`
- video_length_primary: `short=10, none=7, medium=5, long=2`

### 6.5 E_temporal (5 項目)

| 指標 | min | Q1 | median | Q3 | max |
|---|---|---|---|---|---|
| posts_per_day | 2.0 | 4.0 | **5.25** | 10.0 | 25.0 |
| weekday_weekend_ratio | 0.4 | 0.6 | 0.65 | 0.7 | 1.0 |

- primary_time_band: `morning=15, evening=3, afternoon=3, midnight=3`
- burst_pattern: `burst=17, distributed=6, mixed=1`
- publishing_lag: `immediate=21, next_day=2, few_days=1`

**重要 finding**: Sonnet 24 アカは `posts_per_day median 5.25`、empirical 34 アカは少ない (`@TensyokuRmla` のような週次 burst 系を含む)。ofmeton 1/日は **bottom decile** に位置する。

### 6.6 F_funnel (5 項目)

| 指標 | min | Q1 | median | Q3 | max |
|---|---|---|---|---|---|
| cta_explicit_rate | 8% | 30% | 37.5% | 60% | 95% |
| external_link_rate | 8% | 35% | 44% | 65% | 98% |
| follow_prompt_rate | 0% | 4% | 5% | 10% | 35% |
| lead_capture_rate | 2% | 5% | 11% | 16% | 52% |
| profile_click_rate | 4% | 5% | 5% | 8% | 10% |

### 6.7 G_hook (7 項目)

(§3.2 を参照、median 値再掲)

| Hook | median | ofmeton 採用 | 差分 |
|---|---|---|---|
| number_lead | 27.5% | 25% | -10% |
| negation_lead | 4.5% | 5% | +11% |
| question_lead | 8% | 10% | +25% |
| emotion_lead | 45% | 15% | **-67%** |
| authority_lead | 22% | 10% | -55% |
| promise_lead | 25% | 15% | -40% |
| **failure_story (verified)** | **5%** (competitor 比率 median、参考値) | **月 ≤ 4 上限** (比率 KPI 撤回、main-design v10.3 §2.4 / style-guide v1.3 §2.2 SSOT) | 比較不可 (比率 vs 月本数上限の異種軸) — Phase 1 で月 4 本確保を質で死守 |

### 6.8 H_x_format (7 項目)

| 指標 | min | Q1 | median | Q3 | max |
|---|---|---|---|---|---|
| hashtag_rate | 0% | 0% | **0%** | 2% | 5% |
| mention_rate | 3% | 5% | 8% | 13% | 84% |
| emoji_density | 0.02 | 0.8 | 0.8 | 1.8 | 1.8 |
| linebreak_density | 0.12 | 2.5 | **3.35** | 3.8 | 6.5 |
| quote_rt_chain_rate | 0% | 4% | 12.5% | 68% | 92% |
| self_reply_thread_rate | 0% | 5% | 13.5% | 35% | 65% |
| url_in_post_rate | 12% | 35% | 43.5% | 65% | 98% |

### 6.9 I-W (戦略 15 項目) — §5 で詳細展開済

### 6.10 ofmeton 差別化レバー検証

| レバー | 競合 median | ofmeton 採用 | 差分 | 競合 max | "unwritten" 判定 |
|---|---|---|---|---|---|
| **verified failure_story 月本数** | competitor median ≒ 月 1-2 本相当 (5% × 25 posts) | **月 ≤ 4 本上限** (比率 KPI 撤回、main-design v10.3 §2.4 / style-guide v1.3 §2.2 SSOT) | 質で差別化 (実機検証 + 公開許諾 gate + DLP redaction + 業法ガード OK) | competitor max 月 5 本 (`@mmmiyama_D` 20% × 25 posts) | ★比率ではなく **verified の質**で差別化、Phase 1 月 4 本確保が目標 |
| **primary_info_rate (first_hand)** | 15% | 40% | **+167%** | 60% | top decile に到達 |
| **citation_explicit_rate** | 55% | 65% | +18% | 95% | Q3 帯 |
| **industry_sop 月投稿率** | ~0% | 20% | ∞ | ~10% (`@MakeAI_CEO`) | ★unwritten 領域 |
| **non-engineer target 言語比率** | ~10% [推定] | 70%+ | +600% | ~20% [推定] | ★unwritten 領域 (推定値は競合 24 アカの "非エンジニア向け" 用語密度サンプリングベース、Phase 1 後半に再測定 [要検証]) |

### 6.11 "unwritten territory" 検出 (theme × format 空白セル)

「theme = 業界別 SOP」「format = failure_story + 数値証明 + screenshot」の組合せは 24 アカで観測ゼロ。

| theme | format | 競合採用 | ofmeton 採用方針 |
|---|---|---|---|
| 経理 × failure_story | 中文 + screenshot | 0/24 | ★主軸 |
| 採用面接 × industry_sop | 長文 + Article | 0/24 | ★Phase 1 後半 |
| 契約書レビュー × Claude | 中文 + screenshot | 0/24 | ★Phase 1 |
| 議事録 × Claude | 短文 + screencast | 1/24 (`@daifukujinji`) | 採用 |
| 中小企業の人事 × Claude | thread | 0/24 | ★Phase 2 |
| Yahoo!広告 × Claude (非エンジニア) | 中文 + screenshot | 0/24 | ★Phase 2 |
| 確定申告 × Claude | 失敗談 long | 0/24 | ★主軸 |
| 在庫管理 × Claude | 業界別 | 0/24 | Phase 2 |

---

## 7. 引き出し (改善施策ライブラリ、cs:s2-54 由来)

> Optimizer が後で逐次採用判断するための「具体施策ストック」。40+ items。

### 7.1 構造系 (10 items)

1. **超長文 ≥700 字を月 2 本以下に抑制** — competitor median 27% は impression 集中のため過剰。ofmeton は 5% 限定
2. **thread (自己 reply) は月 4 本** — 失敗談 + 学び型に限定使用
3. **Article (X Article) は月 1 本** — note 連動の決定版を Article 化
4. **quote_rt_chain は月 2-3 投稿** — 過去ツイートの再評価 / 続編
5. **短文 (<140) は 40% で安定運用** — 競合 median 12% より高めに置く (短文 = 試行コスト低、A/B が回しやすい)
6. **avg_chars 200-300 字を主軸** — 競合 median 380 字より短め
7. **改行 (linebreak_density) は 3-5 個** — 競合 median 3.35 と合わせる
8. **絵文字は 0-2 個/投稿 (emoji_density 0.5-1.5)** — 競合 Q1-Q3 帯
9. **hashtag は使わない (0/投稿)** — 競合 median 0、Q3 0.02 (5 投稿に 1 個未満)
10. **mention は月 3-5 投稿のみ** — 競合 median 8%

### 7.2 長さ・字数系 (5 items)

11. **note 無料記事 4,000-6,000 字** — competitor で note_link pinned 最長は `@masahirochaen` 5.5 万字。ofmeton はミドル帯
12. **note 有料記事 8,000-12,000 字** — `@so_ainsight` 42,000 字は outlier、`@masahirochaen` ~10,000 字が standard
13. **X 中文の最適字数 200-260 字** — 280 制限 -20-80 字、self-reply への余白
14. **Instagram カルーセル文字数: 各スライド 80-120 字** — 9 枚で総 720-1,080 字
15. **長文ツイート 350-500 字を月 6 本** — 失敗談 + 学び帯

### 7.3 トーン系 (5 items)

16. **tone = educator** (24 中 10 アカ採用、`@commte` / `@SuguruKun_ai` 等) — hype 系 12 と 2 nd-largest
17. **emotion_lead は competitor の 1/3** — 45% → 15% で AI 感を回避
18. **「えぐい」「ガチで神」「マジでおすすめ」は使わない** — competitor で多用、非エンジニア経営者層に違和感
19. **失敗談トーンは「淡々と」** — 「やらかしたw」より「3 ヶ月で 100 回失敗しました」
20. **絵文字は機能語化** — 「👇」「✅」「⚠️」を構造化に使う (装飾には使わない)

### 7.4 媒体連携系 (5 items)

21. **X → note リンクは self-reply に置く** — 本文 280 字を主旨に集中させる
22. **Instagram → note は bio link tree 経由** — Instagram の URL ポリシー対応
23. **note → X は導入文 + 結論を抜粋投稿** — 5,000 字記事を 250 字に圧縮 + リンク
24. **GitHub portfolio リンクは X bio 補助に**
25. **YouTube は Phase 2 以降** — Phase 1 は 3 媒体に集中

### 7.5 戦略パターン (10 items)

26. **verified failure_story を月 ≤ 4 本 上限で投下** (比率 KPI 撤回、main-design v10.3 §2.4 / style-guide v1.3 §2.2 SSOT) — 競合 max 20%、ofmeton は供給制約と質で差別化。月 4 本確保できない月は first_hand × industry_sop / before_after で代替
27. **industry_sop は月 6 本 (20%)** — competitor unwritten、業界別 SOP の Claude 化
28. **citation_explicit を 65%+ で安定** — 出典明示は信頼の core
29. **first_hand (primary_info) を 40% で主軸** — competitor median 15% から逆転
30. **pinned は「失敗談 + 解決法へ note 誘導」型** — 競合 mixed type を採用
31. **bio = note プロフ URL** (Phase 1)
32. **disagreement は基本 ignore、技術誤情報のみ engage** — competitor 75% ignore
33. **posts_per_day = 1** (Phase 1) — competitor median 5.25 から大幅減
34. **morning + afternoon = 60%** — 競合と整合 + 業務時間帯ターゲティング
35. **midnight は 5% 以下** — competitor 海外 EN 系 only

### 7.6 視覚 / 画像系 (5 items)

36. **screenshot を全体の 50%** — competitor screenshot_primary 96%
37. **text_overlay tile (Noto Sans Heavy)** を 20% — visual-design-system.md 連動
38. **AI 生成画像は 5% 以下** — competitor median 5%、非エンジニア違和感対策
39. **color_scheme = light** — competitor 75%、清潔感
40. **動画は 15-30 秒の screencast** — competitor video_length short=10/24

### 7.7 数値 / KPI 系 (3 items)

41. **Phase 1 終了 (~2026-07 末) で 90 投稿後にレビュー** — Thompson Sampling 第 1 期更新
42. **note 月売上 = 1 万円 / 3 万円 / 10 万円** (Phase 1/2/3 KGI)
43. **follower 数 500 / 2,000 / 5,000** (Phase 1/2/3 KGI)

---

## 8. Phase 1 採用初期値 (Optimizer 起動時の bootstrap)

> 上流: `main-design-all-versions.md §7.2.1` で定義された改善対象 8 パラメータと対応。

### 8.1 採用初期値早見表

| Optimizer parameter | 初期値 (採用) | source | Thompson Sampling prior |
|---|---|---|---|
| **(1) 投稿時間帯** | morning 30% / noon 15% / afternoon 30% / evening 20% / midnight 5% | §3.1 | empirical Bayes 起点 (24 アカ集計から α/β、観測 N_obs < 5 は Beta(1,1)) |
| **(2) Hook 配分** | number 25% / question 10% / emotion 15% / authority 10% / promise 15% / negation 5% / その他 20% (合計 100%) + verified failure_story 月 ≤ 4 上限 (比率 KPI 撤回) | §3.2 | empirical Bayes 起点 or Beta(1,1) 一様分布、failure_story は Thompson 適用外 (上限制約のみ) |
| **(3) publishing_lag** | translation 1-6h / paraphrase 6-12h / opinion 24-48h / first_hand 即時〜数日 (固定値なし) | §3.3 | discrete dist (4 軸、first_hand は推奨値なし) |
| **(4) 4 排他軸 (content type)** | translation 10% / paraphrase 20% / opinion 30% / first_hand 40% | §3.4 | Dirichlet α=(1,2,3,4) |
| **(5) citation_explicit_rate** | 65% | §3.5 | Beta(13, 7) |
| **(6) X format 比率 (Current SSOT v10.3)** | 短文単発 50% / 中文単発 25% / 長文単発 10% / スレッド 10-15% | §3.6.1 (main-design v10.3 §6.4.2 SSOT) | Beta(2,8) 弱い prior (全 fmat 共通) |
| (6 歴史) X format 比率 (v9.2 §2.5 撤回済) | 短文 60% / スレッド 30% / 長文 10% | §3.6.2 歴史節 | Beta(6,4) / Beta(3,7) / Beta(1,9) (撤回済) |
| (6 補助) X format 比率 (文字数軸 empirical) | 短文 12% / 中文 12.5% / 長文 35.5% / 超長文 5% (ofmeton 上限) / Article 月 1 本 | §3.6.3 補助軸 | — |
| **(7) Visualizer モード** | 画像 70% / 動画 15% / テキストのみ 15% | §3.7 | Dirichlet α=(7,1.5,1.5) |
| **(8) industry_sop 投稿率** | 月 20% (= 6 投稿) | §3.8 | Beta(4, 16) |

### 8.2 Optimizer 起動時の挙動

1. **Phase 1 開始時 (~2026-06 初)**:
   - 上記初期値を Optimizer に投入
   - Thompson Sampling 事前分布で各パラメータを初期化
   - X 1 日 1 投稿 = 30 日で 30 投稿
2. **30 投稿後 (~2026-07 初)**:
   - 各パラメータの (success, failure) を集計
   - posterior 更新 (success 定義: impression top 30% OR url_link_clicks > median)
   - 初期値から逸脱が大きい場合は人間レビュー (`org-designer` 起動)
3. **60 投稿後 (~2026-08 初)**:
   - lever ごとに winner / loser 確定
   - verified failure_story 月 ≤ 4 上限 / first_hand 40% / industry_sop 20% は **死守** (差別化の Core)
   - 他は Thompson 結果に従う

### 8.3 死守パラメータ (Optimizer が動かしてはいけない)

| パラメータ | 理由 |
|---|---|
| verified failure_story 月 ≤ 4 上限 (比率 KPI なし、main-design v10.3 §2.4 / style-guide v1.3 §2.2 SSOT) | competitor で空白の差別化 Core、供給制約由来 (case verification 担保) |
| first_hand (primary_info) ≥ 30% | competitor で空白の差別化 Core |
| industry_sop 月 ≥ 5 投稿 | competitor unwritten 領域 |
| hashtag 0 個/投稿 | competitor 標準 + [推定] impression 落ちる ([要検証] Phase 1 で hashtag あり/なし投稿の reward 比較が必要) |
| AI 生成画像 ≤ 10% | 非エンジニア違和感対策 |

### 8.4 自由パラメータ (Optimizer が optimize する)

| パラメータ | レンジ | 制約 |
|---|---|---|
| 時間帯比率 | 各 band 5-40% | 合計 = 100% |
| Hook 配分 (verified failure_story 除外) | 各 5-30% | failure_story 除外で合計 = 100% (number/negation/question/emotion/authority/promise/その他) |
| format 比率 (Current SSOT 50/25/10/10-15) | 短文 30-60%、中文 15-35%、長文 5-20%、スレッド 5-20% | 合計 = 95-100% (スレッド側 5% 弾性) |
| Visualizer 比率 | image 50-80%、video 5-25%、text 10-20% | 合計 = 100% |

---

## 9. 出典・データ source

### 9.1 競合分析 source (本書根拠)

| データ | path (絶対) | 生成日時 | 件数 |
|---|---|---|---|
| 65-item-analysis.jsonl | `/Users/rikukudo/Projects/all-good-ops-xad-initialvalues/outputs/improvements/x-account-design-consolidated/initial-values/65-item-analysis.jsonl` | 前 sub-agent (2026-05-27 午前) | 24 records |
| empirical-stats.csv | `/Users/rikukudo/Projects/all-good-ops-xad-initialvalues/outputs/improvements/x-account-design-consolidated/initial-values/empirical-stats.csv` | 前 sub-agent (2026-05-27 午前) | 34 records × 25 cols |
| population-list.md | `/Users/rikukudo/Projects/all-good-ops-xad-initialvalues/outputs/improvements/x-account-design-consolidated/initial-values/population-list.md` | 前 sub-agent (2026-05-27 午前) | 34 アカ |
| population-raw.json | `/Users/rikukudo/Projects/all-good-ops-xad-initialvalues/outputs/improvements/x-account-design-consolidated/initial-values/population-raw.json` | 前 sub-agent (2026-05-27 午前) | 34 records |

### 9.2 raw データ source

| データ | path | 生成日時 | 件数 |
|---|---|---|---|
| Articles 本文 | `/Users/rikukudo/Projects/all-good-ops-xad-initialvalues/raw/publishing/research/2026-05-27-initial-values/articles/` | 2026-05-27 03:10:51 UTC〜 | 37 |
| User info | `/Users/rikukudo/Projects/all-good-ops-xad-initialvalues/raw/publishing/research/2026-05-27-initial-values/users/` | 2026-05-27 03:04:58 UTC〜 | 34 |
| Pinned tweets | `/Users/rikukudo/Projects/all-good-ops-xad-initialvalues/raw/publishing/research/2026-05-27-initial-values/pinned/` | 2026-05-27 03:09:31 UTC〜 | 30 |
| Publisher top10 posts | `/Users/rikukudo/Projects/all-good-ops-xad-initialvalues/raw/publishing/research/2026-05-27-initial-values/posts-publisher-top10/` | 2026-05-27 03:06:31 UTC〜 | 10 アカ × ~100 tweet |
| query-meta (reproducibility) | `/Users/rikukudo/Projects/all-good-ops-xad-initialvalues/raw/publishing/research/2026-05-27-initial-values/query-meta.json` | 2026-05-27 03:04:58 UTC | 151 calls |
| consolidated-dataset | `/Users/rikukudo/Projects/all-good-ops-xad-initialvalues/raw/publishing/research/2026-05-27-initial-values/consolidated-dataset.json` | 前 sub-agent | まとめ |

### 9.3 上流ドキュメント (consolidation 済)

| ドキュメント | path | 関係 |
|---|---|---|
| main-design (A 系列) | `/Users/rikukudo/Projects/all-good-ops-xad-initialvalues/outputs/improvements/x-account-design-consolidated/main-design-all-versions.md` | §7.2.1 で改善対象 8 パラメータ定義 (本書 §3 の対象) |
| style-guide (B 系列) | `/Users/rikukudo/Projects/all-good-ops-xad-initialvalues/outputs/improvements/x-account-design-consolidated/style-guide-all-versions.md` | §3 で X 投稿の hard rule (本書 §4.1 が遵守) |
| competitor-report (C 系列) | `/Users/rikukudo/Projects/all-good-ops-xad-initialvalues/outputs/improvements/x-account-design-consolidated/competitor-report-all-versions.md` | 競合分析の方法論 (本書 §1, §6 の上流) |
| query-design (D 系列) | `/Users/rikukudo/Projects/all-good-ops-xad-initialvalues/outputs/improvements/x-account-design-consolidated/query-design-all-versions.md` | 母集団選定の query 設計 (本書 §1 の上流) |

### 9.4 関連 SSOT (all-good-ops のスキル / 設計書)

| skill | path | 連動箇所 |
|---|---|---|
| content-quality-rubric | `.claude/skills/content-quality-rubric.md` | content-reviewer が本書 §4 の Writer 出力をチェック |
| visual-design-system | `.claude/skills/visual-design-system.md` | §4.2 IG カルーセル / §3.7 Visualizer モード |
| multi-platform-publishing | `.claude/skills/multi-platform-publishing.md` | §5.8 媒体間連動 |
| non-engineer-translation | `.claude/skills/non-engineer-translation.md` | Writer の言語ルール |
| note-revenue-playbook | `.claude/skills/note-revenue-playbook.md` | §4.3 note 構成 |
| publishing-wiki-ingest | `.claude/skills/publishing-wiki-ingest.md` | §5.8.3 1 トピック × 3 媒体展開 |

---

## 補遺: publisher 10 アカ次フェーズ予告

publisher 10 アカ (`@ebikani_hasami` / `@saeroyi_ican` / `@sekine_1234` / `@yura_ai123` / `@Kh_Yabu` / `@carverfomo` / `@kenfjt` / `@TensyokuRmla` / `@hqmank` / `@worldnetworkjp`) は **本書では empirical stats のみ採用**、Sonnet 戦略分析 (I-W 15 項目) は次フェーズ。

理由:

- 前 sub-agent が Sonnet 4.6 65 項目分析を 24 アカで完了した直後に socket error で停止 (引継ぎ報告から確認)
- 24 アカで母集団分析として統計力は確保 (median / Q1 / Q3 / max が安定収束)
- publisher 10 は target_fit_score top で「small follower × high engagement quality」型なので、戦略分析の追加で **§3.1 (時間帯) / §3.2 (Hook) / §3.4 (4 排他軸) の中央値が若干シフトする可能性**
- 次フェーズ (2026-05-28 以降) で publisher 10 を Sonnet 分析 → 本書 §3-5 を delta update

### 補遺.1 publisher 10 の empirical 傾向 (本書での扱い)

| アカ | followers | avg_chars | primary_band | 特徴 |
|---|---|---|---|---|
| @ebikani_hasami | 838 | 186.6 | morning | 短文 + 中文型 (短文 42% / 中文 42%) |
| @saeroyi_ican | 1,878 | 46.5 | evening | 短文 98% の極端 burst 型 |
| @sekine_1234 | 846 | 99.2 | afternoon | 短文 + 中文混在 |
| @yura_ai123 | 1,319 | 87.6 | morning | 短文中心、引用 RT 40% (chain 型) |
| @Kh_Yabu | 1,158 | 58.6 | midnight | 極端な midnight 型 (34%) |
| @carverfomo | 16,145 | **2,302** | morning | 超長文 99% の特殊型、video 97% |
| @kenfjt | 2,133 | 55.2 | afternoon | 短文 92% + 引用 RT 52% |
| @TensyokuRmla | 574 | 85.0 | afternoon | 短文 86% + 高 reply rate 95% |
| @hqmank | 4,718 | 111.3 | noon | 短文 76% + 高 reply rate 90% |
| @worldnetworkjp | 1,761 | 147.5 | afternoon | 短文 54% + 中文 23% + self_thread 52% |

**観察**: publisher 10 の多くは **短文中心 (median 90%+)** で、Sonnet 24 アカ (= 中長文中心) と分布が大きく異なる。これは「target_fit_score = 高 engagement_quality / followers 比」で選ばれた small follower 帯の特性。

次フェーズの Sonnet 戦略分析では:
- 短文中心アカのファネル構造 (TOFU 比率はおそらく 80%+ になる)
- bio_url / pinned の使い方 (small follower 帯では「pinned で号外パターン」が増える可能性)
- 7 軸 Hook 分布 (短文だと number_lead が中心になりやすい)

を確認し、本書 §3-5 のレンジを補正。

---

**本書 v1 終わり**

(本書の改訂版は publisher 10 アカ Sonnet 分析完了後の v2 で発行予定 — 2026-05-28 以降)
