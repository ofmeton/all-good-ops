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

# scores と現存エージェント定義の整合性チェック（読み取り専用・既存挙動を変更しない）
# 結果は logs/audit-integrity-YYYYMMDD.log に書き出し、グローバル変数に件数を残す
INTEGRITY_MISSING=0
INTEGRITY_EXTRA=0
# 外部スポーク評価データの鮮度モニタ（読み取り + ログのみ・既存挙動を変更しない）
STALE_SPOKES=()
STALE_COUNT=0
SPOKE_THRESHOLD_DAYS=14
check_spoke_freshness() {
  local spokes=(
    "/Users/rikukudo/Projects/monetize-os/ops/agent-harness-eval.md"
    "/Users/rikukudo/Projects/monetize-os/ops/organization-harness-eval.md"
    "/Users/rikukudo/Projects/ai-radar/ops/dashboard-health.md"
  )
  for f in "${spokes[@]}"; do
    [ ! -f "$f" ] && continue
    local age=$(( ( $(date +%s) - $(stat -f %m "$f") ) / 86400 ))
    if [ "$age" -gt "$SPOKE_THRESHOLD_DAYS" ]; then
      STALE_SPOKES+=("$(basename "$f"): ${age}日")
    fi
  done
  STALE_COUNT=${#STALE_SPOKES[@]}
  if [ "$STALE_COUNT" -gt 0 ]; then
    log "WARN: 外部スポーク評価データが ${SPOKE_THRESHOLD_DAYS}日 以上古い:"
    for s in "${STALE_SPOKES[@]}"; do
      log "  - $s"
    done
    log "ACTION: 該当スポークのハーネス評価バッチを人間トリガーで再実行してください。"
  else
    log "外部スポーク評価 OK (鮮度 ${SPOKE_THRESHOLD_DAYS}日 以内)"
  fi
}

check_scores_integrity() {
  local integrity_log="${LOG_DIR}/audit-integrity-$(date +%Y%m%d).log"
  local scores_file="${PROJECT_DIR}/data/quality-scores.json"
  local agents_dir="${PROJECT_DIR}/.claude/agents"

  if [ ! -f "$scores_file" ] || [ ! -d "$agents_dir" ]; then
    log "WARN: scores 整合性チェック対象が見つからない（scores=$scores_file, agents=$agents_dir）"
    return 0
  fi

  if ! command -v jq &> /dev/null; then
    log "WARN: jq が無いため scores 整合性チェックをスキップ"
    return 0
  fi

  local existing scored
  existing=$(find "$agents_dir" -name '*.md' -type f -exec basename {} .md \; | sort -u)
  scored=$(jq -r '.scores | keys[]' "$scores_file" | sort -u)

  local missing extra
  missing=$(comm -23 <(echo "$existing") <(echo "$scored"))
  extra=$(comm -13 <(echo "$existing") <(echo "$scored"))

  INTEGRITY_MISSING=$(echo -n "$missing" | grep -c . || true)
  INTEGRITY_EXTRA=$(echo -n "$extra" | grep -c . || true)

  {
    echo "# scores 整合性チェック $(date '+%Y-%m-%d %H:%M:%S')"
    echo "## missing_in_scores（現存エージェントだが scores に未登録）: ${INTEGRITY_MISSING}"
    echo "$missing"
    echo "## extra_in_scores（scores にあるが現存しないエージェント）: ${INTEGRITY_EXTRA}"
    echo "$extra"
  } > "$integrity_log"

  if [ "$INTEGRITY_MISSING" -gt 0 ] || [ "$INTEGRITY_EXTRA" -gt 0 ]; then
    log "WARN: scores 整合性に乖離あり (missing=${INTEGRITY_MISSING}, extra=${INTEGRITY_EXTRA}) → ${integrity_log}"
  else
    log "scores 整合性 OK (missing=0, extra=0)"
  fi
}

log "=== 月次監査開始 ==="

check_scores_integrity
check_spoke_freshness

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

5. 改善サイクル評価（AutoAgent方式 keep/discard）:
   - data/improvement-log.jsonl を読む
   - status が 'applied' または 'evaluating' のエントリがあれば:
     a. 対象エージェントの今回スコア（after_score）と before_score を比較
     b. スコア向上 → kept=true、スコア同等+簡素化 → kept=true、それ以外 → kept=false
     c. improvement-log.jsonl の該当エントリを更新（after_score, kept, evaluated_date, discard_reason）
   - エントリがなければスキップ

6. 月次レポートの作成:
   - 上記の結果を統合
   - 改善アクションアイテムを含む
   - 改善サイクルの振り返りセクションを含む（keep/discard結果）

重要: data/quality-scores.json は必ず更新すること。レポートにだけ書いてJSONを更新し忘れないこと。

結果をoutputs/reports/monthly-${MONTH}.mdに保存してください。" \
  >> "$LOG_FILE" 2>&1

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  log "=== 月次監査完了 ==="
else
  log "ERROR: 月次監査がエラーコード ${EXIT_CODE} で終了"
fi

# JSON 用 stale list 構築（空配列 + set -u 対応）
if [ "$STALE_COUNT" -gt 0 ] && command -v jq &> /dev/null; then
  STALE_JSON=$(printf '%s\n' "${STALE_SPOKES[@]}" | jq -R . | jq -s -c .)
else
  STALE_JSON="[]"
fi

cat >> "${PROJECT_DIR}/data/usage-log.jsonl" << EOF
{"timestamp":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","session_type":"monthly-audit","cost_tier":"standard","agents_invoked":["secretary","quality-auditor","usage-analyst","org-designer"],"skills_referenced":["cost-control"],"exit_code":${EXIT_CODE},"integrity_check":{"missing":${INTEGRITY_MISSING},"extra":${INTEGRITY_EXTRA}},"spoke_freshness":{"stale":${STALE_JSON},"stale_count":${STALE_COUNT},"threshold_days":${SPOKE_THRESHOLD_DAYS}}}
EOF

log "=== ログ: ${LOG_FILE} ==="
