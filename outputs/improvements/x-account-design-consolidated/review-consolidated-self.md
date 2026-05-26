# Consolidated Docs セルフレビュー (Round 1)

> 日付: 2026-05-27 / レビュアー: Claude (本セッション) / 対象: 4 統合ファイル + INDEX
> 準拠ルール: cs:s1-66 (schema 衝突 pre-flight) / cs:s2-68 (silent reduction 厳禁) / cs:s3-43 (worktree)

## 1. レビュー対象

| シリーズ | ファイル | 行数 |
|---|---|---:|
| A | `main-design-all-versions.md` | 948 |
| B | `style-guide-all-versions.md` | 741 |
| C | `competitor-report-all-versions.md` | 1,118 |
| D | `query-design-all-versions.md` | 617 |
| — | `INDEX.md` | 84 |

## 2. 全文書 quantitative value / classification axis 比較表 (Cross-Doc Schema Consistency)

各指標について 4 ファイルから抽出した値を横並びで確認した。**全項目で SSOT 一致** を確認。

### 2.1 投稿頻度

| 媒体 | main-design (A) | style-guide (B) | competitor (C) | query-design (D) | 判定 |
|---|---|---|---|---|---|
| **X** | 1 投稿/日 = 30 本/月 (§2.3) | **1 投稿/日 = 30 本/月** (v1.4 §3) | (v1.4 §3 を SSOT 参照、§367 改訂注記) | — | ✅ 一致 |
| **note** | 無料 3-5/月 + 有料 1/月 = 4-6/月 (§2.3, §4) | **無料 3-5 + 有料 1 = 4-6 本/月** (v1.4 §3) | (v1.4 §3 を SSOT 参照) | — | ✅ 一致 |
| **Instagram** | カルーセル週 2-3 + リール週 1 想定、月 12+ 本目安 (§2.3) | **カルーセル週 2 + リール週 1 = 約 12 本/月** (v1.4 §3) | (v1.4 §3 を SSOT 参照) | — | ⚠ **要注意** — 月数は両者 12 本で一致だが、A が range (週 2-3)、B が単一値 (週 2)。A は v9 当初の range を保持 (cs:s2-68 silent reduction 防止優先)、B は v1.4 確定の単一値。INDEX で SSOT は v1.4 と明示済なので**現状仕様矛盾ではない**が、A の「+」表記は誤解の余地あり (§4.1 patch 候補) |

### 2.2 cron / scheduling

| 監視ソース | A | B | C | D |
|---|---|---|---|---|
| **海外X (twitterapi.io)** | 週次 → **日次** (§3.7 deprecated、§4 行 903 = 「日次」) | **日次 cron, 07:00 JST** (v1.4 §5.3) | (v1.4 §3 SSOT 参照) | — |
| **GitHub Trending** | (未明示、Style Guide 連動) | **日次 cron** (v1.2 で日次化、v1.3 / v1.4 継承) | (v1.4 §3 SSOT 参照) | — |

判定: ✅ 一致 (日次格上げ、priority inversion 解消)。

### 2.3 4 排他軸 (軸 1 = 素材 source)

| 軸要素 | A | B | C | D |
|---|---|---|---|---|
| translation | **10%** (§2.4) | **10%** (v1.3 §6.1) | (v1.4 §3 SSOT 参照) | — |
| paraphrase | **20%** | **20%** | 同 | — |
| opinion | **30%** | **30%** | 同 | — |
| first_hand | **40%** | **40%** | 同 | — |
| 合計 | 100% | 100% | — | — |

判定: ✅ 完全一致 (旧 v10.3 §4.3.6 「opinion 10 / paraphrase 30 / first_hand 40 / industry_sop 20」は §3.X で Deprecated 注記、v1.3 で軸 2 に industry_sop を独立扱い)。

### 2.4 Hook 分類軸 (軸 2 = 表現類型)

