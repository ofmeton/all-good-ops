#!/bin/zsh
# 毎晩 22:00 の DMM 進捗。mini のルーティン dmm-daily-progress から起動する。
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export GOOGLE_WORKSPACE_CLI_KEYRING_BACKEND=file
MF_NODE="$(npx --yes node@22 -p 'process.execPath')"
export PATH="$(dirname "$MF_NODE"):$PATH"
exec npx --yes tsx@4.19.2 --conditions=react-server --tsconfig tsconfig.json scripts/dmm-daily-progress.ts "$@"
