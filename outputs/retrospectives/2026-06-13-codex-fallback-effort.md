# 振り返り: Codex フォールバック & effort 既定変更

- **日時**: 2026-06-13
- **対象**: `codex-implement` フローの堅牢化（PR #187 / #188）
- **種別**: 設定・skill 配線（コーディング系・小規模）

## 何をやったか
1. **Codex レート制限時の自動フォールバック**（PR #187）: `mcp__codex__codex` が rate/usage/quota/429 系で落ちたら、`system-engineer` を `model:"sonnet"` 明示で起動し同じ worktree・ブループリント・受け入れ基準で実装続行。レビューゲート（code-reviewer/silent-failure-hunter/spec-validator）は省略せず必須維持。usage-log に `implementer:"sonnet-fallback"` 記録。**Haiku は実装品質が要件未達のため不採用**。
2. **Codex 既定 effort を high → medium**（PR #188）: 設計は architect が固めて渡す＝Codex は実装担当のため medium で品質はほぼ落ちない。high は reasoning 消費が大きくサブスク枠を早く食う＝レート制限の主因。難所（アルゴリズム的に難しい/状態管理・並行/ブループリント曖昧）のみ high 上書き。`~/.codex/config.toml` の `model_reasoning_effort` も high→medium。
3. ガードレールに **worktree commit hygiene（`git add -A` 回避）** と **worktree 切替後の再 Read** を明記。

## 良かった点
- 選択肢羅列でなく理由付きで断定（Haiku 除外の根拠明示）。
- effort の論点を「定額枠＝コスト無関係 → 真の論点はレート制限消費」と再フレーム。
- `git add -A` の node_modules symlink 混入を検知して unstage、2 回目は対象パス指定 add に自己修正。

## 詰まった点
| # | 事象 | 原因 | 本来の動き |
|---|---|---|---|
| 1 | worktree 切替後 Edit が "File has not been read" で失敗 | 別 worktree の既読状態を引きずった | 切替直後の最初の Edit は Read 先行 |
| 2 | `git add -A` で node_modules symlink 混入 | worktree は node_modules を symlink で持つ | 対象パス指定 add |
| 3 | 序盤 tool call malformed | 一時 parse 失敗 | 再試行で解消（構造的要因なし） |

## 再計測（前回 watch）
- AskUserQuestion 封印（自走指示時）→ verified
- bash_cwd-regression → applied（全 Bash 絶対 cd）
- squash-merge 後 fresh branch → verified
- **worktree-file-reread → 再発**（既存 memory 想起できず → skill ガードレールに再掲で強化）

## 反映
- SAFE: improvement-log 追記 + `codex-implement/SKILL.md` ガードレール 2 行追記。
- 新規 memory なし（フォールバック先・effort 既定は skill＝SSOT に反映済みで重複回避）。

## Open（次回観察）
- フォールバック/medium の実運用効果（レート制限が実際に減るか・medium で取りこぼし増えないか）を次の Codex 委任時に観察。
- 軽微な skill/doc 編集に毎回フル worktree はやや重い（checkout block hook 回避で安全側・判断の余地）。
