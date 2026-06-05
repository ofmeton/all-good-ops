#!/usr/bin/env bash
# worktree 衛生スキャン（決定論的・トークンゼロ）。
# 「ゾンビ worktree」(N日以上 commit なし) と origin/main へ merged 済みの
# local task ブランチを検出して警告する。健全なら無音（exit 0）。
#
# 元々は scripts/monthly-audit.sh の check_worktree_hygiene()（cron 停止で休眠）。
# 副産物沈殿の最強検知を always-on の SessionStart hook 経路へ移設したもの。
# session-start-banner.sh から呼ばれる。将来 monthly-audit を復活させる場合も
# このスクリプトを source / 呼び出して単一実装に寄せること（重複定義を作らない）。
#
# 注: SessionStart の遅延を避けるため git fetch はしない。origin/main は
# ローカル ref を参照する（多少 stale でもヒント用途として許容）。

set -u

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
[ -z "$PROJECT_DIR" ] && exit 0
cd "$PROJECT_DIR" 2>/dev/null || exit 0

WT_THRESHOLD_DAYS="${WT_THRESHOLD_DAYS:-7}"

stale_worktrees=()
merged_task_branches=()

main_wt="$(git worktree list --porcelain 2>/dev/null | awk '/^worktree / {print $2; exit}')"
now_ts="$(date +%s)"

# N日以上 commit がない worktree（main worktree 除外）
while IFS= read -r line; do
  wt_path="$(echo "$line" | awk '{print $1}')"
  branch="$(echo "$line" | awk '{print $3}' | tr -d '[]')"
  [ "$wt_path" = "$main_wt" ] && continue
  [ -z "$branch" ] && continue
  last_commit_ts="$(git -C "$wt_path" log -1 --format=%ct 2>/dev/null || echo 0)"
  age=$(( ( now_ts - last_commit_ts ) / 86400 ))
  if [ "$age" -gt "$WT_THRESHOLD_DAYS" ]; then
    stale_worktrees+=("$branch@$wt_path: ${age}日")
  fi
done < <(git worktree list 2>/dev/null)

# origin/main に merged 済みの local task ブランチ
# 注: 切りたての task ブランチ（commit ゼロ＝origin/main と同位置）も --merged に
# 載るため、現在 checkout 中のブランチは除外する（自分が乗っている branch は
# 削除できず、誤検知ノイズになるだけ）。
current_branch="$(git branch --show-current 2>/dev/null)"
while IFS= read -r b; do
  b="$(echo "$b" | xargs)"
  [ -z "$b" ] && continue
  [[ "$b" == "main" || "$b" == "master" ]] && continue
  [[ "$b" == "$current_branch" ]] && continue
  [[ "$b" =~ ^improve/iteration- ]] && continue
  if [[ "$b" =~ ^task/ ]]; then
    merged_task_branches+=("$b")
  fi
done < <(git branch --merged origin/main 2>/dev/null | sed 's/^\*//' | tr -d ' ')

stale_count=${#stale_worktrees[@]}
merged_count=${#merged_task_branches[@]}

# 健全なら無音（SessionStart banner のノイズを増やさない）
if [ "$stale_count" -eq 0 ] && [ "$merged_count" -eq 0 ]; then
  exit 0
fi

echo
echo "🧟 worktree/ブランチ 棚卸し推奨:"
if [ "$stale_count" -gt 0 ]; then
  echo "   ${WT_THRESHOLD_DAYS}日以上 commit がない worktree ${stale_count} 個:"
  for w in "${stale_worktrees[@]}"; do echo "     - $w"; done
  echo "   → bash scripts/wt-done.sh で片付け、または git worktree remove <path>"
fi
if [ "$merged_count" -gt 0 ]; then
  echo "   origin/main に merge 済みの local task ブランチ ${merged_count} 本:"
  for b in "${merged_task_branches[@]}"; do echo "     - $b"; done
  echo "   → git branch -d <branch>（wt-done.sh が自動削除も）"
fi
echo

exit 0
