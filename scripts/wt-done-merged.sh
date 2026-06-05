#!/usr/bin/env bash
# wt-done-merged — main にマージ済みの worktree を一括で片付ける
#
# 何をするか:
#   メイン repo の各 worktree（メイン本体除く）について、
#     1) working tree が clean
#     2) ブランチが main に merge 済み（git merge-base --is-ancestor）
#   の両方を満たすものだけ、worktree remove + branch 削除 + stale な
#   origin ブランチ削除 を行う。条件を満たさない（未マージ/dirty）worktree
#   はスキップして一覧表示する。
#
# wt-done.sh との違い:
#   - wt-done.sh は「いま中にいる単一 worktree」を upstream/PR 前提で片付ける
#   - 本スクリプトは「ローカルで main に直接マージ済みの複数 worktree」を一括処理
#
# 使い方（メイン repo から）:
#   bash scripts/wt-done-merged.sh           # dry-run（対象を表示するだけ）
#   bash scripts/wt-done-merged.sh --yes     # 実行
#
# 教訓ソース: 2026-06-05 整理セッション（手作業で6回繰り返したため型化）

set -uo pipefail

DO_IT=0
[[ "${1:-}" == "--yes" ]] && DO_IT=1

main_wt="$(git worktree list --porcelain 2>/dev/null | awk '/^worktree / {print $2; exit}')"
cd "$main_wt" 2>/dev/null || { echo "❌ git repo 内で実行してください" >&2; exit 1; }

# main を最新化（origin/main 追従。main は checkout されていない前提）
git fetch origin main -q 2>/dev/null || true

echo "🔍 worktree 走査（main 本体: ${main_wt}）"
removed=0 skipped=0

while IFS= read -r wt; do
  [[ -z "$wt" || "$wt" == "$main_wt" ]] && continue
  branch="$(git -C "$wt" branch --show-current 2>/dev/null)"
  [[ -z "$branch" ]] && continue

  dirty="$(git -C "$wt" status --porcelain -uall 2>/dev/null | wc -l | tr -d ' ')"
  if [[ "$dirty" != "0" ]]; then
    echo "  ⏭  skip（未コミット ${dirty}件・先に commit/整理を）: $branch"
    skipped=$((skipped+1)); continue
  fi
  if ! git merge-base --is-ancestor "$branch" main 2>/dev/null; then
    echo "  ⏭  skip（main 未マージ・独自 commit あり）: $branch"
    skipped=$((skipped+1)); continue
  fi

  if [[ "$DO_IT" == "0" ]]; then
    echo "  ✅ 対象（--yes で削除）: $branch  [$wt]"
    removed=$((removed+1)); continue
  fi

  echo "  🧹 片付け: $branch"
  git worktree remove "$wt" && echo "     worktree 削除 OK"
  git branch -d "$branch" 2>/dev/null || git branch -D "$branch"
  if git rev-parse --verify "origin/$branch" >/dev/null 2>&1; then
    git push origin --delete "$branch" 2>&1 | tail -1 | sed 's/^/     remote削除: /'
  fi
  removed=$((removed+1))
done < <(git worktree list --porcelain 2>/dev/null | awk '/^worktree / {print $2}')

echo ""
if [[ "$DO_IT" == "0" ]]; then
  echo "📋 dry-run: 片付け対象 ${removed}件 / skip ${skipped}件。実行は --yes を付与。"
else
  echo "✅ 完了: 片付け ${removed}件 / skip ${skipped}件。"
fi
