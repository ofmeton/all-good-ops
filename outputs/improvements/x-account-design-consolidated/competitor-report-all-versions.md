# 競合調査 統合完全版 (v1 〜 v3 全 3 バージョン省略なし)

## 0. このドキュメントについて

3 シリーズ統合ドキュメントの 1 つ (Series C / Competitor Report)。`competitor-report.md` (v1)、`competitor-report-v2.md` (v2)、`competitor-report-v3.md` (v3) の 3 ファイルを 1 つに統合した完全版。

### 統合方針 5 ルール

1. **省略なし**: 全バージョンの全節を保持。最新版で削除された節も `Status: Deprecated in vX (理由: ...)` 注記で原文残す。
2. **バージョン来歴ヘッダー**: 各 `##` / `###` 節の冒頭に 1 行追加。
3. **現行 SSOT 明示**: 最新値には `**Current (v3)**` マーカー、過去値は `(v1: X, v2: Y)` で履歴併記。
4. **数値・分類・範囲は原値保持** (cs:s2-68 silent reduction 厳禁): range を下限のみに縮退させない / 単一値に丸めない / classification 軸変更があれば旧軸も保持。
5. **重複文章のみ排除**: 完全同一文章は来歴注記でまとめてよい。差分あれば両方残す。

### 元バージョン一覧

| version | ファイル | 行数 | 主要テーマ |
|---|---|---|---|
| v1 | x-account-design-v10-phase0/competitor-report.md | 451 | 国内 10 アカ × 50 項目集計 + 海外 17 アカ + 国内業種別 7 アカ + note 補完 8 アカ。Style Guide v1 雛形を末尾に内蔵 |
| v2 | x-account-design-v10-phase0-v2/competitor-report-v2.md | 255 | 24 アカ (信頼 4 + 新 20) × 50 + 9 項目、target_fit_score ≥ 0.5 フィルタ。9 項目 Sonnet 4.6 分析を新規追加 |
| v3 | x-account-design-v10-phase0-v2/competitor-report-v3.md | 234 | Codex round 1 オールクリア反映、query 2 系統分離 + Phase 0 v3 で seed hit 70% 検証、新規候補 30+ 発掘 |

### 現行 SSOT

**Current (v3)** に [Style Guide 統合版](./style-guide-all-versions.md) (旧 v1.3 / v1.4) / [main-design 統合版](./main-design-all-versions.md) (旧 v10.3) / [query-design 統合版](./query-design-all-versions.md) (旧 v2) と同期。v1.4 で投稿頻度 / 海外X cron が再修正されたが、v3 本体の数値・構造は据置 (v3 §1 末尾の v1.4 注記参照)。

---

## 1. バージョン進化年表

*Version History*: v1 (2026-05-25) → v2 (2026-05-26) → v3 (2026-05-26 同日 Codex 反映)

| version | 日付 | 主要変更 | 元ファイル行数 |
|---|---|---|---|
| v1 | 2026-05-25 | Phase 0 v1 として 10 アカ深掘り + 海外 17 + 国内業種別 7 + note 補完 8 = 計 42 アカ | 451 |
| **v2** | **2026-05-26** | **母集団を target_fit_score ≥ 0.5 で 24 アカに絞り直し + Sonnet 4.6 で 9 項目仕入れ方法分析を新規追加** | 255 |
| **v3** | **2026-05-26** | **Codex C-1〜C-5 反映: query 2 系統分離 + Phase 0 v3 で seed hit 70% 検証 + 新規候補 30+ 発掘 + 士業位置づけ統一** | 234 |

---

## 2. 統合本文 (節ごとに来歴ヘッダー)

### 2.1 このレポートの位置付け

*Version History*: v1 で導入 (v10 §6 計画との差分明記) → v2 で母集団絞り込み版に改訂 → v3 で Codex round 1 オールクリア反映

#### v1 の位置付け (Status: Superseded by v2/v3、原文保持)

x-account-design v10 §6 / §7 / §8 (Phase 0) のアウトプット。国内 10 アカ × 50 項目集計 (sub-analysis 完了) + 海外 17 アカ + 国内業種別 7 アカの transfer learning + note 競合補完 を 1 ファイルに統合。このレポートが Style Guide v1 と v10.1 設計反映の根拠資料。

**v10 §6 計画との差分**: v10 §6 では「合計 65 アカウント × 50 項目分析」を計画していた。Phase 0 着手時に再評価し、**B+C 路線** に振り直した:

- **既存 10 アカ深掘り** (50 項目 × 928 tweets) — 残 55 アカ追加収集よりも解像度向上を優先
- **海外英語圏 AI 発信者 17 アカ発掘** — transfer learning ソース
- **国内業種別 (士業・経営者) AI 発信者 7 アカ発掘** — ofmeton ターゲット直接競合の確認
- **note 直接競合の差分発見** (v9.1 マップへの追加 8 アカ)

合計 42 アカ。「65 アカ × 1,300 tweets 」より精度高い設計反映を狙う。

**v10 §6 数値の修正**:

| v10 §6 記述 | Phase 0 で再評価した実態 |
|---|---|
| 合計 65 アカウント × 直近 3 ヶ月の上位 20 投稿 ≈ 1,300 投稿 | 既存 10 アカ × 90 日 = **928 tweets** (50 項目深掘り) + 海外 17 + 国内業種別 7 = **transfer learning 計 24 アカ** |
| 既完済 928 tweets / 残 55 アカ × 400 tweets | **残 55 アカ追加収集は不要** と判断。理由は §1 / §5 で詳述 |

**入力データ (v1)**:

| 種別 | パス | サイズ |
|---|---|---|
| 国内 10 アカ × posts (full) | `analysis-50items.json` | 30 KB (10 アカ × A/B/E/F/G/H 集計) |
| 50 項目集計スクリプト | `analyze_50items.py` | 16 KB (Python 3 標準ライブラリのみ) |
| 海外 17 + 国内業種別 7 | `external-accounts.md` | ~10 KB |
| note 競合補完 | `note-additional-findings.md` | ~5 KB |
| v9 publishing research (元) | (別ブランチ `task/260524-jp-ai-publishers-research`) `outputs/publishing/research/2026-05-24-jp-ai-publishers/` | REPORT.md + raw posts |

#### v2 の位置付け (Status: Superseded by v3、ただし母集団詳細・分析手法は v3 でも継承)

Phase 0 v2 の競合調査 (24 アカ + 5 query + 9 項目仕入れ方法分析) を統合した最終レポート。v10.3 設計書の Style Guide / Optimizer / Writer 章への transfer 推奨値を含む。

| 版 | 日付 | スコープ | 行数 |
|---|---|---|---|
| Phase 0 (v1) | 2026-05-24 | 10 アカ × 50 項目、無差別母集団 | 既存 `competitor-report.md` |
| **Phase 0 v2 (v2 file)** | **2026-05-26** | **24 アカ (信頼 4 + 新 20) × 50 + 9 項目、target_fit 重視** | v2 file |
| Phase 0 v3 (将来 = 後の v3) | 未定 | 海外英語圏拡張 + 国内士業/業種別深掘り | — |

**改訂点 (v1 → v2)**:

1. 母集団から **target_fit_score < 0.5 の 6 アカを除外** (umiyuki_ai / kosuke_agos / minorun365 / icoxfog417 / ai_jitan / milbon_)
2. 信頼 4 アカを継承 (Shimayus / SuguruKun_ai / masahirochaen / ClaudeCode_love)
3. **新規 20 アカを追加** (ユーザー指定、§1.2)
4. 5 query (Q1-Q5) で 244 unique handles 発掘 → Phase 0 v3 候補プール
5. **9 項目「発信ネタ仕入れ方法分析」を新規追加** (Sonnet 4.6 で 24 アカ質的分析、CSV 永続化)
6. query 文字列・cursor chain を `query-meta.json` で永続化 (Phase 0 v1 で欠落していた再現性を確保)

#### v3 の位置付け (**Current (v3)**)

v2 → v3 改訂点: query 2 系統分離 + Phase 0 v3 実 API で **seed hit 70% 検証** + 新規候補 30+ 件発掘。v10.3 設計書 / [Style Guide 統合版](./style-guide-all-versions.md) (旧 v1.3) / [query-design 統合版](./query-design-all-versions.md) (旧 v2) と一括整合。

**v2 → v3 改訂サマリ**:

| 改訂点 | 根拠 |
|---|---|
| 母集団は 24 アカで維持 | Phase 0 v3 は **発掘プール拡張のための query 改訂**、24 アカ raw posts は再 fetch せず |
| query を 2 系統 10 本に拡張 | Codex C-1 / C-2 (publisher discovery と audience validation の混線解消) |
| 士業を industry_sop の 1 業種セグメントに格下げ統一 | Codex C-3 / v1.3 §4 |
| Style Guide 数値分類体系統一 | Codex C-4 / v1.3 §2 |
| failure_story 比率 KPI → 月 ≤ 4 上限 | Codex C-5 / v1.3 §2.4 |
| Phase 0 v3 raw 永続化 (inputs-manifest 含む) | Codex H-9 / [query-design 統合版](./query-design-all-versions.md) (旧 v2) §4 |

---

### 2.2 Executive Summary

*Version History*: v1 のみ独立節として存在 (5 件 finding + 3 件乖離 + Style Guide v1 根拠の Phase 0 数値) → v2 / v3 は §1 改訂サマリ + §4-5 推奨コンテンツ角度に分解

#### v1 §1.1 最重要 finding (5 件) (Status: 一部 v2/v3 で更新、原文保持)

1. **国内 10 アカ 50 項目集計の結果、ofmeton ターゲット (非エンジニア経営者) に "言葉が届いている" アカは事実上ゼロ**。
   - "非エンジニア言及率" を集計したところ、`milbon_` 17.7% (11 件) と `ClaudeCode_love` 11.4% (8 件) 以外は 0-4%。
   - 失敗談率 (`fail_rate`) も全体平均 2-8%、平均 3.3%。ofmeton が標榜する「失敗談先行型 × 非エンジニア翻訳」はそのまま空白。

2. **国内最重要発掘: @kandmybike (畠山謙人 / AI 税理士) は ofmeton と最近接ポジション** だが、業種を「税理士」1 本に絞っているため、ofmeton が「業種横断翻訳者」ポジションを取れば棲み分け可能。
   - 「スタッフ 0 人で 60 社」339 万リーチの長文 X 投稿が代表作。CLAUDE.md テンプレ配布の "中身開示" スタイルが ofmeton の参考フォーマット。

