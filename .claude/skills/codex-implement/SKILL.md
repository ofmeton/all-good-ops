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
   - `model` 既定 gpt-5.5 / high（`~/.codex/config.toml`）。必要時のみ上書き
   - `prompt` = ブループリント全文を埋め込む（Codex はリポジトリ規約を知らない。worktree root の `AGENTS.md` を自動で読むが、ブループリントにも要点を再掲する）
   - 完了後、Codex は**ビルダーサマリ**（追加/編集ファイル・契約差分・テスト結果・逸脱・人間ゲート該当）を返す。
4. **レビュー（Claude）**: Codex のサマリと `git diff` を受けて:
   - `pr-review-toolkit:*`（必須 `code-reviewer` + `silent-failure-hunter`、案件で `type-design-analyzer`/`pr-test-analyzer`）
   - feature-factory 文脈なら `dev-automation/spec-validator` で承認済み story/brief と照合
   - 指摘は `mcp__codex__codex-reply`（`threadId` 指定）で同スレッドに差し戻し → 3〜4 を回す
5. **デプロイ（Claude 自走）**: レビュー通過後、commit→push→PR→auto-merge→deploy まで自走（`feedback_deploy_no_confirm`）。**人間承認・PR 承認は不要**。
6. **記録**: `data/usage-log.jsonl` に `implementer: "codex"` を含めて追記（Codex 分は定額枠＝Claude/API 月予算とは別管理）。

## 人間ゲート（維持）
人間承認・PR 承認は不要だが、以下の**硬ゲート**は据え置き（Codex は実行せず Claude→人間にエスカレーション）:
- DB **migration の本番適用** / **外部送信**（メール・LINE・SNS・Slack）/ **金銭**（支払い・送金・請求送付）

## ガードレール
- Codex の commit は git pre-commit hook には掛かるが Claude の PreToolUse hook は通らない → **必ず worktree/task ブランチ内**で起動し、main 直 commit を `AGENTS.md` で禁止済み。
- テストはローカル Supabase 隔離（`.env.local` は本番を指す＝truncate 事故 / `project_stayclean_test_local_supabase`）。
- 並列案件は Codex も**別 worktree**（1 案件=1 worktree 維持）。詳細 `wiki/dev/agent-teams-playbook.md` の Codex-as-implementer レーン。
