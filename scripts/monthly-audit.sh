#!/bin/bash
# monthly-audit.sh — 毎月1日10:00にLaunchAgentから実行
# 品質監査、ランク更新、月次レポート

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="${PROJECT_DIR}/logs"
LOG_FILE="${LOG_DIR}/monthly-audit-$(date +%Y%m%d).log"

mkdir -p "$LOG_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== 月次監査開始 ==="

if ! command -v claude &> /dev/null; then
  log "ERROR: claude コマンドが見つかりません"
  exit 1
fi

MONTH=$(date +%Y%m)

log "Step 1: 品質監査 + ランク更新"
claude --print \
  --max-turns 25 \
  --allowedTools "Read,Write,Edit,Grep,Glob" \
  -p "あなたは秘書エージェントです。月次監査を実行してください:

1. 品質監査（quality-auditorの役割）:
   - 全エージェント定義ファイルを読み、CLAUDE.mdとの整合性をチェック
   - 6軸100点満点でスコアリング（正確性20、網羅性15、効率性15、安全性20、連携性15、改善性15）
   - data/quality-scores.json を更新

2. 使用分析（usage-analystの役割）:
   - data/usage-log.jsonl の今月分を集計
   - コスト分類別の比率（軽量/標準/熟議）
   - エージェント別の使用頻度
   - 月5,000円ペースとの比較

3. ランク更新:
   - 品質スコアと使用頻度からランクを判定（N/N-C/N-B/N-A/N-S）
   - data/agent-ranks.json を更新

4. 組織設計レビュー（org-designerの役割）:
   - 1ヶ月以上未使用のエージェントを検出
   - カバーされていない業務領域がないか確認
   - 統合・新設の候補を提案

5. 月次レポートの作成:
   - 上記の結果を統合
   - 改善アクションアイテムを含む

結果をoutputs/reports/monthly-${MONTH}.mdに保存してください。" \
  >> "$LOG_FILE" 2>&1

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  log "=== 月次監査完了 ==="
else
  log "ERROR: 月次監査がエラーコード ${EXIT_CODE} で終了"
fi

cat >> "${PROJECT_DIR}/data/usage-log.jsonl" << EOF
{"timestamp":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","session_type":"monthly-audit","cost_tier":"standard","agents_invoked":["secretary","quality-auditor","usage-analyst","org-designer"],"skills_referenced":["cost-control"],"exit_code":${EXIT_CODE}}
EOF

log "=== ログ: ${LOG_FILE} ==="