3. **海外 Liam Ottley (@liamottley_) の階段単価設計 ($5k → $60k → $250k+) が ofmeton AI 自動化代行の値付け先行例**。
   - note 有料記事 500/980/1,480 円 → 個別相談 → 小型代行 → 大型代行 の 5 段階を Phase 0 で先に設計しておくと、Phase 2-3 のメンバーシップ判定や代行受注の判断が一貫する。

4. **国内既存上位 10 アカは「結論先出し」+「数字インパクト」の 2 強で約 60-70% を占める Hook 分布**。
   - v10 §4.7 で定義した 13 類型のうち、運用上ヒットしているのは 5-6 類型のみ。残る 7-8 類型は「やった人がいないから刺さるかどうか不明」枠。
   - ofmeton の Phase 1 賭け方は **「数字インパクト + 失敗談先行 + Before-After 数字」3 類型を主軸 (60-70%)、残り 30% で未使用類型をテスト** に設計し直すと初動の Hit 確率が上がる。

5. **国内既存 10 アカは X→note 送客が 0 件** (v9.1 既出) **+ 海外勢も note を使わないため、note を上位事業 (AI 自動化代行) リードの主導線にする戦略は引き続き有効**。
   - ただし note 内 AI 業務自動化ジャンルには **士業 × AI のアカウントが既に 6-7 アカ存在** (Phase 0 補足発見)。ofmeton は「業種横断 + 失敗談 + 数字」の 3 重交差を明示しないと埋もれる。

#### v1 §1.2 v10 設計から実態と乖離していた箇所 (3 件) (Status: v10.1 / v10.2 / v10.3 で反映、原文保持)

| 乖離 | 実態 | 修正方向 (v10.1) |
|---|---|---|
| §6 「合計 65 アカ × 50 項目分析」 | 残 55 追加収集よりも 10 アカ深掘り + 海外/業種別補完が ROI 高 | 「Phase 0 = 既存 10 アカ深掘り (50 項目) + 海外 17 + 国内業種別 7 + note 補完 8」に書き換え |
| §4.7 「Hook 動的拡張 13 類型を初期から運用」 | 国内上位の実態は 5-6 類型に集中、未使用類型は "本当に効くか未検証" | 「Phase 1 主軸 3 類型 (数字 + 失敗談 + Before-After) + テスト枠 4 類型」に再分配 |
| §1.4 「翻案 5 : 実体験 3」 | 国内上位は実体験言及がほぼゼロ (一人称使用 30% 未満)。実体験は **そもそも非エンジニア向け差別化のレバー** | 「翻案 4 : 実体験 4 + 業種別 SOP 2」の比率に修正、実体験を Phase 1 から本流に |

#### v1 §1.3 Phase 0 で確定した数値 (Style Guide v1 の根拠) (Status: Style Guide v1.1 で別の数値に updated、原文保持)

| 項目 | 国内 10 アカ平均 | ofmeton Phase 1 設計 | 根拠 |
|---|---|---|---|
| X 1 投稿平均文字数 | 240 字 (中央値 156 字) | **180-220 字** (短文単発主軸) | 中央値 156 + 数字インパクト型は 200-300 字が刺さる |
| X 1 投稿あたり改行密度 | 0.022 (=22 改行 / 1000 字) | **0.03-0.05** (読みやすさ重視) | ClaudeCode_love 0.047 が読みやすさ TOP、milbon_ 0.029、umiyuki 0.001 (読みづらさ最下位)。中央値を上方修正 |
| URL 添付率 | 33.9% | **20-40% (集客導線 B/C を含む朝昼夕の 5 投稿で全体 1-2 件 URL)** | v10 §4.8 タイムテーブル (1 日 5 投稿のうち URL 付き 1 = 20%) で十分 |
| 絵文字使用率 | 30% (アカ間散らばり大) | **20-30%** (👇 = 誘導目的だけに限定) | ClaudeCode_love 98%, kosuke_agos 0% の二極化。中庸を取る |
| 【】カッコ率 | 14% | **5-10%** (速報枠 + note 送客告知のみ) | masahirochaen 42% / ClaudeCode_love 89% は「速報屋」ポジションで ofmeton と違う |
| 投稿頻度 | 5.5 件/日 (中央値 4.7) | **5 件/日** (v10 §4.8 既に整合) | umiyuki 15.5 / 日は外れ値、ClaudeCode 4.67 / 日と整合 |
| 一人称使用率 | 30% (中央値) | **40-50%** (実体験 4 比率に合わせる) | 国内上位は一人称 70% 無し → 差別化レバー |
| 業務仕組み化テーマ率 | 14% | **50-60%** (主軸テーマ) | 国内上位の主軸は「ニュース速報 + tips」、業務仕組み化は薄い |
| 失敗談率 (fail_rate) | 3.3% | **15-20%** (失敗談先行型を主軸 Hook の 1 つに) | 国内 10 アカで最も差別化が効く空白 |

---

### 2.3 既存 10 アカ × 50 項目集計

*Version History*: v1 §2 で導入 (10 アカ詳細 + F-1〜F-12 個別 finding) → v2 / v3 では母集団絞り込みのため umiyuki_ai / kosuke_agos / minorun365 / icoxfog417 / ai_jitan / milbon_ を除外 (Status: Deprecated as data source, retained as reference)

#### v1 §2.1 アカウント別主要指標一覧 (Status: 10 アカ全データを保持)

| handle | フォロワー | n_own | 文字数中央値 | URL 率 | 絵文字率 | 【】率 | keigo | 業務仕組化 | 非Eng言及 | 失敗談 | 結論先出 % | 数字 % | 投稿/日 | bullet % | CTA末尾 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| umiyuki_ai | 63.5K | 93 | 104 | 14% | 0% | 0% | 13% | 0% | 0% | 1% | 35% | 26% | 15.5 | 0% | 0% |
| Shimayus | 11.9K | 87 | 177 | 18% | 12% | 5% | 8% | 8% | 0% | 3% | 74% | 64% | 2.1 | 3% | 2% |
| SuguruKun_ai | 105.3K | 23 | 343 | 35% | 83% | 4% | 61% | 35% | 4% | 0% | 26% | 52% | 1.2 | 30% | 78% |
| masahirochaen | 193.8K | 50 | 224 | 42% | 42% | 42% | 76% | 18% | 4% | 0% | 42% | 36% | 7.1 | 48% | 10% |
| kosuke_agos | 89.0K | 47 | 556 | 36% | 0% | 0% | 100% | 17% | 0% | 9% | 2% | 30% | 2.0 | 0% | 0% |
| ClaudeCode_love | 29.5K | 70 | 406 | 77% | 99% | 89% | 51% | 27% | 11% | 7% | 0% | 46% | 4.7 | 84% | 67% |
| minorun365 | 14.6K | 58 | 52 | 21% | 22% | 0% | 35% | 7% | 0% | 0% | 14% | 31% | 9.7 | 0% | 0% |
| icoxfog417 | 19.8K | 71 | 98 | 28% | 6% | 0% | 37% | 0% | 0% | 0% | 24% | 30% | 1.0 | 0% | 1% |
| ai_jitan | 49.1K | 6 | 105 | 33% | 67% | 0% | 67% | 17% | 0% | 0% | 67% | 33% | 6.0 | 0% | 67% |
| milbon_ | 44.7K | 62 | 131 | 71% | 0% | 2% | 10% | 10% | 18% | 2% | 47% | 69% | 5.6 | 37% | 10% |
| **平均** | — | — | **240/156** | **38%** | **33%** | **14%** | **46%** | **14%** | **4%** | **2%** | **33%** | **42%** | **5.5** | **20%** | **24%** |
| **中央値** | — | — | **156** | **31%** | **17%** | **3%** | **44%** | **13%** | **2%** | **1%** | **35%** | **35%** | **4.7** | **2%** | **6%** |

> n_own は own posts (リプライ除外)。文字数は中央値の中央値 = 156 字。

#### v1 §2.2 項目別の発見 (注目度順 12 件) (Status: 全 12 件保持、F-1〜F-12)

##### F-1: 「結論先出し」+「数字インパクト」の 2 強が国内発信者の構造

- 10 アカ平均で結論先出し 33% + 数字インパクト 42% = **75%** が初動 Hook。残り 25% に問いかけ / 逆張り / 比較 / 警告 / 自己卑下 / メタ言及 / Before-After 数字 が散らばる。
- v10 §4.7 で定義した「13 類型」は理論上の網羅で、運用上は **2-3 類型に偏ってヒット** する構造。
- **ofmeton 修正案**: Phase 1 初期は数字インパクト + Before-After 数字 + 失敗談先行型 (国内空白) の 3 主軸を 60-70%、残る 30% で問いかけ / 逆張り / 共感 / 警告 / メタ言及 / 比較 / 自己卑下 をテスト枠として運用 → PCR 観察 3 週で Phase 2 主軸を絞る。

##### F-2: 文字数の二極化 (短文派と長文派の住み分けが明確)

- 短文派 ( ≤ 140 字主軸): umiyuki_ai 71%, minorun365 93%, icoxfog417 77%, milbon_ 65% — Hook は短く回数で押す。
- 中長文派 (281-1000 字主軸): kosuke_agos 100%, ClaudeCode_love 79%, masahirochaen 42% — 1 投稿で完結する SOP / 速報。
- **ofmeton 修正案**: v10 §4.3.2 では「短文 60% / スレッド 30% / 長文 10%」と定義したが、**短文 50% + 中文 (141-280) 30% + 長文 (281-1000) 15% + スレッド 5%** に再分配が妥当。長文単発は note 送客の「ロングフォーム月 1 本」枠とリンクさせる。

##### F-3: 「敬体」と「常体」の比率は発信者の "顔" を強く決める

- 敬体率 100% (kosuke_agos), 76% (masahirochaen), 67% (ai_jitan), 61% (SuguruKun_ai), 51% (ClaudeCode_love) — 「企業 / 公式 / 商用色強い」
- 敬体率 8-13% (Shimayus, umiyuki_ai, milbon_) — 「個人 / カジュアル / 批評」
- **ofmeton 修正案**: ofmeton ターゲット (非エンジニア経営者) に届かせるには **敬体 40-55%** が中道。完全敬体は商用感が強く読者の心理的距離が遠い、完全常体は信頼性が下がる。v10 §4.3 Writer プロンプトに「敬体 / 常体ミックス、敬体比率 40-55%」を明示。

