# Phase 0 v2 全成果物 セルフレビュー round 1 (2026-05-26)

> 対象: v10.3 設計書 / v1.1 / v1.2 Style Guide / competitor-report-v2 / query-design / fetch scripts / Phase 0 v2 raw
> 観点: target 変更 (士業外し) の論理波及 / クエリ条件の target_fit / 母集団選定根拠 / 分析手法の再現性 / Style Guide transfer 値の根拠

## 観点別レビュー項目 (R-1 〜 R-30)

### A. Target 整合性 (士業外しの波及)

**R-1**: v10.3 設計書本体 §1.1 / §1.2 / §10.3 / §10.9 / §11 など複数章で士業 / 「中小事業者・士業・コンサル」が言及されているが、v1.2 patch は §10.9 周辺 (L121) の 1 行にしか反映していない。**部分 patch のリスク** = 設計書を将来読む人が「士業も主軸ターゲット」と誤解する可能性

**R-2**: §10.9 業法ガード章は意図的に残置したが、「士業は industry_sop の 1 セグメント」という新ポジション下では業法ガードの対象範囲が変わる可能性 (士業向け SOP 投稿のみガード必要 vs 全業種に対する士業役務言及をガード)

**R-3**: HUMAN_TASKS.md (apps/x-account-system/) に士業向けの human task が含まれていないか確認必要 (H-1〜H-11 のうち士業 client 確認 / 士業バリュー検証等)

**R-4**: competitor-report-v2.md §4.2 で「業種別 SOP (経理/請求書/見積/民泊清掃/士業)」と patch したが、§3 テーマ × フォーマットマトリクスでは「士業 × AI」を別行で扱っている = マトリクス側との整合が不一致

### B. クエリ条件と母集団 (最重要)

**R-5**: **Q1-Q5 は「ユーザーが手打ち指定した 20 アカ」が hit するように設計されていない**。実際 20 アカは reference-accounts.md でユーザー指定された後に Phase 0 v2 fetch を実行している = query 結果ではなく **a priori にユーザーが選定**したリスト。Q1-Q5 はあくまで「追加発掘」用

**R-6**: **20 アカ raw post の主要テーマ調査が不足**。ClaudeCode_UT / claudecode_lab / Obsidian 系などは "Claude Code 機能解説" "Obsidian × AI" が主軸 → 現行 Q1-Q5 (中小/士業/業務効率化/経理-請求書/英語圏 non-engineer) では刺さらない。「ユーザーが指定した 20 アカと同等の発信者を発掘する query」が必要

**R-7**: Q2 改訂 (「士業 + 経理代行 + 事務代行 + 業務代行」) は target 主軸から士業を外した判断と整合しない。**士業を query に残しつつ主軸から外す** ロジック自体に矛盾 (どっちつかず)

**R-8**: Q5 (海外英語圏 0 件) の再設計案が v1.2 §1.2 で言及されたが、具体的な改訂 query が未提示。Phase 0 v3 候補プールの広げ方が未確定

**R-9**: 244 unique handles の上位に **除外組 ai_jitan が 12 件再登場**。Q1-Q4 が target_fit_score < 0.5 を発生させる構造的問題 = query 自体が target ニッチに刺さりきっていない証拠

**R-10**: 既存 4 アカ raw (Shimayus / SuguruKun_ai / masahirochaen / ClaudeCode_love) は 2026-05-24 取得、新 20 アカは 2026-05-26 取得 = **取得タイムスタンプ 2 日差** → 母集団の同時性が破綻している可能性

### C. 分析手法の再現性

**R-11**: Sonnet 4.6 分析は cache_read_tokens = 0 で実行されていた (system prompt が 1024 tok 未満で cache 非適用)。**コスト効率は同じだが**、将来の再実行時に system を冗長化して cache 効かせる余地が style-guide-v1.1 §1 で言及されているのみで、analyze-source-ingestion.py のコメントには未反映

**R-12**: Sonnet 出力の **notes 欄に「自信度低」が 8 アカ** (csaba_kissi / ObsidianOtaku / ai_explorer25 / Atenov_D / heynavtoor / jason_coder0 / claudecode_lab / cyrilXBT) で頻出。これらを **transfer 推奨値の根拠**にしているが、自信度低項目をどう扱うか明文化されていない

**R-13**: 24 アカ × top 20 投稿 (= 480 投稿) で 9 項目分析だが、**top 20 by like count が 90 日代表性を持つか**の検証なし。like 偏重ハイライト投稿の傾向に分析が引きずられているリスク

