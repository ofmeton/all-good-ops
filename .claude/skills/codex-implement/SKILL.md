---
name: codex-implement
description: まとまった機能の実装・テストに加え、バグ修正・デバッグループ・大規模コードベース調査/探索・ローカルデータ分析/集計を Codex(gpt-5.6-terra・定額サブスク) に委任し、Claude は設計(architect)と最終レビュー(一次は Codex セルフレビュー)を握る半委任フロー。Claude サブスク枠のトークンを節約しつつ品質を保つ。ユーザーが「実装して」「この機能を作って」「このバグ直して」「Codex に実装させて」「このコードベース調べて」「この集計やって」等を依頼した時に起動する。軽量タスク・1行修正・Web リサーチ・ブラウザ操作・外部 MCP(freee/Asana/Gmail/Calendar)・発信の文章執筆/繊細な連絡は対象外（Codex の盲点 or Claude 中核価値）。
---

# codex-implement — Codex を実装エンジンに据える半委任フロー

Fable セッション（skill `fable-architect`）からの実装委譲先としても使われる。

## なぜ
実装・テスト・デバッグループは最もトークンを食う。これを **Codex(gpt-5.6-terra max)** に逃がすと、Codex は ChatGPT/Codex の**定額サブスク枠**（Claude サブスク／API 課金の外）で動くため、Claude 側のトークンが激減する。Claude は「ブループリント＋Codex サマリ＋diff」だけ摂取してレビューすればよく、設計とレビューという判断を握るので品質は落ちない。

→ Codex は定額なので `external-api-cost-disclosure`（従量 API のコスト開示）の**対象外**。コスト提示は不要。

## いつ使う / 使わない
**迷ったら Codex に委譲（積極方針・2026-07-10）**: 複数ファイル・テスト付き・デバッグの気配があれば「標準未満」でも Codex へ。
- **使う**:
  - 標準以上（CLAUDE.md コスト分類の標準/熟議）の機能実装・サブシステム・複数ファイル改修。
  - **（A）バグ修正・デバッグループ**: バグ再現→修正→検証ループ（`superpowers:systematic-debugging` の調査・修正フェーズ）。最もトークンを食うので独立したバグ修正依頼も既定で Codex へ。Claude は再現条件の言語化と最終検証を握る。
  - **（C）大規模調査・コードベース探索**: 監査・横断 grep・ログ解析・large-context 精読など read-heavy な探索。Codex に worktree 内で走らせ、Claude は**結論サマリだけ受領**（生ファイルを context に積まない）。
  - **（D）ローカルデータ分析・集計・変換**: mf-finance 等の SQLite 分析クエリ・CSV/JSON 集計・大量ファイル変換スクリプト。ネット不要でリポジトリ内完結するものに限る。
- **使わない**:
  - 軽量（事実確認・計算・テンプレ・リマインド）は秘書直。単発の 1 行修正は通常実装で足りる。
  - **Codex の構造的盲点（ネット不可・ブラウザ不可・Claude 側 MCP 不可）**: Web リサーチ（WebSearch/firecrawl/deep-research）/ ブラウザ操作（chrome-devtools/Playwright・フォーム代行・X 投稿）/ 外部 MCP（freee/Asana/Gmail/Calendar/Supabase 書込）/ 発信の文章執筆・繊細な連絡文面・伴走（文体・配慮・判断＝Claude の中核価値）。これらは Claude 専管。

