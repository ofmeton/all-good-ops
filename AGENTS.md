# AGENTS.md — Codex 実装規約（all-good-ops）

このリポジトリで Codex が実装・テストを担うときの規約。Claude(architect) が設計し、Codex が実装し、Claude がレビューする**半委任**体制。Codex は設計判断をせず、渡されたブループリントを規約準拠で実装する。

人間向けの全体方針は `CLAUDE.md`、設計作法の正本は `wiki/dev/standards.md`。本ファイルは Codex 実装に必須の最小集合のみ。

## 着手前に必ず読む
- **設計 SSOT**: `wiki/dev/standards.md` の **A 章（スタック非依存の設計規律）は常に適用**。採用スタックがあれば **B 章**の該当節（現状 Next.js+Supabase）も読む。
- ブループリント（Claude architect から渡される）= 実装対象の真実。ファイル一覧・データ契約・API 形・テスト要件はそこに従う。規約に反する選択をする場合は理由をサマリに明記（暗黙の逸脱禁止）。

## branch / worktree 規律（厳守）
- 必ず**渡された task ブランチ / worktree 内**で作業する。`cwd` がそれ。
- `main` / `master` への直 commit 禁止（git pre-commit hook が reject する）。別ブランチへ checkout しない。
- commit message は日本語・1 行サマリ + 必要なら本文。末尾に必ず:
  ```
  Co-Authored-By: Codex (gpt-5.5) <noreply@openai.com>
  ```
- 並列で他案件が走ることがある。**自分の担当ファイル領域だけ**を編集する。`package.json` 等の共有ファイルは指示がある時のみ。

## テスト規律
- **「テスト緑」≠「本番動作」**。受け入れ基準（ブループリント記載）を外側＝ユーザー目線で満たすテストを書いて実走する。手段はスタック依存（Web=Playwright / lib・CLI=Vitest・tsx）。
- **Next.js + Supabase のテストはローカル Supabase に隔離して実行**。`.env.local` は**本番 DB を指す**ことがあり、テストが本番を truncate する事故が起きる。ローカルスタック（`supabase start` 等）に向けてから実行する。
- worktree の Next.js build は Turbopack が symlink node_modules で panic する → `next build --webpack` を使う。
- 外部 API / LLM の出力は**境界で検証し、欠損は安全側デフォルトで補完**してから内部へ渡す。

## やってはいけない（人間ゲート＝Claude にエスカレーション）
以下は Codex が実行せず、サマリで Claude に上げる:
- **DB migration の本番適用**（DDL・schema 変更の本番反映）
- **外部送信**（メール / LINE / SNS 投稿 / Slack 等）
- **金銭**（支払い・送金・請求送付・課金）
- `raw/` の上書き・削除（immutable）
ローカルでのコード・テスト・ローカル DB 操作は自走してよい。

## 完了時に返すもの（ビルダーサマリ）
Claude のレビューに渡すため、最後に必ず以下を構造化して返す:
- 追加 / 編集したファイル一覧（パス）
- API 契約 / データ契約（関数シグネチャ・RPC・型）の要点と、ブループリントとの差分
- テスト結果（何を・どのコマンドで実行し・全緑か）
- 規約からの逸脱と理由（あれば）
- 人間ゲート該当でブロックした項目（あれば）