##### F-4: 「業務仕組み化」テーマが少ない (国内 10 アカ平均 14%)

- ClaudeCode_love 27%, SuguruKun_ai 35% が上位。残りは 0-18%。
- 国内発信は「ニュース速報 (32%)」「tips (15%)」「批評 (10%)」の方が主軸。
- **ofmeton 修正案**: v10 §1.4「コンテンツ 4 本柱: Claude 活用事例 60%」を Phase 1 で **業務仕組み化テーマ率 50-60%** に書き換え、ニュース速報は 5-10%、tips は 15-20%、批評は 5% に。

##### F-5: 「非エンジニア言及」は milbon_ と ClaudeCode_love 以外ほぼゼロ

- milbon_ 17.7% (11 件) は「スモビジ / ココナラ / 1日15分労働」等のキーワードで非エンジニア向けポジション明示。
- ClaudeCode_love 11.4% (8 件) は時々「コード書けません」「非エンジニア」「経営者」言及。
- 残り 8 アカは 0-4% — 「中小経営者・士業」を読者像にしていない。
- **ofmeton 修正案**: 全 X 投稿の **必須スロット** として「読者像 1 行明示 ("非エンジニア経営者へ" 等)」を Editor +2 ルールに追加。`non_engineer_rate ≥ 30%` を Phase 1 KPI に設定。

##### F-6: 「失敗談」が圧倒的に空白 (10 アカ平均 fail_rate 2%)

- 国内上位で最も差別化レバーが残っている領域。
- kosuke_agos 8.5% (4 件) と ClaudeCode_love 7.1% (5 件) が比較的多いが、それでも 1 桁。
- **ofmeton 修正案**: v10 §4.6 Editor 6+2 ルールの **実体験スロット必須** を「失敗談スロット必須 (Phase 1)」に強化。`fail_rate ≥ 15%` を Phase 1 KPI に追加。

##### F-7: 投稿時間帯の集中曲線が大きく異なる

- 朝型 (6-9 時): masahirochaen / ClaudeCode_love (各 3-7 件/日)
- 昼型 (11-13 時): Shimayus / minorun365 / milbon_ / SuguruKun_ai
- 夕夜型 (18-23 時): umiyuki_ai / ClaudeCode_love
- **ofmeton 修正案**: v10 §4.8 タイムテーブル (7:00 / 12:00 / 17:00 / 17:30 / 21:00) は国内上位の朝昼夕夜全部に乗っており妥当。ただし **金土の投稿頻度を平日の 80% 程度に下げて、月火水木金にリソース集中** が国内上位の傾向 (`dow_hist` 月-木に集中)。

##### F-8: 「【】カッコ」の使用率は速報屋に集中

- ClaudeCode_love 88.6%, masahirochaen 42% — 「速報屋」ポジション。
- umiyuki_ai / kosuke_agos / icoxfog417 / milbon_ はほぼ使わない (0-2%)。
- **ofmeton 修正案**: ofmeton は速報屋ではなく翻訳者ポジションなので、【】率 5-10% (note 送客の「[note 販売中]」明示 + 月 1-2 本の【完全保存版】系 X 投稿のみに限定) が妥当。

##### F-9: 絵文字「👇」は誘導目的 (URL の前 / 次に展開示唆)

- ClaudeCode_love 118 個, SuguruKun_ai 18 個 — どちらも CTA 末尾率が高く、URL 誘導と連動。
- **ofmeton 修正案**: ofmeton は「👇」を URL 直前の誘導目的だけに限定。雑に Hook で使わない (「実はこれヤバくて 👇」みたいな空疎な使い方を Editor で reject)。

##### F-10: スレッド (2 本以上連投) は kosuke_agos 以外ほぼ「1 本」

- kosuke_agos のみ 14 件のスレッド (2-3 本) を運用、他は 1 本中心。
- **ofmeton 修正案**: v10 §4.3.2 「スレッド 30%」は国内実態より高め。スレッド 5-10% (週 1-2 本) に下方修正、その代わり長文単発 (281-1000 字) を 15% に増やす。

##### F-11: URL を本文中に置くか末尾に置くかは Hook 戦略に依存

- 本文中 (url_mid_rate): ClaudeCode_love 73%, kosuke_agos 36% — 「これ見て 👇 [URL] その後で云々」型
- 本文末尾 (url_end_rate): milbon_ 71%, masahirochaen 38%, icoxfog417 28% — 「云々。詳細は [URL]」型
- **ofmeton 修正案**: ofmeton 朝昼の単発は「本文末尾 URL」、夕方の note 送客は「本文中 URL + 補足」の 2 パターンを使い分け。Writer プロンプトに媒体導線パターン (A/B/C) と URL 位置の対応表を明示。

##### F-12: 「箇条書き (bullet_rate)」は中長文派が多用

- ClaudeCode_love 84%, masahirochaen 48%, milbon_ 37% — 「読みやすさ」を担保するために箇条書きに分解。
- **ofmeton 修正案**: 長文単発 (281-1000 字) と スレッド派生では bullet_rate ≥ 60% を目安に。短文単発は bullet を使わず、1 段落で読ませる。Writer プロンプトに長さ別フォーマットルール明示。

#### v1 §2.3 ofmeton 評価軸 (1-5 段階 × 5 観点) (Status: v2 で母集団絞り込みの根拠となった)

5 = ofmeton ターゲット (非エンジニア経営者) に最も近い、1 = 遠い。

| アカ | 業種別 SOP | 非エンジ言語 | 失敗談 | 数字 ROI | 翻訳トーン | 合計 |
|---|---|---|---|---|---|---|
| umiyuki_ai | 1 | 1 | 1 | 1 | 1 | 5 |
| Shimayus | 3 | 1 | 2 | 4 | 2 | 12 |
| SuguruKun_ai | 3 | 2 | 1 | 3 | 4 | 13 |
| masahirochaen | 2 | 2 | 1 | 2 | 3 | 10 |
| kosuke_agos | 1 | 1 | 3 | 2 | 1 | 8 |
| ClaudeCode_love | 3 | 3 | 3 | 4 | 3 | 16 |
| minorun365 | 2 | 1 | 1 | 1 | 1 | 6 |
| icoxfog417 | 1 | 1 | 1 | 1 | 1 | 5 |
| ai_jitan | 3 | 2 | 1 | 3 | 4 | 13 |
| milbon_ | 4 | 5 | 2 | 5 | 4 | 20 |

- 最高評価: **milbon_** (スモビジ × 非エンジニア言語 × ROI 数字) と **ClaudeCode_love** (Claude 業務自動化主軸)。
- ofmeton はこの 2 アカの「言語トーン + 業種視点」を transfer 元に、業種横断 × 失敗談先行 × 数字 ROI で差別化する。

→ v2 で target_fit_score < 0.5 → 6 アカ除外 (umiyuki_ai / kosuke_agos / minorun365 / icoxfog417 / ai_jitan / milbon_) の母集団改訂に至る。**注: milbon_ は §2.3 では合計 20 で最高評価だが、v2 では target_fit_score 計算で別軸 (bio / 業務仕組み化 / 一次体験) が加味され除外された** (履歴文書間矛盾、cs:s3-66 観点で記録)。

---

### 2.4 母集団の構成

*Version History*: v1 (10 + 17 + 7 + 8 = 42 アカ) → v2 (24 アカに絞り込み、信頼 4 + 新規 20) → v3 (24 アカ維持、Phase 0 v4 候補プール 455 unique handles を別途保持)

#### v2 §1.1 既存信頼 4 アカ (継承) (**Current (v3) 母集団の一部**)

| handle | 主軸 | 採用根拠 |
|---|---|---|
| Shimayus | AIエージェント実装・業務効率化、株式会社quai CEO 医師起業家 | 2026-05-25 ユーザー評価で「めっちゃ参考になる」確定 |
| SuguruKun_ai | ChatGPT/Claude/Gemini 全般 + 公式資料解説、AI研修・開発会社 CEO | 同上 |
| masahirochaen | AIニュース最速発信、デジライズ CEO、法人向け AI 開発・研修 | 同上 |
| ClaudeCode_love | Claude Code 機能速報 + 海外バズ、Claude Code ガチ勢 3 人運営 | 同上 |

#### v2 §1.2 新規 20 アカ (Phase 0 v2 で raw 取得) (**Current (v3) 母集団の一部**)

国内 (推定 日本語主) と海外 (英語/スペイン語) を混在で取得し、target_fit を Sonnet 分析の中で確認:

| group | 該当 handle |
|---|---|
| 国内 Claude / Codex / Obsidian 系 | ClaudeCode_UT / obsidianstudio9 / claudecode_lab / ObsidianOtaku / so_ainsight / Codestudiopjbk / tetumemo / mmmiyama_D / MakeAI_CEO / daifukujinji / commte |
| 海外 (英語) AI / Codex / 開発系 | jason_coder0 / heynavtoor / ethancoder0 / cyrilXBT / csaba_kissi / ai_explorer25 / Atenov_D |
| 海外 (スペイン語) GitHub OSS | Fluyeporlaweb |
| 詳細不明 (要 Phase 0 v3 確認) | exploraX_ |

raw 永続化: `raw/publishing/research/2026-05-26-jp-ai-publishers-v2/raw/posts/<handle>.json` (新 20) + `posts-existing-4/<handle>.json` (既存 4)

#### v2 §1.3 5 query で発掘した 244 unique handles の上位 (Phase 0 v3 候補) (Status: v3 で再評価)

非エンジニア経営者向け target ニッチに query が刺さっている兆候:

| handle | hit 数 | 推定領域 |
|---|---|---|
| **kandmybike** | 15 | 要確認 (国内、自転車? AI?) |
| **AIshukyaku** | 13 | 集客 × AI |
| **ichiaimarketer** | 12 | マーケター × AI |
| **Jeanscpa** | 7 | 会計士系 (士業 hit) |
| **sakai_tax** | 5 | 税理士系 |
| **TakeshiYonese** | 5 | 要確認 |
| **houki_ai_keiri** | 5 | 経理 × AI (target に直撃) |
| **nekokoroconsul1** | 4 | コンサル × AI |
| **taharakoichi** | 4 | 要確認 |
| **sugawara11** | 4 | 要確認 |

→ Phase 0 v3 で 5-10 アカを追加母集団化候補 (v3 で actual sora19ai / 7_eito_7 等が再発掘)

