#!/bin/bash
# optimizer-apply-nightly.sh — LaunchAgent wrapper
#
# launchd は PATH を引き継がないため node/npx の絶対パスを含む PATH を設定する。
# cd はスクリプト位置からの相対解決（worktree/main repo どちらでも動く）。
set -euo pipefail

export PATH="/Users/rikukudo/.nvm/versions/node/v24.14.1/bin:/Users/rikukudo/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

# node が解決できなければ即終了（launchd の標準エラーログに残す）
if ! command -v node >/dev/null 2>&1; then
  echo "[nightly] ERROR: node が見つかりません。PATH=${PATH}" >&2
  exit 1
fi

cd "$(cd "$(dirname "$0")/.." && pwd)"

exec npx tsx scripts/optimizer-apply-nightly.ts "$@"
