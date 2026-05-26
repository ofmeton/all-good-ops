# ofmeton Style Guide 統合完全版 (v1.0 〜 v1.4 全 5 バージョン省略なし)

## 0. このドキュメントについて

3 シリーズ統合ドキュメントの 1 つ (Series B / Style Guide)。`style-guide-v1.1.md` 〜 `style-guide-v1.4.md` の 4 ファイルを 1 つに統合した完全版。v1.0 は v10.3 設計書 inline のみで独立 file は存在しないが、v1.1 の差分表で内容が完全に保持されているため本ドキュメントでも履歴として参照する。

### 統合方針 5 ルール

1. **省略なし**: 全バージョンの全節を保持。最新版で削除された節も `Status: Deprecated in vX (理由: ...)` 注記で原文残す。
2. **バージョン来歴ヘッダー**: 各 `##` / `###` 節の冒頭に 1 行追加: `*Version History*: v1.1 導入 → v1.2 改訂 → v1.4 確定` のように。
3. **現行 SSOT 明示**: 最新値には `**Current (v1.4)**` マーカー、過去値は `(v1.1: X, v1.2: Y, v1.3: Z)` で履歴併記。
4. **数値・分類・範囲は原値保持** (cs:s3-68 silent reduction 厳禁): range を下限のみに縮退させない / 単一値に丸めない / classification 軸変更があれば旧軸も保持。
5. **重複文章のみ排除**: 完全同一文章は来歴注記でまとめてよい。差分あれば両方残す。

### 元バージョン一覧

| version | ファイル | 行数 | 主要テーマ |
|---|---|---|---|
| v1.0 | (v10.3 inline) | — | Phase 0 v1 (10 アカ) ベースの初期値、分類 opinion 10 / paraphrase 30 / first_hand 40 / industry_sop 20 |
| v1.1 | style-guide-v1.1.md | 212 | Phase 0 v2 (24 アカ + 9 項目分析) 反映、4 排他分類 translation/paraphrase/opinion/original 確定 |
| v1.2 | style-guide-v1.2.md | 144 | 士業を主軸ターゲットから industry_sop の 1 業種セグメントに格下げ + GitHub Trending 日次化 |
| v1.3 | style-guide-v1.3.md | 215 | Codex round 1 C-1〜C-5 オールクリア対応、分類体系統一、query 2 系統分離、failure_story 上限化 |
| v1.4 | style-guide-v1.4.md | 164 | Cycle 2 退行修正: 海外X cron 週次→日次、投稿頻度 silent reduction 復元 (Instagram 月 12 / note 4-6) |

### 現行 SSOT

**`STYLE-GUIDE-CURRENT.md` シンボリックリンクは v1.4 を Single Source として指す。**

---

## 1. バージョン進化年表

*Version History*: v1.0 (2026-05-25) → v1.1 (2026-05-26) → v1.2 (2026-05-26) → v1.3 (2026-05-26) → v1.4 (2026-05-27)

