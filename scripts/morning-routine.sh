#!/bin/bash
# morning-routine.sh — 毎朝8:00にLaunchAgentから実行
# daily-scan → context-update → task-sync を順次実行

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="${PROJECT_DIR}/logs"
LOG_FILE="${LOG_DIR}/morning-routine-$(date +%Y%m%d).log"

# ログディレクトリ確認
mkdir -p "$LOG_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== 朝のルーティン開始 ==="

# Claude Code の存在確認
if ! command -v claude &> /dev/null; then
  log "ERROR: claude コマンドが見つかりません"
  exit 1
fi

# 実行
log "Step 1: デイリースキャン + コンテキスト更新 + タスク同期"
claude --print \
  --max-turns 20 \
  --allowedTools "Read,Write,Edit,Grep,Glob,WebSearch,WebFetch,mcp__*__asana_*,mcp__*__gmail_*,mcp__*__gcal_*" \
  -p "あなたは秘書エージェントです。以下を順番に実行してください:

1. daily-scan スキルに従い、Gmail/Calendar/Asanaから今日の情報を収集
2. context-update スキルに従い、変化があったcontextファイルを更新
3. task-sync スキルに従い、新しいタスクをAsanaに同期

最後に、今日のダイジェストをoutputs/reports/daily-$(date +%Y%m%d).mdに保存してください。" \
  >> "$LOG_FILE" 2>&1

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  log "=== 朝のルーティン完了 ==="
else
  log "ERROR: 朝のルーティンがエラーコード ${EXIT_CODE} で終了"
fi

# usage-log に記録
cat >> "${PROJECT_DIR}/data/usage-log.jsonl" << EOF
{"timestamp":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","session_type":"morning-routine","cost_tier":"standard","agents_invoked":["secretary"],"skills_referenced":["daily-scan","context-update","task-sync"],"exit_code":${EXIT_CODE}}
EOF

log "=== ログ: ${LOG_FILE} ==="
