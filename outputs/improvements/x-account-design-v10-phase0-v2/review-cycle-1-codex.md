# Codex MCP クロスレビュー round 1 結果 (2026-05-26)

> reviewer: gpt-5.2 via mcp__codex__codex (read-only sandbox)
> threadId: 019e648e-7303-7382-87ed-2ea86df15586

## Critical (P0)

### C-1: 「発信者発掘」と「target hit 検証」の構造的混線

- 症状: query-design.md が *追加発掘* と *target_fit 検証* を同じ Q1-Q5 で背負っている。Phase 0 v2 母集団 24 アカは a priori 指定の seed で、Q1-Q5 で発掘したものではない
- 対応: **クエリを 2 系統に分離**
  - A) `publisher_discovery`: Claude/Codex/Obsidian/Agent 系で seed と同種の発信者を増やす
  - B) `audience_validation`: 非エンジニア経営者が反応/発言している語彙で読者側を掴む
- 関連 R: R-5 / R-6 / R-9 / R-30

### C-2: Q1-Q5 が seed 20 アカを hit しない (逆算設計になっていない)

- 根拠: seed ツイート本文に Claude/Codex/Obsidian が大量出現 (249/114/92 件) vs 中小/士業/経理 (3/0/3 件) が薄い
- 対応: seed コーパス → 語彙抽出 → 5 本の set-cover で再設計

### C-3: Target 変更 (士業格下げ) が成果物全体に伝播していない

- 根拠: v1.2 は target から士業を外すが、v10.3 §10.3 (月別業種ローテ) では税理士/社労士/行政書士等が残置、competitor-report-v2 でも士業が Tier 1 角度に残置
- 対応: **「士業は industry_sop の事例枠」を single source に固定**し全文書を一括 sweep

### C-4: Style Guide 数値が文書間で不一致 (致命)

- 根拠:
  - **v10.3 §4.3.6**: paraphrase 30% / first_hand 40% / industry_sop 20% / opinion 10% (3 排他 + opinion 別軸)
  - **v1.1**: translation 10% / paraphrase 20% / opinion 30% / original 40% (4 排他)
- → **分類体系自体が違う**
- 対応: 分類体系を 1 つに統一し、v10.3 と Style Guide を一致させる + STYLE-GUIDE-CURRENT.md ポインタ必須

### C-5: failure_story 比率と上限が文書間で同居

- 根拠: v1.1 は比率 15-25%、v10.3 §4.6.2 は `verified_failure_story 月 ≤4` 上限
- 対応: 比率 KPI を撤回 or 「供給制約から導く上限」に一本化

## High (P1)

### H-6: Q2 改訂 (士業 + 業務代行) が士業格下げと噛み合っていない
→ Q2 を分割: A 系 (士業 × AI 発信者) / B 系 (経理代行/事務代行の購買側)

### H-7: target_fit_score が bio キーワード依存で seed 型発掘に効きにくい
→ publisher_discovery 側は投稿本文/リンク先/リポジトリ言及にスコアを寄せる + audience_validation 側だけ bio を使う 2 層化

### H-8: Q5 (英語圏 0 hit) が「次で直す」状態のまま
→ `min_faves` 緩和 + 語彙変更 (SMB/agency/freelancer/non-technical/ops) + 分割クエリ + Phase 0 v3 発動条件明文化

### H-9: 再現性: 絶対パス / inputs manifest 未保存 / 層別なし
→ worktree 相対パス化 + tweet ids manifest 保存 + 層別中央値 (JP/EN、高信頼のみ) 導入

### H-10: top20 by like の代表性が未検証
→ `top by like` と `random/time-stratified` 並走、差分大な項目は範囲で扱う

## Medium (P2)

- H-11: 既存 4 アカ (05-24) と新 20 アカ (05-26) の同時性ズレ
- H-12: GitHub Trending 日次化の cron 実装場所が未確定
- H-13: Style Guide 版管理の事故リスク (STYLE-GUIDE-CURRENT.md 必須)
- H-14: translation 投稿の構造ルール不足 (翻訳意図 1 行を出さないなど)
- H-15: monitoring/pruning 未設計 (drift / 低反応 / テーマ変化 で入替条件)
- H-16: raw json 24 ファイル肥大 (aggregate + index 化)

## R-1〜R-30 評価 (Codex Verdict)

すべて Agree、ただし重大度の修正:
- R-15 (Agree / High): v10.3 本体不一致がより致命 → C-4 に格上げ
- R-17 (Agree / Critical) → C-5 に格上げ
- R-22 (Partial / Medium): UA 明示自体は悪くないが TOS 判定要調査

## 補強アクション 優先順位

1. **P0: クエリ 2 系統分離 + seed 逆算 Q1-Q5 再設計** (publisher_discovery / audience_validation)
2. **P0: target 定義と士業の位置づけ全成果物 sweep** (v10.3 / Style Guide / report / query / score)
3. **P0: Style Guide 数値の single source 化** (分類体系統一、STYLE-GUIDE-CURRENT.md、v10.3 本体と一致)
4. **P1: 分析再現性 patch** (絶対パス排除、inputs manifest、層別中央値、低自信度の扱い規約)
5. **P1: failure_story を供給制約ベース上限に一本化** (比率 KPI 撤回 / 範囲化)
6. **P2: pruning / Phase 0 v3 発動条件 / cron 実装場所** を設計書・HUMAN_TASKS に確定反映

## 20 アカが hit する Q1-Q5 リバース案 (Codex 提案、雛形)

- Q1: `"Claude Code" OR claudecode (使い方 OR 設定 OR 活用 OR 導入) -is:retweet lang:ja min_faves:<緩め>`
- Q2: `(Codex OR "codex cli" OR "@openai/codex") (MCP OR エージェント OR 自動化) -is:retweet lang:ja ...`
- Q3: `(Obsidian OR #Obsidian) (Claude OR GPT OR AI) (運用 OR ワークフロー OR 保存) -is:retweet lang:ja ...`
- Q4: `(MCP OR "Model Context Protocol" OR "Claude Desktop") (連携 OR ツール OR agent) -is:retweet lang:ja ...`
- Q5: `("Claude Code" OR "Codex" OR "Obsidian") (workflow OR agent OR automation) -is:retweet lang:en min_faves:<緩め>`

audience_validation 用の別 5 本 (経営者の困りごと語彙) は別枠で作る。

---

次ステップ: P0 3 件を query-design-v2 / style-guide-v1.3 / v10.3 sweep 3 PR で対応する。
