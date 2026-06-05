---
date: 2026-05-24
category: situations
source: session
---

# all-good-ops worktree 運用ポリシー強制化が main に着地

PR #13 (feat(ops): worktree-default + hook-enforced parallel session discipline) を 2026-05-24 に squash merge で main に取り込み。worktree 隔離が新規 task のデフォルトに格上げされ、pre-commit hook (B) と PreToolUse:Bash hook で物理強制される運用に移行した。

主な追加:
- `scripts/wt-new.sh` / `scripts/wt-done.sh`（新規 task は wt-new、完了時は wt-done）
- `scripts/hooks/pretooluse-bash-checkout-guard.sh`（他 worktree active なブランチ宛 checkout を deny）
- `scripts/git-hooks/pre-commit` (B) で同一ブランチ多重 active 状態の commit を reject
- `scripts/install-git-hooks.sh` を worktree 対応（`git-common-dir` 使用）
- `scripts/session-start-banner.sh` に並列 worktree 一覧表示
- `scripts/monthly-audit.sh` に worktree hygiene セクション
- `.claude/settings.json` に PreToolUse hook 登録 + `/Users/rikukudo/Projects/all-good-ops-*/**` の Read/Write/Edit 許可
- `CLAUDE.md` §GitHub運用ルール を worktree-default + hook 強制 に改訂

脱出口: `ALLOW_MAIN_COMMIT=1` / `ALLOW_BRANCH_CONFLICT=1`（pre-commit）/ コマンド先頭に `ALLOW_BRANCH_CONFLICT=1`（PreToolUse）。

worktree `/Users/rikukudo/Projects/all-good-ops-wt-enforce/` および local/remote ブランチ `task/260524-worktree-enforcement` は cleanup 済み。

新 hook が各 worktree で有効化されるのは、それぞれの task ブランチが main を吸収（merge or rebase）して次セッションが立ち上がったタイミング以降。