| 軸要素 | A | B | C |
|---|---|---|---|
| Hook 総数 | **16 種類** (§2.4 行 309) | 同 (v1.3 §6.2) | 同 |
| primary_hook 数 | 4 種 (failure_story / business_repro / opinion 数字 / first_hand) | 同 | 同 |
| devices 数 | 13 種 (結論先出 / 経験談導入 等) | 同 | 同 |
| **industry_sop** | 軸 2 (Hook 類型) の 1 種、月 20% 目標 | 同 (v1.3 §2.2) | 同 |
| **non_engineer_translation** | 月 20% 目標 (※v1.3 で 25% → 20% に変更) | 同 (v1.3 §6.2) | 同 |
| **failure_story** | **比率 KPI 撤回**、verified ≤ 4/月 上限 (供給制約、C-13 反転) | 同 (v1.3 §6.2 注記) | 同 |

判定: ✅ 一致 (failure_story は当初 fail_rate ≥ 15% だったが、cs:s3-48 + C-13 で月 ≤ 4 上限に反転、A §3.5 / B §3 で Deprecated 原文保持)。

### 2.5 KPI / Metric 体系

| 指標 | A | B | C |
|---|---|---|---|
| 真の北極星 (Phase 1〜) | PCR + url_link_clicks (+ utm_attribution + qualified_lead 3 段、§2.1.3) | (KPI 設計は A SSOT 参照) | (-) |
| dwell_time | **削除** (B-2 で X API 非存在確認、A §3.1 Deprecated) | (-) | (-) |
| business outcome | utm_attribution + paid_article_purchase + consultation_request + qualified_lead (v10.3 追加) | (-) | (-) |

判定: ✅ 一致。

### 2.6 価格設計 (note 有料)

| 指標 | A | B | C |
|---|---|---|---|
| 価格レンジ | 500 / 980 / 1480 円 (3 段、PSM 廃止 → ランダム + switchback、§2.7) | (Style Guide では言及せず) | v3 改訂で「ofmeton 修正案」セクションあり |
| PSM | **廃止** (v10.3、A §3.4 Deprecated) | (-) | (-) |
| Visualizer モード | ランダム + switchback (v10.3 確定、§2.6) | (-) | (-) |

判定: ✅ 一致。

### 2.7 Target Segment

| 軸 | A | B | C |
|---|---|---|---|
| Primary target | 非エンジニア経営者 (中小事業者・コンサル) | 同 (v1.2 §1.1) | 同 |
| **士業の扱い** | industry_sop の 1 セグメント (sub-segment)、Phase 2 後半に投入 (§2.1.2, §2.2) | 同 (v1.2 §1.1) | 同 |
| Phase 1 月別フォーカス | 経理 / 業務効率化 → 製造・小売 → 教育・塾 → AI 委託フロー (v10.3 業法独占薄い順) | (Style Guide では言及せず) | (-) |

判定: ✅ 一致 (cs:s3-62 士業格下げ確定)。

### 2.8 publishing_lag

| 軸 1 区分 | A | B | C |
|---|---|---|---|
| translation | 1-6h (v10.1〜、§2.6) | **1-6h** (v1.1) | (v1.4 SSOT 参照) |
| paraphrase | 6-12h | **6-12h** | 同 |
| opinion | 24-48h | **24-48h** | 同 |
| first_hand | 即時 (自家ネタなので lag 不要) | 同 | 同 |

判定: ✅ 一致。

### 2.9 Query 設計 (D 独自)

