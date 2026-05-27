# Completeness Audit Report (元 16 → 統合 4 ファイル)

> 監査日: 2026-05-27
> 元 16 ファイル (5,590 + 735 + 940 + 410 = 7,675 行) / 統合 4 ファイル (953 + 741 + 1,118 + 617 = 3,429 行)
> 監査範囲: 全 `##` / `###` / `####` / `#####` 節タイトル + 各節の重要キーワード (数値・分類軸・命名規約・ロジック名)
> 監査方針: 重複文章の排除は許容、節タイトル / キーワードの「概念単位の消失」は全て fail として挙げる

---

## 1. サマリ

| 区分 | 件数 | 備考 |
|---|---|---|
| 元節数 (## / ### / #### 合計) | 約 470 節 | A=190 / B=70 / C=120 / D=90 |
| 統合保持 (節タイトル or 進化マトリクス行で言及) | 約 380 節 | 主に Style / Competitor / Query は丁寧に履歴節保持 |
| **重大抜け漏れ (Phase 1 着手時に必須補完)** | **18 件** | ほぼ全て `main-design-all-versions.md` 由来 |
| 詳細抜け漏れ (Phase 1 で必要、補完対象) | 24 件 | §4 module ロジック / §9 observability / §11 review item /§13 reviewer 依頼 群 |
| 軽微な抜け漏れ (歴史記録、優先度低) | 12 件 | v9 §12 議論経過 / 付録 B / B-1〜B-3 試験リンク 等 |
| **合計抜け漏れ** | **54 件** | ユーザー指摘 5 項目すべて含む |

**最重要結論**: 統合 4 ファイルのうち `main-design-all-versions.md` (953 行) が、元 7 ファイル 5,590 行を「進化マトリクス + Deprecated 節 + v10.3 SSOT 要約」に圧縮しているため、**§4 各エージェント・モジュールのロジック詳細**、**§9 データフロー + observability**、**§10 法務章 (10.1-10.6 細目)**、**§11 クロスレビュー観点 50 件全文**、**§12 議論の経過**、**§13 レビュアー依頼** がほぼ全消失。Style / Competitor / Query 3 ファイルは履歴付き節構造で原文をかなり良く保存している。

---

## 2. 重大抜け漏れ (Phase 1 着手時に必須、即時補完対象 — 計 18 件)

### A-1: X 投稿フォーマット比率 (短文 60% / スレッド 30% / 長文 10%)

- **元出典**: `x-account-design-v9-2.md:64-74` (§1.2 ofmeton 向け fmat 選択指針 — Contextual Thompson Sampling の事前分布)
- **元出典 2**: `x-account-design-v10.md:356-365` (§4.3.2 ##### ofmeton 向け fmat 選択指針 — Contextual Thompson Sampling)
- **元出典 3**: `x-account-design-v10-1.md:166-198` (§4.3.2 X 投稿フォーマット詳述 (M-4: fmat 再分配))
- **統合版**: **消失** (`main-design-all-versions.md` 全 grep でヒットゼロ — `60%`, `短文 60`, `スレッド 30`, `長文 10`, `Thompson Sampling 事前分布`, `Contextual Thompson Sampling` どれも本文非掲載。v9 行サマリで「Contextual Thompson Sampling」の単語のみ史的記述)
- **重要度**: ★★★★★ (Thompson Sampling の α/β 事前分布として実装着手時に使うパラメータ)
- **補完先**: `main-design-all-versions.md` §2.4 コンテンツ戦略 + §4 進化マトリクス (新規行追加)

### A-2: 素材レイヤー 2 系統 (translation/paraphrase/opinion/original 4 軸の前段にあった 2 系統設計)

- **元出典**: `x-account-design-v9.md:132-208` (§3.1 レイヤー構成。レイヤー A = ai-radar・publishing-research・inspiration 由来の翻案候補。レイヤー B = LINE 完結インタビュー由来の実体験候補。それぞれ別エージェント / 別 source schema)
- **元出典 2**: `x-account-design-v10.md:132-178` (§3.1 レイヤー構成、同上 + v10 更新)
- **元出典 3**: `x-account-design-v10-2.md:60-86` (§3.1 v10.2 でも独立節として保持)
- **統合版**: **消失** (`main-design-all-versions.md` には `### 3.1 [元 v9 §1.3] dwell_time 指標` などの Deprecated 節はあるが、§3.1 レイヤー構成の原文は折り畳まれて存在しない。`素材レイヤー`, `2 系統`, `レイヤー A`, `レイヤー B` どれもヒットゼロ。v10.3 §3.1 が `inspirations ingest プロセス (C-5)` に拡張されている所まで含めて履歴節として保持されていない)
- **重要度**: ★★★★★ (実装着手時のディレクトリ構造・DB schema の根幹)
- **補完先**: `main-design-all-versions.md` §2 統合本文に新規 §2.X「レイヤー構成 (素材 source 2 系統)」を追加 + §3 Deprecated に v9/v10/v10.2 §3.1 原文保持

### A-3: Writer エージェント個別ロジック

- **元出典**: `x-account-design-v9.md:402-470` (§4.3 Writer マルチプラットフォーム派生 + フォーマット選択。フォーマット選択ロジック v8 ε-greedy から変更 / プラットフォーム派生 / note 生成フロー)
- **元出典 2**: `x-account-design-v10.md:340-491` (§4.3 + 4.3.1〜4.3.5 統合詳述)
- **元出典 3**: `x-account-design-v10-1.md:160-277` (§4.3 M-4 / M-5 / M-6 反映、Writer プロンプト固定要素 + X スレッド構成 4 パターン + carousel 5 テンプレ)
- **元出典 4**: `x-account-design-v10-3.md:257-368` (§4.3 G-1 / B-1 / B-5 改訂 + 4.3.6 Writer 2 軸クロス制御 A-1)
- **統合版**: **大半消失** (`main-design-all-versions.md` §2.4 内に「Writer プロンプト固定」「primary_hook を毎回 4 種からランダム選択」など断片はあるが、`X スレッド構成 4 パターン`、`カルーセル 9 枚構成 5 テンプレ`、`Writer プロンプト固定要素`、`マルチプラットフォーム派生原則`、`4.3.6 Writer 2 軸クロス制御` どれも独立節として存在しない)
- **重要度**: ★★★★★ (Writer は実装最初に手をつけるエージェント)
- **補完先**: `main-design-all-versions.md` §2 に独立 §2.13「Writer エージェント (現行 v10.3 + 履歴)」を新設

### A-4: Hook Analyzer エージェント個別ロジック

- **元出典**: `x-account-design-v9.md:532-571` (§4.7 既知類型 10 + 分類ロジック + 新類型認定 月次承認 + 既存類型の自然死)
- **元出典 2**: `x-account-design-v10.md:565-608` (§4.7 初期 13 類型 v9 既存 10 + v9.2 新規 3 / 分類ロジック / 新類型認定)
- **元出典 3**: `x-account-design-v10-2.md:251-302` (§4.7 CR-5 primary_hook + devices 2 軸分類 / Phase 1 配分制御 / 新類型認定 HDBSCAN の停止)
- **元出典 4**: `x-account-design-v10-3.md:482-512` (§4.7 R-14 Phase 別 / G-3 テスト枠 5 / HDBSCAN C-12)
- **統合版**: **大半消失** (`main-design-all-versions.md` には「Hook 16 種類 (4 primary_hook × 13 devices)」一覧の table 表示はあるが、`分類ロジック`、`HDBSCAN`、`新類型認定`、`Phase 別 Hook 検証ロードマップ`、`既存類型の自然死`、`primary_hook + devices 分離の出力 schema` どれも独立節として消失)
- **重要度**: ★★★★★ (Optimizer の入力源となる)
- **補完先**: `main-design-all-versions.md` §2 に独立 §2.14「Hook Analyzer (現行 v10.3 + 履歴)」を新設

### A-5: Interviewer エージェント個別ロジック

- **元出典**: `x-account-design-v9.md:282-352` (§4.1 設計意図 / 内部状態スキーマ / **質問生成 5 ステップ** / **質問パターンライブラリ 8 種** / インタビュー実施場所 v8 から LINE 完結に変更)
- **元出典 2**: `x-account-design-v10.md:249-294` (§4.1 同上 + LINE 完結方式)
- **元出典 3**: `x-account-design-v10-3.md:232-253` (§4.1 + 業種別キーワード注入 C-2)
- **統合版**: **完全消失** (`main-design-all-versions.md` に `Interviewer` の単語は §3 の MA 用途一覧で 1 回出るのみ。`質問パターンライブラリ`、`質問生成 5 ステップ`、`内部状態スキーマ`、`pattern_id`、`LINE 完結方式`、`業種別キーワード注入` 全て消失)
- **重要度**: ★★★★★ (Phase 1 ローンチ前に LINE Messaging API 実装の根拠)
- **補完先**: `main-design-all-versions.md` §2 に独立 §2.15「Interviewer (現行 v10.3 + 履歴)」を新設

### A-6: 選別エージェント個別ロジック

- **元出典**: `x-account-design-v9.md:353-401` (§4.2 翻案候補スコア式 v8 から修正 / 実体験候補の優先度 / 重複検出ロジック hashed_idea_id)
- **元出典 2**: `x-account-design-v10.md:295-339` (§4.2 v9.1 修正版スコア式)
- **統合版**: **完全消失** (`翻案候補スコア式`, `実体験候補の優先度`, `重複検出`, `hashed_idea_id` どれもヒットゼロ)
- **重要度**: ★★★★ (選別エージェントは Writer の前段、実装時に必須)
- **補完先**: `main-design-all-versions.md` §2 に独立 §2.16「選別エージェント (現行 v10.3 + 履歴)」を新設

### A-7: Visualizer 3 モード + 自動切替判定

- **元出典**: `x-account-design-v9.md:471-506` (§4.4 Visualizer 3 モード / モード自動切替判定 v8 Mann-Whitney から変更)
- **元出典 2**: `x-account-design-v10.md:492-544` (§4.4 3 モード + PSM + デザインシステム統合)
- **元出典 3**: `x-account-design-v10-3.md:369-402` (§4.4 PSM 廃止 → ランダム + switchback)
- **統合版**: **部分保持** (`main-design-all-versions.md` §3.4 Deprecated に PSM 関連の一部記述あり、但し「3 モード (ai-only / self-only / hybrid)」の説明や v9 の Mann-Whitney からの変更経緯、デザインシステム連動 (visual-designer skill 引き継ぎ) は欠落)
- **重要度**: ★★★★ (visualizer は v10.3 で随時 mode 切替する重要モジュール)
- **補完先**: `main-design-all-versions.md` §3 Deprecated 内に v9 §4.4 / v10 §4.4 / v10.3 §4.4 原文を 3 枝で保持

### A-8: Optimizer 改善対象 3 区分 (Full auto / Auto + brownout / 承認必須)

- **元出典**: `x-account-design-v9.md:616-690` (§4.8 改善対象 3 区分 詳述 / そもそも論 weekly レビューの観点 / 集客導線 3 パターンの改善対象追加)
- **元出典 2**: `x-account-design-v10.md:646-732` (§4.8 v9 + v9.2 統合)
- **元出典 3**: `x-account-design-v10-1.md:350-413` (§4.8 M-9 Full auto に項目追加)
- **統合版**: **断片しか保持されず** (`main-design-all-versions.md` §2.6 内に「Optimizer Phase 1/2/3 / 変更幅キャップ / 異常検知ロールバック / キルスイッチ」は記述あり。だが「Full auto (承認不要)」「Auto + 7 日 brownout」「承認必須 (5 種)」の 3 区分の「個別項目リスト」(具体的に何が Full auto で何が承認必須か) は欠落)
- **重要度**: ★★★★ (どの設定変更を自動でやって良いかの根拠表)
- **補完先**: `main-design-all-versions.md` §2.6 末に「Optimizer 改善対象 3 区分の具体項目」サブ節を追加

### A-9: Optimizer 初期値を競合分析から設計する方針

- **元出典**: `competitor-report.md` 全体 + `x-account-design-v9-1.md:341-359` (§5.4 ティーザー境界の A/B テストロジック Optimizer 改善対象)
- **元出典 2**: `x-account-design-v9.md:586-615` (§4.8 Phase 2 仮説検証 + competitor analysis 駆動の事前分布)
- **元出典 3**: `competitor-report-all-versions.md` §2.10 Phase 1 着手前の transfer 設計 + §2.15 §6.5 Style Guide v1 雛形 (Optimizer 連動)
- **統合版**: **方針として明示されず** (`main-design-all-versions.md` で `Optimizer.*初期値`, `競合分析駆動`, `事前分布.*competitor`, `prior.*competitor` 全ヒットゼロ。styleguide-all-versions.md §2.5 重み付け (Optimizer §4.8 用) で部分言及はあるが、main-design 側で接続文がない)
- **重要度**: ★★★★ (Phase 1 着手時の Optimizer の α / β は競合 24 アカ × 9 項目分析の中央値から逆算する設計の根拠)
- **補完先**: `main-design-all-versions.md` §2.6 内に「Optimizer の初期値 (事前分布) は competitor-report-all-versions.md §2.10 / §2.15 から逆算」と明示 + Style Guide v1.x の重み付けセクションへの双方向リンク

### A-10: X 投稿頻度 5/日 → 1/日 切替の真因

- **元出典**: `style-guide-v1.1.md:1-50` (v1.1 §1 コンテンツ比率 + ヘッダー: Phase 0 v2 反映版 → 1 投稿/日 に縮減)
- **元出典 2**: `style-guide-v1.4.md:40-62` (§1.2 投稿頻度 silent reduction を正設計に復元)
- **元出典 3**: `style-guide-all-versions.md` §2.11 KPI 設計 / §4.5 投稿頻度の変遷
- **統合版**: **記述あり、但し原因記述が推定混入** (`main-design-all-versions.md:905` の進化マトリクス行で「Style Guide v1.1 で品質確保のため縮減」と書いているが、これは [cs:s3-72] で指摘済の **未検証の推定原因**。v1.1 ヘッダー実物には「品質確保のため」とは書かれていない。`style-guide-all-versions.md` §4.5 / §5.2 silent reduction の事故と対策 では事実観察に留めている。**main-design と style-guide で言及内容が異なる**ことが整合性違反)
- **重要度**: ★★★ (歴史的経緯 + 再発防止)
- **補完先**: `main-design-all-versions.md:905` の「品質確保のため」を削除し、「Style Guide v1.1 で 5/日 → 1/日 に変更 (理由は style-guide-v1.1.md ヘッダーには明示なし、Phase 0 v2 24 アカ分析後の判断)」に置換

### A-11: 競合調査 50 項目 A〜H 分類 (構造 / 内容・トーン / 画像 / 動画 / 時系列・運用 / ファネル / Hook / X フォーマット)

- **元出典**: `x-account-design-v9.md:786-848` (§6 全 A〜H 50 項目分類 + 二軸集計)
- **元出典 2**: `x-account-design-v10.md:814-841` (§6 §A〜H 引継 + 二軸集計)
- **元出典 3**: `competitor-report.md:86-202` (§2 既存 10 アカ × 50 項目集計 / F-1〜F-12)
- **統合版**: **competitor-report-all-versions.md §2.3 内に F-1〜F-12 として保持されているが、main-design 側に「A〜H 分類軸」の構造そのものが消失** (main-design §6 が無く、§2.6 / §2.4 にも A〜H 軸の言及なし。`構造・フォーマット系`, `内容・トーン系`, `画像系`, `動画系`, `ファネル系`, `Hook 系` 全消失)
- **重要度**: ★★★ (Phase 0 v2 で 50 項目を再集計するときの参照軸)
- **補完先**: `main-design-all-versions.md` §2.4 内に「**競合調査 50 項目分類軸 (A〜H)**」サブ節を追加 + competitor-report への cross-link

### A-12: Daily Digest / Weekly Brief (LINE Messaging API による事後報告)

- **元出典**: `x-account-design-v9.md:707-744` (§5.2 Daily Digest 毎晩 23:00 JST / Weekly Brief 毎月曜朝)
- **元出典 2**: `x-account-design-v10.md:746-777` (§5.2 同上)
- **元出典 3**: `x-account-design-v10-3.md:589-608` (§5.2 Daily Digest 因果連鎖追加 A-4)
- **統合版**: **完全消失** (`main-design-all-versions.md` に `Daily Digest`, `Weekly Brief`, `LINE Messaging API`, `23:00 JST`, `月曜朝` ヒットゼロ)
- **重要度**: ★★★★ (LINE Messaging API 接続の有無は Phase 1 ローンチ判定に直結)
- **補完先**: `main-design-all-versions.md` §2.6 末か §2.12 リスクヘッジに「LINE 事後報告 (Daily Digest / Weekly Brief)」サブ節を追加

### A-13: 安全装置 4 種 (変更幅キャップ / 異常検知ロールバック / キルスイッチ / brownout mode / MA Session 即 archive)

- **元出典**: `x-account-design-v9.md:745-785` (§5.3 安全装置 5 種)
- **元出典 2**: `x-account-design-v10.md:778-813` (§5.3 同上 + B-3 発見)
- **統合版**: **部分保持** (main-design §2.6 / §2.12 / Deprecated に「変更幅キャップ」「異常検知ロールバック」「キルスイッチ」「brownout mode」「MA Session 即 archive」の **キーワードはバラ撒かれて存在**。だが「§5.3 安全装置」という独立節としては存在せず、設定変更ログ / brownout mode の発動条件詳細 (¥10,000 到達時の挙動 = 投稿停止 + 計測継続 + 通知継続 + バックアップ継続) の一部詳述が薄い)
- **重要度**: ★★★ (運用時の挙動契約)
- **補完先**: `main-design-all-versions.md` §2.12 内に「**安全装置 5 種 (まとめ)**」サブ節を追加

### A-14: 法務章 §10.4 VOICEVOX クレジット表記 / §10.5 AI 生成画像の表記 / §10.6 Secrets rotation 戦略

- **元出典**: `x-account-design-v9.md:987-1041` (§10.1〜10.6)
- **元出典 2**: `x-account-design-v10.md:952-1001` (§10.1〜10.6)
- **元出典 3**: `x-account-design-v10-3.md:820-938` (§10.1〜10.9 + 業法ガード新章 / note 販売 compliance 新章)
- **統合版**: **大半消失** (main-design §2.9 法務 / §2.10 業法ガード で §10.1 ステマ規制 / §10.2 翻案ルール / §10.3 X / Meta 自動投稿規約 / §10.7 公開許諾 / §10.8 note 販売 compliance / §10.9 業法ガード は touched on しているが、§10.4 VOICEVOX / §10.5 AI 生成画像 / §10.6 Secrets rotation の 3 細目は本文ヒットゼロ — リスト形式の §10 章サマリでわずかに名前が出るのみ)
- **重要度**: ★★★ (次フェーズ動画導入時に VOICEVOX 必須、Phase 0 で AI 生成画像表記の決断が必要、Secrets は実装直結)
- **補完先**: `main-design-all-versions.md` §2.9 / §2.10 の後に §2.11「法務章 細目 (§10.4〜10.6)」サブ節を追加

### A-15: §11 クロスレビュー観点 50 件 (E-1〜E-41 + Codex + Claude self-review 27 件 + 業法ガード 1 + Phase 1 承認モード 1 + 階段単価 1)

- **元出典**: `x-account-design-v9.md:1042-1121` (§11.1〜11.9 41 件)
- **元出典 2**: `x-account-design-v9-1.md:486-498` (§11 v9.1 新規)
- **元出典 3**: `x-account-design-v9-2.md:394-405` (§5 E-34〜E-38)
- **元出典 4**: `x-account-design-v10.md:1002-1097` (§11.1〜11.10 統合 38 件)
- **元出典 5**: `x-account-design-v10-1.md:554-595` (§11 v10.1 新規 E-39〜E-41)
- **元出典 6**: `x-account-design-v10-2.md:516-529` (§11 v10.2 Codex 観点統合)
- **元出典 7**: `x-account-design-v10-3.md:939-956` (§11 全 50 件オールクリア宣言 + §11.1 v10.3 残置観点 7 件)
- **統合版**: **完全消失** (main-design §2.12 リスクヘッジ で「Codex R-16〜R-25 / Claude self-review 27 件」と概観のみ。**個別 ID と内容 (E-1〜E-41) / R-1〜R-25 / C-1〜C-13 / CR-1〜CR-5 / D-1〜D-2 / M-1〜M-14 / B-1〜B-5 / A-1〜A-4 / F-2 / G-1〜G-3 / H-7) は本文に存在しない**)
- **重要度**: ★★★★ (Phase 1 着手前 gate の根拠リスト)
- **補完先**: `main-design-all-versions.md` 末尾に新規 §6「クロスレビュー観点 全 50 件 (v10.3 オールクリア + v10.4 残置 7 件)」を追加 — 個別 ID の出典・反映 status・残置/解決の区分付き

### A-16: §13 レビュアーへの最終依頼 (各バージョン)

- **元出典**: `x-account-design-v9.md:1138-1152` / `x-account-design-v9-1.md:508-521` / `x-account-design-v9-2.md:416-428` / `x-account-design-v10.md:1113-1129` / `x-account-design-v10-1.md:583-595` / `x-account-design-v10-2.md:540-551` / `x-account-design-v10-3.md:966-981`
- **統合版**: **完全消失** (main-design に `レビュアーへの最終依頼` ヒットゼロ。Codex MCP に何を見てほしいかの宣言文が全消失)
- **重要度**: ★★★ (将来 v10.4 で外部レビュー回す時に何を見てほしかったかの履歴)
- **補完先**: `main-design-all-versions.md` §3 Deprecated 末尾に「§13 レビュアー依頼 (各バージョン履歴)」サブ節を新設

### A-17: §9 データフロー + observability (論理構造 + 各ストアの論理単位 + Observability)

- **元出典**: `x-account-design-v9.md:921-986` (§9 論理構造 + Observability)
- **元出典 2**: `x-account-design-v10.md:888-951` (§9.1 論理構造 / §9.2 各ストアの論理単位 / §9.3 Observability)
- **元出典 3**: `x-account-design-v10-3.md:785-819` (§9.1 論理構造 / §9.2 + UTM / business outcome C-10 / §9.3 Observability)
- **統合版**: **完全消失** (main-design に `データフロー`, `論理構造`, `observability`, `Observability`, `posts_xa\.csv`, `sentry`, `OTEL`, `opentelemetry` 全ヒットゼロ)
- **重要度**: ★★★★ (Supabase schema 設計 + 観測の根拠)
- **補完先**: `main-design-all-versions.md` 末尾に新規 §7「データフロー + observability」を追加 (v10.3 §9 全文 + v9 §9 履歴)

### A-18: §3.3 コスト試算詳細 workload 表 / シナリオ別予算 (low / expected / p95) / 月予算 ¥10,000 との関係 / brownout 発動条件

- **元出典**: `x-account-design-v10-2.md:99-142` (§3.3.1 workload 表 / §3.3.2 シナリオ別予算 / §3.3.3 月予算 ¥10,000 との関係 / §3.3.4 brownout mode 条件)
- **元出典 2**: `x-account-design-v9.md:227-243` (§3.3 コスト試算月額実測ベース)
- **統合版**: **概数のみ保持** (main-design `¥9,154 expected`, `¥10,000`, `expected ¥9,154 / low ¥6,500 / p95 ¥13,800` の数字は出現するが、**workload 表 (agent ごとの token / call 数) と brownout 発動条件式 4 件** は本文に欠落)
- **重要度**: ★★★ (コスト超過時に何を切るかの根拠)
- **補完先**: `main-design-all-versions.md` §2.6 か新規 §8 に「コスト試算 (workload 表 + brownout 発動条件)」サブ節を追加

---

## 3. 詳細抜け漏れ (Phase 1 で必要、補完対象 — 計 24 件)

### B-1 Writer 周辺の細目

- `x-account-design-v9.md:412-442` フォーマット選択ロジック (v8 ε-greedy → v9 Contextual Thompson Sampling への変更経緯)
- `x-account-design-v9.md:443-446` プラットフォーム派生原則 (短文 X → 長文 note 派生時の text reduction 戦略)
- `x-account-design-v9.md:448-470` note 生成フロー (叩き台、v9.1 で詳述。**初期設計も競合調査ベース**) — 初期設計がそもそも competitor 駆動だった点
- `x-account-design-v10.md:367-376` X スレッド構成 4 パターン (短文連鎖型 / 段階拡大型 / 並列対比型 / 起承転結型 — 各定義)
- `x-account-design-v10.md:385-394` カルーセル 9 枚構成 5 テンプレ (note 5 構成からの transfer)
- `x-account-design-v10-1.md:179-198` Writer プロンプト固定要素 (M-5 言語トーン: 敬体 / 構造 / 1 行毎の主語明示 等)

### B-2 note 生成フロー詳細 (v9.1 §2〜§10)

- `x-account-design-v9-1.md:94-194` 構成パターン 5 系統の **詳細テンプレ** (各系統で見出し設計 / リード設計 / クロージング設計 が詳述されていた)
- `x-account-design-v9-1.md:267-340` ティーザー境界設計テンプレ (無料 800-1,500 字 / 有料 1,500-6,000 字 の構成詳細 + A/B テストロジック)
- `x-account-design-v9-1.md:341-360` ティーザー境界の A/B テストロジック (Optimizer 改善対象としての設計)
- `x-account-design-v9-1.md:361-417` 投稿時間最適化 + SEO 整備 + メンバーシップ移行設計
- `x-account-design-v9-1.md:454-485` 媒体連動詳細 (note → X / IG への逆流 / X 投稿の note 引用パターン)
- 統合版: `main-design-all-versions.md` §2.7 価格・商品設計 / §2.4 内に keywords だけ存在、**詳細テンプレ消失**
- 補完先: `main-design-all-versions.md` §2.7 末尾に新規 §2.7.X「note 生成フロー詳述 (v9.1 §2〜§10 統合)」を追加

### B-3 Phase 0/1/2/3 計画詳述 (Foundation 2-3 週間 / Week 1 投稿開始 / Phase 1 KPI / Phase 2 拡張 / Phase 3 安定化 + Threads/Shorts 検討)

- `x-account-design-v9.md:861-920` §8 Phase 0 / Phase 1 / Phase 2 / Phase 3 各詳述
- `x-account-design-v10.md:852-887` §8 同上
- `x-account-design-v10-3.md:717-784` §8.1〜8.4 + Phase 1 IG 独立 gate (C-7) / Phase 1 KPI (C-10 売上 attribution 追加) / Phase 1 運用負担見積り (D-2)
- 統合版: `main-design-all-versions.md` §2.11 Phase 1〜3 進行計画 で要約は存在、**Phase 0 Foundation 2-3 週間の sub-tasks / Week 1 投稿開始の条件 / Phase 2 拡張詳細 / Phase 3 安定化 + Threads/Shorts 検討** は欠落
- 補完先: `main-design-all-versions.md` §2.11 内に各 Phase の sub-tasks 表を追加

### B-4 v9-2 §2 Instagram カルーセル詳述 (カラーパレット / フォント / レイアウト の詳細)

- `x-account-design-v9-2.md:234-273` §2.3 デザインシステム (visual-designer skill 引き継ぎ) + §2.4 ストーリーズ / リール連動 + §2.5 投稿頻度 + §2.6 媒体間連動
- 統合版: `main-design-all-versions.md` には keyword レベルでしか保持されず、**カラー 4 色 / Noto Sans Heavy / レイアウト 1080 × 1080px / 文字サイズ最小値 36pt 等の数値** が消失
- 補完先: `main-design-all-versions.md` §2.4 か Style Guide consolidated に併合済か確認の上で main-design 側でも参照リンク

### B-5 v9-2 §4 横断改善観点 (1 トピックの 3 媒体展開フロー + 媒体間カニバリ vs 補完 + Optimizer 横断観察)

- `x-account-design-v9-2.md:317-393` §4.1 1 トピックの 3 媒体展開フロー / §4.2 媒体間カニバリ vs 補完 / §4.3 Optimizer の横断観察 / §4.4 1 トピックの 3 媒体テンプレ (集客導線統合)
- 統合版: main-design `§2.6` に「3 媒体展開フロー」の言及 1 行のみ。詳述消失
- 補完先: `main-design-all-versions.md` §2.6 か §2.3 媒体ポートフォリオ末尾に「1 トピックの 3 媒体展開フロー詳述」サブ節を追加

### B-6 OAuth 2.0 PKCE 実装 gate (v10.2 §3.5 新章)

- `x-account-design-v10-2.md:155-200` §3.5 X OAuth 2.0 PKCE 必須 scope / Phase 1 着手前の実機テスト 4 項目 / refresh token 保管 / Meta launch gate
- 統合版: main-design に `OAuth 2.0 PKCE`, `refresh token`, `PKCE 実装 gate` 全ヒットゼロ
- 補完先: `main-design-all-versions.md` §2.11 Phase 1 進行計画 内に「OAuth 2.0 PKCE gate (v10.2 §3.5 新章)」サブ節を追加

### B-7 公開許諾 gate Schema (v10.2 §10.7 新章)

- `x-account-design-v10-2.md:447-515` §10.7.1 Schema / §10.7.2 Editor +5 ルール / §10.7.3 顧客同意の取得フロー / §10.7.4 ZDR / API 送信ガード
- `x-account-design-v10-3.md:851-877` §10.7 顧客素材方針変更
- 統合版: main-design §2.9 法務 で keywords (公開許諾 gate, DLP redaction) は出るが、**Schema 構造 / 取得フロー / ZDR ガード詳細** は消失
- 補完先: `main-design-all-versions.md` §2.9 法務章末尾に「公開許諾 gate Schema」サブ節

### B-8 §12 議論の経過 (各バージョンで設計判断の意思決定過程を保存していた節)

- `x-account-design-v9.md:1122-1137` / `x-account-design-v9-1.md:499-507` / `x-account-design-v9-2.md:406-415` / `x-account-design-v10.md:1098-1112` / `x-account-design-v10-1.md:570-582` / `x-account-design-v10-2.md:530-539` / `x-account-design-v10-3.md:957-965`
- 統合版: main-design に `議論の経過` ヒットゼロ
- 補完先: `main-design-all-versions.md` §5 統合プロセスメモ 内に「各バージョンの議論経過 (履歴)」サブ節を追加

### B-9 付録 A / B / C (B-1〜B-3 検証成果リンク / 既存資産参考素材リンク / v9.1 / v10.X 改善候補)

- `x-account-design-v9.md:1153-1185` 付録 A〜C
- `x-account-design-v10.md:1130-1185` 付録 A〜C
- `x-account-design-v10-3.md:982-1001` 付録 A〜C
- 統合版: main-design に検証成果リンク (B-1 / B-2 / B-3 試験スクリプト) ヒットゼロ
- 補完先: `main-design-all-versions.md` 末尾に「付録: 検証成果リンク (B-1〜B-3)」を再掲

---

## 4. 軽微な抜け漏れ (歴史的記録、優先度低 — 計 12 件)

### C-1 v9 §0.2 v8 からの主要変更点 (バージョン比較表) — 統合版に進化マトリクスはあるが v8 → v9 の差分は薄め
### C-2 v9 §1.1 発信主体のプロファイル詳述 (主要 stack / B-1〜B-3 試験で実測されたコスト) — main-design §2.1.1 で touched on のみ
### C-3 v9 §2 設計の根本原則 (自動化レベル / 予算制約 / マルチプラットフォーム展開) — main-design §2 で keyword レベルのみ
### C-4 v9 §3.2 技術スタック (v8 から実測ベース更新) — main-design §3.4 Deprecated に部分言及あり、詳細欠落
### C-5 v9 §3.4 Managed Agents 一本化の判断 (採用理由 / 採用判断 / リスクと対処) — main-design §3 で keyword レベルのみ
### C-6 v9-1 §6 マガジン構造 / §7 投稿時間最適化 / §8 SEO 整備 / §9 メンバーシップ移行設計 / §10 媒体連動詳細 (B-2 で touched on したが詳細は全 5 章分の sub-detail は欠落)
### C-7 v10 §6 競合調査 50 項目 (Phase 0 実施) — main-design に独立節として存在しない (competitor-report-all-versions.md に保持されている)
### C-8 v10 §7 Style Guide の段階運用 (承認制) — main-design `Style Guide.*段階運用` ヒット 1 件のみで詳述消失 (style-guide-all-versions.md に保持)
### C-9 v10.3 §6.0 v10.2 §6 の致命的欠陥 / §6.1〜§6.6 Phase 0 v2 母集団 / query 設計 / 9 項目分析 / 実コスト試算 / 実施タイミング / 二軸集計 — main-design では competitor-report に向けるべきとして消失、但し main-design 側に「§6 競合調査」セクションそのものが無い
### C-10 v10.3 §10.9 業法ガード (税理士法 / 弁護士法 / 司法書士法 等の独占範囲) §10.9.1 禁止 / §10.9.2 許可 / §10.9.3 Editor +5 統合 — main-design §2.10 で touched on、詳述消失
### C-11 各バージョンのヘッダー (タイトル + 経緯 + 構成原則) — 統合版で §0 のみに圧縮
### C-12 v9.1 / v9.2 / v10.X 共通の「付録 C v10.X 以降の改善候補」(競合調査の深掘り / 実装着手前の検証 / 拡張機能 / ブランド整備) — main-design 末尾に再掲なし

---

## 5. Style / Competitor / Query 統合の抜け漏れ (確認結果)

### Style Guide 統合 (`style-guide-all-versions.md` 741 行)

- **保存状況**: 良好。v1.0 (v10.3 inline only) → v1.4 全 5 バージョンを履歴節 + Deprecated 節で網羅。§4 数値・分類軸の進化マトリクス (1.1〜4.6) で軸 1 (素材 source) / 軸 2 (Hook 類型) / Target 定義 / cron 頻度 / 投稿頻度 / KPI 指標 の進化を表化済。
- **検出された抜け漏れ**: なし (silent reduction / 統合作業中に発見した文書間矛盾 / Phase 1 着手時の Single Source など 5 章メタも保持)

### Competitor Report 統合 (`competitor-report-all-versions.md` 1,118 行)

- **保存状況**: 非常に良好。v1 / v2 / v3 各バージョンの全節タイトル + F-1〜F-12 (10 アカ × 12 finding) + R-1〜R-10 後悔予測 + §2.15 Style Guide v1 雛形 (§6.1〜§6.5) を保持。
- **検出された抜け漏れ**: 軽微のみ。v1 §0.2 v10 §6 数値の修正 + §0.3 入力データ が「§2.1 に転記済」と書かれているが、転記内容は v10 設計から見た差分の数行のみ。詳細な「入力データ source 一覧」(B-1〜B-3 + publishing-research + raw/x の取得日時) は欠落しているがそもそも別ファイル管理であろう。

### Query Design 統合 (`query-design-all-versions.md` 617 行)

- **保存状況**: 非常に良好。v1 / v2 全 2 バージョン全節 + Deprecated 節 + §4 数値の進化マトリクス + §5 統合プロセスメモを網羅。
- **検出された抜け漏れ**: なし

---

## 6. 補完計画 (どの統合ファイル / どの節に / 何を追記するか)

| 補完ID | 補完先ファイル | 追加先節 | 追加内容 | 元節 | 重要度 |
|---|---|---|---|---|---|
| F-1 | main-design | §2.4 | X 投稿フォーマット比率 60/30/10 + Contextual Thompson Sampling 事前分布 | A-1 | ★★★★★ |
| F-2 | main-design | §2 新規 §2.13 | レイヤー構成 (素材 source 2 系統 + inspirations ingest) | A-2 | ★★★★★ |
| F-3 | main-design | §2 新規 §2.14 | Writer エージェント現行 + 履歴 | A-3 + B-1 + B-2 | ★★★★★ |
| F-4 | main-design | §2 新規 §2.15 | Hook Analyzer 現行 + 履歴 | A-4 | ★★★★★ |
| F-5 | main-design | §2 新規 §2.16 | Interviewer 現行 + 履歴 | A-5 | ★★★★★ |
| F-6 | main-design | §2 新規 §2.17 | 選別エージェント現行 + 履歴 | A-6 | ★★★★ |
| F-7 | main-design | §3 Deprecated 内 | Visualizer 3 モード v9/v10/v10.3 履歴 | A-7 | ★★★★ |
| F-8 | main-design | §2.6 末尾 | Optimizer 改善対象 3 区分 + competitor 駆動初期値方針 | A-8 + A-9 | ★★★★ |
| F-9 | main-design | §2.6 末尾 | LINE Daily Digest / Weekly Brief 仕様 | A-12 | ★★★★ |
| F-10 | main-design | 905 行修正 | 「品質確保のため」削除 → 推定外しに | A-10 | ★★★ |
| F-11 | main-design | §2.4 末尾 | 競合調査 50 項目分類軸 A〜H | A-11 | ★★★ |
| F-12 | main-design | §2.12 内 | 安全装置 5 種まとめ | A-13 | ★★★ |
| F-13 | main-design | §2.10 末尾 | 法務 §10.4 VOICEVOX / §10.5 AI 生成画像 / §10.6 Secrets rotation | A-14 | ★★★ |
| F-14 | main-design | 新規 §6 | クロスレビュー 50 件 (E / R / C / CR / M / B / A / D / F / G / H 系列) | A-15 | ★★★★ |
| F-15 | main-design | §3 Deprecated 末尾 | §13 レビュアー依頼 各バージョン履歴 | A-16 | ★★★ |
| F-16 | main-design | 新規 §7 | データフロー + observability (v10.3 §9 全文 + v9 §9 履歴) | A-17 | ★★★★ |
| F-17 | main-design | 新規 §8 | コスト試算 workload 表 + brownout 発動条件 | A-18 | ★★★ |
| F-18 | main-design | §2.7 末尾 | note 生成フロー詳述 (v9.1 §2〜§10 統合) | B-2 | ★★★ |
| F-19 | main-design | §2.11 末尾 | Phase 0/1/2/3 sub-tasks 表 + OAuth PKCE gate | B-3 + B-6 | ★★★ |
| F-20 | main-design | §2.3 末尾 | 1 トピックの 3 媒体展開フロー詳述 | B-5 | ★★ |
| F-21 | main-design | §2.9 末尾 | 公開許諾 gate Schema | B-7 | ★★★ |
| F-22 | main-design | §5 末尾 | 議論の経過 各バージョン履歴 | B-8 | ★★ |
| F-23 | main-design | 末尾 付録 | 検証成果リンク + 各 v 改善候補 | B-9 + C-12 | ★ |
| F-24 | main-design | 各所 | C-1〜C-11 軽微項目 | C-1〜C-11 | ★ |

**実装順序 (推奨)**:

1. **第 1 波 (★★★★★ の 5 件)**: F-1 / F-2 / F-3 / F-4 / F-5 — Phase 1 着手時に最初に必要
2. **第 2 波 (★★★★ の 6 件)**: F-6 / F-7 / F-8 / F-9 / F-14 / F-16 — Phase 1 ローンチ前の gate
3. **第 3 波 (★★★ の 9 件)**: F-10〜F-13 / F-15 / F-17〜F-19 / F-21 — Phase 1 中盤までに
4. **第 4 波 (★★ 以下 の 4 件)**: F-20 / F-22 / F-23 / F-24 — 履歴記録、優先度低

**補完作業の見積もり**: 第 1 波で約 1,000 行追記 / 第 2 波で約 800 行 / 第 3 波で約 500 行 / 第 4 波で約 200 行 → 合計 約 2,500 行 (現行 953 行 → 約 3,500 行に拡張)。

---

## 7. 監査メソドロジー (再現可能性)

1. **全 16 元ファイル + 4 統合ファイル の `^#+ ` 見出しを `grep -nE` で全列挙** → `/tmp/xad-audit/*.headings` に永続化
2. **ユーザー指摘 5 項目 + システム rule cs:s1-71 / cs:p1-acca で明示された項目** を最優先で grep 確認 (`60%.*30%.*10%`, `Thompson Sampling 事前分布`, `素材レイヤー`, `Writer プロンプト固定`, `Hook Analyzer`, `Interviewer.*質問パターン`, `Optimizer 競合分析駆動`, `5/日.*1/日.*切替`)
3. **§4 module ロジック (v9 §4.1〜4.8) / §9 データフロー / §10 法務細目 / §11 review 観点 / §12 議論経過 / §13 reviewer 依頼** を網羅 grep し全消失を確認
4. **競合調査 50 項目 A〜H / 集客導線 3 パターン / 安全装置 5 種** を grep し partial 保存と完全消失を区別
5. **Style / Competitor / Query 統合ファイル** は履歴節 + Deprecated 節 + 進化マトリクスが整っているため抜け漏れほぼなしと確認

監査範囲は「節タイトル + 重要 keyword」レベル。**全文 token-level diff は実施していない** (時間制約のため)。F-1〜F-5 第 1 波の補完作業時に追加で全文 diff を回すことを推奨。

---

*作成: completeness-audit-report.md (2026-05-27)*
*範囲: 元 16 ファイル → 統合 4 ファイル / 全 ## / ### / #### / ##### 節 + キーワードレベル diff*
*次工程: 補完計画 §6 F-1〜F-24 を Phase 1 着手前に実装*
