# ofmeton Style Guide v1.3 — Codex round 1 オールクリア対応版

> v1.1 / v1.2 の指摘 C-1〜C-5 を全て反映、v10.3 設計書本体との分類体系統一を実施した patch 版。  
> **Phase 1 着手時は本 v1.3 を採用**。v1.1 / v1.2 は履歴として残置。

---

## 0. 版管理 + 現行ポインタ

| version | 日付 | 差分 |
|---|---|---|
| v1.0 | 2026-05-25 (v10.3 inline) | Phase 0 v1 (10 アカ) ベース、分類: opinion 10 / paraphrase 30 / first_hand 40 / industry_sop 20 |
| v1.1 | 2026-05-26 (PR #23) | Phase 0 v2 (24 アカ + 9 項目)、別分類: translation 10 / paraphrase 20 / opinion 30 / original 40 |
| v1.2 | 2026-05-26 (PR #24) | 士業主軸格下げ + GitHub Trending 日次化 |
| **v1.3** | **2026-05-26 (本 PR)** | **C-1〜C-5 オールクリア: 分類体系統一 / failure_story 上限化 / query 2 系統分離 / 士業 sweep** |

### 0.1 現行版指定

**`STYLE-GUIDE-CURRENT.md` シンボリックリンクを v1.3 に固定** (R-20 / R-21 / H-13 対応)。Phase 1 着手時には v1.3 のみが Single Source。

---

## 1. v1.1 / v1.2 → v1.3 差分まとめ

### C-1 / C-2 / C-3 / C-4 / C-5 全対応

| Codex 指摘 | 対応 |
|---|---|
| C-1 「発信者発掘 + target hit 混線」 | §3 query 設計 2 系統分離 (A 系 publisher / B 系 audience) |
| C-2 「Q1-Q5 が seed 20 アカ hit しない」 | §3 query を Claude/Codex/Obsidian/MCP 軸で再設計、Phase 0 v3 実 API で **seed hit 70%** 検証済 |
| C-3 「士業外し sweep 未完」 | §4 全成果物の士業言及一括 sweep (v10.3 §10.3 / report-v2 / Style Guide / query 全箇所) |
| C-4 「数値文書間不一致」 | §2 分類体系統一 (4 排他 + 別軸 Hook) + STYLE-GUIDE-CURRENT.md |
| C-5 「failure_story 比率 vs 上限同居」 | §2.4 比率 KPI 撤回 / `verified_failure_story 月 ≤4` 上限のみに統一 |

---

## 2. コンテンツ素材分類 (統一)

### 2.1 軸 1: 素材 source (4 排他、合計 100%)

| 種別 | Phase 1 比率 | 定義 |
|---|---|---|
| translation | **10%** | 海外発信を直訳に近い形 (cs:p3-ddde 「翻訳意図 1 行」を出さない構造規約あり) |
| paraphrase | **20%** | 構造 + 固有名詞 + 数字を変更しつつ海外/公式情報を再加工 |
| **opinion** | **30%** | 海外情報をトリガーに ofmeton の所感を前面に出す (差別化レバー、cs:p3-ddde 整合) |
| **first_hand** | **40%** | 本人事業 (RICE CREAM / 家庭教師 / portfolio / all-good-ops) + 案件 client 素材の一次体験 |

合計 10 + 20 + 30 + 40 = **100%**

→ v10.3 §4.3.6 の旧 「opinion 10 / paraphrase 30 / first_hand 40 / industry_sop 20」 は **本 v1.3 で廃止**。industry_sop は **軸 1 ではなく軸 2 (Hook 類型)** として独立扱い (cf. §2.2)。

### 2.2 軸 2: Hook 類型 (排他、別軸、合計 100% / 1 投稿には 1 類型のみ)

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

### 2.3 軸 1 × 軸 2 のクロス具体例

| 軸 1 \ 軸 2 | failure_story | industry_sop | non_engineer_translation |
|---|---|---|---|
| translation | 不適 (上限) | 不適 | × (cs:p3-ddde 翻訳臭 NG) |
| paraphrase | × | △ (case study 引用) | △ |
| opinion | × | △ | **◎ (主軸)** |
| **first_hand** | **◎ (主軸 verified ≤4/月)** | **◎ (主軸)** | △ |

### 2.4 failure_story の供給制約 (C-5 対応)

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

## 3. query 2 系統設計 (C-1 / C-2 対応)

詳細は `query-design-v2.md` 参照。

### 3.1 A 系 publisher_discovery (発信者発掘)

| Q# | 趣旨 | Phase 0 v3 hit (新規, 上位例) |
|---|---|---|
| A1 | Claude Code 活用発信者 | ClaudeCode_UT / ClaudeCode_love / cyrilXBT / commte / Codestudiopjbk / 新規: sora19ai / gagarot200 |
| A2 | Codex / CLI 系 | Codestudiopjbk / masahirochaen / 新規: AiAircle34052 / kawai_design |
| A3 | Obsidian × AI | obsidianstudio9 / ObsidianOtaku / Shimayus / 新規: 7_eito_7 |
| A4 | MCP / エージェント実装 | Shimayus / so_ainsight / SuguruKun_ai / 新規: genkAIjokyo |
| A5 | 海外英語圏 (旧 Q5 緩和) | (一部 hit、改善余地あり → Phase 0 v4) |

**seed 24 アカ hit rate: 17/24 = 70%** (Phase 0 v3 実 API call で検証)

### 3.2 B 系 audience_validation (読者層検証)

| Q# | 趣旨 | Phase 0 v3 hit (新規, 上位例) |
|---|---|---|
| B1 | 中小経営者の AI 困りごと | AIshukyaku (25) / kandmybike (18) / chanryo_eff (16) / shodaiiiiii / inkya_sme |
| B2 | コンサル / 業務代行 × AI | SuguruKun_ai / akihito_okura / yamatomo_1117 |
| B3 | 業務効率化 / 業務自動化 | shota7180 / happyyoshigi / TakeshiYonese |
| B4 | industry_sop 候補 (経理/請求書/見積) | houki_ai_keiri / daifukujinji |
| B5 | 士業 × AI (industry_sop 1 セグメント) | speranzapt / TakeshiYonese (士業含む) |

### 3.3 target_fit_score 2 層化 (H-7 対応)

```
publisher_score (A 系) = (followers × engagement × 0.3)
                       + (content_overlap_score × 0.4)  ← 投稿本文/リンク/リポジトリ言及
                       + (recent_max_engagement × 0.2)
                       + (publishing_frequency × 0.1)

audience_score (B 系) = (target_fit_bio × 0.5)
                      + (target_fit_content × 0.5)
```

publisher_score ≥ 0.5 で発信者候補化、audience_score ≥ 0.4 で読者層分析対象。

---

## 4. 士業の位置づけ統一 (C-3 対応)

| 場所 | 旧 (v1.2) | 新 (v1.3) |
|---|---|---|
| 主軸 target | 中小事業者・**士業**・コンサル | **中小事業者・コンサル** (士業除外) |
| industry_sop 軸 | 経理/請求書/見積/民泊清掃 | **経理/請求書/見積/民泊清掃 + 士業 (1 業種セグメント)** |
| §10.9 業法ガード | リスクが薄い業種からスタート、Phase 2 後半に士業へ拡張 | **リスクが薄い業種からスタート、Phase 2 後半に業種拡張 (士業含む全 industry_sop)** |
| Q2 query (旧) | 士業 4 語 | **B5 query**: 士業 5 語 (industry_sop 候補発掘用) |
| competitor-report-v2 §4.2 | 業種別 SOP (経理/請求書/見積/民泊清掃) | 業種別 SOP (経理/請求書/見積/民泊清掃/**士業**) |

すべての箇所で「士業 = industry_sop の 1 業種セグメント、主軸 target ではない」と統一。

---

## 5. その他継承する v1.1 / v1.2 規定 (変更なし)

### 5.1 publishing_lag

- translation: 1-6h
- paraphrase: 6-12h
- **opinion: 24-48h** (差別化レバー)
- first_hand: 即時〜数日

### 5.2 citation_explicit_rate

**≥ 65%** (中央値 37.5% の 1.7 倍、誠実性レバー)
+ translation 投稿構造規約: 「翻訳意図の 1 行」を出さない (cs:p3-ddde 整合、H-14 対応)

### 5.3 情報源プリセット (v1.2 から維持)

| 優先 | 情報源 | 取得経路 |
|---|---|---|
| 1 | 海外X | twitterapi.io (週次 cron) |
| 2 | 公式ブログ | twitterapi.io 公式アカ監視 |
| 3 | GitHub Trending | **日次 cron** (v1.2 で日次化、本 v1.3 で継承) |
| 4 | Claude Code 履歴 + Git commit + 案件メモ | 自リポジトリ scan + DLP redaction |
| 5 | Discord (Claude Code / Anthropic) | manual ingest (週次) |
| 6 | Podcast | manual ingest (月次) |
| 7 | 音声メモ | 公開許諾 gate 通過後 |

---

## 6. Phase 1 KPI (v1.3 確定値)

| 指標 | 目標 |
|---|---|
| 投稿頻度 | 1 投稿/日 (X) + 週 1 (note / Instagram) |
| PCR (Profile Click Rate) | 0.30%+ |
| url_link_clicks (note 送客) | 月 50 click+ |
| **failure_story 投稿数** | **≤ 4/月 (verified のみ、上限 KPI)** |
| industry_sop 投稿数 | 20% (= 6/月 if 30 投稿) |
| non_engineer_translation 投稿数 | 20% (= 6/月) |
| citation_explicit_rate | ≥ 65% |
| publishing_lag (opinion) | 24-48h 中央値 |

---

## 7. v1.3 → 将来 v1.4 の発動条件 (H-15 / R-28 対応)

以下のいずれかで Optimizer が v1.4 への改訂を提案 (人間承認必須):

- Phase 1 Month 1 末で PCR / url_link_clicks 実測 → 中央値乖離 ≥ 20% で transfer 値見直し
- watchlist 24 アカのうち 4 アカ以上が直近 30 日 engagement -50% → pruning + 新規候補追加
- Phase 0 v4 (Q5 海外英語圏再設計後) で新規 publisher 5+ 件発掘 → 母集団 24 → 28 へ拡張

---

## 8. 完了判定

- [x] Codex round 1 C-1〜C-5 すべて反映
- [x] query 2 系統分離 + Phase 0 v3 で seed hit 70% 検証
- [x] 分類体系統一 (4 排他軸 1 + Hook 類型軸 2)
- [x] failure_story 上限 ≤ 4/月 一本化
- [x] 士業全成果物 sweep
- [ ] STYLE-GUIDE-CURRENT.md シンボリックリンク作成 (本 PR 内)
- [ ] v10.3 設計書本体への transfer (§4.3.6 / §10.3 / §10.9 / §11 等)
- [ ] competitor-report-v3.md 起草
- [ ] Codex 再クロスレビューで closed loop