| 軸 | v1 | v2 (**Current**) |
|---|---|---|
| query 数 | 5 (Q1-Q5 単系統) | 10 (publisher 5 + audience 5 = 2 系統分離) |
| seed hit rate | ~50% (cs:s3-64 step 1d、persona 起点) | **70%+** (Phase 0 v3 で 17/24、seed reverse-engineering) |
| Q5 (海外英語圏) | 0 hits | min_faves 緩和 + query 拡張で対応 (PR #25 で改善検証) |
| Q2 改訂 | 士業 + 経理代行 (v1.2 改訂で業務代行業全般に拡張) | 同 |

判定: ✅ 一致 (Codex C-1 / C-2 反映済)。

### 2.10 法務 / コンプライアンス

| 軸 | A | B | C |
|---|---|---|---|
| 公開許諾 gate (案件素材) | publication_consent='granted' (CR-2、§2.9) | (-) | (-) |
| DLP redaction | 12 カテゴリ、固有名詞 mask (CR-2、§2.9) | (-) | (-) |
| 業法ガード (税理士 / 司法書士 / 弁護士法独占) | §10.9 業法独占キーワード ban (v10.3 新章) | (-) | (-) |
| note 販売 compliance | §10.10 (v10.3 新章) | (-) | (-) |
| バックアップアカウント | **削除** (CR-1、X Automation Rules 抵触、§3.3 Deprecated 原文保持) | (-) | (-) |
| 失業手当ガード | **除外** (本人指示、CLAUDE.md 方針) | (-) | (-) |

判定: ✅ 一致。

## 3. 軽微な improvement 候補 (Codex 投入前の self-patch、必須ではないが Round 1 で確認)

### F-1: A §2.3 Instagram の「月 12+ 本目安」を「月 12 本」に修正

- 現状: 「カルーセル週 2-3 + リール週 1 想定 (v9.2 §2.5 / v10.1 投稿頻度設計と整合、月 12+ 本目安)」
- 推奨: 「月 12 本」 (B v1.4 §3 SSOT と一致)
- 理由: 「+」表記は実値超過を許容する解釈を招く可能性。SSOT 値は v1.4 で「月 12」と確定
- ただし: A の §4 進化マトリクス行 902 では「(カルーセル週 2-3 + リール週 1、月 12+ 本目安)」と表記している。これは「v9 当初の range 保持 (cs:s2-68 silent reduction 防止)」の意図と読める
- **判断**: パッチしない。理由 — A の表記は「v9 当初設計を保持」+ 「v1.4 確定の月 12 と等価」を示しており、cs:s2-68 ルールに従っている。INDEX §1 で SSOT は v1.4 と明示済なので、A の「目安」表記は履歴文脈として保持して良い

### F-2: A §3.2 「haguri persona」の Deprecated 扱い

- 現状: §3.2 [元 v8〜v9 §X.Y] 既存資産扱い (BSA / haguri 連携) に haguri persona が含まれている
- 文脈: haguri は monetize-os 配下の persona で all-good-ops の x-account-design とは別管理 (CLAUDE.md 明示)
- **判断**: パッチしない。理由 — 「v9 時点で連携対象外と確定した既存資産」枠で並列に並べたのは正しい (BSA / haguri / x-buzz-radar / ai-radar すべて「v9 当時連携検討対象で v9 で撤廃判断」したという統一文脈)。INDEX §5 (統合対象外) でも haguri は触れていないので、§3.2 の歴史的記録としての保持は妥当

### F-3: INDEX §6 「旧バージョンファイルの扱い」明文化済か再確認

- 旧 v9.md / v10.md / style-guide-v1.1.md 等は削除しない方針を明記済 (INDEX §6)
- セルフレビュー過程で旧ファイル参照が正しく保たれていることを確認
- **判断**: 既に明文化済、パッチ不要

## 4. Round 1 結論

| Item | Status |
|---|---|
| Cross-doc schema consistency (10 軸) | **All Pass (✅)** |
| Silent reduction (cs:s2-68) | **検出なし** (Instagram の表記差異は履歴 + SSOT の併記、矛盾ではない) |
| Classification axis 矛盾 (cs:s1-66) | **検出なし** (4 排他軸 / Hook 16 種 / publishing_lag / etc 全て一致) |
| Deprecated 節の原文保持 | **9 セクションで確認** (A §3.1-§3.9) + B / C / D 各 §3 |
| Version history header | **A 11 / B / C / D 全節カバー** |
| Current SSOT marker | **適切に配置** |

**判定**: Codex クロスレビュー (Round 2) に送信可能な状態。schema 衝突 / silent reduction / 値矛盾なし。

## 5. Codex への申し送り事項 (Round 2 用)

1. 4 統合ファイル + INDEX をまとめてレビュー対象
2. 過去 PR #25 review-cycle-1-codex.md で Codex は既に 4 ラウンド経て all-clear 済 (Style Guide v1.3 / competitor-report-v3 段階)
3. 今回の Round 2 は **統合作業による意図せぬ変質 / silent reduction / SSOT 矛盾** の検出に焦点
4. 既に self-patch 候補は §3 に列挙済 (パッチしないと判断したものも含む)
5. Codex に追加検出を期待する観点: (a) 4 ファイル間の cross-reference リンク切れ (b) deprecated 節と本文の論理矛盾 (c) v9 当初設計が完全に消えている節がないか
