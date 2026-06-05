#!/usr/bin/env bash
# PreToolUse:Bash hook — git checkout / git switch を別 worktree で active な
# ブランチに対して block する。
#
# 入力: stdin に JSON で tool_name / tool_input.command
# 出力: 通過 = exit 0、block = JSON で permissionDecision=deny
#
# 脱出口: コマンドの先頭に `ALLOW_BRANCH_CONFLICT=1` を付けて再実行

set -euo pipefail

input="$(cat)"
command="$(echo "$input" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")"

# 空 or git じゃないなら通過
if [[ -z "$command" ]] || [[ ! "$command" =~ git[[:space:]]+(checkout|switch) ]]; then
  exit 0
fi

# 脱出口
if [[ "$command" =~ ALLOW_BRANCH_CONFLICT=1 ]]; then
  exit 0
fi

# git checkout / git switch <branch> のブランチ名を抽出
# パターン: `git checkout <branch>` / `git switch <branch>`
# 除外: `git checkout -b`, `git checkout --`, `git checkout -- file`, `git switch -c`
target_branch=""
if [[ "$command" =~ git[[:space:]]+checkout[[:space:]]+(-[a-zA-Z]+[[:space:]]+)?([^[:space:]-][^[:space:]]*) ]]; then
  flag="${BASH_REMATCH[1]:-}"
  candidate="${BASH_REMATCH[2]}"
  # -b / -B / --orphan は新規ブランチ作成 → 通過
  if [[ "$flag" =~ ^-(b|B)[[:space:]]+$ ]] || [[ "$flag" =~ orphan ]]; then
    exit 0
  fi
  # -- は file checkout → 通過
  if [[ "$candidate" == "--" ]]; then
    exit 0
  fi
  target_branch="$candidate"
elif [[ "$command" =~ git[[:space:]]+switch[[:space:]]+(-[a-zA-Z]+[[:space:]]+)?([^[:space:]-][^[:space:]]*) ]]; then
  flag="${BASH_REMATCH[1]:-}"
  candidate="${BASH_REMATCH[2]}"
  if [[ "$flag" =~ ^-(c|C)[[:space:]]+$ ]]; then
    exit 0
  fi
  target_branch="$candidate"
fi

if [[ -z "$target_branch" ]]; then
  exit 0
fi

# 該当ブランチが別 worktree で active か確認
project_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"
conflict="$(git -C "$project_dir" worktree list --porcelain 2>/dev/null | awk -v target="$target_branch" '
  /^worktree / { path=$2 }
  /^branch refs\/heads\// {
    sub("refs/heads/", "", $2)
    if ($2 == target) print path
  }
')"

if [[ -z "$conflict" ]]; then
  exit 0
fi

# 現在の cwd と同じ worktree なら通過（no-op checkout）
current_wt="$(git -C "$(pwd)" rev-parse --show-toplevel 2>/dev/null || echo "")"
if [[ "$conflict" == "$current_wt" ]]; then
  exit 0
fi

# block
cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "ブランチ '$target_branch' は別 worktree で active です:\n  $conflict\n\n対処:\n  (a) その worktree に cd して作業を続ける\n  (b) 新規作業なら別 topic で wt-new を切る\n      bash scripts/wt-new.sh <topic>\n\n脱出口（強制 checkout、推奨しない）:\n  ALLOW_BRANCH_CONFLICT=1 $command"
  }
}
EOF
exit 0