#### v2 §1.4 Q5 が 0 件だった件 (Status: v3 で A5 として min_faves:50 緩和 + キーワード拡張)

Q5 = `"AI automation" ("small business" OR "non-engineer" OR "non-coder") -is:retweet lang:en min_faves:100`

→ **0 tweets**。原因仮説:
- `min_faves:100` が厳しすぎ (海外英語圏 X では Claude Code 系 tweet は数十 faves が標準)
- 単語の組合せが narrow (`small business` よりも `SMB` / `agency` / `freelancer` が一般的)
- twitterapi.io advanced_search の英語 token 解析が日本語ほど smooth でない可能性

Phase 0 v3 で再設計予定:
- `min_faves:30` まで緩和
- query を `"non-technical" OR "non-engineer" OR "SMB" OR "agency"` に拡張
- `"AI automation" -is:retweet lang:en` + 個別キーワードに分割

#### v3 §2 母集団の構成 (v3 確定)

##### v3 §2.1 主母集団 (24 アカ、変更なし)

v2 と同一: 信頼 4 + ユーザー指定 20 = 24 アカ。`raw/publishing/research/2026-05-26-jp-ai-publishers-v2/raw/posts*` で永続化済。

##### v3 §2.2 Phase 0 v4 候補プール (新規)

`raw/publishing/research/2026-05-26-jp-ai-publishers-v3/raw/candidates-merged.json` に 455 unique handles を保存。publisher_score 上位 6-10 アカを Phase 0 v4 で seed 拡張対象とする。発動条件:

- Phase 1 Month 1 末で `failure_story` / `industry_sop` 投稿に必要な参考素材が不足したと Optimizer が判定
- ofmeton 本人が「もう少しサンプル増やしたい」と希望

---

### 2.5 Phase 0 v3 実行結果

*Version History*: v3 のみ独立節として導入 (Phase 0 v3 実 API call の結果報告)

#### v3 §1 Phase 0 v3 実行結果 (**Current (v3)**)

| 項目 | 値 |
|---|---|
| 実行日 | 2026-05-26 |
| query 数 | 10 (A 系 5 + B 系 5) |
| 取得 tweets | 987 |
| 推定コスト | ¥24 (¥27 上限) |
| **実コスト** | **¥23 ($0.148)** |
| (v1.4 改訂注記) | 投稿頻度・cron 頻度は **[Style Guide 統合版](./style-guide-all-versions.md) §4.5 投稿頻度の変遷 + §4.4 cron 頻度の変遷 (= 旧 v1.4 確定)** を Single Source とする (X 1/日 + note 4-6/月 + IG 月 12 / 海外X 日次 cron) |
| API calls | 50 |
| publisher unique handles | 215 |
| audience unique handles | 275 |
| merged unique handles | 455 |

##### v3 §1.1 seed 24 アカの hit 検証

| 結果 | 件数 | 内訳 |
|---|---|---|
| **publisher または audience で hit** | **17 / 24 (70%)** | 国内中心アカ + 一部海外アカ |
| いずれもゼロ | 7 / 24 (30%) | Atenov_D / Fluyeporlaweb / ai_explorer25 / csaba_kissi / ethancoder0 / jason_coder0 / mmmiyama_D |

→ ゼロ hit 7 アカの分析:
- 6 アカ (Atenov_D / Fluyeporlaweb / ai_explorer25 / csaba_kissi / ethancoder0 / jason_coder0): **海外英語圏**、A5 query (`min_faves:50`) でも刺さらず → **Phase 0 v4 で更に緩和 + キーワード拡張必要**
- 1 アカ (mmmiyama_D): 国内日本人だが **Gemini / Antigravity / 自分独自ツール** が主軸、Claude/Codex/Obsidian 軸では刺さらず

→ **70% hit は許容**、残り 30% は別軸 query (海外英語圏 + 主軸ツール多様化) で Phase 0 v4 対応予定。

##### v3 §1.2 publisher 新規発掘 TOP 15 (publisher_score ≥ 候補)

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

##### v3 §1.3 audience 新規発掘 TOP 10 (target 読者層検証)

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

### 2.6 9 項目仕入れ方法分析 (Sonnet 4.6)

*Version History*: v2 で新規導入 (24 アカ × 9 項目 質的分析) → v3 で再実行不要を確認 (母集団不変のため)

#### v2 §2 サマリ (**Current (v3)** 数値、再実行不要)

詳細は `source-ingestion-analysis-summary.md` 参照。中央値:

| 項目 | 中央値 | 解釈 |
|---|---|---|
| publishing_lag_hours | **9h** | 海外発表から半日以内 |
| translation_rate | 7.5% | 直訳は少ない |
| **paraphrase_rate** | **32.5%** | **主流パターン** |
| opinion_rate | 17.5% | 控えめ |
| citation_explicit_rate | 37.5% | 半数以下のアカが引用元明示 |
| cross_platform_intake | 40% | 半数程度 |
| original_rate | 27.5% | 中程度 |

##### 主要情報源 (24 アカ中)

1. 海外X: 96% (23 アカ)
2. 公式ブログ: 75% (18 アカ)
3. GitHub: 62% (15 アカ)

→ **3 大情報源で 80%+ をカバー**。Discord / Podcast / 国内資料は 25% 以下 = 差別化余地

##### アカウント タイポロジー

- **Type A (12 アカ)**: 海外X 翻案・要約・パラフレーズ型 (定型フォーマット、煽り CTA)
- **Type B (3 アカ)**: 一次体験・本人実装型 (mmmiyama_D / daifukujinji / masahirochaen) **← ofmeton の参考軸**
- **Type C (5 アカ)**: 英語圏キュレーション再パッケージ型 (リスト編集中心、引用希薄)
- **Type D (2 アカ)**: コミュニティ活動・短文返信型

#### v3 §3 中央値 (再掲) と Style Guide v1.3 transfer 推奨値 (**Current (v3)**)

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

#### v3 §3 (続) 9 項目分析の再実行不要根拠

理由: 母集団 24 アカが不変なため。Codex 指摘 R-12 (自信度低 8 アカ) / R-13 (top by like 代表性) は **次フェーズ Phase 0 v4 で random/time-stratified を並走** することで補強。

---

### 2.7 海外 + 国内業種別 transfer learning

*Version History*: v1 §3 で導入 (海外 17 + 国内業種別 7 の transfer learning) → v2 / v3 では母集団に統合され独立節は無いが、知見は §5 推奨コンテンツ角度に転写

#### v1 §3.1 国内最重要発掘: @kandmybike (畠山謙人 / AI 税理士) (Status: 知見は v3 audience hit に承継)

- **「スタッフ 0 人で 60 社」339 万リーチの X 長文** が代表作。CLAUDE.md テンプレ配布など実装の中身まで開示。
- ofmeton ポジションに **最も近接** (5 観点合計 22-23 相当)、ただし業種 = 税理士 1 本。
- ofmeton は「業種横断翻訳者 (税理士 + 製造 + 教育 + 小売 + 士業)」ポジションで棲み分ける。
- 連携の可能性: 同氏が士業 × AI の note 記事を書く時の transfer 元として、ofmeton から相互送客提案が打てる。

#### v1 §3.2 海外で transfer すべき 8 要素 (`external-accounts.md` C 章サマリ) (Status: 知見はそのまま保持)

1. **Liam Ottley (@liamottley_) の階段単価設計** ($5k → $60k → $250k+) → ofmeton note 500/980/1,480 円 → 個別相談 → 小型代行 → 大型代行の 5 段階を Phase 0 で設計。
2. **Nate Herk (@nateherk) の数字付き ROI 開示徹底** ($500K / 8 ヶ月 を毎回明示) → ofmeton も Before-After 数字 + 期間 を全 X 投稿テンプレに。
3. **畠山謙人「CLAUDE.md テンプレ配布」型** → ofmeton も note 有料記事の中核に「業種別 Claude プロンプト集」を据える。
4. **swyx (@swyx) のカテゴリ命名先行者利益** ("AI Engineer" 命名) → ofmeton も「AI 翻訳者」「業種別 SOP デザイナー」等の用語発明を検討。
5. **David Ondrej (@DavidOndrej1) の断言型フック** → ofmeton も「節約じゃなく新規受注獲得」型の断言で X 投稿フックを強化。
6. **Matt Wolfe (@mreflow) の AI ツール DB + Rowan Cheung 日次 5 分 NL** → ofmeton も「業種別 AI 自動化 SOP DB」を wiki/publishing に蓄積、note メンバーシップで継続購読化。
7. **畠山謙人 Forbes 級ロングフォーム X 投稿 (1 投稿で 339 万リーチ)** → ofmeton も月 1 本ロングフォーム単発を組み込み、note 送客導線にする。
8. **Allie K. Miller (@alliekmiller) の LinkedIn 連動** → ofmeton も Phase 2-3 で LinkedIn (B2B / 経営者リーチ) を検討。

#### v1 §3.3 国内業種別発信者 (発掘失敗領域 = ofmeton 空白市場)

WebSearch で X handle が特定できなかった領域:
- 社労士 × AI 発信 (個人発信者)
- 行政書士 × AI 専業発信者
- 弁護士 × AI 発信
- 製造業経営者 × AI 発信
- 女性経営者 × AI 発信

**これらが ofmeton の Phase 1-2 で抑えるべき空白**。発信を始めれば検索上位を取りに行ける。

#### v1 §3.4 note 競合補完 (v9.1 マップへの追加)

`note-additional-findings.md` で詳述。要点:
- v9.1 直接競合 4 アカのうち **ritowa は note 消滅 (404)** で除外。
- 新規追加 8 アカ (zeirishi_ai_lab, lush_canna4905, sevenrich, fukahori_ac, pleasure_7190, ysnotebook, touki_moriya, ken_hakodate) を発見。
- **税理士 × AI セグメントは既に 6-7 アカ存在 = 空白ではない**。ofmeton は 4 重交差 (業種横断 × 数字 ROI × 非エンジニア視点 × 失敗談先行) で差別化必須。

---

### 2.8 テーマ × フォーマット マトリクス

*Version History*: v2 §3 で導入 (24 アカ x 全カバー) → v3 §4 で士業位置づけ統一 + audience hit 注記追加

#### v2 §3 マトリクス (24 アカ x 全カバー、Status: v3 で士業箇所 update)

縦軸: テーマ (target に刺さるか) / 横軸: フォーマット (発信スタイル)

