#!/bin/bash
# optimizer-apply-nightly.sh — LaunchAgent wrapper
#
# launchd は PATH を引き継がないため node/npx の絶対パスを含む PATH を設定する。
# 注意: merge 後は以下の cd パスを main repo の絶対パスに更新すること。
#   prod: /Users/rikukudo/Projects/private-agents/all-good-ops/apps/x-account-system
set -euo pipefail

export PATH="/Users/rikukudo/.nvm/versions/node/v24.14.1/bin:/Users/rikukudo/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

# node が解決できなければ即終了（launchd の標準エラーログに残す）
if ! command -v node >/dev/null 2>&1; then
  echo "[nightly] ERROR: node が見つかりません。PATH=${PATH}" >&2
  exit 1
fi

cd /Users/rikukudo/Projects/all-good-ops-xad-nightly-apply/apps/x-account-system

exec npx tsx scripts/optimizer-apply-nightly.ts "$@"
