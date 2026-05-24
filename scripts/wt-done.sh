#!/usr/bin/env bash
# wt-done — 現在の worktree を片付ける
#
# 何をするか:
#   1) 現在地が task/* ブランチの worktree であることを確認
#   2) working tree が clean であることを確認
#   3) upstream の状態（pushed? merged?）を確認
#   4) ユーザー確認後、main worktree から `git worktree remove` + `git branch -d`
#
# 使い方:
#   完了したい worktree 内で:
#     bash scripts/wt-done.sh
#
#   merge せず破棄したい場合（試行錯誤専用）:
#     DISCARD=1 bash scripts/wt-done.sh

set -euo pipefail

current_branch="$(git branch --show-current)"
current_path="$(git rev-parse --show-toplevel)"
main_path="$(git worktree list --porcelain | awk '/^worktree / {print $2; exit}')"

if [[ "$current_path" == "$main_path" ]]; then
  echo "❌ ここは main worktree です。task worktree 内で実行してください。" >&2
  echo "   現在: $current_path" >&2
  exit 1
fi

if [[ ! "$current_branch" =~ ^task/ ]]; then
  echo "❌ 現在のブランチが task/* ではありません: $current_branch" >&2
  echo "   wt-done は task/* ブランチ専用です。" >&2
  exit 1
fi

# working tree clean チェック
if [[ -n "$(git status --porcelain)" ]]; then
  echo "❌ working tree が clean ではありません。先に commit / discard してください。" >&2
  git status --short >&2
  exit 1
fi

echo "🧹 wt-done"
echo "   branch: $current_branch"
echo "   path:   $current_path"
echo ""

# DISCARD モード
if [[ "${DISCARD:-0}" == "1" ]]; then
  echo "⚠️  DISCARD=1: merge せず破棄します。"
  read -r -p "本当に破棄して OK ですか? [y/N] " ans
  if [[ "$ans" != "y" ]]; then
    echo "中止しました。"
    exit 1
  fi
  (
    cd "$main_path"
    git worktree remove --force "$current_path"
    git branch -D "$current_branch"
  )
  echo "✅ 破棄完了"
  exit 0
fi

# pushed & merged チェック
upstream_status="$(git rev-list --left-right --count "@{u}...HEAD" 2>/dev/null || echo "")"
if [[ -z "$upstream_status" ]]; then
  echo "⚠️  upstream 未設定。push 履歴なし → 破棄するなら DISCARD=1 で再実行" >&2
  exit 1
fi

read -r behind ahead <<<"$upstream_status"
if [[ "$ahead" != "0" ]]; then
  echo "⚠️  upstream より $ahead commit 進んでいます。先に push してください。" >&2
  echo "   git push" >&2
  exit 1
fi

# main に merge されているか
merged_into_main="$(git -C "$main_path" branch --merged origin/main 2>/dev/null | grep -c "$current_branch" || true)"
if [[ "$merged_into_main" -eq 0 ]]; then
  cat >&2 <<EOF
⚠️  '$current_branch' は origin/main に merge されていません。

   選択肢:
     a) PR 作成 → merge → 再実行
        gh pr create
     b) 破棄（merge 不要なら）
        DISCARD=1 bash scripts/wt-done.sh

EOF
  exit 1
fi

# OK、片付け
echo "✅ pushed & merged 確認"
echo "→ git worktree remove $current_path"
(
  cd "$main_path"
  git worktree remove "$current_path"
  git branch -d "$current_branch"
  # remote tracking branch も削除（origin にあれば）
  if git rev-parse --verify "origin/$current_branch" >/dev/null 2>&1; then
    git push origin --delete "$current_branch" 2>&1 | tail -3
  fi
)
echo "✅ wt-done 完了"
