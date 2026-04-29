#!/bin/zsh
# scripts/relogin.sh - クッキー期限切れ時の再ログイン
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib/env.sh"

echo "🔑 Lancers 再ログイン"

source "$BSA_PA_VENV/bin/activate"
# heredoc 経由だと stdin が input() で読めないため、独立スクリプトを --reuse 付きで呼ぶ
python "$SCRIPT_DIR/lib/_lancers_login.py" --reuse
deactivate
