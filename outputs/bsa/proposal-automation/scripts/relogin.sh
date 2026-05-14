#!/bin/zsh
# scripts/relogin.sh - クッキー期限切れ時の再ログイン
# Usage:
#   relogin.sh          # 全媒体（LAN + CW + CN）を再ログイン
#   relogin.sh lan      # Lancers のみ
#   relogin.sh cw       # CrowdWorks のみ
#   relogin.sh cn       # Coconala のみ（提案投下用。collector は cookie 不要）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib/env.sh"

TARGET="${1:-all}"

source "$BSA_PA_VENV/bin/activate"
trap deactivate EXIT

if [ "$TARGET" = "all" ] || [ "$TARGET" = "lan" ]; then
  echo "🔑 Lancers 再ログイン"
  python "$SCRIPT_DIR/lib/_lancers_login.py" --reuse
fi

if [ "$TARGET" = "all" ] || [ "$TARGET" = "cw" ]; then
  echo "🔑 CrowdWorks 再ログイン"
  python "$SCRIPT_DIR/lib/_crowdworks_login.py" --reuse
fi

if [ "$TARGET" = "all" ] || [ "$TARGET" = "cn" ]; then
  echo "🔑 Coconala 再ログイン"
  python "$SCRIPT_DIR/lib/_coconala_login.py" --reuse
fi
