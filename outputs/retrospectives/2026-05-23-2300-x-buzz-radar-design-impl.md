# セッション振り返り — x-buzz-radar 設計 → 実装

**日時**: 2026-05-23 23:00 JST
**対象**: 海外 X バズツイート収集 + 3 媒体発信ネタ化システム (x-buzz-radar) の brainstorming → spec → plan → 一気通貫実装まで完走
**主成果**:
- spec v7 (`docs/superpowers/specs/2026-05-23-x-buzz-radar-design.md`、commit 8034dec)
- plan (`docs/superpowers/plans/2026-05-23-x-buzz-radar.md`、commit aacb88b)
- T1-T20 実装 (commit 83df5df、43 files / 7811 insertions、vitest 7 tests PASS / tsc exit 0)
- ai-radar 0008 migration 起草 (別 repo commit 96d1dfd、apply 保留)

## §0 raw 保存漏れチェック

- 検出: 0 件
- 振り返り Step 2 でユーザー発話走査 → 主要事実は raw/facts/situations/2026-05-23-x-buzz-radar-impl-complete.md に集約済を確認

## §1 良かった点

- **ユーザー指摘への即応 (v1 → v2 転換)**: 「定点観測効率悪い」指摘に対し、同一ターン内で X API ファクトチェック → twitterapi.io 発見 → 検索ベース v2 への転換まで完了
- **段階的ファクトチェックの徹底**: X API 料金 / min_faves operator 公式不在 / twitterapi.io SLA 99.99% / Instagram Graph API 仕様 / note 公式 API 不在 を都度 WebSearch + WebFetch で確定
- **設計 versioning (v1→v7)**: 意思決定の系譜を spec 内に保存。後から「なぜこの選択にしたか」が辿れる構造
- **destructive 操作の安全策**: ai-radar X crawler 削除を「migration 起草 + 別ブランチ + apply 保留」に分割、dogfooding 完了を待つ T11a/b/c に分割
- **並列実装**: bg npm install + 多重 Write でファイル作成の待ち時間を最小化、vitest 7 tests + tsc 0 で動作確認

## §2 詰まった瞬間・二度手間

| # | 事象 | 原因 | 先回りできたポイント | 本来すべき動き |
|---|---|---|---|---|
| 1 | v1 設計で「24 アカ定点観測」を採用 → ユーザーから「効率悪い」と却下 | 既存 ai-radar §4.6 に引きずられ「アカウント観測」前提で思考 | ユーザーが「効率よく」「完璧」と最上級評価を明示した時点で複数戦略を比較表で先出しすべき | 「アカウント観測 vs テーマ検索 vs グラフ巻き込み」の比較を Section 2 で最初から提示 |
| 2 | Instagram / note self-watch の実装可能性確認が v7 まで遅延 | v1-v6 で X self-watch のみ設計、他媒体は後回し | CLAUDE.md KGI に「3 媒体運用」明記なのだから最初から 3 媒体で設計すべき | media-specific 機能は最初の媒体だけで設計せず、3 媒体並列確認 |
| 3 | ai-radar 残実装の確認をユーザー指摘まで放置 | spec v6 では T11「ai-radar 旧 X 取得部 削除」とだけ書き、具体作業を詳細化していなかった | 「既存リポジトリの物理置換」を伴う設計は最初に既存実装の同種機能を確認するフェーズを入れる | brainstorming Step 1 に「物理置換対象の既存実装スキャン」を加える |
| 4 | バズ判定アルゴ設計を v3 まで「複合スコア」と仮定 | バズ判定をローカル処理する前提で考えた。API 機能の有無を先に整理していなかった | 取得経路の API capability を Section 2 で確定してから判定設計に入るべき | API capability を先に確定 → 後段の処理に何が残るかを逆算 |

## §3 自動化・効率化の余地

- **取得戦略の選択肢表**: 「アカウント観測 vs テーマ検索 vs グラフ巻き込み vs Trending API」を brainstorming スキルの「データ収集系設計」テンプレに組込み候補
- **既存リポ物理置換チェック**: writing-plans スキルに「物理置換対象の既存実装スキャン」を Step 0 として組込み候補
- **3 媒体並列設計テンプレ**: ofmeton の 3 媒体運用 (X/IG/note) は KGI 直結。media-specific 機能の設計テンプレに「3 媒体並列確認」を default 化

## §4 次回への改善提案

- ユーザーが「効率よく」「完璧」「最適」と最上級評価語を使った設計依頼を出したら、**最初の設計案を出す前に必ず複数戦略の比較表を提示**する
- ofmeton 関連の媒体設計タスクでは、**X / Instagram / note の 3 媒体それぞれの API / 実装可能性を spec 作成時に並列確認**する
- 既存リポ (ai-radar 等) の物理置換を伴う設計を起こす時は、**spec 起草前に既存実装ファイルを ls + grep して「削除対象」を Section 2 で先に固定**する
- API 経由のデータ取得設計時は、**API capability (operator/filter/quota) を先に確定 → 後段ローカル処理を逆算**する

## §5 反映済 (本振り返り時点)

### SAFE 全反映

| feedback memory | 内容 |
|---|---|
| feedback_top_eval_word_strategy_compare | 最上級評価語 → 戦略比較を最初に |
| feedback_3_media_parallel_design | ofmeton 媒体設計は 3 媒体並列 |
| feedback_existing_repo_replacement_scan | 既存リポ物理置換は削除対象を先に固定 |
| feedback_api_capability_first | API capability を先に確定して後段逆算 |

`data/improvement-log.jsonl` に 4 行 append 済（safe-applied）。

### RISKY (スキル化候補) → 見送り

新規スキル化レベルの反復は今回なし。既存 brainstorming / writing-plans スキルの内側でカバーされるべき改善は memory feedback で十分。

## §6 セッション総括成果物 (参考)

### all-good-ops 側 commit (task/260523-x-buzz-radar、未 push)
- 59f66da: spec v6 + raw 素材
- 8034dec: spec v7 (3 媒体対応)
- aacb88b: implementation plan (T1-T22)
- 83df5df: T1-T20 実装 (43 files / 7811 insertions)
- 67e5a13: raw fact 記録

### ai-radar 側 commit (task/260523-prepare-x-removal、未 push)
- 96d1dfd: migration 0008 起草 (apply 保留)

### 残人間タスク (H1-H8)
1. Supabase 新規 project 作成 + migration apply
2. twitterapi.io アカウント + API key 取得
3. Instagram Business 化 + FB 連携 + long-lived token
4. LINE Notify token
5. .env.local + Vercel env に各キー
6. Vercel deploy + 動作確認
7. dogfooding 1-2 週間
8. ai-radar 0008 apply + crawler 物理削除
