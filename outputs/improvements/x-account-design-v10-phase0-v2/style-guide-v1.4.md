# ofmeton Style Guide v1.4 — Cycle 2 退行修正版

> Cycle 1 (v1.3) で見落とした 2 件の **退行 (silent reduction)** をユーザー指摘により修正。  
> **Phase 1 着手時は本 v1.4 を採用**。v1.1 / v1.2 / v1.3 は履歴として残置。

---

## 0. 版管理 + 現行ポインタ

| version | 日付 | 差分 |
|---|---|---|
| v1.0 | 2026-05-25 (v10.3 inline) | Phase 0 v1 ベース |
| v1.1 | 2026-05-26 (PR #23) | Phase 0 v2 反映 |
| v1.2 | 2026-05-26 (PR #24) | 士業格下げ + GitHub Trending 日次化 |
| v1.3 | 2026-05-26 (PR #25) | Codex round 1 オールクリア対応 |
| **v1.4** | **2026-05-27 (本 PR)** | **Cycle 2: 海外X 週次→日次格上げ + 投稿頻度 silent reduction 復元** |

→ `STYLE-GUIDE-CURRENT.md` は v1.4 を Single Source として指す。

---

## 1. v1.3 → v1.4 差分まとめ

### 1.1 海外X cron: 週次 → 日次 (退行修正、cs:p2-fd8c / s3-67)

#### 旧 (v1.2 / v1.3 §5.3 No.1)

> 海外X — twitterapi.io (**週次 cron**)

#### 新 (v1.4)

> 海外X — twitterapi.io (**日次 cron**, 07:00 JST、GitHub Trending と同タイミング)

#### 変更理由

- v1.3 §5.1 publishing_lag (translation 1-6h / paraphrase 6-12h) との **逆転**: 最も urgency 高い情報源を最も粗い cron に割り当てていた
- GitHub Trending (62% カバー、二次) が日次なのに、海外X (96% カバー、一次) が週次は priority inversion
- cs:s3-67 (cron 頻度は freshness 要求と整合させる) 違反

### 1.2 投稿頻度: silent reduction を正設計に復元 (cs:p3-592d / s2-68)

#### 旧 (v1.3 §6)

> 投稿頻度: 1 投稿/日 (X) + 週 1 (note / Instagram)

#### 新 (v1.4)

> 投稿頻度:
> - **X: 1 投稿/日 = 30 本/月** (変更なし)
> - **note: 無料 3-5 本/月 + 有料 1 本/月 = 計 4-6 本/月** (v9.1 / CLAUDE.md 確定値)
> - **Instagram: カルーセル週 2 + リール週 1 = 約 12 本/月** (v9 当初想定)

#### 変更理由

- v1.3 で「週 1 (note/Instagram)」と書いて note 月 4 (下限値のみ) / IG 月 4 (当初想定の 1/3) に **silent reduction** していた
- v9.1 note 詳述章で「無料 3-5 + 有料 1」と確定済、CLAUDE.md にも同記述
- IG は v9 当初設計でカルーセル + リールの想定、月 12 が標準
- cs:s2-68 違反 (range を下限に縮退、commitment を silent に縮小)

---

## 2. 継承する v1.3 規定 (変更なし)

### 2.1 コンテンツ比率 (軸 1, 4 排他)

| 種別 | Phase 1 比率 |
|---|---|
| translation | 10% |
| paraphrase | 20% |
| **opinion** | **30%** |
| **first_hand** | **40%** |

### 2.2 Hook 類型 (軸 2)

failure_story 月 ≤ 4 上限 / industry_sop 20% / non_engineer_translation 20% / before_after 15% / number_first 10% / insight_thread 10% / tool_review 10% / その他 mix 15%

### 2.3 publishing_lag

- translation: 1-6h
- paraphrase: 6-12h
- **opinion: 24-48h**
- first_hand: 即時〜数日

### 2.4 citation_explicit_rate

**≥ 65%** + translation 構造規約 (翻訳意図 1 行を出さない)

### 2.5 情報源プリセット (v1.4 更新)

| 優先 | 情報源 | 取得経路 | 競合カバー率 |
|---|---|---|---|
| 1 | 海外X | twitterapi.io (**日次 cron, 07:00 JST** ← v1.4 で週次から格上げ) | 96% |
| 2 | 公式ブログ | twitterapi.io 公式アカ監視 (日次連動) | 75% |
| 3 | GitHub Trending | 日次 cron (07:00 JST) | 62% |
| 4 | Claude Code 履歴 + Git commit + 案件メモ | 自リポジトリ scan + DLP redaction | 29% |
| 5 | Discord (Claude Code / Anthropic) | manual ingest (週次) | 4% |
| 6 | Podcast | manual ingest (月次) | 25% |
| 7 | 音声メモ | 公開許諾 gate 通過後 | — |

### 2.6 士業 = industry_sop の 1 業種セグメント (v1.2 / v1.3 から継承)

主軸 target は中小事業者・コンサル。士業は industry_sop で扱う。

### 2.7 query 2 系統 (v1.3 から継承)

A 系 publisher_discovery 5 + B 系 audience_validation 5。詳細は query-design-v2.md。

---

## 3. Phase 1 KPI (v1.4 確定値)

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

---

## 4. Cycle 2 のセルフレビュー (cs:s1-66 pre-flight check 実施)

### 4.1 数値定義 cross-document check

| 概念 | v1.4 | v9.1 (note 章) | CLAUDE.md | v10.3 (§1.4) |
|---|---|---|---|---|
| X 投稿 | 30/月 | (未明示) | 1 投稿/日 | (§4.3.2 短文 90% 想定で 30 本以上) |
| note 投稿 | 4-6/月 | 無料 3-5 + 有料 1 | 月 売上 3-10 万 (本数別記なし) | (§4.3 note 章で 4-6 想定) |
| Instagram 投稿 | 12/月 | — | (Phase 別 follower 目標のみ) | (§3 で IG カルーセル + リール想定) |
| 海外X cron | 日次 | — | — | (§3.1 で「速報性 1-6h」要求) |
| GitHub Trending | 日次 | — | — | v1.2 で日次化 |

→ 文書間整合性 OK。v1.4 と他文書の数値が一致するように修正済。

### 4.2 silent reduction の検出パターン (再発防止)

- range の下限のみ採用 (4-6 → 4) → 必ず range 全体を保持
- 当初設計値を「簡素化」名目で reduce → 必ず元値と diff を明記
- 「週 N」表記は月換算で逆チェック (週 1 = 月 4 / 週 2 = 月 8 / 週 3 = 月 12)

---

## 5. v1.4 → v1.5 発動条件 (v1.3 §7 から継承)

- Phase 1 Month 1 末で PCR / url_link_clicks 実測 → 中央値乖離 ≥ 20%
- watchlist 24 アカのうち 4+ が engagement -50%
- 海外X 日次 cron で素材供給過多/不足が判明 → 頻度再調整

---

## 6. 完了判定

- [x] 海外X 日次格上げ (cs:p2-fd8c 整合)
- [x] 投稿頻度 silent reduction 復元 (cs:p3-592d 整合)
- [x] Cycle 2 セルフレビュー pre-flight check (cs:s1-66) 実施
- [ ] STYLE-GUIDE-CURRENT.md を v1.4 に更新
- [ ] competitor-report-v3 / v10.3 関連箇所 sweep
- [ ] PR-merge + GitHub UI URL 提示
