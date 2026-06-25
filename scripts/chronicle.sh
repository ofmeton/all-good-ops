#!/bin/bash
# chronicle — 会話ログの変換・要約・ポートフォリオ生成をまとめて実行
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== 会話ログ変換 ==="
python3 "$SCRIPT_DIR/extract-session.py" --all --summary

echo ""
echo "=== ポートフォリオ生成 ==="
python3 "$SCRIPT_DIR/build-portfolio.py"

echo ""
echo "完了。要約ファイルを編集して発信ネタを追記してください:"
echo "  chronicle/summaries/"
