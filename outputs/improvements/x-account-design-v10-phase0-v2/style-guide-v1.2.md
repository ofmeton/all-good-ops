# ofmeton Style Guide v1.2 — Target 修正版

> v1.1 から 2 点を反映した patch 版。v1.1 (`style-guide-v1.1.md`) と並置運用し、Phase 1 着手時はこの v1.2 を採用。  
> v1.1 を上書きせず別 file として残置 (履歴保持)。

---

## 0. 版管理

| version | 日付 | 差分 |
|---|---|---|
| v1.0 | 2026-05-25 (v10.3 内蔵) | Phase 0 v1 (10 アカ) ベースの初期値 |
| v1.1 | 2026-05-26 (PR #23) | Phase 0 v2 (24 アカ + 9 項目分析) 反映 |
| **v1.2** | **2026-05-26** | **Target から士業を主軸格下げ + GitHub Trending 日次化** |
| v1.3 (将来) | Phase 1 30 日後 | 実測 PCR / url_link_clicks をフィードバック |

---

## 1. v1.1 → v1.2 差分まとめ

### 1.1 Target 定義の修正 (主要)

#### 旧 (v1.1 / v10.3)

> AI を活用したい非エンジニア (**中小事業者・士業・コンサル**) 経営者

#### 新 (v1.2)

> AI を活用したい非エンジニア (**中小事業者・コンサル**) 経営者
> ※ 士業 (税理士 / 社労士 / 行政書士 / 弁護士) は industry_sop で扱う **1 業種セグメント** に格下げ。発信トーンは経営者向けに統一しつつ、業種別 SOP 投稿では士業も対象事例として含める。

#### 変更理由

- **狭さの問題**: 士業は各業界カルチャーが独立 (税理士 / 社労士 / 行政書士 / 弁護士で専門用語・関心領域が異なる) → 横断する SOP 発信が難しく、主軸ターゲットにすると発信トーンがブレる
- **ofmeton 事業との整合**: AI 自動化代行 (KGI 2) の想定顧客は中小経営者中心。terra-isshiki / minpaku-cleaning / RICE CREAM の事例も士業向けではない
- **Phase 0 v2 知見の保持**: 士業系 hit (`Jeanscpa` / `sakai_tax` / `houki_ai_keiri`) は industry_sop の対象事例として残す。Q2 query は「士業 + 業務代行業」に拡張して候補プールを広げる

### 1.2 GitHub Trending を週次 → 日次に格上げ

#### 旧 (v1.1 §2 No.3)

> GitHub Trending — manual ingest (週次)

#### 新 (v1.2)

> GitHub Trending — **日次 cron** (07:00 JST / 全言語 + 日本語フィルタ)
> 実装: `apps/x-account-system/scripts/fetch-github-trending.py`
> 永続化: `raw/publishing/github-trending/YYYY-MM-DD.json`
> コスト: 無料 (HTML scrape 1 req/day = ¥0)

#### 変更理由

- 競合中央値の publishing_lag (9h) より速く GitHub OSS 動向を拾うには日次が下限
- GitHub Trending HTML scrape は無料 (公式 API なし / cron 負荷小)
- Tier 1 「Claude Code 機能速報」軸の素材 supply を増やす

---

## 2. v1.1 から継承する項目 (変更なし)

### 2.1 コンテンツ比率

| 種別 | 比率 |
|---|---|
| translation | 10% |
| paraphrase | 20% |
| opinion | 30% |
| original | 40% |

### 2.2 publishing_lag 設計

- translation: 1-6h
- paraphrase: 6-12h
- **opinion: 24-48h** (差別化レバー)
- original: 即時〜数日

### 2.3 citation_explicit_rate

**≥ 65%** (中央値 37.5% の 1.7 倍、誠実性レバー)

### 2.4 Hook 類型 KPI

| 類型 | 競合発信率 | ofmeton 目標 |
|---|---|---|
| failure_story | 0% | **15-25%** (8 倍差別化レバー) |
| industry_sop | ~8% | **20%** (← 士業も含む業種別 SOP として扱う) |
| non_engineer_translation | ≤5% | 25% |

### 2.5 情報源プリセット (v1.2 で No.3 のみ更新)

| 優先 | 情報源 | 取得経路 | 競合カバー率 | ofmeton 採用根拠 |
|---|---|---|---|---|
| 1 | 海外X (Anthropic / OpenAI / 開発者) | twitterapi.io (週次 cron) | 96% | 主流 |
| 2 | 公式ブログ | twitterapi.io 公式アカ監視 | 75% | 速報一次ソース |
| 3 | **GitHub Trending** | **日次 cron (07:00 JST)** | 62% | **Codex/Claude Code 系発見軸 (v1.2 で日次化)** |
| 4 | Claude Code 履歴 + Git commit + 案件メモ | 自リポジトリ scan + DLP redaction | 29% | 一次体験ソース、差別化レバー |
| 5 | Discord (Claude Code / Anthropic) | manual ingest (週次) | 4% | ほぼブルーオーシャン |
| 6 | Podcast | manual ingest (月次) | 25% | opinion 投稿の素材 |
| 7 | 音声メモ (案件中) | 公開許諾 gate 通過後 | — | Phase 1 後半で導入 |

---

## 3. 連動する変更 (本 PR で同時反映)

### 3.1 Q2 query 改訂 (`query-design.md` §1.3)

#### 旧

```
Q2 | "AI" ("士業" OR "税理士" OR "社労士" OR "行政書士") -is:retweet lang:ja min_faves:30
```

#### 新

```
Q2 | "AI" ("士業" OR "経理代行" OR "事務代行" OR "業務代行") -is:retweet lang:ja min_faves:30
```

→ 士業を主軸ターゲットから外したため、Q2 を「士業 + 業務代行業」に拡張。中小経営者向けの "業務代行業" カテゴリ (経理代行 / 事務代行 / 業務代行) を併合して候補プールを広げる。

### 3.2 competitor-report-v2.md の Tier 1 表記更新

§4 推奨コンテンツ角度の第 2 軸:
- 旧: 「業種別 SOP (経理/請求書/民泊清掃)」型
- 新: 「業種別 SOP (経理/請求書/民泊清掃/**士業も対象事例の 1 セグメントとして含む**)」型

### 3.3 v10.3 設計書 (x-account-design-v10-3.md) の主軸ターゲット行更新

L121 周辺:
- 旧: `Phase 2 後半に士業へ拡張する`
- 新: `Phase 2 後半に業種拡張する` (士業の固有名は外す、§10.9 業法ガードは残置)

§10.9 業法ガード章はそのまま残す (industry_sop で士業事例を扱う際の法務ガードとして依然必要)。

---

## 4. 完了判定

- [x] Target 定義から士業の主軸格下げを明文化
- [x] GitHub Trending を日次 cron に
- [x] Q2 query 改訂 (士業 + 業務代行業)
- [x] competitor-report-v2.md / v10.3 設計書本体に patch
- [x] fetch-github-trending.py 実装
- [ ] (Phase 1 開始時) cron schedule を実機登録 (HUMAN_TASKS H-12 として追加)
