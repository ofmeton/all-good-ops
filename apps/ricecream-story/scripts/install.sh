#!/usr/bin/env bash
# ricecream-story の専用 venv を作る。両機（MacBook Air / Mac mini）で同じ
# Python 3.11 + Pillow 11.3.0 を得るのが目的（画像出力を決定論にするため）。
#
# 親インタプリタは「両機に確実に存在し、かつバージョンが揃っているもの」を
# 優先する。claude-gateway の venv が第一候補なのは、両機とも 3.11.15 / arm64 で
# 一致していることを確認済みだから。mini には uv も brew も PATH に無い。
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV="$APP_DIR/.venv"

pick_python() {
  local candidates=(
    "${RICECREAM_STORY_PYTHON_BASE:-}"
    "$HOME/Projects/claude-gateway/.venv/bin/python"
    "/opt/homebrew/bin/python3.11"
    "$HOME/.local/bin/python3.11"
  )
  local c
  for c in "${candidates[@]}"; do
    [ -n "$c" ] && [ -x "$c" ] && { echo "$c"; return 0; }
  done
  if command -v python3 >/dev/null 2>&1 &&
     python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)'; then
    command -v python3
    return 0
  fi
  echo "no suitable python (need 3.10+)" >&2
  return 1
}

PY="$(pick_python)"
echo "parent python: $PY ($("$PY" -V 2>&1))"

if [ ! -x "$VENV/bin/python" ]; then
  "$PY" -m venv "$VENV"
fi

"$VENV/bin/python" -m pip install --quiet --upgrade pip
"$VENV/bin/python" -m pip install --quiet -r "$APP_DIR/requirements.txt"
if [ "${WITH_DEV:-0}" = "1" ]; then
  "$VENV/bin/python" -m pip install --quiet -r "$APP_DIR/requirements-dev.txt"
fi

echo "installed:"
"$VENV/bin/python" -c "import PIL, sys; print(' python', sys.version.split()[0]); print(' Pillow', PIL.__version__)"
echo
echo "next: $VENV/bin/python -m ricecream_story.cli doctor"
