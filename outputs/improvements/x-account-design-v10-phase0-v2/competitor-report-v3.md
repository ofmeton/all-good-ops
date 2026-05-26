# 競合調査 v3 レポート — Codex round 1 オールクリア反映版

> v2 → v3 改訂点: query 2 系統分離 + Phase 0 v3 実 API で **seed hit 70% 検証** + 新規候補 30+ 件発掘。  
> v10.3 設計書 / Style Guide v1.3 / query-design-v2 と一括整合。

---

## 0. v2 → v3 改訂サマリ

| 改訂点 | 根拠 |
|---|---|
| 母集団は 24 アカで維持 | Phase 0 v3 は **発掘プール拡張のための query 改訂**、24 アカ raw posts は再 fetch せず |
| query を 2 系統 10 本に拡張 | Codex C-1 / C-2 (publisher discovery と audience validation の混線解消) |
| 士業を industry_sop の 1 業種セグメントに格下げ統一 | Codex C-3 / v1.3 §4 |
| Style Guide 数値分類体系統一 | Codex C-4 / v1.3 §2 |
| failure_story 比率 KPI → 月 ≤ 4 上限 | Codex C-5 / v1.3 §2.4 |
| Phase 0 v3 raw 永続化 (inputs-manifest 含む) | Codex H-9 / query-design-v2 §4 |

---

## 1. Phase 0 v3 実行結果

| 項目 | 値 |
|---|---|
| 実行日 | 2026-05-26 |
| query 数 | 10 (A 系 5 + B 系 5) |
| 取得 tweets | 987 |
| 推定コスト | ¥24 (¥27 上限) |
| **実コスト** | **¥23 ($0.148)** |
| API calls | 50 |
| publisher unique handles | 215 |
| audience unique handles | 275 |
| merged unique handles | 455 |

### 1.1 seed 24 アカの hit 検証

| 結果 | 件数 | 内訳 |
|---|---|---|
| **publisher または audience で hit** | **17 / 24 (70%)** | 国内中心アカ + 一部海外アカ |
| いずれもゼロ | 7 / 24 (30%) | Atenov_D / Fluyeporlaweb / ai_explorer25 / csaba_kissi / ethancoder0 / jason_coder0 / mmmiyama_D |

→ ゼロ hit 7 アカの分析:
- 6 アカ (Atenov_D / Fluyeporlaweb / ai_explorer25 / csaba_kissi / ethancoder0 / jason_coder0): **海外英語圏**、A5 query (`min_faves:50`) でも刺さらず → **Phase 0 v4 で更に緩和 + キーワード拡張必要**
- 1 アカ (mmmiyama_D): 国内日本人だが **Gemini / Antigravity / 自分独自ツール** が主軸、Claude/Codex/Obsidian 軸では刺さらず

→ **70% hit は許容**、残り 30% は別軸 query (海外英語圏 + 主軸ツール多様化) で Phase 0 v4 対応予定。

### 1.2 publisher 新規発掘 TOP 15 (publisher_score ≥ 候補)

| handle | pub_hits | aud_hits | 推定領域 (要 raw 取得検証) |
|---|---|---|---|
| **sora19ai** | 11 | 6 | 国内 AI 発信、publisher + audience 両 hit |
| 7_eito_7 | 8 | 3 | 国内 Obsidian + AI |
| AiAircle34052 | 9 | 1 | 国内 Codex/CLI 系 |
| kawai_design | 8 | 1 | デザイン × AI |
| genkAIjokyo | 8 | 0 | 国内 MCP / エージェント |
| gagarot200 | 8 | 0 | 国内 Claude Code 活用 |
| shota7180 | 5 | 5 | 国内 業務効率化 |
| Gencoin8 | 6 | 0 | crypto + AI 系 (要除外検証) |
| taishiyade | 5 | 0 | 国内 AI 発信 |
| makaneko_AI | 5 | 0 | 国内 AI |
| take_ai_mkt | 5 | 0 | 国内 マーケ × AI |
| shotovim | 5 | 0 | 国内 開発 |
| ComagerTon79278 | 4 | 1 | — |
| okuyama_ai_ | 3 | 3 | — |

→ Phase 0 v4 で **sora19ai / 7_eito_7 / AiAircle34052 / kawai_design / genkAIjokyo / gagarot200** など上位 6 アカを seed 拡張候補に。¥40 程度の追加コスト (6 アカ × 100 tweets)。

### 1.3 audience 新規発掘 TOP 10 (target 読者層検証)

| handle | aud_hits | 用途 |
|---|---|---|
| **AIshukyaku** | 25 | target 「AI 集客」読者層 |
| kandmybike | 18 | 中小経営者向け AI |
| chanryo_eff | 16 | 効率化文脈 |
| ai_jitan (除外組) | 10 | 既存知見、参考のみ |
| sora19ai | 6 | publisher と兼用 |
| shota7180 | 5 | 業務効率化 |
| **houki_ai_keiri** | 5 | **industry_sop (経理) 重要候補** |
| TakeshiYonese | 5 | 士業 (industry_sop 1 セグメント) |
| inkya_sme | 4 | SMB target |
| h_www | 5 | — |

