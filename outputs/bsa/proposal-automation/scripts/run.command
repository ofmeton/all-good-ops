#!/bin/zsh
# scripts/run.command - デスクトップから呼ばれるメインスクリプト。
# Stage 1: collector (Lancers 収集 + fit_score 計算)
# Stage 2: generator (上位10件の提案文生成)
# Stage 3: notifier (macOS 通知 + Gmail 送信)
# Stage 4: dashboard 起動 + ブラウザで開く
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib/env.sh"

NOTIFY="$BSA_PA_BASE/src/notifier/notify.sh"
LOG_FILE="$BSA_PA_APPDATA/run-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

trap 'on_error $?' ERR

on_error() {
  if [ -x "$NOTIFY" ]; then
    bash "$NOTIFY" "❌ BSA-PA エラー" "ステージで失敗。$LOG_FILE を確認" || true
  fi
  echo "Press Enter to close..."
  read -t 60 -r _ || true
  exit "${1:-1}"
}

START_TIME=$(date +%s)

echo "📥 BSA 案件収集を開始します..."
echo "ログ: $LOG_FILE"
echo ""

# Stage 1: collector + scorer
echo "🔍 Stage 1: 案件を収集中..."
source "$BSA_PA_VENV/bin/activate"
cd "$BSA_PA_BASE/src/collector"
if ! python -m main; then
  if [ -x "$NOTIFY" ]; then
    bash "$NOTIFY" "🔑 Lancers セッション切れ" "scripts/relogin.sh を実行してください"
  fi
  echo ""
  echo "Press Enter to close"
  read -t 60 -r _ || true
  exit 1
fi
deactivate

# Stage 2: generator
echo ""
echo "📝 Stage 2: 提案文を生成中..."
cd "$BSA_PA_BASE/src/generator"
npx tsx src/main.ts

# Stage 3: notify
echo ""
echo "🔔 Stage 3: 通知中..."
COLLECTED=$(sqlite3 "$BSA_PA_DB" "SELECT COUNT(*) FROM jobs WHERE date(collected_at)=date('now','localtime')")
PROPOSED=$(sqlite3 "$BSA_PA_DB" "SELECT COUNT(*) FROM proposals WHERE date(generated_at)=date('now','localtime')")
HIGH=$(sqlite3 "$BSA_PA_DB" "SELECT COUNT(*) FROM jobs WHERE date(collected_at)=date('now','localtime') AND fit_score>=80")
MID=$(sqlite3 "$BSA_PA_DB" "SELECT COUNT(*) FROM jobs WHERE date(collected_at)=date('now','localtime') AND fit_score>=60 AND fit_score<80")
LOW=$(sqlite3 "$BSA_PA_DB" "SELECT COUNT(*) FROM jobs WHERE date(collected_at)=date('now','localtime') AND fit_score>=40 AND fit_score<60")

if [ -x "$NOTIFY" ]; then
  bash "$NOTIFY" \
    "📥 BSA 収集完了" \
    "${COLLECTED}件収集 / ${PROPOSED}件提案準備済み (🔥${HIGH} 🎯${MID} 📋${LOW})"
fi

cd "$BSA_PA_BASE/src/notifier"
npx tsx gmail.ts || echo "⚠️ Gmail 送信失敗（無視して続行）"

# Stage 4: dashboard 起動 + ブラウザ
echo ""
echo "🌐 Stage 4: ダッシュボードを起動..."
DASH_PID_FILE="$BSA_PA_APPDATA/dashboard.pid"
if [ -f "$DASH_PID_FILE" ] && kill -0 "$(cat "$DASH_PID_FILE")" 2>/dev/null; then
  echo "Dashboard already running (PID $(cat "$DASH_PID_FILE"))"
else
  cd "$BSA_PA_BASE/src/dashboard"
  nohup npm run dev > "$BSA_PA_APPDATA/dashboard.log" 2>&1 &
  echo $! > "$DASH_PID_FILE"
  sleep 4
fi

open http://127.0.0.1:3000

ELAPSED=$(($(date +%s) - START_TIME))
echo ""
echo "✅ 完了 (${ELAPSED}秒)。ブラウザでダッシュボードを確認してください。"
echo "（このウィンドウは 60秒後に自動で閉じます）"
sleep 60
exit 0