**R-14**: 既存 4 アカ raw の **配置場所が posts-existing-4/** で新 20 アカと別 dir。Sonnet 分析時に dir 分岐ロジックを script に実装したが、将来 (Phase 0 v3 等) で「24 アカ + α」が増えると dir 分岐が増殖する。**single dir + manifest.json 方式**に改修すべき

### D. Style Guide transfer 値の根拠

**R-15**: **paraphrase 20% (中央値 32.5% から大幅低下)** の根拠が薄い。「翻案依存を意図的に下げる」とあるが、競合 12 アカ Type A が高 paraphrase で成功しているなら、20% は冒険的すぎる。**段階的低下 (Month 1: 30% → Month 3: 20%)** の方が安全

**R-16**: **citation_explicit_rate ≥ 65%** が cs:p3-ddde (ユーザーが翻訳スタイルを嫌い、自分の意見を前面に出すスタイル好き) と矛盾の懸念。citation 多用は「翻訳臭」を強化する可能性 → opinion 30% との **発信スタイル相反**

**R-17**: **failure_story Hook 比率 15-25%**: Phase 0 v1 (10 アカ) 3.2% → Phase 0 v2 (24 アカ) 0% に変動。**統計的に 0% は信頼度低い** (24 アカ全員が完全に避けるのは reverse-engineer の余地、または分析時に failure_story を別の Hook 類型に振り分けた可能性) → 競合中央値の信頼区間を出すべき

**R-18**: publishing_lag (opinion 24-48h) の運用実装: **Scheduler に組み込んでいない**。投稿生成日と公開日を 24-48h ずらす Workflow が v10.3 設計書 §4.5 Scheduler に未実装。Phase 1 着手前にこの GAP 埋め必要

**R-19**: Hook 類型 16 種 (既存 13 + 新 3) を 30 投稿/月でどう配分するかの最適化が未設計。Optimizer に依存しているが、Phase 1 Month 1 の初期配分が未定

### E. Style Guide 並置運用と版管理

**R-20**: v1.0 (v10.3 inline) / v1.1 / v1.2 が並存。**ユーザーが「現在の最新版はどれか」を判断する仕組みなし**。`STYLE-GUIDE-CURRENT.md` symlink or `version-pointer.json` の導入が望ましい

**R-21**: v10.3 設計書本体に inline で Style Guide v1.0 相当の記述があり、これと v1.1/v1.2 の値が乖離している場合に **どちらが優先か**が明示されていない (v1.2 §3.3 で「Style Guide v1.2 §1.1 参照」と note を入れたが断片的)

### F. fetch-github-trending.py 日次化

**R-22**: 全言語 + 5 言語別 = 6 req/day だが、`time.sleep(1.0)` × 6 + scrape 時間 ≈ 10 秒。**rate limit は GitHub 公開ページなので問題なし**だが、UA を `ofmeton-trending-fetch/1.0` で明示 → GitHub TOS への抵触判定不明

**R-23**: cron schedule の実装場所が未指定。Cloudflare Workers Scheduled Event / GitHub Actions / mac launchd の選択肢があるが v10.3 §4.1 / §4.8 に組み込まれていない

**R-24**: 永続化 path `raw/publishing/github-trending/YYYY-MM-DD.json` は immutable raw 規約 (CLAUDE.md §raw) と整合か? `raw/facts/` でなく `raw/publishing/` 配下なので OK だが、ingest workflow との接続が style-guide-v1.2 だけで設計書本体に未反映

### G. その他構造的な問題

**R-25**: **Recurring monitoring の pruning 仕組み未設計** (cs:s2-52)。24 アカ固定 watchlist で時間経過とともに drift する → "今は使えるが半年後は使えない" シナリオが style-guide-v1.2 §2.5 にコメントなし

**R-26**: failure_story 8 倍差別化の **法務・倫理ガード**: 案件素材の失敗談を公開する際に client 許諾 + DLP redaction + 業法ガード (§10.9) の 3 重チェックが必要。ofmeton 1 投稿/日 × 30 日 × 15-25% = 4-7 失敗談投稿 を 30 日で出すなら **ガード Workflow が間に合うか**未検証

**R-27**: cs:p3-ddde (翻訳スタイル嫌い・自分の意見を前面に) と translation_rate 10% は許容範囲内だが、**「翻訳意図の 1 行」を出さないルール**が明文化されていない。translation 投稿の構造規定が必要

**R-28**: Phase 0 v3 (Q5 再設計 + 母集団拡張) の **発動条件・タイミング**が style-guide-v1.2 / competitor-report-v2 で曖昧。「Phase 1 30 日後」「PCR が目標未達時」など条件付き Optimizer 提案が望ましい

**R-29**: source-ingestion-analysis-raw/ 24 ファイルは Sonnet 出力の **JSON pretty + 各 call 1 file** で永続化されたが、24 ファイル合計 1.5MB は次の Phase 0 v3 で同じ手法を取ると累積していく。**1 file aggregate 化**を検討

**R-30**: `analyze-source-ingestion.py` の Q2 query は **Phase 0 v2 fetch のみ** で使われ、9 項目分析自体は使わない (= 分析対象は raw posts のみ)。にもかかわらず fetch-phase0-v2.py の Q2 を v1.2 で改訂した = **改訂は再 fetch 用、現在の 24 アカ raw には影響なし**。これが理解されていないと「v1.2 改訂で分析結果も変わる」と誤解されるリスク

---

## 優先度分類

### Critical (実装ブロッカー)

- **R-5 / R-6**: 20 アカが Q1-Q5 で hit しない構造的問題。ユーザー指示「20 アカが引っかかる query 条件を想像」への直接の不適合
- **R-7**: Q2 改訂と target 主軸格下げの不整合
- **R-1**: v10.3 設計書本体への部分 patch 問題、複数章の整合性
- **R-15 / R-17**: Style Guide 主要値の根拠不足 (paraphrase 20% / failure_story 15-25%)

### High (運用前に解消)

- **R-2 / R-4**: 士業の扱いの局所整合
- **R-10**: 既存 4 アカと新 20 アカの取得タイムスタンプ差
- **R-11 / R-12 / R-13**: 分析手法の自信度・代表性
- **R-16**: citation 65% と opinion 30% / cs:p3-ddde の相反検証
- **R-18 / R-19**: publishing_lag / Hook 配分の運用実装
- **R-22 / R-23 / R-24**: GitHub Trending 実装ギャップ

### Medium (Phase 1 中に解消)

- **R-3 / R-8 / R-9 / R-14 / R-20 / R-21 / R-25 / R-26 / R-27 / R-28 / R-29 / R-30**

---

## 補強アクション提案

| Action | 対応 R | 種別 | 所要 |
|---|---|---|---|
| **A1: 20 アカ raw から頻出語・テーマ抽出** | R-5 / R-6 | 調査 | 30 分 |
| **A2: Q1-Q5 を 20 アカ hit ベースで再設計** | R-5 / R-6 / R-7 / R-8 | 設計 | 30 分 |
| **A3: 改訂 query で実 API call (¥60-100)** | R-9 | 実装 | 5-10 分 |
| **A4: v10.3 設計書本体の士業言及 sweep** | R-1 / R-2 / R-4 | 編集 | 20 分 |
| **A5: Style Guide v1.3 起草 (v1.2 + 補強値)** | R-15 / R-16 / R-17 | 設計 | 1 時間 |
| **A6: HUMAN_TASKS.md に H-12 GitHub Trending cron 追加** | R-23 | 編集 | 10 分 |
| **A7: source-ingestion-analysis 再実行 (改訂 query 結果踏まえて)** | R-12 / R-13 | 実装 | 5 分 + ¥80 |
| **A8: STYLE-GUIDE-CURRENT.md symlink 化** | R-20 / R-21 | 編集 | 5 分 |
| **A9: competitor-report-v3 起草** | R-1 / R-4 / R-5 / R-15 / R-17 | 設計 | 1 時間 |
| **A10: Codex クロスレビュー** | 全体 | 検証 | 5-10 分 |
| **A11: Phase D 再セルフ + 再クロス** | 全体 | 検証 | 30 分 |

**累積想定コスト**: ¥160-180 (A3 + A7)、**所要時間**: 4-5 時間

---

## 次ステップ (本 review-cycle 内で実行)

1. A1 (20 アカ raw 頻出語抽出) を Bash で実行
2. A10 (Codex クロスレビュー) を並列依頼
3. A2 (Q1-Q5 再設計) ドラフト
4. Codex 応答を受けて統合
5. A3 (改訂 query 実 API call) 実行
6. A4 / A5 / A6 / A8 / A9 を一気に書き上げる
7. A11 (Phase D 再レビュー) で final 確認
8. PR-merge + main 到達 URL 提示
