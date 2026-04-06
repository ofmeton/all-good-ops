#!/bin/bash
# weekly-review.sh — 毎週日曜9:00にLaunchAgentから実行
# KPI進捗チェック、来週の優先事項設定

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="${PROJECT_DIR}/logs"
LOG_FILE="${LOG_DIR}/weekly-review-$(date +%Y%m%d).log"

mkdir -p "$LOG_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== 週次レビュー開始 ==="

if ! command -v claude &> /dev/null; then
  log "ERROR: claude コマンドが見つかりません"
  exit 1
fi

WEEK_NUM=$(date +%V)
YEAR=$(date +%Y)

log "Step 1: 週次レビュー実行"
claude --print \
  --max-turns 15 \
  --allowedTools "Read,Write,Edit,Grep,Glob,WebSearch,mcp__*__asana_*,mcp__*__gcal_*" \
  -p "あなたは秘書エージェントです。週次レビューを実行してください:

1. 今週完了したタスクの一覧（Asanaから取得）
2. knowledge/context/ の各ファイルを確認し、今週の変化をまとめる
3. KPI進捗チェック:
   - 月収26万円目標への進捗
   - 各収入源の状況
   - 子どもの居場所づくりの進捗
   - AIコスト（今月のusage-log.jsonlを集計）
4. 来週の優先事項を3-5個提案
5. 「保留」セクションのタスクを棚卸し

結果をoutputs/reports/weekly-${YEAR}W${WEEK_NUM}.mdに保存してください。" \
  >> "$LOG_FILE" 2>&1

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  log "=== 週次レビュー完了 ==="
else
  log "ERROR: 週次レビューがエラーコード ${EXIT_CODE} で終了"
fi

cat >> "${PROJECT_DIR}/data/usage-log.jsonl" << EOF
{"timestamp":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","session_type":"weekly-review","cost_tier":"standard","agents_invoked":["secretary"],"skills_referenced":["asana-management"],"exit_code":${EXIT_CODE}}
EOF

log "=== ログ: ${LOG_FILE} ==="
