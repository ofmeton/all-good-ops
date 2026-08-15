#!/usr/bin/env bash
# Playfair Display の可変フォントから static instance を切り出して assets/fonts へ置く。
#
# なぜ static にするか: Pillow の set_variation_by_axes は FreeType のビルドに
# 依存するので、可変フォントを実行時にインスタンス化すると両機で字形が微妙に
# 変わりうる。ここで一度だけ焼いて commit し、実行時は静的 TTF を読むだけにする。
#
# 一度走らせて commit すれば以後不要。フォントを更新したい時だけ再実行する。
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FONT_DIR="$APP_DIR/assets/fonts"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

BASE="https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay"
mkdir -p "$FONT_DIR"

echo "downloading upstream variable font + license"
curl -sSfL "$BASE/PlayfairDisplay%5Bwght%5D.ttf" -o "$WORK/PlayfairDisplay[wght].ttf"
curl -sSfL "$BASE/OFL.txt" -o "$FONT_DIR/OFL.txt"

PY="${RICECREAM_STORY_PYTHON:-$APP_DIR/.venv/bin/python}"
"$PY" -c 'import fontTools' 2>/dev/null || {
  echo "fonttools not installed. run: WITH_DEV=1 scripts/install.sh" >&2
  exit 1
}

for spec in "900:Black" "700:Bold"; do
  wght="${spec%%:*}"
  name="${spec##*:}"
  echo "instancing wght=$wght -> PlayfairDisplay-$name.ttf"
  "$PY" -m fontTools.varLib.instancer \
    "$WORK/PlayfairDisplay[wght].ttf" "wght=$wght" \
    -o "$FONT_DIR/PlayfairDisplay-$name.ttf" >/dev/null
done

echo
echo "sha256 (record these in README.md):"
shasum -a 256 "$WORK/PlayfairDisplay[wght].ttf" | awk '{print "  " $1 "  upstream PlayfairDisplay[wght].ttf"}'
( cd "$FONT_DIR" && shasum -a 256 PlayfairDisplay-*.ttf OFL.txt | sed 's/^/  /' )
