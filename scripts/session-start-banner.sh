#!/usr/bin/env bash
# Claude Code SessionStart hook の中身。
# cwd / branch / uncommitted を表示。
# main / master / improve/iteration-* に居る場合は警告し、task ブランチへの移動を促す。

set -u

cd "${CLAUDE_PROJECT_DIR:-$PWD}" 2>/dev/null || exit 0

branch="$(git branch --show-current 2>/dev/null || echo not-git)"
uncommitted="$(git status --short 2>/dev/null | wc -l | xargs)"

printf '\n📍 cwd: %s\n   branch: %s\n   uncommitted: %s files\n' "$(pwd)" "$branch" "$uncommitted"

# 保護ブランチに居る場合は警告
if [[ "$branch" =~ ^(main|master|improve/iteration-.*)$ ]]; then
  cat <<EOF

⚠️  保護ブランチ '$branch' で開始しています。
   1セッション = 1 task ブランチ が原則。作業に入る前に task ブランチを切ってください:

     git checkout -b task/$(date +%y%m%d)-<topic>

   pre-commit hook で main / master / improve/iteration-* への直 commit は reject されます。
   緊急時の脱出口: ALLOW_MAIN_COMMIT=1 git commit ...

EOF
fi

exit 0
