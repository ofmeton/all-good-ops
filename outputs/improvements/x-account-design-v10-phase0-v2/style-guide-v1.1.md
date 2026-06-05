# ofmeton Style Guide v1.1 — Phase 0 v2 反映版

> Phase 0 v2 競合調査 (24 アカ × 50 + 9 項目) の知見を v10.3 §4.3 / §4.7 / §4.8 に transfer した運用ガイド。  
> v1.0 (= v10.3 設計書埋め込み) からの差分を明示し、Phase 1 着手時にこの値で運用開始する。

---

## 0. 版管理

| version | 日付 | 差分 |
|---|---|---|
| v1.0 | 2026-05-25 (v10.3 内蔵) | Phase 0 v1 (10 アカ) ベースの初期値 |
| **v1.1** | **2026-05-26** | **Phase 0 v2 (24 アカ + 9 項目分析) 反映** |
| v1.2 (将来) | Phase 1 30 日後 | 実測 PCR / url_link_clicks をフィードバック |

---

## 1. コンテンツ比率 (v10.3 §4.3 Writer 更新)

### v1.0 (旧)

```
Phase 1 (初期 2-3 ヶ月): 翻案 5 : 実体験 3
自動切替後: 実体験 6 : 翻案 4
```

### v1.1 (新)

| 種別 | 比率 | v1.0 比較 | 根拠 |
|---|---|---|---|
| translation (直訳) | **10%** | (Phase 0 v1 では未明示) | 競合中央値 7.5% を僅かに上回る (海外速報需要への配慮) |
| paraphrase (翻案) | **20%** | 翻案 5 (50%) → 20% | 競合中央値 32.5% より低く、翻案依存を意図的に下げる |
| **opinion (所感)** | **30%** | (Phase 0 v1 では未明示) | 競合中央値 17.5% の 1.7 倍。所感型で差別化 |
| **original (実体験)** | **40%** | 実体験 3 (30%) → 40% | Type B 競合 (mmmiyama_D / daifukujinji / masahirochaen) の領域に踏み込む |

合計: 10 + 20 + 30 + 40 = 100%

### 移行ルール

- Phase 1 着手時から v1.1 比率で運用
- 自動切替ルールは Optimizer (§4.8) の月次評価で:
  - 4 週連続で original 投稿の PCR が中央値の 1.2x 以上 → original 50% に増加
  - opinion 投稿の url_link_clicks が中央値の 0.8x 以下 → opinion 20% に減少 + paraphrase 30% に戻す
- 切替提案は人間承認 (cs:p3-fcbb の「Style Guide版変更」承認必須 4 種の 1 つ)

---

## 2. 情報源プリセット (新規 §)

### v1.1 で確定する初期プリセット

| 優先 | 情報源 | 取得経路 | 競合カバー率 | ofmeton 採用根拠 |
|---|---|---|---|---|
| 1 | 海外X (Anthropic / OpenAI / 開発者) | twitterapi.io advanced_search (週次 cron) | 96% | 主流情報源、外せない |
| 2 | 公式ブログ (Anthropic / OpenAI / Google) | twitterapi.io 公式アカ監視 (v9 §3.1 で確定) | 75% | 速報の一次ソース |
| 3 | GitHub Trending | manual ingest (週次) | 62% | Codex / Claude Code 系の発見軸 |
| 4 | **Claude Code 履歴 + Git commit + 案件メモ** | 自リポジトリ scan + DLP redaction | 29% | **一次体験ソース、差別化レバー** |
| 5 | **Discord (Claude Code / Anthropic)** | manual ingest (週次) | **4%** | **ほぼブルーオーシャン** |
| 6 | Podcast (Anthropic / Latent Space 等) | manual ingest (月次) | 25% | opinion 投稿の素材 |
| 7 | 音声メモ (案件中) | 公開許諾 gate 通過後 | — | Phase 1 後半で導入 |

### 重み付け (Optimizer §4.8 用)

```yaml
source_weights:
  外部ソース (1-3):
    weight: 0.4  # 翻案 + 所感の素材
  一次ソース (4-5, 7):
    weight: 0.5  # original + opinion の素材
  補助 (6):
    weight: 0.1
```

---

## 3. publishing_lag 設計 (v1.1 新規)

### 競合中央値

| layer | median |
|---|---|
| 速報型 (Type A) | 9h |
| 所感型 (Type B) | 24-48h |

### ofmeton 採用値

| コンテンツ種別 | publishing_lag (target) | 理由 |
|---|---|---|
| translation (10%) | 1-6h | 海外速報の翻訳は速さが命 |
| paraphrase (20%) | 6-12h | 中央値前後 |
| **opinion (30%)** | **24-48h** | **解釈時間を確保、Type B 域 (差別化レバー)** |
| original (40%) | 即時〜数日 | 一次体験は本人の作業時間依存、固定値なし |

→ Phase 1 で **opinion 投稿の lag 中央値 = 24-48h を遵守** することで Type A 競合との差別化を機械的に実現

---

## 4. citation_explicit_rate 設計 (v1.1 新規)

### 競合分布

- 中央値: 37.5%
- 60-75% 帯: 4 アカ (commte / ClaudeCode_love / SuguruKun_ai / ClaudeCode_UT)

### ofmeton 採用値

**citation_explicit_rate ≥ 65%** を Phase 1 KPI に組み込む。

実装ルール:
- 海外X / 公式ブログ / GitHub の翻案・所感投稿: **必ず原典 URL を末尾 or リプライ第 1 段に貼る**
- 一次体験 (original) 投稿: 案件名は伏せるが「実案件 (民泊系SaaS)」「自社業務」程度の出所明示は必須 (DLP redaction との両立)
- 例外: failure_story 型 (1 段目 = 失敗、2 段目 = 修正) の構成では citation を後段にまとめる

