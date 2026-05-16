#!/usr/bin/env bash
# responsive-snap.sh — 全 viewport で full-page スクショ + 横スクロール自動検出
#
# Usage:
#   ./scripts/responsive-snap.sh [URL] [PAGES] [PRESET]
#
#   URL     base URL (default: http://localhost:3000)
#   PAGES   comma-separated paths (default: /)
#   PRESET  viewport preset: default|lp|mobile (default: default)
#
# Examples:
#   ./scripts/responsive-snap.sh
#   ./scripts/responsive-snap.sh http://localhost:3000 "/,/about,/rooms,/stay,/access"
#   ./scripts/responsive-snap.sh http://localhost:3001 "/" lp
#
# Output:
#   tmp/responsive/<timestamp>/{manifest.json,report.json,*.png}
#   stdout: summary table + overflow count
#
# Exit code:
#   0  全 viewport で overflow なし・エラーなし
#   1  console error あり
#   2  overflow / nav error あり
#   99 内部エラー

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLS_DIR="$REPO_ROOT/scripts/.responsive-tools"

URL="${1:-http://localhost:3000}"
PAGES="${2:-/}"
PRESET="${3:-default}"

if [ ! -d "$TOOLS_DIR/node_modules" ]; then
  echo "[responsive-snap] installing playwright (one-time)..." >&2
  (cd "$TOOLS_DIR" && npm install --no-audit --no-fund --silent)
  (cd "$TOOLS_DIR" && npx playwright install chromium >/dev/null)
fi

TS="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="$REPO_ROOT/tmp/responsive/$TS"
mkdir -p "$OUT_DIR"

echo "[responsive-snap] base=$URL pages=$PAGES preset=$PRESET" >&2
echo "[responsive-snap] out=$OUT_DIR" >&2

set +e
node "$TOOLS_DIR/snap.mjs" \
  --base "$URL" \
  --pages "$PAGES" \
  --out "$OUT_DIR" \
  --viewports "$PRESET"
RC=$?
set -e

echo "" >&2
case $RC in
  0) echo "[responsive-snap] ✓ clean" >&2 ;;
  1) echo "[responsive-snap] ! console errors detected (see $OUT_DIR/report.json)" >&2 ;;
  2) echo "[responsive-snap] ✗ overflow or nav error detected (see $OUT_DIR/report.json)" >&2 ;;
  *) echo "[responsive-snap] internal error rc=$RC" >&2 ;;
esac

exit $RC
