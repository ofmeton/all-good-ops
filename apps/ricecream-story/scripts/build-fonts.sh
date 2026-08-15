#!/usr/bin/env bash
# Merriweather の可変フォントから static instance を切り出して assets/fonts へ置く。
#
# なぜ static にするか: Pillow の set_variation_by_axes は FreeType のビルドに
# 依存するので、可変フォントを実行時にインスタンス化すると両機で字形が微妙に
# 変わりうる。ここで一度だけ焼いて commit し、実行時は静的 TTF を読むだけにする。
#
# なぜ Merriweather Black か: sample の実物と字形を並べて比べた結果（out/font-candidates.png
# を生成して判定）。sample は低コントラストで骨太のセリフ、数字は幅広の lining。
# 当初使った Playfair Display は高コントラストの Didone で、O の上下がヘアラインまで
# 細るため別物だった。Source Serif 4 Black も近かったが Merriweather の方が太い。
#
# 一度走らせて commit すれば以後不要。フォントを更新したい時だけ再実行する。
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FONT_DIR="$APP_DIR/assets/fonts"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

BASE="https://raw.githubusercontent.com/google/fonts/main/ofl/merriweather"
mkdir -p "$FONT_DIR"

echo "downloading upstream variable font + license"
curl -sSfL "$BASE/Merriweather%5Bopsz,wdth,wght%5D.ttf" -o "$WORK/upstream.ttf"
curl -sSfL "$BASE/OFL.txt" -o "$FONT_DIR/OFL.txt"

PY="${RICECREAM_STORY_PYTHON:-$APP_DIR/.venv/bin/python}"
"$PY" -c 'import fontTools' 2>/dev/null || {
  echo "fonttools not installed. run: WITH_DEV=1 scripts/install.sh" >&2
  exit 1
}

# opsz と wdth は必ず固定する。落とすと Pillow 側で既定値が使われ、両機で
# freetype のバージョン差が字形に出る余地が残る。
echo "instancing opsz=144 wdth=100 wght=900 -> Merriweather-Black.ttf"
"$PY" -m fontTools.varLib.instancer \
  "$WORK/upstream.ttf" opsz=144 wdth=100 wght=900 \
  -o "$FONT_DIR/Merriweather-Black.ttf" >/dev/null

echo
echo "sha256 (record these in README.md and cli.py FONT_SHA256):"
shasum -a 256 "$WORK/upstream.ttf" | awk '{print "  " $1 "  upstream Merriweather[opsz,wdth,wght].ttf"}'
( cd "$FONT_DIR" && shasum -a 256 Merriweather-Black.ttf OFL.txt | sed 's/^/  /' )
