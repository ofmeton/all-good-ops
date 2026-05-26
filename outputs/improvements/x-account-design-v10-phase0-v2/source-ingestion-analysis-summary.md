# 発信ネタ仕入れ方法分析 summary (Phase 0 v2 #2)

> 24 アカ × top 20 投稿 = 480 投稿を Sonnet 4.6 (claude-sonnet-4-6) で質的分析。  
> 9 項目を CSV 化、中央値・分布で transfer 推奨値の根拠を作る。  
> raw: `source-ingestion-analysis.csv` / 各 call response: `source-ingestion-analysis-raw/<handle>.json`

---

## 1. 実行サマリ

| 項目 | 値 |
|---|---|
| 分析対象 | 24 アカ (新 20 + 既存信頼 4) |
| 投稿 | 480 (各アカ top 20 by like count) |
| 分析モデル | claude-sonnet-4-6 |
| 推定コスト | ¥84 (上限 ¥140) |
| **実コスト** | **¥71 ($0.4486)** |
| 完走率 | 24 / 24 (100%) |
| input tokens | 101,575 |
| output tokens | 9,590 |
| cache_read tokens | 0 (system prompt が 1024 tok 未満で cache 非適用) |

> ※ Sonnet 4.6 の prompt caching は ≥ 1024 input tok 単位でブロック化される。本分析の system は 450 tok 程度なので cache_control 指定しても効かなかった。次フェーズ (>= 24 アカ繰り返し) では system を冗長化して cache hit を狙う余地あり。

---

## 2. 9 項目 中央値・分布

| 項目 | median | mean | min | max |
|---|---|---|---|---|
| publishing_lag_hours | **9** | 13.9 | 1 | 48 |
| translation_rate_pct | 7.5 | 9.6 | 0 | 30 |
| paraphrase_rate_pct | **32.5** | 34.0 | 5 | 70 |
| opinion_rate_pct | 17.5 | 18.5 | 5 | 50 |
| citation_explicit_rate_pct | 37.5 | 33.0 | 5 | 75 |
| cross_platform_intake_rate_pct | **40.0** | 47.7 | 15 | 75 |
| original_rate_pct | 27.5 | 37.9 | 10 | 85 |

### 解釈

- **翻案 (paraphrase) 主導**: 中央値 32.5% で最大の比率。"海外情報を日本語化" が業界スタンダード
- **直訳 (translation) は低い**: 7.5%。意訳・要約に再加工するのが主流
- **所感 (opinion) と一次体験 (original) は両方とも中程度**: 17.5% / 27.5%。合計 45% が「自分の言葉」枠
- **publishing_lag 速い**: 中央値 9h = 海外発表から半日以内
- **引用元明示は半数以下**: 37.5%。誠実性 (URL 明示) で差別化可能

---

## 3. 情報源 頻度ランキング (24 アカ中)

| 情報源 | 出現アカ数 | カバー率 |
|---|---|---|
| **海外X (Twitter)** | 23 | 96% |
| **公式ブログ (Anthropic/OpenAI 等)** | 18 | 75% |
| **GitHub** | 15 | 62% |
| Podcast | 6 | 25% |
| YouTube (動画) | 6 | 25% |
| 案件メモ / 自身の実務 | 7 | 29% |
| 論文 / 公式ドキュメント | 4 | 17% |
| Discord | 1 | 4% |
| 本 | 1 | 4% |
| 国内公的機関資料 | 1 | 4% |

### 解釈

- **3 大情報源 = 海外X + 公式ブログ + GitHub** で 80%+ の競合をカバー
- Discord / 国内資料 / 案件メモ は使用率が低い = **差別化レバーの候補**
- Podcast / YouTube は中位 (25%)

---

## 4. アカウント タイポロジー (4 類型)

### Type A: 海外X 翻案・要約・パラフレーズ型 (大多数 / 12 アカ)

paraphrase ≥ 30% かつ translation+paraphrase 合計 ≥ 50%。海外X や公式ブログを日本語化する定型フォーマット。

代表: ClaudeCode_UT / obsidianstudio9 / ObsidianOtaku / so_ainsight / Codestudiopjbk / SuguruKun_ai / ClaudeCode_love / tetumemo / claudecode_lab / MakeAI_CEO

特徴:
- 「【保存版】見出し + ▶︎箇条書き + 煽り CTA」の定型構造
- 末尾に外部リンク (note / 自サイト誘導) 多い
- publishing_lag 6-18h

### Type B: 一次体験・本人実装型 (3 アカ)

original ≥ 50% かつ実体験ベース。代表: **mmmiyama_D (orig 65%)** / **daifukujinji (orig 75%)** / **masahirochaen (orig 35%, 現地取材)**

特徴:
- 自分でツールを触ってデモを出す
- プロンプトの具体的開示
- 再現性重視

→ **ofmeton の発信ポジションに最も近い。学習対象**

### Type C: キュレーション再パッケージ型 (英語圏 / 5 アカ)

英語圏で original ≥ 70% に見えるが、内容は「リスト編集」「他Xスレッドの転載」が中心。
代表: Fluyeporlaweb (85%) / ai_explorer25 (85%) / ethancoder0 (75%) / cyrilXBT (75%) / heynavtoor (65%)

特徴:
- 同一コンテンツを複数日に再投稿 (リーチ最大化)
- citation_explicit_rate が極端に低い (5-15%)
- 情報の新規性は低い

→ ofmeton としては避けるべきパターン

### Type D: コミュニティ活動・短文返信型 (2 アカ)

リプライ主体で独自情報発信は少ない。Atenov_D (リプライ 15/20) / Shimayus (一次取材+コミュ活動)

→ X 上の存在感醸成パターン。Phase 1 後半で参考にする可能性

---

## 5. citation_explicit_rate の分布

| range | 該当アカ数 |
|---|---|
| 5-20% (引用希薄) | 6 (英語圏キュレーション型に多い) |
| 30-50% (中程度) | 14 (Type A の大半) |
| **60-75% (引用厚い)** | 4 (commte 75%, ClaudeCode_love 55%, SuguruKun_ai 55%, ClaudeCode_UT 60%) |

→ 引用元明示の高さは「実用性・誠実性」の差別化軸。中央値 37.5% を超えた **60%+ を狙うのは現実的なレバー**

---

## 6. publishing_lag_hours の分布

| 速さ | 該当アカ数 |
|---|---|
| 1-6h (速報型) | 9 (masahirochaen 1h, daifukujinji 2h, mmmiyama_D 6h など) |
| 9-12h | 8 |
| 18-24h | 3 |
| 48h+ | 4 (MakeAI_CEO / heynavtoor / ai_explorer25 / ethancoder0) |

→ 競合は速報重視。中央値 9h。ofmeton が **24-48h に意図的に遅らせる** ことは "解釈時間を確保した所感型" の差別化レバーになり得る

---

## 7. 次フェーズ (#3) への引き継ぎ

- 中央値 + Tier 分類は `competitor-report-v2.md` で詳述
- ofmeton 用 transfer 推奨値は `style-guide-v1.1.md` で v10.3 §4.3 を更新
- 引用元明示 60%+ / publishing_lag 24-48h / opinion+original 60% の 3 つを差別化レバーとして提案

---

## 8. 完了判定

- [x] 24 アカ分の source-ingestion-analysis.csv 出力
- [x] 中央値 + 上位アカの特徴をまとめた summary.md
- [ ] Style Guide v1.1 への反映 (次 file)
- [ ] competitor-report-v2.md (次 file)
