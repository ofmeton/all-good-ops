#!/bin/bash
# self-improve.sh — 毎週日曜10:00にLaunchAgentから実行
# AutoAgent方式の自己改善ループ: データ収集 → 分析・提案生成 → ログ記録

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="${PROJECT_DIR}/logs"
LOG_FILE="${LOG_DIR}/self-improve-$(date +%Y%m%d).log"
DATE=$(date +%Y%m%d)

# Phase 3 起動ガード（簡易テスト時は RUN_SECRETARY=0 でスキップ）
RUN_SECRETARY="${RUN_SECRETARY:-1}"

mkdir -p "$LOG_DIR"
mkdir -p "${PROJECT_DIR}/outputs/improvements"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== 自己改善サイクル開始 ==="

if ! command -v claude &> /dev/null; then
  log "ERROR: claude コマンドが見つかりません"
  exit 1
fi

# コスト安全弁: 今月のセッション数が多すぎたらスキップ
MONTH_ENTRIES=$(grep -c "$(date +%Y-%m)" "${PROJECT_DIR}/data/usage-log.jsonl" 2>/dev/null | tr -d '[:space:]' || echo "0")
if [ "$MONTH_ENTRIES" -gt 40 ]; then
  log "SKIP: 今月のセッション数が上限超過 (${MONTH_ENTRIES}件)。自己改善をスキップします"
  cat >> "${PROJECT_DIR}/data/usage-log.jsonl" << EOF
{"timestamp":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","session_type":"self-improvement","cost_tier":"skipped","agents_invoked":[],"skills_referenced":[],"summary":"コスト制限によりスキップ","exit_code":0}
EOF
  exit 0
fi

# イテレーション番号を算出
ITERATION=$(grep -c '"session_type":"self-improvement"' "${PROJECT_DIR}/data/usage-log.jsonl" 2>/dev/null | tr -d '[:space:]' || echo "0")
ITERATION=$((ITERATION + 1))

# 提案ファイル名に iteration 番号を含めて同日複数回実行時の衝突を避ける
PROPOSAL_BASENAME="proposal-${DATE}-it${ITERATION}.md"

log "Iteration: ${ITERATION}"

# ========================================
# Phase 1 + 2 統合: データ収集→分析→提案生成
# ========================================
log "Phase 1+2: データ収集・分析・提案生成"
claude --print \
  --max-turns 20 \
  --permission-mode acceptEdits \
  --allowedTools "Read,Write,Glob,Grep" \
  -p "あなたは org-designer の自己改善モードです。Iteration ${ITERATION}。
プランモードに入らず、即座に実行してください。

## ステップ1: データ収集

### 1-A: all-good-ops 本体のデータ
以下のファイルを読み、状況を把握してください:
- data/quality-scores.json（品質スコア）
- data/usage-log.jsonl（直近2週間の使用ログ）
- data/improvement-log.jsonl（過去の改善提案と結果）
- data/agent-ranks.json（ランク状況）
- outputs/reports/ の直近レポート（あれば）

### 1-B: monetize-os スポークのデータ（2026-04-21 追加）
以下も読み、状況を把握してください。ファイルが無い / 更新が 2 週間以上古い場合は「未計測」と記録し、monetize-os 側の提案はこのサイクルでは出さない:
- /Users/rikukudo/Projects/monetize-os/ops/agent-harness-eval.md
- /Users/rikukudo/Projects/monetize-os/ops/team-harness-eval.md
- /Users/rikukudo/Projects/monetize-os/ops/organization-harness-eval.md
- /Users/rikukudo/Projects/monetize-os/ops/agent-improvement-plan.md
- /Users/rikukudo/Projects/monetize-os/ops/team-improvement-plan.md
- /Users/rikukudo/Projects/monetize-os/ops/organization-improvement-plan.md
- /Users/rikukudo/Projects/monetize-os/ops/agent-activity-log.md

評価対象のエージェント:
- monetize-os/.claude/agents/growth-lead.md
- monetize-os/.claude/agents/market-research.md
- monetize-os/.claude/agents/compliance.md
- monetize-os/personas/hagurin/.claude/agents/*.md (persona 固有、character.md 禁則を必ず尊重)

データが空や未初期化の場合は「データなし」と記録してください。

## ステップ2: 分析（AutoAgent方式の根本原因分析）
1. スコアギャップ分析: 目標(N-B=60点)との乖離が大きいエージェント/軸を特定
2. 使用パターン照合: 低スコア×高使用=優先度1、低スコア×未使用=削除候補
3. 前サイクル差分: 前回の変更とスコア変動の相関を確認
4. discarded履歴: 過去にdiscardされた提案と同じ変更を繰り返さない

## ステップ3: 提案ファイルの作成
Writeツールで outputs/improvements/${PROPOSAL_BASENAME} を作成してください。

内容:
# 自己改善提案 $(date +%Y-%m-%d) (Iteration ${ITERATION})

## 診断サマリー
（スコア変化、最低スコアのエージェント/軸、使用パターンの異常）

## 根本原因分析
（なぜそのスコアなのか、ハーネスのどこが原因か）

## 改善提案（優先度順、最大3件）

提案はセクション分け:
### all-good-ops 改善
### monetize-os 改善（データが揃っていれば）

各提案に:
- 対象ファイル（絶対パス。all-good-ops / monetize-os のどちらか明記）
- 変更種別（agent定義修正 / skill追加 / CLAUDE.md更新）
- 現状の問題
- 具体的な変更内容（差分レベルで具体的に）
- 期待するスコア影響（数値で）
- リスク
- monetize-os の提案で persona 固有ファイルを触る場合、persona の character.md 禁則を尊重しているか明記

## コスト見積もり
## 前回サイクルの振り返り

## ルール
- 提案は最大3件に絞る
- コスト増加を伴う提案は避ける
- 汎用的な改善のみ（特定タスク専用のハックは禁止）
- データが不足している場合は「初回サイクルのため基準値を確立する提案」を出す
- 提案は人間が承認してから適用される（自動適用禁止）
- 必ず proposal ファイルを Write ツールで作成すること" \
  >> "$LOG_FILE" 2>&1

PHASE_EXIT=$?
log "Phase 1+2 完了 (exit: ${PHASE_EXIT})"

# 提案ファイル存在検証（サイレント失敗を防ぐ）
PROPOSAL_FILE="${PROJECT_DIR}/outputs/improvements/${PROPOSAL_BASENAME}"
if [ ! -f "$PROPOSAL_FILE" ]; then
  log "ERROR: 提案ファイルが生成されませんでした: ${PROPOSAL_FILE}"
  cat >> "${PROJECT_DIR}/data/improvement-log.jsonl" << EOF
{"date":"$(date +%Y-%m-%d)","iteration":${ITERATION},"status":"failed","reason":"proposal file not generated","exit_code":${PHASE_EXIT}}
EOF
  exit 2
fi

PROPOSAL_BYTES=$(wc -c < "$PROPOSAL_FILE" | tr -d '[:space:]')
log "提案ファイル生成確認 (${PROPOSAL_BYTES} bytes)"

# 最新版を指すシンボリックリンクを更新（互換）
ln -sf "${PROPOSAL_BASENAME}" "${PROJECT_DIR}/outputs/improvements/proposal-latest.md"

# ========================================
# Phase 3: 秘書による審査・適用（権限委譲）
# ========================================
SECRETARY_EXIT=0
SECRETARY_INVOKED=false
if [ "$RUN_SECRETARY" = "1" ]; then
  SECRETARY_INVOKED=true
  log "Phase 3: 秘書審査・適用"
  claude --print \
  --max-turns 25 \
  --permission-mode acceptEdits \
  --allowedTools "Read,Write,Edit,Glob,Grep,Bash(git:*)" \
  -p "あなたは秘書（secretary）の改善提案審査モードです。
ユーザーから改善提案の承認権限が委譲されています。基本は全て自動承認し、リスキーなものだけエスカレーションしてください。

## 審査対象
${PROPOSAL_FILE}

## 指示
1. 上記ファイルを読み、提案を1件ずつ SAFE / RISKY で判定してください
2. 判定基準は secretary.md の「改善提案審査モード」セクションを参照
3. SAFE と判定したものは:
   - improve/iteration-${ITERATION} ブランチを作成
   - 対象ファイルに提案通りの変更を Edit ツールで適用
   - git add -A && git commit -m '自己改善 Iteration ${ITERATION}: <提案タイトル>'
   - main ブランチに merge
4. RISKY と判定したものは:
   - outputs/improvements/escalated-${DATE}.md に理由と推奨アクションを記載
   - 適用しない
5. 各提案の判定結果を data/improvement-log.jsonl に1行ずつ追記:
   {\"date\":\"$(date +%Y-%m-%d)\",\"iteration\":${ITERATION},\"proposal_id\":\"...\",\"target_file\":\"...\",\"change_summary\":\"...\",\"secretary_decision\":\"applied|escalated|rejected\",\"decision_reason\":\"...\",\"status\":\"applied|escalated|rejected\"}

## 重要
- 迷ったら RISKY として扱う（迷ったら確認、が原則）
- Edit 適用の前に対象ファイルを必ず Read する
- git 操作はワーキングディレクトリ ${PROJECT_DIR} で行う
- 変更は必ずブランチ経由。main に直接 commit しない
- 提案に曖昧な点があれば rejected として理由を記録する

最後に、処理結果サマリーを3-5行で報告してください。" \
    >> "$LOG_FILE" 2>&1

  SECRETARY_EXIT=$?
  log "Phase 3 完了 (exit: ${SECRETARY_EXIT})"
else
  echo "WARN: secretary phase skipped — proposals remain in 'proposed' state" >&2
  log "Phase 3 スキップ (RUN_SECRETARY=0)"
fi

# ========================================
# Phase 4: ログ記録
# ========================================
log "Phase 3: ログ記録"

# improvement-log のサイクルメタ行を追記（個別提案は秘書が既に追記済み）
cat >> "${PROJECT_DIR}/data/improvement-log.jsonl" << EOF
{"date":"$(date +%Y-%m-%d)","iteration":${ITERATION},"event":"cycle_complete","proposal_file":"outputs/improvements/${PROPOSAL_BASENAME}","proposal_bytes":${PROPOSAL_BYTES},"phase12_exit":${PHASE_EXIT},"phase3_exit":${SECRETARY_EXIT},"secretary_invoked":${SECRETARY_INVOKED}}
EOF

# usage-log に追記
TOTAL_EXIT=$((PHASE_EXIT + SECRETARY_EXIT))
cat >> "${PROJECT_DIR}/data/usage-log.jsonl" << EOF
{"timestamp":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","session_type":"self-improvement","cost_tier":"standard","agents_invoked":["org-designer","secretary"],"skills_referenced":["human-confirmation"],"summary":"自己改善サイクル Iteration ${ITERATION} (生成+審査+適用)","exit_code":${TOTAL_EXIT}}
EOF

if [ $TOTAL_EXIT -eq 0 ]; then
  log "=== 自己改善サイクル完了 ==="
  log "提案ファイル: outputs/improvements/${PROPOSAL_BASENAME}"
  log "秘書が審査・適用済み。git log で変更履歴を確認してください"
  if [ -f "${PROJECT_DIR}/outputs/improvements/escalated-${DATE}.md" ]; then
    log "⚠️  エスカレーション案件あり: outputs/improvements/escalated-${DATE}.md"
  fi
else
  log "WARNING: エラー発生 (phase12: ${PHASE_EXIT}, phase3: ${SECRETARY_EXIT})"
fi

log "=== ログ: ${LOG_FILE} ==="
