# Population List — x-account-design Initial Values (2026-05-27)

## 母集団 (34 アカ最終リスト)

- 既 24 アカ = 信頼 4 (人間が手動評価で参考になると確定) + 追加 20 (Phase 0 v2 で twitterapi.io バースト検出)
- 追加 10 アカ = Phase 0 v3 publisher 5 query 上位 target_fit_score (audience query 5 query は除外)

## A. 既 24 アカ (Phase 0 v2)

### A.1 信頼 4 (人間 manual cohort)

- @Shimayus
- @SuguruKun_ai
- @masahirochaen
- @ClaudeCode_love

### A.2 追加 20 (Phase 0 v2 burst-detected)

- @Atenov_D
- @ClaudeCode_UT
- @Codestudiopjbk
- @Fluyeporlaweb
- @MakeAI_CEO
- @ObsidianOtaku
- @ai_explorer25
- @claudecode_lab
- @commte
- @csaba_kissi
- @cyrilXBT
- @daifukujinji
- @ethancoder0
- @exploraX_
- @heynavtoor
- @jason_coder0
- @mmmiyama_D
- @obsidianstudio9
- @so_ainsight
- @tetumemo

## B. 追加 10 アカ (Phase 0 v3 publisher top target_fit)

| rank | handle | followers | avg_engagement | non_eng_fit | target_fit_score |
|---|---|---|---|---|---|
| 1 | @ebikani_hasami | 838 | 3881.0 | 0 | 463.13 |
| 2 | @saeroyi_ican | 1,876 | 8542.0 | 0 | 455.33 |
| 3 | @sekine_1234 | 846 | 3528.0 | 0 | 417.02 |
| 4 | @yura_ai123 | 1,191 | 4785.0 | 0 | 401.76 |
| 5 | @Kh_Yabu | 1,159 | 3613.0 | 0 | 311.73 |
| 6 | @carverfomo | 16,136 | 28188.0 | 0 | 174.69 |
| 7 | @kenfjt | 2,131 | 2148.0 | 0 | 100.80 |
| 8 | @TensyokuRmla | 575 | 543.5 | 0 | 94.52 |
| 9 | @hqmank | 4,689 | 4132.0 | 0 | 88.12 |
| 10 | @worldnetworkjp | 1,757 | 1356.0 | 0 | 77.18 |

## C. データ source

- 既 24 アカ tweet raw: `raw/publishing/research/2026-05-26-jp-ai-publishers-v2/raw/posts*/`
- 上位 10 publisher tweet raw: `raw/publishing/research/2026-05-27-initial-values/posts-publisher-top10/`
- 全 34 アカ user_info: `raw/publishing/research/2026-05-27-initial-values/users/`
- pinned tweets: `raw/publishing/research/2026-05-27-initial-values/pinned/` (30 件取得)
- Article 本文: `raw/publishing/research/2026-05-27-initial-values/articles/` (37 件取得)
- query-meta: `raw/publishing/research/2026-05-27-initial-values/query-meta.json` (cs:s1-51 準拠)

## D. target_fit_score 設計 (Phase 0 v3 publisher top10 選定)

```
target_fit_score = (avg_engagement / max(followers, 100)) * 100  # engagement quality
                 + non_eng_fit * 3                                # bio non-engineer signal weight

avg_engagement = mean(likes + retweets + bookmarks) of hits in 5 publisher queries
non_eng_fit = #(非エンジニア keywords in bio) - #(エンジニア keywords in bio), clamped >= 0
```

非エンジニア keywords: 経営 / 中小 / 業務 / 自動化 / 効率化 / 業界 / 現場 / 実務 / 活用 / 導入 / 解説
エンジニア keywords: エンジニア / プログラマ / Developer / プログラミング / コード / 実装

## E. 集計

- 母集団 = 34 アカ
- 解析対象 tweet 総数 = 3238
- user_info 取得 = 34/34
- pinned 取得 = 30/34
- Article 本文取得 = 37 (既 24 アカ 35 + publisher top10 5)