## フロー
1. **設計（Claude architect）**: `dev-automation/architect` で standards 準拠のブループリントを作る（ファイル一覧・データ契約・API 形・受け入れ基準・テスト要件・改善レバー）。最難関設計のみ Fable 5。← ここは省略しない（Codex の規約逸脱を防ぐ土台）。
2. **worktree 用意**: `scripts/wt-new.sh <topic>` で task ブランチ/worktree を切る（main 直 commit を hook で防ぐため必須）。
3. **実装委任（Codex）**: `mcp__codex__codex` を以下で呼ぶ。
   - `cwd` = 2 の worktree 絶対パス
   - `sandbox` = `workspace-write`
   - `approval-policy` = `never`（自律）
   - `model` = **`gpt-5.6-terra`** / effort = **`max`** を**毎回 config で明示**する（`config` に `model="gpt-5.6-terra"` + `model_reasoning_effort="max"`。`~/.codex/config.toml` の既定に依存しない）。medium/high への切り下げ判断は不要（2026-07-10 方針）。注意: max は reasoning 消費が大きい＝サブスク枠の減りが早い。枠切れ時は `## レート制限時の自動フォールバック` がそのまま受け皿。
   - `prompt` = ブループリント全文を埋め込む（Codex はリポジトリ規約を知らない。worktree root の `AGENTS.md` を自動で読むが、ブループリントにも要点を再掲する）
   - 完了後、Codex は**ビルダーサマリ**（追加/編集ファイル・契約差分・テスト結果・逸脱・人間ゲート該当）を返す。
   - **Codex がレート/使用量制限で落ちたら** → `## レート制限時の自動フォールバック`（Sonnet 4.6 へ自動切替）へ。
4. **レビュー（Codex 一次パス → Claude 最終判断）**: トークン節約のためレビューも二段にする。
   - **（B）一次レビュー = Codex**: `mcp__codex__codex-reply`（同 `threadId`）で「自分の diff を `code-reviewer` + `silent-failure-hunter` 観点で批判的にセルフレビューし、検出した問題と修正案を列挙せよ（自己弁護でなく粗探し）」と指示。別スレッド/別呼び出しで**第三者レビュー視点**を取らせてもよい（`feedback_codex_review_as_reviewer_option`＝別モデルの目）。Codex は明白なバグ・silent failure を自分で潰してから上げる。
   - **最終判断 = Claude（必須・省略不可）**: Codex 一次レビュー後の diff を Claude が確認。**重要案件・本番影響大・人間ゲート該当**は `pr-review-toolkit:*`（`code-reviewer` + `silent-failure-hunter`、案件で `type-design-analyzer`/`pr-test-analyzer`）を Claude サブエージェントで回す。軽微な改修は Claude メインループの diff 確認＋Codex 一次レビューで足りる（Opus サブagent の二重起動を避ける）。
   - feature-factory 文脈なら `dev-automation/spec-validator` で承認済み story/brief と照合（これは Claude が握る＝仕様の真実判定）。
   - 指摘は `mcp__codex__codex-reply`（`threadId` 指定）で同スレッドに差し戻し → 3〜4 を回す
5. **デプロイ（Claude 自走）**: レビュー通過後、commit→push→PR→auto-merge→deploy まで自走（`feedback_deploy_no_confirm`）。**人間承認・PR 承認は不要**。
6. **記録**: `data/usage-log.jsonl` に `implementer: "codex"` を含めて追記（Codex 分は定額枠＝Claude/API 月予算とは別管理）。

## レート制限時の自動フォールバック（Codex → Sonnet 4.6）
Codex が使えない時は**実装を止めず**、品質を落とさないフォールバック先 **Sonnet 4.6** に自動で切り替える。Haiku は使わない（実装には力不足＝品質要件を満たさない）。

**発火条件**: `mcp__codex__codex`（または `codex-reply`）が以下いずれかで失敗:
- レート/使用量制限系: `rate limit` / `usage limit` / `quota` / `429` / `too many requests` / Codex サブスク枠の上限到達メッセージ。
- 上記が曖昧でも「Codex 側起因で実装が前に進められない」と判断したら同様に切替。
（ネットワーク一時失敗・引数ミス等の**非レート起因**は 1 回だけ再試行 → それでも駄目なら切替。）

