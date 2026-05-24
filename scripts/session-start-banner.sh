#!/usr/bin/env bash
# Claude Code SessionStart hook の中身。
# cwd / branch / uncommitted / worktree 状況を表示。
# 並列 worktree 検出時は新規作業を wt-new で隔離するよう促す。

set -u

cd "${CLAUDE_PROJECT_DIR:-$PWD}" 2>/dev/null || exit 0

branch="$(git branch --show-current 2>/dev/null || echo not-git)"
uncommitted="$(git status --short 2>/dev/null | wc -l | xargs)"
wt_count="$(git worktree list 2>/dev/null | wc -l | xargs)"
current_wt="$(git rev-parse --show-toplevel 2>/dev/null || echo unknown)"
main_wt="$(git worktree list --porcelain 2>/dev/null | awk '/^worktree / {print $2; exit}')"

printf '\n📍 cwd: %s\n   branch: %s\n   uncommitted: %s files\n   worktrees: %s active\n' \
  "$(pwd)" "$branch" "$uncommitted" "$wt_count"

# 並列 worktree が動いていれば他 worktree を一覧
if [[ "$wt_count" -ge 2 ]]; then
  echo "   並列 worktree:"
  git worktree list 2>/dev/null | awk -v self="$current_wt" '
    $1 != self { printf "     - %s [%s]\n", $1, $3 }
  '
fi

# 保護ブランチに居る場合は警告
if [[ "$branch" =~ ^(main|master|improve/iteration-.*)$ ]]; then
  cat <<EOF

⚠️  保護ブランチ '$branch' で開始しています。
   新規作業に入る前に worktree を切ってください:

     bash scripts/wt-new.sh <topic>
     → 新 worktree が origin/main 派生で生まれる
     → cd /Users/.../all-good-ops-<topic>

   pre-commit hook で main / master / improve/iteration-* への直 commit は reject されます。
   緊急時の脱出口: ALLOW_MAIN_COMMIT=1 git commit ...

EOF
elif [[ "$current_wt" == "$main_wt" ]] && [[ "$wt_count" -ge 2 ]]; then
  cat <<EOF

ℹ️  メイン worktree で並列 worktree が複数 active です。
   別主題の新規 task は wt-new で隔離してください（HEAD 取り合い防止）:
     bash scripts/wt-new.sh <topic>

EOF
fi

exit 0