| テーマ \ フォーマット | 海外バズ翻案 | Tips リスト | 一次体験デモ | 所感型 (リリース→意見) | 失敗談 | 業種別 SOP |
|---|---|---|---|---|---|---|
| Claude Code 機能速報 | ◎ 12 アカ | ○ 6 | △ 3 | △ 2 | × 0 | × 0 |
| プロンプト集 | ○ 7 | ◎ 9 | △ 2 | △ 1 | × 0 | × 0 |
| AI ツール比較 | ○ 5 | ◎ 8 | △ 2 | △ 1 | × 0 | × 0 |
| GitHub OSS 紹介 | ○ 6 | ◎ 6 | △ 1 | △ 1 | × 0 | × 0 |
| 業務効率化 (経理/請求書/見積) | × 0 | △ 2 | △ 2 | × 0 | × 0 | **△ 2** |
| 士業 (税理士/社労士) × AI | × 0 | × 0 | × 0 | × 0 | × 0 | × 0 |
| 中小経営者 1 人社長向け | × 0 | △ 1 | △ 1 | × 0 | × 0 | × 0 |
| AI 実装失敗談 | × 0 | × 0 | × 0 | × 0 | **× 0** | × 0 |

凡例: ◎ 8+ / ○ 5-7 / △ 1-4 / × 0

#### v3 §4 マトリクス (v3 確定、士業に audience hit 注記追加) (**Current (v3)**)

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

#### v2 §3 / v3 §4 空白領域分類 (Tier 1 / Tier 2 / Tier 3)

##### Tier 1 (最優先 = 1〜2 アカ以下しかカバーしていない)

1. **AI 実装失敗談** (全 24 アカで 0 件、Phase 0 v1 でも 3.2% のみ確認、ofmeton の 8 倍差別化レバーとして既確証)
2. **業種別 SOP (経理/請求書/見積/家庭教師/民泊清掃)** (houki_ai_keiri など Phase 0 v3 候補にのみ存在、ofmeton は terra-isshiki / minpaku-cleaning / RICE CREAM の素材で先行可能)
3. **士業 × AI 実装** (税理士/社労士/行政書士向け、Q2 hit handle = Phase 0 v3 候補で発見、ofmeton 自身は士業でないが「翻訳者」ポジション活用可) — **v3 で 1 セグメント化、競合 ≤ 2 アカ**
4. **中小経営者 1 人社長向け Claude 活用事例** (Q1 hit handle = 同上)
5. **非エンジニア翻訳** (v3 追加): 競合 ≤ 5%

##### Tier 2 (= 4 アカ以下)

6. AI ツール比較を一次体験デモで (3 アカのみ)
7. 業務効率化を所感型で (0-1 アカ)

##### Tier 3 (差別化余地はあるが供給は十分)

8. Claude Code 機能速報 (12 アカ、ただし「実装の失敗→修正の記録」軸は空白)
9. プロンプト集 (9 アカ、ただし「非エンジニア向け業務翻訳」軸は空白)

---

### 2.9 ofmeton 用 推奨コンテンツ角度

*Version History*: v2 §4 で 4 軸導入 → v3 §5 で士業統一 + opinion lag / citation rate / Discord 等の詳細を追加

#### v2 §4.1 第 1 軸 (最強差別化) (**Current (v3)** 内容と一致)

**「AI 実装失敗談 → 修正の記録」型ポスト**
- 24 アカ全員が 0% で発信していない
- ofmeton の "Python/Java/業務自動化バックグラウンド + Claude Code 実運用" のクレデンシャルと整合
- 失敗 → 修正のセット = 「Tips」「Before/After」「Carousel」全フォーマット展開可

#### v3 §5.1 第 1 軸 詳細追加 (**Current (v3)**)

**「AI 実装失敗談 → 修正の記録」型ポスト** (verified_failure_story 月 ≤ 4)

- 24 アカ 0% で発信、Phase 0 v1 でも 3.2%
- 軸 1 = first_hand 必須
- 案件 commit log + 案件メモ + 音声メモから供給、公開許諾 gate + DLP redaction + 業法ガード必須
- 供給制約があるため比率 KPI ではなく **上限 KPI**

#### v2 §4.2 第 2 軸 (target 直撃) (Status: v3 §5.2 で士業統一を反映)

**「業種別 SOP (経理/請求書/見積/民泊清掃/士業)」型ポスト**
- terra-isshiki / minpaku-cleaning / RICE CREAM の自分の案件素材で先行可能 (DLP redaction で固有名詞マスク前提)
- 競合 24 アカ中 0-2 アカのみカバー
- note 有料記事への直接転換可 (例: 「中小経営者向け請求書発行自動化 SOP 完全版 ¥1,480」)
- **v1.2 改訂**: 士業 (税理士/社労士/行政書士) は主軸ターゲットから外し、本 industry_sop 軸の **1 業種セグメント** として扱う。発信トーンは経営者向けに統一しつつ業種別 SOP の対象には士業も含める

#### v3 §5.2 第 2 軸 詳細追加 (**Current (v3)**)

**「業種別 SOP」型ポスト**

- 主軸軸 1 = first_hand (terra-isshiki / minpaku-cleaning / RICE CREAM / 家庭教師)
- 1 業種セグメント = 経理 / 請求書 / 見積 / 民泊清掃 / **士業 (税理士向け SOP 等)**
- 月 6 投稿 (= 30 投稿の 20%)
- Phase 0 v3 audience hit (houki_ai_keiri / TakeshiYonese) を読者層語彙の transfer に

#### v2 §4.3 / v3 §5.3 第 3 軸 (誠実性レバー) (**Current (v3)**)

**「引用元明示 60%+ / 65%+」「publishing_lag 24-48h (意図的に遅らせる)」**
- 競合中央値: citation_explicit 37.5% / lag 9h
- ofmeton: **v2 表記** citation 60%+ / lag 24-48h で「速報 → 解釈時間を入れた所感」型に / **v3 表記** citation 65%+ / opinion lag 24-48h
- ニッチではないが信頼形成のレバー
- **v3 追加**: translation 投稿構造規約: 「翻訳意図 1 行」を出さない (cs:p3-ddde 整合)

#### v2 §4.4 / v3 §5.4 第 4 軸 (補助 / 情報源差別化) (**Current (v3)**)

**「Discord / Podcast / 国内資料」など低使用情報源の活用**
- Discord (1 アカ) / 国内資料 (1 アカ) = ほぼブルーオーシャン
- ofmeton の Claude Code Discord 参加履歴を活用可
- **v3 追加**:
  - **Discord (Claude Code / Anthropic)** 競合 4%、ほぼブルーオーシャン
  - **国内資料 (公的機関 / 民間 PDF)** 競合 4%
  - **音声メモ (案件中)** 公開許諾 gate 通過後

---

### 2.10 Phase 1 着手前の transfer 設計

*Version History*: v2 §5 で導入 → v3 §3 と Style Guide v1.3 で更に整理

#### v2 §5 主要 transfer (**Current (v3)** Style Guide v1.3 / v1.4 と一致)

詳細は [`style-guide-all-versions.md`](./style-guide-all-versions.md) (旧 v1.1 / v1.4 を統合済) §2.1〜§2.14 参照。主要 transfer:

| 項目 | 競合中央値 | **ofmeton 推奨** | 根拠 |
|---|---|---|---|
| paraphrase_rate | 32.5% | **20%** | 翻案は主流だが他で差別化 |
| opinion_rate | 17.5% | **30%** | 所感は弱い競合多数 |
| original_rate | 27.5% | **40%** | 一次体験 + 失敗談で差別化 |
| translation_rate | 7.5% | **10%** | ほぼ維持 |
| citation_explicit_rate | 37.5% | **65%+** | 誠実性レバー |
| publishing_lag_hours | 9h | **24-48h** | 解釈時間を確保 |
| cross_platform_intake | 40% | **35-50%** | 競合と同等。note / Podcast を refresh で確認 |

#### v2 §5 情報源プリセット (Status: v1.4 で海外X が日次化、本表は v2 オリジナル)

ofmeton の初期プリセット (v10.3 §3.1 素材レイヤー方針との整合):
1. 海外X (Anthropic / OpenAI / 開発者の公式アカ) ← twitterapi.io 経由
2. 公式ブログ (Anthropic Claude Tips / OpenAI / Google AI)
3. GitHub Trending (Claude Code / Codex / AI ツール)
4. **Claude Code 履歴 + Git commit + 案件メモ (terra-isshiki / minpaku-cleaning / RICE CREAM)** ← 一次体験ソース
5. Discord (Claude Code / Anthropic) ← 競合 1 アカのみ使用、差別化レバー
6. 音声メモ (案件中の気づき) ← 公開許諾 gate 通過後

---

### 2.11 Phase 1 着手前ブロッカー 5 件の状況

*Version History*: v2 §6 で導入 → v3 §6 で状況更新 (v10.3 / v1.3 反映)

#### v2 §6 状況 (Status: v3 で update)

cs:p2-5906 / p2-3936 の 5 件ブロッカー:

