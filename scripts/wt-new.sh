#!/usr/bin/env bash
# wt-new <topic> — 新規 task 用 worktree を origin/main から切る
#
# 何をするか:
#   1) git fetch origin main
#   2) 既存ブランチ / worktree との衝突チェック
#   3) git worktree add で /Users/<user>/Projects/all-good-ops-<topic> に
#      task/YYMMDD-<topic> ブランチ（origin/main 派生）を生やす
#   4) npm install を当該 worktree で実行（package.json があれば）
#   5) cd コマンドをエコー（ユーザーがコピペで移動）
#
# 使い方:
#   bash scripts/wt-new.sh x-buzz
#   → /Users/<user>/Projects/all-good-ops-x-buzz に task/YYMMDD-x-buzz が用意される

set -euo pipefail

if [[ $# -ne 1 ]]; then
  cat >&2 <<EOF
Usage: bash scripts/wt-new.sh <topic>

<topic> は kebab-case 推奨（半角英数 + ハイフン）。
例: bash scripts/wt-new.sh x-buzz-radar
EOF
  exit 1
fi

topic="$1"

# topic バリデーション
if [[ ! "$topic" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
  echo "❌ topic は小文字英数+ハイフンのみ: '$topic'" >&2
  exit 1
fi

# repo root を main worktree から取得（どの worktree から叩いても OK）
repo_root="$(git rev-parse --show-toplevel)"
projects_root="$(cd "$repo_root/../.." && pwd)"
date_prefix="$(date +%y%m%d)"
branch="task/${date_prefix}-${topic}"
wt_path="${projects_root}/all-good-ops-${topic}"

# 既存衝突チェック
if git rev-parse --verify "$branch" >/dev/null 2>&1; then
  echo "❌ ブランチ '$branch' は既に存在します。" >&2
  echo "   別 topic 名を使うか、既存ブランチに cd してください。" >&2
  echo "   既存 worktree 一覧:" >&2
  git worktree list >&2
  exit 1
fi

if [[ -e "$wt_path" ]]; then
  echo "❌ パス '$wt_path' は既に存在します。先に削除するか別 topic 名にしてください。" >&2
  exit 1
fi

echo "🌿 wt-new"
echo "   topic:  $topic"
echo "   branch: $branch"
echo "   path:   $wt_path"
echo ""

# fetch 最新 main
echo "→ git fetch origin main"
git fetch origin main --quiet

# worktree add
echo "→ git worktree add -b $branch $wt_path origin/main"
git worktree add -b "$branch" "$wt_path" origin/main

# npm install（package.json があれば）
if [[ -f "$wt_path/package.json" ]]; then
  echo "→ npm install (root)"
  ( cd "$wt_path" && npm install --silent 2>&1 | tail -5 ) || echo "⚠️  npm install 失敗（手動で実行してください）" >&2
fi

cat <<EOF

✅ worktree ready

  cd $wt_path

このディレクトリでこのセッションを完結させてください。
完了時:  bash scripts/wt-done.sh
EOF
