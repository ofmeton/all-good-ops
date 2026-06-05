#!/usr/bin/env bash
# Claude Code Stop hook の中身（決定論的・トークンゼロ）。
# 応答完了時に repo family の未コミットを -uall 合算し、閾値超なら
# 「終了前にコミット/整理を」と促す。閾値内なら無音（exit 0）。
#
# 狙い: 沈殿は「セッション終了時に未コミットを放置」して起きる。SessionStart の
# session-start-banner.sh が入口側、本スクリプトが出口側の安全網（出口で最後に促す）。
# 合算ロジックは session-start-banner.sh と同形（単一の閾値 env を共有）。

set -u

cd "${CLAUDE_PROJECT_DIR:-$PWD}" 2>/dev/null || exit 0

ALERT_THRESHOLD="${UNCOMMITTED_ALERT_THRESHOLD:-20}"

family_total=0
while IFS= read -r wt; do
  [[ -z "$wt" ]] && continue
  n="$(git -C "$wt" status --porcelain -uall 2>/dev/null | wc -l | xargs)"
  family_total=$((family_total + n))
done < <(git worktree list --porcelain 2>/dev/null | awk '/^worktree / {print $2}')

if [[ "$family_total" -gt "$ALERT_THRESHOLD" ]]; then
  echo
  echo "⚠️  未コミット ${family_total} 件（repo family -uall 合算・閾値 ${ALERT_THRESHOLD}）"
  echo "   → 終了前にコミット or 整理を。放置の沈殿が「ぐちゃぐちゃ」の根因。"
  echo "   手順: .claude/skills/git-repo-cleanup-protocol.md"
  echo
fi

exit 0