→ B 系 hit は **読者層の語彙抽出用** (発信者として採用しない)。Style Guide v1.3 transfer 学習の補強材料。

---

## 2. 母集団の構成 (v3 確定)

### 2.1 主母集団 (24 アカ、変更なし)

v2 と同一: 信頼 4 + ユーザー指定 20 = 24 アカ。`raw/publishing/research/2026-05-26-jp-ai-publishers-v2/raw/posts*` で永続化済。

### 2.2 Phase 0 v4 候補プール (新規)

`raw/publishing/research/2026-05-26-jp-ai-publishers-v3/raw/candidates-merged.json` に 455 unique handles を保存。publisher_score 上位 6-10 アカを Phase 0 v4 で seed 拡張対象とする。発動条件:

- Phase 1 Month 1 末で `failure_story` / `industry_sop` 投稿に必要な参考素材が不足したと Optimizer が判定
- ofmeton 本人が「もう少しサンプル増やしたい」と希望

---

## 3. 9 項目発信ネタ仕入れ方法分析 (再現性確認)

**変更なし**: v2 で実施した Sonnet 4.6 分析の 24 アカ × 9 項目 (`source-ingestion-analysis.csv`) は再実行不要。

理由: 母集団 24 アカが不変なため。Codex 指摘 R-12 (自信度低 8 アカ) / R-13 (top by like 代表性) は **次フェーズ Phase 0 v4 で random/time-stratified を並走** することで補強。

### 3.1 中央値 (再掲) と Style Guide v1.3 transfer 推奨値

| 項目 | 中央値 | v1.3 採用値 | 根拠 |
|---|---|---|---|
| publishing_lag_hours | 9h | opinion 24-48h | Type B 領域差別化 |
| translation_rate | 7.5% | **10%** | 中央値準拠 |
| paraphrase_rate | 32.5% | **20%** | 翻案依存低下、競合と差別化 |
| opinion_rate | 17.5% | **30%** | 差別化レバー |
| original_rate (= first_hand) | 27.5% | **40%** | 一次体験主軸 |
| citation_explicit_rate | 37.5% | **≥ 65%** | 誠実性レバー |
| cross_platform_intake_rate | 40% | 35-50% | 中央値前後維持 |

合計 10 + 20 + 30 + 40 = 100% で **v10.3 §4.3.6 と一致**するように Style Guide v1.3 §2.1 で 4 排他化。

---

## 4. テーマ × フォーマット マトリクス (v3 確定)

| テーマ \ フォーマット | 海外バズ翻案 | Tips リスト | 一次体験デモ | 所感型 | 失敗談 | 業種別 SOP |
|---|---|---|---|---|---|---|
| Claude Code 機能速報 | ◎ 12 | ○ 6 | △ 3 | △ 2 | × 0 | × 0 |
| プロンプト集 | ○ 7 | ◎ 9 | △ 2 | △ 1 | × 0 | × 0 |
| AI ツール比較 | ○ 5 | ◎ 8 | △ 2 | △ 1 | × 0 | × 0 |
| GitHub OSS 紹介 | ○ 6 | ◎ 6 | △ 1 | △ 1 | × 0 | × 0 |
| 業務効率化 | × 0 | △ 2 | △ 2 | × 0 | × 0 | **△ 2** |
| **士業 × AI** (industry_sop 1 セグメント) | × 0 | × 0 | × 0 | × 0 | × 0 | × 0 (Phase 0 v3 audience で houki_ai_keiri / TakeshiYonese 発掘) |
| 中小経営者 1 人社長向け | × 0 | △ 1 | △ 1 | × 0 | × 0 | × 0 |
| **AI 実装失敗談** | × 0 | × 0 | × 0 | × 0 | **× 0** | × 0 |

凡例: ◎ 8+ / ○ 5-7 / △ 1-4 / × 0

### Tier 1 空白領域 (最優先) — v3 で再確定