| version | 日付 | 主要変更 | 元ファイル行数 |
|---|---|---|---|
| v1.0 | 2026-05-25 (v10.3 内蔵) | Phase 0 v1 (10 アカ) ベース、初期値設定 | (inline) |
| **v1.1** | **2026-05-26 (PR #23)** | **Phase 0 v2 (24 アカ + 9 項目分析) 反映** | 212 |
| **v1.2** | **2026-05-26 (PR #24)** | **Target から士業を主軸格下げ + GitHub Trending 日次化** | 144 |
| **v1.3** | **2026-05-26 (PR #25)** | **C-1〜C-5 オールクリア: 分類体系統一 / failure_story 上限化 / query 2 系統分離 / 士業 sweep** | 215 |
| **v1.4** | **2026-05-27 (本 PR)** | **Cycle 2: 海外X 週次→日次格上げ + 投稿頻度 silent reduction 復元** | 164 |
| v1.5 (将来) | Phase 1 30 日後 | 実測 PCR / url_link_clicks をフィードバック | — |

---

## 2. 統合本文 (節ごとに来歴ヘッダー)

### 2.1 コンテンツ素材分類 (軸 1)

*Version History*: v1.0 (3 区分・他: opinion 10 / paraphrase 30 / first_hand 40 / industry_sop 20) → v1.1 (4 排他確定: translation/paraphrase/opinion/original) → v1.3 (用語統一: original → first_hand、軸 2 industry_sop と分離) → v1.4 継承

#### v1.0 の旧分類 (Status: Deprecated in v1.1)

> 旧 v10.3 §4.3.6 の分類 「opinion 10 / paraphrase 30 / first_hand 40 / industry_sop 20」。industry_sop が軸 1 (素材 source) に混在していたため、v1.3 で軸 2 (Hook 類型) に独立扱いとし、本軸 1 から外した。

#### v1.1 の旧版 (Status: Superseded by v1.3 用語変更、数値は v1.3/v1.4 と同一)

| 種別 | 比率 | v1.0 比較 | 根拠 |
|---|---|---|---|
| translation (直訳) | **10%** | (Phase 0 v1 では未明示) | 競合中央値 7.5% を僅かに上回る (海外速報需要への配慮) |
| paraphrase (翻案) | **20%** | 翻案 5 (50%) → 20% | 競合中央値 32.5% より低く、翻案依存を意図的に下げる |
| **opinion (所感)** | **30%** | (Phase 0 v1 では未明示) | 競合中央値 17.5% の 1.7 倍。所感型で差別化 |
| **original (実体験)** | **40%** | 実体験 3 (30%) → 40% | Type B 競合 (mmmiyama_D / daifukujinji / masahirochaen) の領域に踏み込む |

合計: 10 + 20 + 30 + 40 = 100%

> v1.1 旧 v1.0 比較欄: `Phase 1 (初期 2-3 ヶ月): 翻案 5 : 実体験 3` / `自動切替後: 実体験 6 : 翻案 4`

#### v1.3 / v1.4 確定 4 排他 (**Current (v1.4)**)

| 種別 | Phase 1 比率 | 定義 |
|---|---|---|
| translation | **10%** | 海外発信を直訳に近い形 (cs:p3-ddde 「翻訳意図 1 行」を出さない構造規約あり) |
| paraphrase | **20%** | 構造 + 固有名詞 + 数字を変更しつつ海外/公式情報を再加工 |
| **opinion** | **30%** | 海外情報をトリガーに ofmeton の所感を前面に出す (差別化レバー、cs:p3-ddde 整合) |
| **first_hand** | **40%** | 本人事業 (RICE CREAM / 家庭教師 / portfolio / all-good-ops) + 案件 client 素材の一次体験 |

合計 10 + 20 + 30 + 40 = **100%**

→ v10.3 §4.3.6 の旧 「opinion 10 / paraphrase 30 / first_hand 40 / industry_sop 20」 は **v1.3 で廃止**。industry_sop は **軸 1 ではなく軸 2 (Hook 類型)** として独立扱い。

#### v1.1 の移行ルール (継承、v1.3 / v1.4 でも有効)

- Phase 1 着手時から v1.1 / v1.3 / v1.4 比率で運用
- 自動切替ルールは Optimizer (§4.8) の月次評価で:
  - 4 週連続で original (= first_hand) 投稿の PCR が中央値の 1.2x 以上 → first_hand 50% に増加
  - opinion 投稿の url_link_clicks が中央値の 0.8x 以下 → opinion 20% に減少 + paraphrase 30% に戻す
- 切替提案は人間承認 (cs:p3-fcbb の「Style Guide版変更」承認必須 4 種の 1 つ)

---

### 2.2 Hook 類型 (軸 2、別軸・1 投稿に 1 類型のみ、合計 100%)

*Version History*: v1.1 導入 (failure_story 15-25% 比率 KPI) → v1.3 改訂 (failure_story を比率 KPI 撤回 → 月 ≤ 4 上限化、C-5 対応) → v1.4 継承

#### v1.1 の旧版 (Status: failure_story の比率 KPI 表記は v1.3 で撤回)

Phase 0 v1 で確定済 13 類型 (継承、v10.3 §4.7 参照、本 file では再記述しない)。Phase 0 v2 で追加検証された差別化レバー:

| 類型 | 競合発信率 | ofmeton 目標 | 根拠 |
|---|---|---|---|
| **failure_story (実装失敗→修正)** | **0%** (24 アカ全員不在、Phase 0 v1 でも 3.2%) | **15-25%** (Status: Deprecated in v1.3) | **8 倍差別化レバー (cs:p2-aeba 既確証)** |
| **industry_sop (業種別 SOP)** | 約 8% (houki_ai_keiri など Phase 0 v3 候補のみ) | 20% | 業種別 (経理 / 請求書 / 民泊清掃) に振り切る |
| **non_engineer_translation (非エンジニア翻訳)** | 5% 以下 | 25% (v1.1) / 20% (v1.3) | 競合は技術解説に偏り、翻訳者ポジション空白 |
| 既存 10 類型 (number_first / before_after など) | 40-60% | 30-40% | 競合と同等帯。差別化レバーではない |

#### v1.3 / v1.4 確定 (**Current (v1.4)**)

軸 1 × 軸 2 のクロスで投稿テンプレが決まる。

| Hook 類型 | Phase 1 目標比率 | 軸 1 と相性が良い source |
|---|---|---|
| **failure_story** | **上限 ≤ 4 投稿/月** (verified のみ、比率 KPI なし) | first_hand 限定 |
| **industry_sop** | 20% (= 6 投稿/月 if 30 投稿) | first_hand 主軸、case study 引用は paraphrase |
| **non_engineer_translation** | 20% | opinion 主軸 (海外技術 → 経営者向け翻訳) |
| **before_after** | 15% | first_hand or opinion |
| **number_first** | 10% | translation / paraphrase |
| **insight_thread** | 10% | opinion |
| **tool_review** | 10% | first_hand / paraphrase |
| **その他類型 (8 種)** | 15% | mix |

→ failure_story を **「比率 KPI 撤回 → verified ≤ 4/月 上限のみ」** に統一 (C-5 対応)。

#### 軸 1 × 軸 2 のクロス具体例 (v1.3 新規)

| 軸 1 \ 軸 2 | failure_story | industry_sop | non_engineer_translation |
|---|---|---|---|
| translation | 不適 (上限) | 不適 | × (cs:p3-ddde 翻訳臭 NG) |
| paraphrase | × | △ (case study 引用) | △ |
| opinion | × | △ | **◎ (主軸)** |
| **first_hand** | **◎ (主軸 verified ≤4/月)** | **◎ (主軸)** | △ |

#### failure_story の供給制約 (v1.3 で C-5 対応として明文化、v1.4 継承)

```yaml
verified_failure_story:
  上限: 月 ≤ 4 投稿 (= 週 1)
  必要条件:
    - 実際の失敗事実 (案件 commit log / 案件メモ / 音声メモから)
    - 公開許諾 gate 通過 (client 同意 / 個人情報 redact)
    - DLP redaction 適用済 (固有名詞・金額マスク)
    - 業法ガード OK (§10.9, 士業向け SOP 投稿時は厳格)
  
  ↑ 4 投稿/月を満たせない月は failure_story を出さず、first_hand × industry_sop / before_after で代替
```

→ 旧 v1.1 の「15-25% (= 4.5-7.5 投稿/月)」は **撤回**。供給制約があるため理論値より実運用上限が低い。

---

### 2.3 publishing_lag 設計

*Version History*: v1.1 新規導入 → v1.2 / v1.3 / v1.4 で継承 (変更なし)

#### 競合中央値 (v1.1 観察)

| layer | median |
|---|---|
| 速報型 (Type A) | 9h |
| 所感型 (Type B) | 24-48h |

#### ofmeton 採用値 (**Current (v1.4)**, v1.1 から不変)

| コンテンツ種別 | publishing_lag (target) | 理由 |
|---|---|---|
| translation (10%) | 1-6h | 海外速報の翻訳は速さが命 |
| paraphrase (20%) | 6-12h | 中央値前後 |
| **opinion (30%)** | **24-48h** | **解釈時間を確保、Type B 域 (差別化レバー)** |
| original / first_hand (40%) | 即時〜数日 | 一次体験は本人の作業時間依存、固定値なし |

→ Phase 1 で **opinion 投稿の lag 中央値 = 24-48h を遵守** することで Type A 競合との差別化を機械的に実現

---

### 2.4 citation_explicit_rate 設計

*Version History*: v1.1 新規導入 (≥ 65%) → v1.2 / v1.3 / v1.4 で継承 (v1.3 で translation 構造規約「翻訳意図 1 行」を出さない、を追記)

#### 競合分布 (v1.1 観察)

- 中央値: 37.5%
- 60-75% 帯: 4 アカ (commte / ClaudeCode_love / SuguruKun_ai / ClaudeCode_UT)

#### ofmeton 採用値 (**Current (v1.4)**)

**citation_explicit_rate ≥ 65%** を Phase 1 KPI に組み込む。

実装ルール:
- 海外X / 公式ブログ / GitHub の翻案・所感投稿: **必ず原典 URL を末尾 or リプライ第 1 段に貼る**
- 一次体験 (first_hand) 投稿: 案件名は伏せるが「実案件 (民泊系SaaS)」「自社業務」程度の出所明示は必須 (DLP redaction との両立)
- 例外: failure_story 型 (1 段目 = 失敗、2 段目 = 修正) の構成では citation を後段にまとめる
- **v1.3 追加**: translation 投稿構造規約として「翻訳意図の 1 行」を出さない (cs:p3-ddde 整合、H-14 対応)

→ 「誠実性」の差別化レバー。中央値の 1.7 倍を狙う

---

### 2.5 情報源プリセット

*Version History*: v1.1 導入 (7 ソース、海外X 週次 cron) → v1.2 (GitHub Trending を週次 → 日次に格上げ) → v1.3 継承 → v1.4 (海外X 週次 → 日次に格上げ、退行修正)

#### v1.1 旧版 (Status: Superseded by v1.2 + v1.4 — 海外X は週次、GitHub Trending は週次)

| 優先 | 情報源 | 取得経路 | 競合カバー率 | ofmeton 採用根拠 |
|---|---|---|---|---|
| 1 | 海外X (Anthropic / OpenAI / 開発者) | twitterapi.io advanced_search (**週次 cron**, v1.1 時点) | 96% | 主流情報源、外せない |
| 2 | 公式ブログ (Anthropic / OpenAI / Google) | twitterapi.io 公式アカ監視 (v9 §3.1 で確定) | 75% | 速報の一次ソース |
| 3 | GitHub Trending | **manual ingest (週次)** (v1.1 時点) | 62% | Codex / Claude Code 系の発見軸 |
| 4 | **Claude Code 履歴 + Git commit + 案件メモ** | 自リポジトリ scan + DLP redaction | 29% | **一次体験ソース、差別化レバー** |
| 5 | **Discord (Claude Code / Anthropic)** | manual ingest (週次) | **4%** | **ほぼブルーオーシャン** |
| 6 | Podcast (Anthropic / Latent Space 等) | manual ingest (月次) | 25% | opinion 投稿の素材 |
| 7 | 音声メモ (案件中) | 公開許諾 gate 通過後 | — | Phase 1 後半で導入 |

#### v1.2 改訂分 (GitHub Trending 日次化)

旧 v1.1 §2 No.3 (`GitHub Trending — manual ingest (週次)`) → v1.2 新:

> GitHub Trending — **日次 cron** (07:00 JST / 全言語 + 日本語フィルタ)
> 実装: `apps/x-account-system/scripts/fetch-github-trending.py`
> 永続化: `raw/publishing/github-trending/YYYY-MM-DD.json`
> コスト: 無料 (HTML scrape 1 req/day = ¥0)

変更理由:
- 競合中央値の publishing_lag (9h) より速く GitHub OSS 動向を拾うには日次が下限
- GitHub Trending HTML scrape は無料 (公式 API なし / cron 負荷小)
- Tier 1 「Claude Code 機能速報」軸の素材 supply を増やす

#### v1.3 中間状態 (Status: GitHub Trending 日次 / 海外X 依然週次のまま、v1.4 で退行修正)

| 優先 | 情報源 | 取得経路 |
|---|---|---|
| 1 | 海外X | twitterapi.io (**週次 cron**) ← v1.4 で退行修正 |
| 2 | 公式ブログ | twitterapi.io 公式アカ監視 |
| 3 | GitHub Trending | **日次 cron** (v1.2 で日次化、v1.3 で継承) |
| 4 | Claude Code 履歴 + Git commit + 案件メモ | 自リポジトリ scan + DLP redaction |
| 5 | Discord (Claude Code / Anthropic) | manual ingest (週次) |
| 6 | Podcast | manual ingest (月次) |
| 7 | 音声メモ | 公開許諾 gate 通過後 |

#### v1.4 確定版 (**Current (v1.4)**, 海外X 日次格上げ)

| 優先 | 情報源 | 取得経路 | 競合カバー率 |
|---|---|---|---|
| 1 | 海外X | twitterapi.io (**日次 cron, 07:00 JST** ← v1.4 で週次から格上げ) | 96% |
| 2 | 公式ブログ | twitterapi.io 公式アカ監視 (日次連動) | 75% |
| 3 | GitHub Trending | 日次 cron (07:00 JST) | 62% |
| 4 | Claude Code 履歴 + Git commit + 案件メモ | 自リポジトリ scan + DLP redaction | 29% |
| 5 | Discord (Claude Code / Anthropic) | manual ingest (週次) | 4% |
| 6 | Podcast | manual ingest (月次) | 25% |
| 7 | 音声メモ | 公開許諾 gate 通過後 | — |

v1.4 変更理由 (海外X 週次 → 日次):
- v1.3 §5.1 publishing_lag (translation 1-6h / paraphrase 6-12h) との **逆転**: 最も urgency 高い情報源を最も粗い cron に割り当てていた
- GitHub Trending (62% カバー、二次) が日次なのに、海外X (96% カバー、一次) が週次は priority inversion
- cs:s3-67 (cron 頻度は freshness 要求と整合させる) 違反

#### 重み付け (Optimizer §4.8 用) (v1.1 新規)

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

### 2.6 Target 定義

*Version History*: v1.0 / v1.1 (中小事業者・士業・コンサル) → v1.2 (士業を主軸格下げ、中小事業者・コンサル) → v1.3 (士業 = industry_sop の 1 業種セグメントと明文化) → v1.4 継承

#### v1.0 / v1.1 旧版 (Status: Deprecated in v1.2)

> AI を活用したい非エンジニア (**中小事業者・士業・コンサル**) 経営者

#### v1.2 / v1.3 / v1.4 確定 (**Current (v1.4)**)

> AI を活用したい非エンジニア (**中小事業者・コンサル**) 経営者
> ※ 士業 (税理士 / 社労士 / 行政書士 / 弁護士) は industry_sop で扱う **1 業種セグメント** に格下げ。発信トーンは経営者向けに統一しつつ、業種別 SOP 投稿では士業も対象事例として含める。

#### 変更理由 (v1.2)

- **狭さの問題**: 士業は各業界カルチャーが独立 (税理士 / 社労士 / 行政書士 / 弁護士で専門用語・関心領域が異なる) → 横断する SOP 発信が難しく、主軸ターゲットにすると発信トーンがブレる
- **ofmeton 事業との整合**: AI 自動化代行 (KGI 2) の想定顧客は中小経営者中心。terra-isshiki / minpaku-cleaning / RICE CREAM の事例も士業向けではない
- **Phase 0 v2 知見の保持**: 士業系 hit (`Jeanscpa` / `sakai_tax` / `houki_ai_keiri`) は industry_sop の対象事例として残す。Q2 query は「士業 + 業務代行業」に拡張して候補プールを広げる

#### 士業の位置づけ統一マトリクス (v1.3 で C-3 対応として導入)

| 場所 | 旧 (v1.0 / v1.1) | 中間 (v1.2) | 新 (v1.3 / v1.4) |
|---|---|---|---|
| 主軸 target | 中小事業者・**士業**・コンサル | 中小事業者・コンサル (士業除外) | **中小事業者・コンサル** (士業除外) |
| industry_sop 軸 | 経理/請求書/見積/民泊清掃 | 同左 + 士業も対象事例 | **経理/請求書/見積/民泊清掃 + 士業 (1 業種セグメント)** |
| §10.9 業法ガード | (未整備) | リスクが薄い業種からスタート、Phase 2 後半に士業へ拡張 | **リスクが薄い業種からスタート、Phase 2 後半に業種拡張 (士業含む全 industry_sop)** |
| Q2 query (旧) | 士業 4 語 | 士業 + 業務代行業 (v1.2) | **B5 query**: 士業 5 語 (industry_sop 候補発掘用) |
| competitor-report-v2 §4.2 | 業種別 SOP (経理/請求書/見積/民泊清掃) | 同左 + 士業も対象事例 | 業種別 SOP (経理/請求書/見積/民泊清掃/**士業**) |

すべての箇所で「士業 = industry_sop の 1 業種セグメント、主軸 target ではない」と統一。

---

### 2.7 テーマ × フォーマット マトリクス

*Version History*: v1.1 導入 (v10.3 §4.4 Visualizer 連動) → v1.2 / v1.3 / v1.4 で継承 (内容変更なし、士業の扱いだけ §2.6 で更新)

([`competitor-report-all-versions.md`](./competitor-report-all-versions.md) (旧 v2) §3 と同一マトリクスを参照)

| 優先 | テーマ | フォーマット | 競合カバー | ofmeton 着手時期 |
|---|---|---|---|---|
| Tier 1 | AI 実装失敗談 | 全フォーマット | × 0 | **Phase 1 Week 1 から投下** |
| Tier 1 | 業種別 SOP (経理/請求書/民泊清掃) | 一次体験デモ + 所感 | △ 1-2 | **Phase 1 Week 2 から投下** |
| Tier 1 | 士業 × AI (非エンジニア翻訳) | 翻案 + 所感 | × 0 | **Phase 1 Week 3 から投下** |
| Tier 2 | 業務効率化 | 所感型 | × 0-1 | Phase 1 Month 2 |
| Tier 3 | Claude Code 機能速報 | 翻案 | ◎ 12 アカ | 補助、Optimizer 自動配分に任せる |

#### Visualizer モード (v10.3 §4.4) との接続 (v1.1 新規)

- Tier 1 投稿: failure_story モード + industry_sop モードを Visualizer の優先テンプレに登録
- Tier 2: opinion_post モードを 24-48h lag で出すよう Scheduler に組み込み
- Tier 3: 既存テンプレ (number_first / before_after) で運用

---

### 2.8 cross_platform_intake (媒体横断引用) 設計

*Version History*: v1.1 導入 → v1.2 / v1.3 / v1.4 で継承 (変更なし)

#### 競合中央値: 40% (Type A 系で 70%+ のアカ多い)

#### ofmeton 採用値 (**Current (v1.4)**)

- **35-50%** (中央値前後を維持)
- 媒体: note (主に有料記事内のティーザー要約) + YouTube (海外 Anthropic 系) + Podcast (Latent Space 等) を月次 refresh で確認
- 案件メモ・音声メモ・Claude Code 履歴は cross_platform ではなく "一次体験 (original / first_hand)" にカウント

---

### 2.9 query 2 系統設計

*Version History*: v1.0 〜 v1.2 (Q1-Q5 単系統、ただし v1.2 で Q2 を士業 + 業務代行業に拡張) → v1.3 (C-1 / C-2 対応で 2 系統 10 query 分離、Phase 0 v3 で seed hit 70% 検証) → v1.4 継承

詳細は [`query-design-all-versions.md`](./query-design-all-versions.md) (旧 v2 を統合済 Series D)。

#### A 系 publisher_discovery (発信者発掘) — v1.3 / v1.4

| Q# | 趣旨 | Phase 0 v3 hit (新規, 上位例) |
|---|---|---|
| A1 | Claude Code 活用発信者 | ClaudeCode_UT / ClaudeCode_love / cyrilXBT / commte / Codestudiopjbk / 新規: sora19ai / gagarot200 |
| A2 | Codex / CLI 系 | Codestudiopjbk / masahirochaen / 新規: AiAircle34052 / kawai_design |
| A3 | Obsidian × AI | obsidianstudio9 / ObsidianOtaku / Shimayus / 新規: 7_eito_7 |
| A4 | MCP / エージェント実装 | Shimayus / so_ainsight / SuguruKun_ai / 新規: genkAIjokyo |
| A5 | 海外英語圏 (旧 Q5 緩和) | (一部 hit、改善余地あり → Phase 0 v4) |

**seed 24 アカ hit rate: 17/24 = 70%** (Phase 0 v3 実 API call で検証)

#### B 系 audience_validation (読者層検証) — v1.3 / v1.4

| Q# | 趣旨 | Phase 0 v3 hit (新規, 上位例) |
|---|---|---|
| B1 | 中小経営者の AI 困りごと | AIshukyaku (25) / kandmybike (18) / chanryo_eff (16) / shodaiiiiii / inkya_sme |
| B2 | コンサル / 業務代行 × AI | SuguruKun_ai / akihito_okura / yamatomo_1117 |
| B3 | 業務効率化 / 業務自動化 | shota7180 / happyyoshigi / TakeshiYonese |
| B4 | industry_sop 候補 (経理/請求書/見積) | houki_ai_keiri / daifukujinji |
| B5 | 士業 × AI (industry_sop 1 セグメント) | speranzapt / TakeshiYonese (士業含む) |

#### target_fit_score 2 層化 (H-7 対応、v1.3 新規)

```
publisher_score (A 系) = (followers × engagement × 0.3)
                       + (content_overlap_score × 0.4)  ← 投稿本文/リンク/リポジトリ言及
                       + (recent_max_engagement × 0.2)
                       + (publishing_frequency × 0.1)

audience_score (B 系) = (target_fit_bio × 0.5)
                      + (target_fit_content × 0.5)
```

publisher_score ≥ 0.5 で発信者候補化、audience_score ≥ 0.4 で読者層分析対象。

#### v1.2 Q2 query 改訂 (連動変更、v1.3 で B 系に再編)

旧 v1.0 / v1.1: `Q2 | "AI" ("士業" OR "税理士" OR "社労士" OR "行政書士") -is:retweet lang:ja min_faves:30`

v1.2 新: `Q2 | "AI" ("士業" OR "経理代行" OR "事務代行" OR "業務代行") -is:retweet lang:ja min_faves:30`

→ 士業を主軸ターゲットから外したため、Q2 を「士業 + 業務代行業」に拡張。中小経営者向けの "業務代行業" カテゴリ (経理代行 / 事務代行 / 業務代行) を併合して候補プールを広げる。

v1.3 で 2 系統に分離後、士業は B5 query (audience_validation の 1 セグメント) として完全独立。

---

### 2.10 連動変更 (v1.2 で同時反映)

*Version History*: v1.2 導入 (士業格下げ + GitHub Trending 日次化に伴う patch 群)

#### Q2 query 改訂 — §2.9 参照

#### competitor-report-v2.md の Tier 1 表記更新

§4 推奨コンテンツ角度の第 2 軸:
- 旧: 「業種別 SOP (経理/請求書/民泊清掃)」型
- 新: 「業種別 SOP (経理/請求書/民泊清掃/**士業も対象事例の 1 セグメントとして含む**)」型

#### v10.3 設計書 (x-account-design-v10-3.md) の主軸ターゲット行更新

L121 周辺:
- 旧: `Phase 2 後半に士業へ拡張する`
- 新: `Phase 2 後半に業種拡張する` (士業の固有名は外す、§10.9 業法ガードは残置)

§10.9 業法ガード章はそのまま残す (industry_sop で士業事例を扱う際の法務ガードとして依然必要)。

---

### 2.11 KPI 設計

*Version History*: v1.1 導入 (Phase 1 目標値、note/Instagram 週 1) → v1.2 / v1.3 で投稿頻度を「1 投稿/日 (X) + 週 1 (note / Instagram)」と表記 (silent reduction の温床) → v1.4 で復元 (X 30/月 + note 4-6/月 + Instagram カルーセル週 2 + リール週 1 = 月 12)

#### v1.1 旧版 (Status: 投稿頻度表記は v1.4 で正設計に復元)

| 指標 | 目標 |
|---|---|
| 投稿頻度 | 1 投稿/日 (X) + 週 1 (note / Instagram) ← Status: Deprecated in v1.4 |
| **PCR (Profile Click Rate)** | **0.30%+** (v10.3 §1.3 三段階目標) |
| url_link_clicks (note 送客) | 月 50 click+ |
| failure_story 型 Hook 比率 | 15-25% ← Status: Deprecated in v1.3 |
| industry_sop 比率 | 20% |
| citation_explicit_rate | **65%+** (本 Style Guide で新規 KPI 化) |

#### v1.3 中間版 (Status: 投稿頻度は v1.4 で再修正)

| 指標 | 目標 |
|---|---|
| 投稿頻度 | 1 投稿/日 (X) + 週 1 (note / Instagram) ← Status: Deprecated in v1.4 |
| PCR (Profile Click Rate) | 0.30%+ |
| url_link_clicks (note 送客) | 月 50 click+ |
| **failure_story 投稿数** | **≤ 4/月 (verified のみ、上限 KPI)** |
| industry_sop 投稿数 | 20% (= 6/月 if 30 投稿) |
| non_engineer_translation 投稿数 | 20% (= 6/月) |
| citation_explicit_rate | ≥ 65% |
| publishing_lag (opinion) | 24-48h 中央値 |

#### v1.4 確定 (**Current (v1.4)**)

| 指標 | 目標 |
|---|---|
| **X 投稿頻度** | **1 投稿/日 = 30 本/月** |
| **note 投稿頻度** | **無料 3-5 本 + 有料 1 本 = 4-6 本/月** |
| **Instagram 投稿頻度** | **カルーセル週 2 + リール週 1 = 約 12 本/月** |
| PCR (Profile Click Rate) | 0.30%+ |
| url_link_clicks (note 送客) | 月 50 click+ |
| failure_story 投稿数 | ≤ 4/月 (verified のみ、上限 KPI) |
| industry_sop 投稿数 | 30 本中 20% (= 6 本/月) |
| non_engineer_translation 投稿数 | 30 本中 20% (= 6 本/月) |
| citation_explicit_rate | ≥ 65% |
| publishing_lag (opinion) | 24-48h 中央値 |

v1.4 変更理由 (投稿頻度復元):
- v1.3 で「週 1 (note/Instagram)」と書いて note 月 4 (下限値のみ) / IG 月 4 (当初想定の 1/3) に **silent reduction** していた
- v9.1 note 詳述章で「無料 3-5 + 有料 1」と確定済、CLAUDE.md にも同記述
- IG は v9 当初設計でカルーセル + リールの想定、月 12 が標準
- cs:s2-68 / cs:s3-68 違反 (range を下限に縮退、commitment を silent に縮小)

#### 評価周期 (v1.1 新規、継承)

- 週次: brand-publisher が data/usage-log.jsonl 経由で経過チェック
- 月次: Optimizer (Phase 2 = Opus) が PCR / url_link_clicks / followers の傾向を見て Style Guide 改訂提案
- 改訂は cs:p3-fcbb の「Style Guide版変更」承認必須 = 人間 ofmeton が判断

---

### 2.12 v1.0 → v1.1 差分まとめ (v1.1 で導入された比較表)

*Version History*: v1.1 導入 (履歴比較表として)、以降のバージョンでも参照のため残置

| 項目 | v1.0 | **v1.1** | 差分根拠 |
|---|---|---|---|
| translation_rate | 未明示 | **10%** | 競合中央値準拠 |
| paraphrase_rate | 50% | **20%** | 翻案依存を意図的に下げる |
| opinion_rate | 未明示 | **30%** | Type B 競合差別化 |
| original_rate (= first_hand) | 30% | **40%** | 一次体験を主軸化 |
| citation_explicit_rate | 未明示 | **≥ 65%** | 誠実性レバー |
| publishing_lag (opinion) | 未明示 | **24-48h** | Type B 競合領域 |
| failure_story Hook 比率 | 未明示 | **15-25%** (Status: Deprecated in v1.3) | 8 倍差別化レバー (cs:p2-aeba) |
| industry_sop 比率 | 未明示 | **20%** | Tier 1 空白埋め |
| 情報源優先度 | (大枠のみ) | 1-7 確定 | 競合 96/75/62% カバー実測ベース |

---

### 2.13 v1.1 / v1.2 → v1.3 差分まとめ (v1.3 で導入)

*Version History*: v1.3 導入 (C-1〜C-5 対応の説明用)

#### C-1 / C-2 / C-3 / C-4 / C-5 全対応

| Codex 指摘 | 対応 |
|---|---|
| C-1 「発信者発掘 + target hit 混線」 | §2.9 query 設計 2 系統分離 (A 系 publisher / B 系 audience) |
| C-2 「Q1-Q5 が seed 20 アカ hit しない」 | §2.9 query を Claude/Codex/Obsidian/MCP 軸で再設計、Phase 0 v3 実 API で **seed hit 70%** 検証済 |
| C-3 「士業外し sweep 未完」 | §2.6 全成果物の士業言及一括 sweep (v10.3 §10.3 / report-v2 / Style Guide / query 全箇所) |
| C-4 「数値文書間不一致」 | §2.1 分類体系統一 (4 排他 + 別軸 Hook) + STYLE-GUIDE-CURRENT.md |
| C-5 「failure_story 比率 vs 上限同居」 | §2.2 比率 KPI 撤回 / `verified_failure_story 月 ≤4` 上限のみに統一 |

---

### 2.14 v1.3 → v1.4 差分まとめ (v1.4 で導入)

*Version History*: v1.4 導入 (Cycle 2 退行修正の説明用)

#### 1.1 海外X cron: 週次 → 日次 (退行修正、cs:p2-fd8c / s3-67)

旧 (v1.2 / v1.3 §5.3 No.1): `海外X — twitterapi.io (週次 cron)`

新 (v1.4): `海外X — twitterapi.io (日次 cron, 07:00 JST、GitHub Trending と同タイミング)`

#### 1.2 投稿頻度: silent reduction を正設計に復元 (cs:p3-592d / s2-68)

旧 (v1.3 §6): `投稿頻度: 1 投稿/日 (X) + 週 1 (note / Instagram)`

新 (v1.4):
- **X: 1 投稿/日 = 30 本/月** (変更なし)
- **note: 無料 3-5 本/月 + 有料 1 本/月 = 計 4-6 本/月** (v9.1 / CLAUDE.md 確定値)
- **Instagram: カルーセル週 2 + リール週 1 = 約 12 本/月** (v9 当初想定)

#### Cycle 2 のセルフレビュー (cs:s1-66 pre-flight check 実施)

数値定義 cross-document check:

| 概念 | v1.4 | v9.1 (note 章) | CLAUDE.md | v10.3 (§1.4) |
|---|---|---|---|---|
| X 投稿 | 30/月 | (未明示) | 1 投稿/日 | (§4.3.2 短文 90% 想定で 30 本以上) |
| note 投稿 | 4-6/月 | 無料 3-5 + 有料 1 | 月 売上 3-10 万 (本数別記なし) | (§4.3 note 章で 4-6 想定) |
| Instagram 投稿 | 12/月 | — | (Phase 別 follower 目標のみ) | (§3 で IG カルーセル + リール想定) |
| 海外X cron | 日次 | — | — | (§3.1 で「速報性 1-6h」要求) |
| GitHub Trending | 日次 | — | — | v1.2 で日次化 |

→ 文書間整合性 OK。v1.4 と他文書の数値が一致するように修正済。

#### silent reduction の検出パターン (再発防止、v1.4 §4.2 新規)

- range の下限のみ採用 (4-6 → 4) → 必ず range 全体を保持
- 当初設計値を「簡素化」名目で reduce → 必ず元値と diff を明記
- 「週 N」表記は月換算で逆チェック (週 1 = 月 4 / 週 2 = 月 8 / 週 3 = 月 12)

---

### 2.15 STYLE-GUIDE-CURRENT.md シンボリックリンク (v1.3 で導入)

*Version History*: v1.3 導入 (現行ポインタの SSOT 化) → v1.4 で更新先を v1.4 に変更

**`STYLE-GUIDE-CURRENT.md` シンボリックリンクを v1.3 に固定** (R-20 / R-21 / H-13 対応、v1.3 時点)。Phase 1 着手時には v1.3 のみが Single Source。

**v1.4 で更新**: シンボリックリンクは v1.4 を Single Source として指す。

---

### 2.16 v1.3 → 将来 v1.4 / v1.5 の発動条件

*Version History*: v1.3 §7 導入 (H-15 / R-28 対応) → v1.4 §5 で継承 + 海外X 頻度再調整条件を追加

以下のいずれかで Optimizer が改訂を提案 (人間承認必須):

- Phase 1 Month 1 末で PCR / url_link_clicks 実測 → 中央値乖離 ≥ 20% で transfer 値見直し
- watchlist 24 アカのうち 4 アカ以上が直近 30 日 engagement -50% → pruning + 新規候補追加
- Phase 0 v4 (Q5 海外英語圏再設計後) で新規 publisher 5+ 件発掘 → 母集団 24 → 28 へ拡張
- **(v1.4 追加)** 海外X 日次 cron で素材供給過多/不足が判明 → 頻度再調整

---

### 2.17 完了判定

*Version History*: 各バージョン共通の最終チェックリスト

#### v1.1 完了判定

- [x] 24 アカ Sonnet 分析 → 中央値で transfer 推奨値導出
- [x] 競合 0% カバー領域 (failure_story / industry_sop) を Tier 1 として KPI 化
- [x] 引用元明示 (citation 65%+) と publishing_lag 24-48h を差別化レバーとして明文化
- [x] v10.3 §4.3 / §4.4 / §4.7 / §4.8 への transfer ガイドライン完備
- [ ] (人間タスク) HUMAN_TASKS H-1〜H-5 + H-8 + H-10 完了後、Phase 1 着手

#### v1.2 完了判定

- [x] Target 定義から士業の主軸格下げを明文化
- [x] GitHub Trending を日次 cron に
- [x] Q2 query 改訂 (士業 + 業務代行業)
- [x] competitor-report-v2.md / v10.3 設計書本体に patch
- [x] fetch-github-trending.py 実装
- [ ] (Phase 1 開始時) cron schedule を実機登録 (HUMAN_TASKS H-12 として追加)

#### v1.3 完了判定

- [x] Codex round 1 C-1〜C-5 すべて反映
- [x] query 2 系統分離 + Phase 0 v3 で seed hit 70% 検証
- [x] 分類体系統一 (4 排他軸 1 + Hook 類型軸 2)
- [x] failure_story 上限 ≤ 4/月 一本化
- [x] 士業全成果物 sweep
- [ ] STYLE-GUIDE-CURRENT.md シンボリックリンク作成 (本 PR 内)
- [ ] v10.3 設計書本体への transfer (§4.3.6 / §10.3 / §10.9 / §11 等)
- [ ] competitor-report-v3.md 起草
- [ ] Codex 再クロスレビューで closed loop

#### v1.4 完了判定 (**Current**)

- [x] 海外X 日次格上げ (cs:p2-fd8c 整合)
- [x] 投稿頻度 silent reduction 復元 (cs:p3-592d 整合)
- [x] Cycle 2 セルフレビュー pre-flight check (cs:s1-66) 実施
- [ ] STYLE-GUIDE-CURRENT.md を v1.4 に更新
- [ ] competitor-report-v3 / v10.3 関連箇所 sweep
- [ ] PR-merge + GitHub UI URL 提示

---

## 3. Deprecated 節 (省略なし原文保持)

### 3.1 v1.1 のオリジナル「§9. v1.0 → v1.1 差分まとめ」(Status: 整理して §2.12 に再掲、原文は本節で保持)

(§2.12 と同一内容。v1.1 内では §9 として独立節になっていた。)

### 3.2 v1.2 のオリジナル「§1.1 旧」(Status: 全文を §2.6 に転記、原文は本節で保持)

旧 (v1.1 / v10.3):

> AI を活用したい非エンジニア (**中小事業者・士業・コンサル**) 経営者

新 (v1.2):

> AI を活用したい非エンジニア (**中小事業者・コンサル**) 経営者
> ※ 士業 (税理士 / 社労士 / 行政書士 / 弁護士) は industry_sop で扱う **1 業種セグメント** に格下げ。発信トーンは経営者向けに統一しつつ、業種別 SOP 投稿では士業も対象事例として含める。

### 3.3 v1.1 §2 旧 「情報源プリセット」 (Status: §2.5 で v1.1 / v1.2 / v1.3 / v1.4 を並列保持済み、原文は §2.5 内に統合)

(§2.5 表参照)

### 3.4 v1.1 §1 「Phase 1 (初期 2-3 ヶ月): 翻案 5 : 実体験 3 / 自動切替後: 実体験 6 : 翻案 4」 (Status: Deprecated in v1.1 (= 同 file 内で旧版扱い)、§2.1 に履歴転記済み)

(§2.1 #v1.0 の旧分類 box 参照)

### 3.5 v1.3 §2.1 末尾「v10.3 §4.3.6 の旧分類は廃止」宣言 (Status: §2.1 に集約)

> v10.3 §4.3.6 の旧 「opinion 10 / paraphrase 30 / first_hand 40 / industry_sop 20」 は **本 v1.3 で廃止**。industry_sop は **軸 1 ではなく軸 2 (Hook 類型)** として独立扱い (cf. §2.2)。

### 3.6 v1.1 オリジナル「§5. Hook 類型 — Phase 0 v1 で確定済 13 類型 (継承)」 (Status: §2.2 に統合、v10.3 §4.7 参照記述は維持)

> Phase 0 v1 で確定済 13 類型 (継承)
> (v10.3 §4.7 参照、本 file では再記述しない)

### 3.7 v1.3 §3.1 / §3.2 / §3.3 query 2 系統 (Status: §2.9 に統合済み、原文ロジック温存)

(§2.9 参照)

### 3.8 v1.4 §4.1 数値定義 cross-document check 表 (Status: §2.14 に内蔵済み)

(§2.14 参照)

---

## 4. 数値・分類軸の進化マトリクス

*Version History*: 本マトリクスは統合版での新規追加 (cs:s1-66 に従い数値・分類軸の cross-version 比較表を冒頭近くにまとめる)

### 4.1 軸 1 (素材 source) 分類軸の変遷

| 概念 | v1.0 (v10.3 inline) | v1.1 | v1.2 | v1.3 | v1.4 |
|---|---|---|---|---|---|
| 分類区分数 | 4 区分 (opinion/paraphrase/first_hand/industry_sop) | 4 排他 (translation/paraphrase/opinion/original) | 同 v1.1 | 4 排他 (translation/paraphrase/opinion/first_hand)、用語 original → first_hand | 同 v1.3 |
| industry_sop の位置 | 軸 1 内 (20%) | (4 排他外、Hook 類型で扱い) | 同 v1.1 | **軸 2 (Hook 類型) に独立** | 同 v1.3 |
| translation 比率 | 未明示 (= 旧 paraphrase 内) | 10% | 10% | 10% | 10% |
| paraphrase 比率 | 30% (v1.0 旧軸) / 50% (v1.1 比較表) | 20% | 20% | 20% | 20% |
| opinion 比率 | 10% (v1.0 旧軸) | 30% | 30% | 30% | 30% |
| first_hand (= original) 比率 | 40% (v1.0 旧軸) / 30% (v1.1 比較表) | 40% | 40% | 40% | 40% |

### 4.2 軸 2 (Hook 類型) failure_story 仕様の変遷

| 概念 | v1.0 | v1.1 | v1.2 | v1.3 | v1.4 |
|---|---|---|---|---|---|
| failure_story KPI 型 | 未明示 | **比率 KPI (15-25%)** | 同 v1.1 | **上限 KPI (≤ 4/月)** | 同 v1.3 |
| 換算 | — | 15-25% = 4.5-7.5 投稿/月 | 同左 | ≤ 4 投稿/月 | 同左 |
| 必要条件 | — | (未明示) | (未明示) | 4 条件明文化 (失敗事実 / 許諾 / DLP / 業法ガード) | 同 v1.3 |

### 4.3 Target 定義の変遷

| 概念 | v1.0 | v1.1 | v1.2 | v1.3 | v1.4 |
|---|---|---|---|---|---|
| 主軸 target | 中小事業者・士業・コンサル | 中小事業者・士業・コンサル | **中小事業者・コンサル** (士業除外) | 同 v1.2 | 同 v1.2 |
| 士業の扱い | 主軸 | 主軸 | industry_sop の 1 業種セグメント | 同 v1.2 + §10.9 業法ガードで明文 | 同 v1.3 |

### 4.4 cron 頻度の変遷

| ソース | v1.1 | v1.2 | v1.3 | v1.4 |
|---|---|---|---|---|
| 海外X | 週次 | 週次 | 週次 | **日次** (退行修正) |
| 公式ブログ | (twitterapi 監視) | 同左 | 同左 | 日次連動 |
| GitHub Trending | 週次 (manual ingest) | **日次 cron (07:00 JST)** | 同 v1.2 | 同 v1.2 |
| Discord | manual ingest (週次) | 同左 | 同左 | 同左 |
| Podcast | manual ingest (月次) | 同左 | 同左 | 同左 |

### 4.5 投稿頻度の変遷 (cs:s3-68 silent reduction 検出対象)

| 媒体 | v1.0 | v1.1 | v1.2 | v1.3 | v1.4 (Current) | v9.1/CLAUDE.md 元設計 |
|---|---|---|---|---|---|---|
| X | (記載なし) | 1 投稿/日 (= 30 本/月) | 同左 | 1 投稿/日 (= 30 本/月) | **1 投稿/日 = 30 本/月** | 1 投稿/日 |
| note | (記載なし) | 週 1 (= 月 4) | 週 1 | 週 1 (silent reduction の温床) | **無料 3-5 本 + 有料 1 本 = 4-6 本/月** | 無料 3-5 + 有料 1 |
| Instagram | (記載なし) | 週 1 (= 月 4) | 週 1 | 週 1 (silent reduction、当初設計 1/3 へ縮退) | **カルーセル週 2 + リール週 1 = 約 12 本/月** | カルーセル + リール想定で月 12 |

### 4.6 KPI 指標の進化

| 指標 | v1.0 | v1.1 | v1.2 | v1.3 | v1.4 |
|---|---|---|---|---|---|
| PCR | 未明示 | 0.30%+ | 0.30%+ | 0.30%+ | 0.30%+ |
| url_link_clicks (月) | 未明示 | 50+ | 50+ | 50+ | 50+ |
| citation_explicit_rate | 未明示 | ≥ 65% | ≥ 65% | ≥ 65% | ≥ 65% |
| publishing_lag (opinion) | 未明示 | 24-48h | 24-48h | 24-48h | 24-48h |
| failure_story | 未明示 | 15-25% (比率) | 15-25% | ≤ 4/月 (上限) | ≤ 4/月 (上限) |
| industry_sop | 未明示 | 20% | 20% | 20% (= 6/月 if 30 投稿) | 30 本中 20% (= 6 本/月) |
| non_engineer_translation | 未明示 | 25% | 25% | 20% | 30 本中 20% (= 6 本/月) |

---

## 5. 統合プロセスメモ

### 5.1 観察された進化パターン

- **v1.0 → v1.1**: Phase 0 v2 (24 アカ + 9 項目分析) の知見を取り込み、分類軸を 4 排他化。`original` という名称で導入された 40% 比率は v1.3 で `first_hand` に renamed (用語のみ、数値不変)。
- **v1.1 → v1.2**: Target 定義の絞り込み (士業格下げ) と GitHub Trending の cron 頻度格上げ。Q2 query を士業 + 業務代行業に拡張する連動修正含む。
- **v1.2 → v1.3**: Codex round 1 の C-1〜C-5 を一括反映。最大の構造変更は (a) industry_sop を軸 1 から軸 2 に独立 (b) failure_story の KPI 型を比率 → 上限に切替 (c) query を 2 系統 10 本に分離。
- **v1.3 → v1.4**: Cycle 2 で発覚した 2 件の silent reduction を退行修正。(a) 海外X cron が週次のまま放置されていた (b) 投稿頻度表記「週 1」が当初設計値を下回っていた。

### 5.2 silent reduction の事故と対策

v1.3 では「1 投稿/日 (X) + 週 1 (note / Instagram)」と表記。これが note 4 本/月 (下限のみ) / Instagram 4 本/月 (当初設計 1/3) に縮退した silent reduction を引き起こした。v1.4 で全面復元し、§2.14 / §4.2 に検出パターンを明文化。

### 5.3 統合作業中に発見した文書間矛盾 (本ドキュメント作成時)

- **classification 軸の改名**: v1.1 「original」 / v1.3 「first_hand」が同一概念 (40% 比率)。v1.3 で用語統一されたが、数値は不変。本ドキュメントでは両表記を保持。
- **failure_story の比率 KPI vs 上限 KPI**: v1.1 / v1.2 は 15-25% (比率)、v1.3 / v1.4 は ≤ 4/月 (上限)。Codex C-5 で「比率と上限の同居 → 上限のみ採用」に整理。本ドキュメントでは旧比率も §2.2 内で「Deprecated」付きで保持。

### 5.4 Phase 1 着手時の Single Source

**`STYLE-GUIDE-CURRENT.md` → v1.4** を指す。v1.0 / v1.1 / v1.2 / v1.3 は履歴として残置、本統合版でも参照可能。
