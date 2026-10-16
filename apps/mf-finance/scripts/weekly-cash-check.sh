#!/bin/zsh
# launchd（milla-job）から週次の資金チェックを起動する。better-sqlite3 のビルドに合わせて Node 22 を使う。
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
MF_NODE="$(npx --yes node@22 -p 'process.execPath')"
export PATH="$(dirname "$MF_NODE"):$PATH"
exec npx --yes tsx@4.19.2 --conditions=react-server --tsconfig tsconfig.json scripts/weekly-cash-check.ts "$@"
