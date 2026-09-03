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

PY="${RICECREAM_STORY_PYTHON:-$APP_DIR/.venv/bin/python}"

rebuild_en=0
rebuild_jp=0
if [[ "${FORCE_REBUILD:-}" == "1" || ! -f "$FONT_DIR/Merriweather-Black.ttf" ]]; then
  rebuild_en=1
else
  echo "Merriweather-Black.ttf already exists; skipping download and instancing"
fi

# --- 和文（notice レーン用） ---
# なぜ Noto Serif JP Black か: Merriweather Black は低コントラストの骨太セリフ。
# その和文の対は太い明朝で、ゴシックにするとブランドの見え方が変わる。
# 欧文と同じく wght を焼いて静的化する（可変のまま読むと両機で字形がぶれる）。
JP_BASE="https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifjp"

if [[ "${FORCE_REBUILD:-}" == "1" || ! -f "$FONT_DIR/NotoSerifJP-Black.ttf" ]]; then
  rebuild_jp=1
else
  echo "NotoSerifJP-Black.ttf already exists; skipping download and instancing"
fi

if (( rebuild_en || rebuild_jp )); then
  "$PY" -c 'import fontTools' 2>/dev/null || {
    echo "fonttools not installed. run: WITH_DEV=1 scripts/install.sh" >&2
    exit 1
  }
fi

if (( rebuild_en )); then
  echo "downloading upstream variable font + license"
  curl -sSfL "$BASE/Merriweather%5Bopsz,wdth,wght%5D.ttf" -o "$WORK/upstream.ttf"
  curl -sSfL "$BASE/OFL.txt" -o "$FONT_DIR/OFL.txt"

  # opsz と wdth は必ず固定する。落とすと Pillow 側で既定値が使われ、両機で
  # freetype のバージョン差が字形に出る余地が残る。
  echo "instancing opsz=144 wdth=100 wght=900 -> Merriweather-Black.ttf"
  "$PY" -m fontTools.varLib.instancer \
    "$WORK/upstream.ttf" opsz=144 wdth=100 wght=900 \
    -o "$FONT_DIR/Merriweather-Black.ttf" >/dev/null
fi

if (( rebuild_jp )); then
  echo "downloading Noto Serif JP variable font + license"
  curl -sSfL "$JP_BASE/NotoSerifJP%5Bwght%5D.ttf" -o "$WORK/upstream-jp.ttf"
  curl -sSfL "$JP_BASE/OFL.txt" -o "$FONT_DIR/OFL-NotoSerifJP.txt"

  echo "instancing wght=900 -> NotoSerifJP-Black.ttf"
  "$PY" -m fontTools.varLib.instancer \
    "$WORK/upstream-jp.ttf" wght=900 \
    -o "$FONT_DIR/NotoSerifJP-Black.ttf" >/dev/null
fi

echo
echo "sha256 (record these in README.md and cli.py FONT_SHA256):"
if (( rebuild_en )); then
  shasum -a 256 "$WORK/upstream.ttf" | awk '{print "  " $1 "  upstream Merriweather[opsz,wdth,wght].ttf"}'
fi
if (( rebuild_jp )); then
  shasum -a 256 "$WORK/upstream-jp.ttf" | awk '{print "  " $1 "  upstream NotoSerifJP[wght].ttf"}'
fi
( cd "$FONT_DIR" && shasum -a 256 Merriweather-Black.ttf OFL.txt NotoSerifJP-Black.ttf OFL-NotoSerifJP.txt | sed 's/^/  /' )