1. **AI 実装失敗談**: 競合 24 アカ全員 0% → ofmeton の差別化レバー (※ failure_story 月 ≤ 4 上限で運用)
2. **業種別 SOP** (経理/請求書/民泊清掃/**士業**): 競合 ≤ 2 アカ
3. **中小経営者向け Claude 活用事例**: 競合 ≤ 1 アカ
4. **非エンジニア翻訳**: 競合 ≤ 5%

---

## 5. ofmeton 用 推奨コンテンツ角度 (v3 確定)

### 5.1 第 1 軸 (最強差別化)

**「AI 実装失敗談 → 修正の記録」型ポスト** (verified_failure_story 月 ≤ 4)

- 24 アカ 0% で発信、Phase 0 v1 でも 3.2%
- 軸 1 = first_hand 必須
- 案件 commit log + 案件メモ + 音声メモから供給、公開許諾 gate + DLP redaction + 業法ガード必須
- 供給制約があるため比率 KPI ではなく **上限 KPI**

### 5.2 第 2 軸 (target 直撃)

**「業種別 SOP」型ポスト**

- 主軸軸 1 = first_hand (terra-isshiki / minpaku-cleaning / RICE CREAM / 家庭教師)
- 1 業種セグメント = 経理 / 請求書 / 見積 / 民泊清掃 / **士業 (税理士向け SOP 等)**
- 月 6 投稿 (= 30 投稿の 20%)
- Phase 0 v3 audience hit (houki_ai_keiri / TakeshiYonese) を読者層語彙の transfer に

### 5.3 第 3 軸 (誠実性レバー)

**「引用元明示 65%+」「publishing_lag (opinion) 24-48h」**

- 競合中央値: citation 37.5% / lag 9h
- ofmeton: citation 65%+ / opinion lag 24-48h
- translation 投稿構造規約: 「翻訳意図 1 行」を出さない (cs:p3-ddde 整合)

### 5.4 第 4 軸 (情報源差別化)

- **Discord (Claude Code / Anthropic)** 競合 4%、ほぼブルーオーシャン
- **国内資料 (公的機関 / 民間 PDF)** 競合 4%
- **音声メモ (案件中)** 公開許諾 gate 通過後

---

## 6. Phase 1 着手前ブロッカー 5 件 (v3 状況再確認)

| # | 内容 | 状態 |
|---|---|---|
| 1 | §10.3 バックアップアカウント | ✅ v10.3 で所有導線置換済 |
| 2 | 公開許諾 gate Schema | ✅ v10.3 明文化済 + v1.3 §2.4 で failure_story の必要条件として再強化 |
| 3 | §3.3 コスト過小見積 | ✅ cs:p2-aeba で ¥6,500/9,154/13,800 確定 |
| 4 | X OAuth offline.access | ⚠️ HUMAN_TASKS H-1 (実機テスト残) |
| 5 | Hook 比率 75% 重複ラベル | ✅ v10.3 §4.7 + v1.3 §2.2 で軸 1 / 軸 2 分離 |

→ Claude 側 4/5 ブロッカー解消、#4 のみ人間タスク。

---

## 7. 残課題と Phase 0 v4 発動条件

### 7.1 残課題 (Codex round 1 Medium 級)

- H-9 (再現性): analyze-source-ingestion.py の絶対パス排除、inputs-manifest は Phase 0 v3 で対応済 (`fetch-phase0-v3.py`) → 次回 9 項目分析実行時に analyze 側も対応
- **H-14** (GitHub Trending cron 実装場所): HUMAN_TASKS に新規追加 (H-12 / H-13 は既存)
- H-13 (STYLE-GUIDE-CURRENT.md): **本 PR でシンボリックリンク作成**
- H-15 (pruning 設計): Style Guide v1.3 §7 で発動条件明文化
- R-22 (GitHub Trending TOS): 公開ページ scrape は GitHub TOS で許容範囲、UA 明示で良識的範囲

### 7.2 Phase 0 v4 発動条件

以下のいずれかで:
- Phase 1 Month 1 末で素材不足
- ofmeton 本人希望
- 海外英語圏 6 アカ (Atenov_D / Fluyeporlaweb / ai_explorer25 / csaba_kissi / ethancoder0 / jason_coder0) の発掘リトライ必要

Phase 0 v4 内容案:
- A5 query を `min_faves:30` まで緩和 + `SMB/agency/freelancer/non-technical/ops` キーワード追加
- mmmiyama_D 軸の query 追加 (Gemini / Antigravity / 自分独自ツール紹介)
- Phase 0 v3 で発掘した sora19ai / 7_eito_7 / AiAircle34052 / kawai_design / genkAIjokyo / gagarot200 を raw 取得 (¥40 程度)
- 9 項目分析を 24 → 28-30 アカに拡張 (¥80 追加)

---

## 8. v3 完了判定

- [x] query 2 系統 10 本で実 API call → seed hit 70% 検証
- [x] 新規 publisher 候補 15+ / audience 候補 15+ 発掘
- [x] 母集団 24 アカ維持、9 項目分析再実行不要を確認
- [x] Tier 1 空白領域再確定 (failure_story / industry_sop / 中小経営者)
- [x] Style Guide v1.3 / v10.3 設計書本体との整合確保
- [ ] Codex 再クロスレビュー (Phase D) で closed loop
- [ ] STYLE-GUIDE-CURRENT.md シンボリックリンク作成
- [ ] HUMAN_TASKS H-14 GitHub Trending cron 追加 (H-12 / H-13 は既存)