**切替手順**（メインループが自動実行）:
1. `system-engineer` を **`model: "sonnet"` を明示**して起動（`Agent({subagent_type: "system-engineer", model: "sonnet", ...})`）。既定はメインループ Opus 継承なので**必ず `model` を渡す**。
2. プロンプトには **architect ブループリント全文＋Codex が残した途中成果（diff/サマリがあれば）** を渡し、同じ worktree(`cwd`)・同じ受け入れ基準・テスト要件で続行。
3. **レビューゲート(4)は省略せず必須**（むしろフォールバック時こそ厳格に）。`code-reviewer` + `silent-failure-hunter`、feature-factory 文脈なら `spec-validator`。これで Sonnet 実装でも品質ラインを割らない。
4. デプロイ(5)・人間ゲート（後述）は通常どおり。
5. **記録**: `data/usage-log.jsonl` に `implementer: "sonnet-fallback"`、フォールバック理由（レート制限 等）を付けて追記。
6. **復帰**: フォールバックは当該タスク限り。次タスクは既定どおり Codex から始める（Codex 枠が回復している前提。連続で制限に当たるなら 1 行通知して Sonnet 継続を提案）。

> 「自動」の実体: ハーネスが裏でモデルを差し替えるのではなく、この skill 手順に従いメインループが Codex 失敗を検知→ `model:"sonnet"` の system-engineer 起動を**その場で行う**。ユーザー確認は不要（デプロイ自走と同じ `feedback_deploy_no_confirm` の範囲）。

## 人間ゲート（維持）
人間承認・PR 承認は不要だが、以下の**硬ゲート**は据え置き（Codex は実行せず Claude→人間にエスカレーション）:
- DB **migration の本番適用** / **外部送信**（メール・LINE・SNS・Slack）/ **金銭**（支払い・送金・請求送付）

## ガードレール
- Codex の commit は git pre-commit hook には掛かるが Claude の PreToolUse hook は通らない → **必ず worktree/task ブランチ内**で起動し、main 直 commit を `AGENTS.md` で禁止済み。
- テストはローカル Supabase 隔離（`.env.local` は本番を指す＝truncate 事故 / `project_stayclean_test_local_supabase`）。
- 並列案件は Codex も**別 worktree**（1 案件=1 worktree 維持）。詳細 `~/brain/2-atoms/agent-teams-playbook.md` の Codex-as-implementer レーン。
- **worktree commit hygiene**: worktree 内の commit は `git add -A` を避け `git add <対象パス>` で限定（worktree は node_modules を symlink で持ち `-A` が symlink を拾って混入する）。
- **worktree 切替後の再 Read**: 別 worktree で同一相対パスを読んでいても、切替後の最初の Edit は必ず Read 先行（既読状態は worktree 単位。`feedback_worktree_file_reread`）。
- **Codex sandbox はブラウザを起動できない**: Playwright/Chrome 駆動のテストコードを Codex に委任すると「実走できず盲目で書く」ため、exact className ハードコード等の脆い実装になりがち（実際 web-ui-bridge の操作プローブで3回 churn）。ブラウザ駆動テストを委任する時は ①**構造/部分一致セレクタ**で書くよう明示 ②**実走検証は Claude が行う前提**（Codex の「緑」を信じない）③環境依存で安定しないものは `skip:true`＋理由＋代替カバレッジを許容、を最初からブリーフに入れる。
- **Codex sandbox はネットワーク不可**: Next.js + `next/font`(Google Fonts) のアプリを委任すると `npm run build` が毎回 `Failed to fetch <Font> from Google Fonts` で失敗する（mf-finance で4回連続）。ブリーフに「**build はスキップして tsc/test のみ報告。`npm run build` はネットワーク要のため Claude がローカル検証する**。font/layout/package.json は触らない（next/font と `next build` は本番で正常）」を最初から入れ、Codex の build 失敗報告は環境要因として無視→Claude 側で build 緑を確認する。他にも外部 API/fetch を要する検証は同様に Claude 側へ回す。