→ 「誠実性」の差別化レバー。中央値の 1.7 倍を狙う

---

## 5. Hook 類型 (v10.3 §4.7 統合)

### Phase 0 v1 で確定済 13 類型 (継承)

(v10.3 §4.7 参照、本 file では再記述しない)

### Phase 0 v2 で追加検証された差別化レバー

| 類型 | 競合発信率 | ofmeton 目標 | 根拠 |
|---|---|---|---|
| **failure_story (実装失敗→修正)** | **0%** (24 アカ全員不在、Phase 0 v1 でも 3.2%) | **15-25%** | **8 倍差別化レバー (cs:p2-aeba 既確証)** |
| **industry_sop (業種別 SOP)** | 約 8% (houki_ai_keiri など Phase 0 v3 候補のみ) | 20% | 業種別 (経理 / 請求書 / 民泊清掃) に振り切る |
| **non_engineer_translation (非エンジニア翻訳)** | 5% 以下 | 25% | 競合は技術解説に偏り、翻訳者ポジション空白 |
| 既存 10 類型 (number_first / before_after など) | 40-60% | 30-40% | 競合と同等帯。差別化レバーではない |

---

## 6. テーマ × フォーマット マトリクス (v10.3 §4.4 Visualizer 連動)

### 空白 / 過密 セル一覧

(`competitor-report-v2.md` §3 と同一マトリクスを参照)

| 優先 | テーマ | フォーマット | 競合カバー | ofmeton 着手時期 |
|---|---|---|---|---|
| Tier 1 | AI 実装失敗談 | 全フォーマット | × 0 | **Phase 1 Week 1 から投下** |
| Tier 1 | 業種別 SOP (経理/請求書/民泊清掃) | 一次体験デモ + 所感 | △ 1-2 | **Phase 1 Week 2 から投下** |
| Tier 1 | 士業 × AI (非エンジニア翻訳) | 翻案 + 所感 | × 0 | **Phase 1 Week 3 から投下** |
| Tier 2 | 業務効率化 | 所感型 | × 0-1 | Phase 1 Month 2 |
| Tier 3 | Claude Code 機能速報 | 翻案 | ◎ 12 アカ | 補助、Optimizer 自動配分に任せる |

### Visualizer モード (v10.3 §4.4) との接続

- Tier 1 投稿: failure_story モード + industry_sop モードを Visualizer の優先テンプレに登録
- Tier 2: opinion_post モードを 24-48h lag で出すよう Scheduler に組み込み
- Tier 3: 既存テンプレ (number_first / before_after) で運用

---

## 7. cross_platform_intake (媒体横断引用) 設計

### 競合中央値: 40% (Type A 系で 70%+ のアカ多い)

### ofmeton 採用値

- **35-50%** (中央値前後を維持)
- 媒体: note (主に有料記事内のティーザー要約) + YouTube (海外 Anthropic 系) + Podcast (Latent Space 等) を月次 refresh で確認
- 案件メモ・音声メモ・Claude Code 履歴は cross_platform ではなく "一次体験 (original)" にカウント

---

## 8. KPI 設計 (v10.3 §1.3 連動)

### Phase 1 (Month 1) 目標値

| 指標 | 目標 |
|---|---|
| 投稿頻度 | 1 投稿/日 (X) + 週 1 (note / Instagram) |
| **PCR (Profile Click Rate)** | **0.30%+** (v10.3 §1.3 三段階目標) |
| url_link_clicks (note 送客) | 月 50 click+ |
| failure_story 型 Hook 比率 | 15-25% |
| industry_sop 比率 | 20% |
| citation_explicit_rate | **65%+** (本 Style Guide で新規 KPI 化) |

### 評価周期

- 週次: brand-publisher が data/usage-log.jsonl 経由で経過チェック
- 月次: Optimizer (Phase 2 = Opus) が PCR / url_link_clicks / followers の傾向を見て Style Guide 改訂提案
- 改訂は cs:p3-fcbb の「Style Guide版変更」承認必須 = 人間 ofmeton が判断

---

## 9. v1.0 → v1.1 差分まとめ

| 項目 | v1.0 | **v1.1** | 差分根拠 |
|---|---|---|---|
| translation_rate | 未明示 | **10%** | 競合中央値準拠 |
| paraphrase_rate | 50% | **20%** | 翻案依存を意図的に下げる |
| opinion_rate | 未明示 | **30%** | Type B 競合差別化 |
| original_rate | 30% | **40%** | 一次体験を主軸化 |
| citation_explicit_rate | 未明示 | **≥ 65%** | 誠実性レバー |
| publishing_lag (opinion) | 未明示 | **24-48h** | Type B 競合領域 |
| failure_story Hook 比率 | 未明示 | **15-25%** | 8 倍差別化レバー (cs:p2-aeba) |
| industry_sop 比率 | 未明示 | **20%** | Tier 1 空白埋め |
| 情報源優先度 | (大枠のみ) | 1-7 確定 | 競合 96/75/62% カバー実測ベース |

---

## 10. 完了判定

- [x] 24 アカ Sonnet 分析 → 中央値で transfer 推奨値導出
- [x] 競合 0% カバー領域 (failure_story / industry_sop) を Tier 1 として KPI 化
- [x] 引用元明示 (citation 65%+) と publishing_lag 24-48h を差別化レバーとして明文化
- [x] v10.3 §4.3 / §4.4 / §4.7 / §4.8 への transfer ガイドライン完備
- [ ] (人間タスク) HUMAN_TASKS H-1〜H-5 + H-8 + H-10 完了後、Phase 1 着手
