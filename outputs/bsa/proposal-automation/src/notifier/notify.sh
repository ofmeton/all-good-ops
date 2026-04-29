#!/bin/zsh
# BSA Proposal Automation - macOS notification wrapper
# Usage: notify.sh <title> <message> [sound]
set -euo pipefail

TITLE="${1:-BSA-PA}"
MESSAGE="${2:-No message}"
SOUND="${3:-default}"

if ! command -v terminal-notifier >/dev/null 2>&1; then
  echo "terminal-notifier not installed. Install with: brew install terminal-notifier" >&2
  exit 1
fi

terminal-notifier \
  -title "$TITLE" \
  -message "$MESSAGE" \
  -sound "$SOUND" \
  -group "bsa-pa" \
  -sender "com.apple.Terminal" \
  >/dev/null