1. ✅ §10.3 バックアップアカウント問題 → v10.3 で所有導線に置換済 (PR #20 で確定、PR #21 で main 到達)
2. ✅ 公開許諾 gate → v10.3 で Schema 明文化済
3. ✅ §3.3 コスト過小見積 → cs:p2-aeba で実測 ¥6,500/9,154/13,800 月確定
4. ⚠️ X OAuth 2.0 PKCE offline.access scope → 実機テストは未着手 (HUMAN_TASKS H-1)
5. ✅ Hook 比率 75% 重複ラベル → v10.3 §4.7 で primary_hook + devices 再分類済

→ **#4 は人間タスク**。Claude 側で詰める作業は Phase 0 v2 と本レポートで完了

#### v3 §6 状況 (**Current (v3)**)

| # | 内容 | 状態 |
|---|---|---|
| 1 | §10.3 バックアップアカウント | ✅ v10.3 で所有導線置換済 |
| 2 | 公開許諾 gate Schema | ✅ v10.3 明文化済 + v1.3 §2.4 で failure_story の必要条件として再強化 |
| 3 | §3.3 コスト過小見積 | ✅ cs:p2-aeba で ¥6,500/9,154/13,800 確定 |
| 4 | X OAuth offline.access | ⚠️ HUMAN_TASKS H-1 (実機テスト残) |
| 5 | Hook 比率 75% 重複ラベル | ✅ v10.3 §4.7 + v1.3 §2.2 で軸 1 / 軸 2 分離 |

→ Claude 側 4/5 ブロッカー解消、#4 のみ人間タスク。

---

### 2.12 残課題と Phase 0 v4 発動条件

*Version History*: v3 §7 で導入 (Codex round 1 残課題 + Phase 0 v4 発動条件)

#### v3 §7.1 残課題 (Codex round 1 Medium 級) (**Current (v3)**)

- H-9 (再現性): analyze-source-ingestion.py の絶対パス排除、inputs-manifest は Phase 0 v3 で対応済 (`fetch-phase0-v3.py`) → 次回 9 項目分析実行時に analyze 側も対応
- **H-14** (GitHub Trending cron 実装場所): HUMAN_TASKS に新規追加 (H-12 / H-13 は既存)
- H-13 (STYLE-GUIDE-CURRENT.md): **本 PR でシンボリックリンク作成**
- H-15 (pruning 設計): Style Guide v1.3 §7 で発動条件明文化
- R-22 (GitHub Trending TOS): 公開ページ scrape は GitHub TOS で許容範囲、UA 明示で良識的範囲

#### v3 §7.2 Phase 0 v4 発動条件 (**Current (v3)**)

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

### 2.13 v10 設計への修正提案 (v10.1 で反映)

*Version History*: v1 §4 で M-1〜M-14 として導入 (v10.1 / v10.2 / v10.3 で順次反映済み、原文保持)

| # | v10 該当章 | 修正内容 | 根拠 |
|---|---|---|---|
| M-1 | §1.4 コンテンツバランス | 翻案 4 : 実体験 4 + 業種別 SOP 2 に変更 (元 翻案 5 : 実体験 3) | F-5 / F-6 / 国内 10 アカで実体験言及が極小 = 差別化レバー |
| M-2 | §1.4 自動切替トリガ | 「PCR 3 週連続 0.3% 超 + 上位投稿パターン 3 類型特定」を維持しつつ、**`non_engineer_rate ≥ 30%` + `fail_rate ≥ 15%` を継続条件** に追加 | F-5 / F-6 |
| M-3 | §3.3 コスト試算 | Phase 0 残 55 アカ追加収集の ¥250 を削除、海外 / 国内業種別調査の予算を Phase 1 に編入 (実質月予算外、本 PR 作業のみ) | §0.1 / B+C 路線変更 |
| M-4 | §4.3.2 X フォーマット fmat | 「短文 60 / スレッド 30 / 長文 10」 → 「短文 50 / 中文 (141-280) 30 / 長文 (281-1000) 15 / スレッド 5」に再分配 | F-2 / F-10 |
| M-5 | §4.3.2 X 投稿テンプレ | 「敬体率 40-55%」「【】率 5-10%」「絵文字 20-30% (👇 は URL 直前限定)」を Writer プロンプトに明示 | F-3 / F-8 / F-9 |
| M-6 | §4.3.5 1 トピック 3 媒体展開フロー | 「金土の X 投稿頻度を平日の 80% に下げる」 (週末トーン低下) を明記 | F-7 |
| M-7 | §4.6 Editor 6+2 ルール | 「+3 失敗談スロット (Phase 1)」「+4 読者像 1 行明示 (非エンジニア / 経営者 / 士業)」を追加 → 6+2 → 6+4 ルールへ | F-5 / F-6 |
| M-8 | §4.7 Hook 13 類型 | Phase 1 主軸 3 類型 (数字 + 失敗談先行 + Before-After) 60-70%、テスト枠 4 類型 (問いかけ / 逆張り / 共感 / メタ言及) 30% を明示 | F-1 |
| M-9 | §4.8 Optimizer 改善対象 / Full auto | 「アカ別文字数中央値、敬体率、【】率を Style Guide v 経由で 4-12 週おきに自動更新」を Full auto 範囲に追加 | F-2 / F-3 / F-8 |
| M-10 | §4.8 集客導線 3 パターン | URL 位置を媒体導線 A/B/C と対応付け: A (URL なし) / B (URL 末尾 = 朝昼) / C (URL 中 = 夕方 note 送客) | F-11 |
| M-11 | §6 競合調査 | 「合計 65 アカ × 1,300 投稿」を「Phase 0 = 既存 10 アカ深掘り + 海外 17 + 国内業種別 7 + note 補完 8 = 42 アカ + 924 tweets + 60-80 記事タイトル」に書き換え | §0.1 / §0.2 |
| M-12 | §7 Style Guide v1 | v1 初期生成の主原料を「国内 10 アカ 50 項目集計 + 海外 17 + 国内業種別 7 + note 補完 8」に書き換え。雛形を §6 (本レポート) に含める | §1.3 |
| M-13 | §10 法務・規約ガード | §10.2 翻案ルールに「**数字付き ROI 開示時は自身の実測値であること、他者事例は出典明示**」を追加 | 畠山謙人 + SEVENRICH 等が数字開示を始めており、ofmeton も差別化として数字を出すが責任範囲を明確化 |
| M-14 | §11 クロスレビュー | E-39 (新規): 「3 主軸 + 4 テスト枠の Hook 配分は Phase 1 で十分な検証データが集まるか (n=投稿 / 月)」 / E-40: 「数字付き ROI 開示の責任範囲 (実測値 vs 他者事例) は 1 投稿に同居していいか」 / E-41: 「業種横断翻訳者ポジションが業種特化勢 (畠山謙人 / shigyou_ai_com 等) に勝てる根拠は何か」 を追加 | §1.2 / §3.1 / §3.4 |

---

### 2.14 3 ヶ月運用後の後悔予測 (10 件)

*Version History*: v1 §5 で導入 (R-1〜R-10、後悔予測 10 件) → v2 / v3 では明示参照されないが、知見として保持

#### R-1: 「Hook 13 類型を初期から全部運用しようとした結果、検証データが分散して何も結論が出ない」

- 各類型 月 5-10 投稿しか割り当てられず、PCR 統計的有意性が出るまで 6-9 ヶ月かかる
- **回避策**: Phase 1 は 3 主軸 70% + 4 テスト枠 30% に絞る (M-8)、Phase 2 で類型を追加する

#### R-2: 「失敗談スロット必須化 (`fail_rate ≥ 15%`) で『盛った失敗談』が量産される」

- LLM が架空の失敗談を生成、Editor で reject されず流出
- **回避策**: 失敗談には「実体験ソース ID (Claude Code 履歴 / Git commit / 案件メモ / 音声メモ)」必須を Editor +3 ルールに追加。実体験リンク不在の失敗談は架空とみなして reject

#### R-3: 「業種横断翻訳者ポジションが、結果として『どの業種にも刺さらない』ぼんやり感を生む」

- 業種特化勢 (畠山 = 税理士、shigyou_ai_com = 士業) より深さで負ける
- **回避策**: 月ごとに「今月の業種フォーカス」を 1-2 業種に絞って深さを出す (1 月: 税理士、2 月: 経理、3 月: 教育、...)、年間で 12 業種をカバーする運用に変更

#### R-4: 「note 5 構成パターン + ティーザー境界設計が、書く方の負担で運用継続できない」

- 構成パターンごとに 3,000-10,000 字 + 無料軽量版を書くのは 1 本 4-8 時間
- **回避策**: 構成パターンを 3 系統に絞る (まとめ型 + 専門職×AI + シリーズ実践記)、ツール比較型と段階型は Phase 2 から、無料軽量版は 200-400 字に固定

#### R-5: 「集客導線 3 パターン (A/B/C) の effect 差が Optimizer で検出できない」

- A (URL なし) / B (URL 末尾) / C (URL 中) は混合運用で交絡因子が多すぎる
- **回避策**: Phase 1 は **A 単独 (URL なし 4 投稿) + 夕方 1 投稿だけ URL 付き** に単純化、Phase 2 で B/C の A/B テスト計画を立てる

#### R-6: 「Liam Ottley 階段単価設計を真似て 5 万 / 15 万 / 30 万円を Phase 0 で確定し、Phase 2 で『安すぎた』と後悔」

- 海外単価は日本の 3-5 倍。Phase 0 で確定は早すぎる
- **回避策**: Phase 0 では「階段の幅 (5 段階)」だけ確定、各単価は Phase 1 で個別相談 3-5 件こなしてから確定

#### R-7: 「Hook『数字インパクト』の数字が架空または誇大表現で景表法違反」

- §10.1 ステマ規制 + §10.2 翻案ルールでガード済だが、「業務時間 80% 削減」「3 倍効率化」のような誇大表現はガードしきれない
- **回避策**: §10.2 に「**数字付き ROI 表現は実測値 (出典 ID) を Editor で必須化、推測値や他社事例は『〇〇社事例として』明示**」を追加 (M-13 で対応)

#### R-8: 「LINE 完結インタビュー (5-10 ターン × 月 60 回) で、本人が "答える疲れ" を起こす」

- 月 480 通の応答は ADHD/ASD 特性で継続困難
- **回避策**: 週 1 回 30 分の "まとめインタビュー" モード (5-10 トピックを一気に 30 分で消化) を §4.1 に追加、Phase 1 の運用ベースラインに

#### R-9: 「Phase 0 で海外 17 アカ + 国内業種別 7 アカを発掘したが、Phase 1 で 1 度も transfer learning を発火させない」

- 「ある」だけで使われない、wiki/publishing/inspirations/ に放置
- **回避策**: §4.8 Optimizer Weekly Brief に「**transfer learning 使用回数 (raw/publishing/inspirations/ ingest 回数)**」を KPI として明示 (週 ≥ 3 件)

#### R-10: 「v10 §4.7 Hook 動的拡張で『新類型認定』を月 1 回承認するが、認定基準 (PCR 中央値 + 20%) が厳しすぎて 6 ヶ月で 1 件も認定されない」

- 国内 10 アカの hook 分布から推測すると「中央値 +20%」は新類型として極端な高ハードル
- **回避策**: §4.7 新類型認定基準を Phase 1 のみ「PCR 中央値 +10% + 投稿数 ≥ 5 件」に緩める、Phase 2 から +20% に戻す

---

### 2.15 Style Guide v1 雛形 (Phase 0 アウトプット)

*Version History*: v1 §6 で導入 (Style Guide v1 雛形を本レポート内に内蔵) → v2 / v3 では独立した `style-guide-v1.x.md` に分離

#### v1 §6 (Status: 分離して style-guide-v1.x.md に発展、原文を本節に保持)

v10 §7 で「v1 (初期) — 投稿開始前 Foundation」と定義された Style Guide。Phase 0 で確定する。

##### v1 §6.1 ofmeton X / Instagram / note の言語トーン

```yaml
language_tone:
  keigo_rate: 0.40-0.55       # 敬体 / 常体ミックス。完全敬体は商用色強い
  first_person_rate: 0.40-0.55  # 一人称使用率。実体験 4 比率と整合
  reader_address_rate: ≥0.30   # 読者像 1 行明示 (「非エンジニア経営者へ」等)

x_post_format:
  short:    {ratio: 0.50, len: 100-280字, hook: 数字 + 失敗談 + Before-After 主軸}
  medium:   {ratio: 0.30, len: 141-280字, hook: 結論先出 + 経験談}
  long:     {ratio: 0.15, len: 281-1000字, hook: 業界批評 + 思考フレーム}
  thread:   {ratio: 0.05, len: 2-7本,    hook: ストーリー + 構造化解説}

x_meta:
  bracket_rate: 0.05-0.10     # 【】カッコ控えめ
  emoji_rate: 0.20-0.30        # 👇は URL 直前限定
  url_position:
    morning_noon: "末尾 (URL なし or 添え)"
    evening: "本文中 (note 送客の補足)"
  hashtag_rate: ≤0.05         # ハッシュタグ控えめ
  newline_density: 0.030-0.050  # 改行で読みやすさ確保
```

##### v1 §6.2 ofmeton Hook ライブラリ (Phase 1 主軸 3 + テスト枠 4)

```yaml
phase1_main_hooks:
  - 数字インパクト型        # ratio 25-30%
  - 失敗談先行型 (Before-After 共起) # ratio 25-30%
  - Before-After 数字型     # ratio 15-20%

phase1_test_hooks:
  - 問いかけ型           # ratio 5-10%
  - 逆張り型 (みんなXと言うが実はY) # ratio 5-10%
  - 共感型 (実は私も最初は X) # ratio 5-10%
  - メタ言及型           # ratio 5%

phase1_kpi:
  non_engineer_rate: ≥0.30
  fail_rate: ≥0.15
  business_organization_theme_rate: ≥0.50
```

##### v1 §6.3 ofmeton note 構成パターン (Phase 1 = 3 系統)

```yaml
phase1_note_formats:
  matome:       # まとめ型
    target_ratio: 0.40
    word_count: 3000-6000
    price: 980-1480
  professional_x_ai:   # 専門職×AI 型 (業種別 SOP)
    target_ratio: 0.40
    word_count: 3000-5000
    price: 980 + 初回無料
  series_jissen:        # シリーズ実践記型
    target_ratio: 0.20
    word_count: 1500-3000
    price: 300 個別 + マガジン 980/月

phase2_added_formats:
  step_by_step:        # 段階型
  tool_compare:        # ツール比較型
```

##### v1 §6.4 ofmeton 階段単価設計 (5 段階)

```yaml
ofmeton_pricing_ladder:
  L1_free:           {item: note 無料記事, price: 0,     freq: 3-5/月}
  L2_paid_note:      {item: note 有料記事, price: 500-1480, freq: 1/月}
  L3_consult:        {item: 個別相談 1h,   price: 5000-10000, freq: 5-10/月}
  L4_small_proj:     {item: AI 自動化代行 (小型), price: 50000-150000, freq: 1-3/月 (Phase 2-3)}
  L5_large_proj:     {item: AI 自動化代行 (大型), price: 300000+, freq: 月 1 (Phase 3+)}
```

##### v1 §6.5 Visualizer デザインシステム (v10 §4.4 既出 + Phase 0 修正)

| 役割 | 色 (確定値) | 注記 |
|---|---|---|
| Primary | **#1A2B5F** (ofmeton ネイビー) | 信頼感、知的、業務文脈 |
| Accent | **#FF6B6B** (コーラルレッド) | 注目訴求、CTA |
| Background | **#F8F8F5** (オフホワイト) | 紙質感、長文読みやすさ |
| Text | **#2A2A2A** (チャコールグレー) | 黒よりやわらかい本文 |
| Sub-Accent (新規) | **#F4D35E** (ホワイトイエロー) | Before-After の "After" 強調 |

- フォント: 見出し Noto Sans JP Heavy (900), 本文 Noto Sans JP Regular (400) — v10 既出を維持
- Instagram カルーセル: 1080×1080 px、文字最小値 32 px — v10 既出を維持

---

### 2.16 データの限界・観測限界

*Version History*: v1 §7 で導入 → v2 / v3 では明示節として再掲されないが、観測限界の事実は引き継ぎ

#### v1 §7 (Status: 観測限界の参照資料、Phase 1 実機テストで解消予定)

| 項目 | 観測限界 | Phase 1 への引き継ぎ |
|---|---|---|
| 50 項目の C (画像系 15-21) | post JSON に media 情報なし、alt text なし。`url_rate` から間接推定のみ | Phase 1 で X API 取得時に media field を含めて再評価 |
| 50 項目の D (動画系 22-28) | 同上、動画 URL / 長さ / 字幕情報なし | 同上 |
| 50 項目の F-34 (固定ポスト) | top_tweets API では pin 判定不可、極端に古い投稿があれば pin と推測のみ | X API で pinned_tweet_id を取得して再評価 |
| 海外 17 アカ | X 直接 fetch は HTTP 402 で全件不可、フォロワー数は記事側二次情報 | Phase 1 で twitterapi.io advanced_search で実 handle ベース取得 |
| 国内業種別 B6/B7 (社労士/行政書士) | WebSearch で個人発信者 X handle 特定不可 | Phase 1 で twitterapi.io 業種別キーワード検索で再発掘、無ければ「空白市場確定」として ofmeton 自身が埋める方向に |
| note 補完 8 アカ | WebSearch ヒット時点 (2026-05-25) の URL 確認のみ、記事数 / 価格 / フォロワー数は未取得 | Phase 1 で必要なら別タスク (Firecrawl 課金 or 手動精査) |

---

### 2.17 次フェーズへの引き継ぎ

*Version History*: v2 §7 で導入 → v3 §8 で完了判定の chart に置換

#### v2 §7 引き継ぎ

##### 即着手可能 (Claude 側)

- [x] source-ingestion-analysis.csv 出力 (#2 完了)
- [x] summary.md (本レポート §2 + 別 file)
- [x] **competitor-report-v2.md (本 file)** (#3 完了)
- [x] **style-guide-v1.1.md** (#3 完了)

##### 人間タスク (ofmeton 本人、¥980-1,500 初期 + Phase 1 月¥9,414)

cs:p2-5906 の残課題 #4:
- HUMAN_TASKS H-1 (X Developer Console)
- HUMAN_TASKS H-2 (Supabase project 作成)
- HUMAN_TASKS H-3 (Anthropic key)
- HUMAN_TASKS H-4 (OpenAI key)
- HUMAN_TASKS H-5 (Cloudflare Workers Paid)
- HUMAN_TASKS H-8 (所有ドメイン取得)
- HUMAN_TASKS H-10 (X 投稿アカウント認証)

##### Phase 0 v3 候補 (将来、推定 ¥80-150)

- 5 query 発掘 244 handles から target_fit_score ≥ 0.5 を 5-10 アカ追加母集団化
- Q5 (海外英語圏) を再設計して再実行
- 候補上位: kandmybike / AIshukyaku / ichiaimarketer / Jeanscpa / sakai_tax / houki_ai_keiri / nekokoroconsul1

##### Phase 1 (着手 = 1 投稿/日、月 ¥9,414)

- 失敗談軸 ・業種別 SOP 軸でコンテンツ 30 本投下
- Style Guide v1.1 の transfer 値で運用
- 30 日後に PCR / url_link_clicks / followers の実測値を Optimizer に投入

#### v3 §8 完了判定 (**Current (v3)**)

- [x] query 2 系統 10 本で実 API call → seed hit 70% 検証
- [x] 新規 publisher 候補 15+ / audience 候補 15+ 発掘
- [x] 母集団 24 アカ維持、9 項目分析再実行不要を確認
- [x] Tier 1 空白領域再確定 (failure_story / industry_sop / 中小経営者)
- [x] Style Guide v1.3 / v10.3 設計書本体との整合確保
- [ ] Codex 再クロスレビュー (Phase D) で closed loop
- [ ] STYLE-GUIDE-CURRENT.md シンボリックリンク作成
- [ ] HUMAN_TASKS H-14 GitHub Trending cron 追加 (H-12 / H-13 は既存)

---

### 2.18 付録 A: 元データ参照

*Version History*: v1 付録 A として導入 (元データの参照リスト) → v2 / v3 では §1.3 等の inline 参照に置換

| 種別 | パス |
|---|---|
| 50 項目集計 (10 アカ × 6 区分) | `outputs/improvements/x-account-design-v10-phase0/analysis-50items.json` |
| 50 項目集計スクリプト | `outputs/improvements/x-account-design-v10-phase0/analyze_50items.py` |
| 海外 17 + 国内業種別 7 詳細 | `outputs/improvements/x-account-design-v10-phase0/external-accounts.md` |
| note 競合補完 | `outputs/improvements/x-account-design-v10-phase0/note-additional-findings.md` |
| v9 publishing research (元 10 アカ) | (別ブランチ `task/260524-jp-ai-publishers-research`) `outputs/publishing/research/2026-05-24-jp-ai-publishers/REPORT.md` |
| 起点設計書 | `outputs/improvements/x-account-design-v10.md` |

### 2.19 付録 B: Phase 0 → v10.1 / Phase 1 への引き渡し

*Version History*: v1 付録 B として導入 (Phase 0 → Phase 1 への手順) → v2 / v3 で更新

| アクション | 担当 | タイミング |
|---|---|---|
| v10.1 設計書を起草 (M-1〜M-14 を反映) | Claude (本 PR) | 本 Phase 0 PR と同時 |
| セルフレビュー (v10.1) | Claude (本 PR) | v10.1 完成直後 |
| Codex MCP クロスレビュー | Codex (本 PR) | セルフレビュー完了後 |
| Phase 1 着手 (人間承認つき 1 本/日 X 投稿開始) | ユーザー + Claude | v10.1 merge 後 |
| Style Guide v1 を Writer プロンプトに固定 | Claude | Phase 1 開始時 |
| transfer learning ingest (raw/publishing/inspirations/) 開始 | ユーザー + Claude | Phase 1 開始時 |

---

## 3. Deprecated 節 (省略なし原文保持)

### 3.1 v1 §0 全体 (Status: §2.1 に統合)

v1 オリジナルの「§0.1 v10 §6 計画との差分」「§0.2 v10 §6 数値の修正」「§0.3 入力データ」は §2.1 内に転記済。

### 3.2 v1 §3.3 国内業種別発信者 (発掘失敗領域) (Status: §2.7 §3.3 として保持、ofmeton 空白市場の認識)

v1 §3.3 オリジナル文章は §2.7 内に転記済 (社労士・行政書士・弁護士・製造業経営者・女性経営者の発信領域空白)。

### 3.3 v1 §6 Style Guide v1 雛形 (Status: 独立 file `style-guide-v1.x.md` に分離、原文を §2.15 に保持)

v1 §6.1 〜 §6.5 全文を §2.15 内に保持。

### 3.4 v2 §1.3 244 unique handles 上位 (Status: v3 で実 API 検証結果に置換、v2 表は §2.4 §1.3 として保持)

v2 §1.3 は v3 で sora19ai / 7_eito_7 / AiAircle34052 / kawai_design / genkAIjokyo / gagarot200 等の publisher_score 計算結果に置換されたが、v2 オリジナル候補リスト (kandmybike / AIshukyaku 等) は §2.4 内で保持。

### 3.5 v2 §1.4 Q5 0 件原因仮説 (Status: v3 で A5 query 緩和により部分解消、原文を §2.4 §1.4 に保持)

### 3.6 v2 §6 ブロッカー 5 件 (Status: v3 §6 で update、両方を §2.11 に保持)

### 3.7 v1 §5 後悔予測 R-1〜R-10 (Status: v2 / v3 では明示参照されないが、§2.14 に全文保持)

---

## 4. 数値・分類軸の進化マトリクス

*Version History*: 本マトリクスは統合版での新規追加 (cs:s1-66 に従い数値・分類軸の cross-version 比較表を冒頭近くにまとめる)

### 4.1 母集団の進化

| 概念 | v1 | v2 | v3 |
|---|---|---|---|
| 主母集団アカ数 | 10 アカ × 50 項目 (深掘り) | 24 アカ × 50 + 9 項目 (信頼 4 + 新規 20) | 24 アカ維持 + 候補プール 455 unique handles |
| 追加 transfer learning | 海外 17 + 国内業種別 7 + note 補完 8 = 計 32 アカ | (上記に統合済) | Phase 0 v4 候補プールに統合 |
| 合計 (cross-reference) | 42 アカ | 24 アカ + 244 unique handles (Q1-Q5 発掘) | 24 アカ + 455 unique handles (A1-A5 + B1-B5 発掘) |
| 母集団選定基準 | 無差別 (上位 10 アカ) | **target_fit_score ≥ 0.5** | (v2 から継承) |
| 除外アカ数 | 0 | 6 (umiyuki_ai / kosuke_agos / minorun365 / icoxfog417 / ai_jitan / milbon_) | (v2 から継承) |

### 4.2 query 設計の進化

| 概念 | v1 | v2 | v3 |
|---|---|---|---|
| query 数 | (なし、既存 10 アカ深掘り中心) | 5 (Q1-Q5、単系統) | **10 (A 系 5 + B 系 5、2 系統分離)** |
| Q2 系 内容 | — | "AI" ("士業" OR "税理士" OR "社労士" OR "行政書士") | (B5 として 1 セグメント化) |
| Q5 系 内容 | — | "AI automation" ("small business" OR "non-engineer" OR "non-coder") lang:en min_faves:100 | A5 query (緩和: min_faves:50、キーワード拡張) |
| seed hit rate | — | 計算前 | **17/24 = 70%** (実 API call で検証) |
| 発掘 unique handles | — | 244 | 455 (publisher 215 + audience 275、重複あり) |
| 実コスト | — | ¥54 (見積 ¥60) | **¥23 ($0.148)** (見積 ¥24) |

### 4.3 9 項目仕入れ方法分析 (v2 で新規導入)

| 概念 | v1 | v2 | v3 |
|---|---|---|---|
| publishing_lag_hours 中央値 | — | 9h | 9h (再実行不要、母集団不変) |
| translation_rate 中央値 | — | 7.5% | 7.5% |
| paraphrase_rate 中央値 | — | 32.5% | 32.5% |
| opinion_rate 中央値 | — | 17.5% | 17.5% |
| original_rate 中央値 | — | 27.5% | 27.5% |
| citation_explicit_rate 中央値 | — | 37.5% | 37.5% |
| cross_platform_intake_rate 中央値 | — | 40% | 40% |
| Type A / B / C / D 分類 | — | 12 / 3 / 5 / 2 アカ | (v2 から継承) |

### 4.4 推奨コンテンツ角度の進化

| 概念 | v1 | v2 | v3 |
|---|---|---|---|
| 第 1 軸 | 数字インパクト + 失敗談先行 + Before-After (3 主軸) | AI 実装失敗談 → 修正の記録 | failure_story 月 ≤ 4 上限 (verified) |
| 第 2 軸 | (Hook 類型 4 テスト枠) | 業種別 SOP (経理/請求書/見積/民泊清掃/士業) | industry_sop = 月 6 投稿 (= 20%)、士業は 1 業種セグメント |
| 第 3 軸 | (citation 未明示) | citation 60%+ / publishing_lag 24-48h | **citation 65%+** / opinion lag 24-48h / translation 構造規約 |
| 第 4 軸 | (transfer learning 8 要素) | Discord / Podcast / 国内資料 (低使用情報源) | Discord 4% + 国内資料 4% + 音声メモ (公開許諾後) |

### 4.5 Phase 1 ブロッカー 5 件の解消状況

| # | v1 (未明示) | v2 状況 | v3 状況 |
|---|---|---|---|
| 1 | — | ✅ 解消済 (v10.3) | ✅ 解消済 |
| 2 | — | ✅ 解消済 (v10.3 Schema) | ✅ 解消済 + v1.3 §2.4 再強化 |
| 3 | — | ✅ 解消済 (cs:p2-aeba) | ✅ 解消済 |
| 4 | — | ⚠️ HUMAN_TASKS H-1 残 | ⚠️ HUMAN_TASKS H-1 残 |
| 5 | — | ✅ 解消済 (v10.3 §4.7) | ✅ 解消済 + v1.3 §2.2 軸 1/2 分離 |

### 4.6 士業の位置づけの進化 (cs:s3-65 cascade update 対象)

| 概念 | v1 | v2 | v3 |
|---|---|---|---|
| 主軸 target | 中小経営者・士業 (テーマとして含む) | 中小事業者・士業・コンサル | **中小事業者・コンサル** (士業除外) |
| industry_sop 軸 | (未明示) | 業種別 SOP (経理/請求書/民泊清掃) | 業種別 SOP (経理/請求書/見積/民泊清掃/**士業**) |
| Q2/B5 query | (なし) | Q2: 士業 4 語 / 業務代行業混合 (v1.2 patch) | B5: 士業 5 語 (industry_sop 1 セグメント) |
| マトリクス内表記 | 士業 × AI = 1 行 (× 0 表示) | 同左 | **士業 × AI (industry_sop 1 セグメント)** = 1 行 |
| Tier 1 表記 | 士業 × AI (非エンジニア翻訳) | 業種別 SOP (経理/請求書/民泊清掃/士業も対象事例) | 業種別 SOP + 士業 (1 業種セグメント、競合 ≤ 2 アカ) |

---

## 5. 統合プロセスメモ

### 5.1 観察された進化パターン

- **v1 → v2**: 母集団を量から target_fit 質に切替。10 アカ深掘りで得た F-1〜F-12 finding は v2 で 9 項目 Sonnet 4.6 分析に再現される (具体的な数値は変わったが構造的観察は維持)。F-5 「非エンジニア言及率」の低さ、F-6 「失敗談率」の空白は v2 / v3 でも Tier 1 として再確認された。
- **v2 → v3**: Codex round 1 オールクリア反映。最大の構造変更は (a) query を 2 系統 10 本に分離 (publisher discovery と audience validation) (b) 士業を主軸 → industry_sop の 1 業種セグメントに格下げ (cs:s3-65 cascade update を全成果物に適用) (c) failure_story の比率 KPI → 上限 KPI 切替。

### 5.2 母集団絞り込み事故と対策

v2 で除外された 6 アカ (umiyuki_ai / kosuke_agos / minorun365 / icoxfog417 / ai_jitan / milbon_) のうち、**milbon_ は v1 §2.3 評価軸合計で最高評価 20 点だった**。v2 では target_fit_score 計算で bio / 業務仕組み化 / 一次体験という別軸が加味されたため除外。これは v1 / v2 で評価軸自体が変わった結果であり、矛盾ではないが履歴上注意が必要。

### 5.3 数値定義 cross-document 整合性 (cs:s1-66 適用)

| 概念 | v1 | v2 | v3 | Style Guide v1.4 (cross-ref) |
|---|---|---|---|---|
| paraphrase_rate (ofmeton 採用) | (M-1 で「翻案 4 (40%)」) | 20% | 20% | 20% |
| original_rate / first_hand (ofmeton 採用) | (M-1 で「実体験 4 (40%)」) | 40% | 40% | 40% |
| citation_explicit_rate | (未明示) | 60%+ | **65%+** | ≥ 65% |
| publishing_lag (opinion) | (未明示) | 24-48h | 24-48h | 24-48h |
| failure_story KPI 型 | F-6 で `fail_rate ≥ 15%` | 第 1 軸として強調 (比率なし) | **上限 ≤ 4/月 (verified)** | ≤ 4/月 (verified、上限 KPI) |

→ v3 / Style Guide v1.4 で完全一致。v1 / v2 の citation 表記は 60%+ / 65%+ で 5pt 差があるが、v3 で 65%+ に統一済。

### 5.4 Phase 1 着手時の Single Source

- **Competitor Report**: 本統合版 (= [`competitor-report-all-versions.md`](./competitor-report-all-versions.md)) を Single Source。原版 v3 の確定値を保持
- **Style Guide**: [`style-guide-all-versions.md`](./style-guide-all-versions.md) (原 v1.4 が Current SSOT、原 `STYLE-GUIDE-CURRENT.md` symbolic link を集約)
- **Query Design**: [`query-design-all-versions.md`](./query-design-all-versions.md) (原 v2 が Current SSOT、Phase 0 v3 publisher 5 + audience 5 = 10 query)
