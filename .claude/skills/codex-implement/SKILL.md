---
name: codex-implement
description: まとまった機能の実装・テストを Codex(gpt-5.5 high・定額サブスク) に委任し、Claude は設計(architect)とレビュー(pr-review/spec-validator)を握る半委任フロー。Claude サブスク枠のトークンを節約しつつ品質を保つ。ユーザーが「実装して」「この機能を作って」「Codex に実装させて」等、標準以上の実装を依頼した時に起動する。軽量タスク・単発調査は対象外（秘書直 / 通常実装で足りる）。
---

# codex-implement — Codex を実装エンジンに据える半委任フロー

## なぜ
実装・テスト・デバッグループは最もトークンを食う。これを **Codex(gpt-5.5 high)** に逃がすと、Codex は ChatGPT/Codex の**定額サブスク枠**（Claude サブスク／API 課金の外）で動くため、Claude 側のトークンが激減する。Claude は「ブループリント＋Codex サマリ＋diff」だけ摂取してレビューすればよく、設計とレビューという判断を握るので品質は落ちない。

→ Codex は定額なので `external-api-cost-disclosure`（従量 API のコスト開示）の**対象外**。コスト提示は不要。

## いつ使う / 使わない
- **使う**: 標準以上（CLAUDE.md コスト分類の標準/熟議）の機能実装・サブシステム・複数ファイル改修。
- **使わない**: 軽量（事実確認・計算・テンプレ・リマインド）は秘書直。単発の調査・1 行修正は通常実装で足りる。

## フロー
1. **設計（Claude architect）**: `dev-automation/architect` で standards 準拠のブループリントを作る（ファイル一覧・データ契約・API 形・受け入れ基準・テスト要件・改善レバー）。最難関設計のみ Fable 5。← ここは省略しない（Codex の規約逸脱を防ぐ土台）。
2. **worktree 用意**: `scripts/wt-new.sh <topic>` で task ブランチ/worktree を切る（main 直 commit を hook で防ぐため必須）。
3. **実装委任（Codex）**: `mcp__codex__codex` を以下で呼ぶ。
   - `cwd` = 2 の worktree 絶対パス
   - `sandbox` = `workspace-write`
   - `approval-policy` = `never`（自律）
   - `model` 既定 gpt-5.5 / **medium**（`~/.codex/config.toml` の `model_reasoning_effort`）。設計は architect が固めて渡す＝Codex は実装担当なので medium で品質は落ちない（high は reasoning 消費が大きくサブスク枠を早く食う＝レート制限の主因）。**難所のみ high に上書き**: アルゴリズム的に難しい / 状態管理・並行処理が絡む / ブループリントに曖昧さが残る実装のみ、`mcp__codex__codex` の config で `model_reasoning_effort=high` を渡す。
   - `prompt` = ブループリント全文を埋め込む（Codex はリポジトリ規約を知らない。worktree root の `AGENTS.md` を自動で読むが、ブループリントにも要点を再掲する）
   - 完了後、Codex は**ビルダーサマリ**（追加/編集ファイル・契約差分・テスト結果・逸脱・人間ゲート該当）を返す。
   - **Codex がレート/使用量制限で落ちたら** → `## レート制限時の自動フォールバック`（Sonnet 4.6 へ自動切替）へ。
4. **レビュー（Claude）**: Codex のサマリと `git diff` を受けて:
   - `pr-review-toolkit:*`（必須 `code-reviewer` + `silent-failure-hunter`、案件で `type-design-analyzer`/`pr-test-analyzer`）
   - feature-factory 文脈なら `dev-automation/spec-validator` で承認済み story/brief と照合
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
- 並列案件は Codex も**別 worktree**（1 案件=1 worktree 維持）。詳細 `wiki/dev/agent-teams-playbook.md` の Codex-as-implementer レーン。
- **worktree commit hygiene**: worktree 内の commit は `git add -A` を避け `git add <対象パス>` で限定（worktree は node_modules を symlink で持ち `-A` が symlink を拾って混入する）。
- **worktree 切替後の再 Read**: 別 worktree で同一相対パスを読んでいても、切替後の最初の Edit は必ず Read 先行（既読状態は worktree 単位。`feedback_worktree_file_reread`）。
