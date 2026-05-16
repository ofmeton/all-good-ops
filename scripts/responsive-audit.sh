#!/usr/bin/env bash
# responsive-audit.sh — レイアウト崩れのホットスポットを静的解析で特定
#
# Usage:
#   ./scripts/responsive-audit.sh [DIR]
#
#   DIR  解析対象ディレクトリ (default: .)
#
# Output:
#   Fixed widths       width:Npx / w-[Npx] / min-w-[Npx] の場所
#   nowrap             whitespace-nowrap の総数 + 多用ファイル
#   overflow-x:hidden  崩れ隠しの疑い箇所
#   clamp() adoption   text サイズ宣言中の clamp() 採用率
#
# Exit code: 常に 0（情報提示のみ）

set -uo pipefail

TARGET_DIR="${1:-.}"

if ! command -v rg >/dev/null 2>&1; then
  echo "rg (ripgrep) が必要です: brew install ripgrep" >&2
  exit 99
fi

# Scope: .tsx / .jsx / .ts / .js / .html / .css / .scss
TYPES=(--type-add 'web:*.{tsx,jsx,ts,js,html,css,scss,vue,svelte}' --type web)

cd "$TARGET_DIR"

print_section() {
  printf "\n== %s ==\n" "$1"
}

# Helper: run rg, swallow exit code (0=match / 1=no match / 2=error)
rg_safe() {
  rg "$@" 2>/dev/null || true
}

count_lines() {
  awk 'END { print NR }'
}

# 1. Fixed widths in CSS-in-JS and CSS
print_section "Fixed widths (max-width / min-width 除く)"
FIXED_PATTERNS=(
  '-e' '(?<!max-)(?<!min-)\bwidth:\s*[0-9]+px'
  '-e' '(?<!max-)(?<!min-)\bw-\[[0-9]+px\]'
  '-e' '\bmin-w-\[[0-9]+px\]'
)
fixed_count=$(rg_safe "${TYPES[@]}" -n --pcre2 "${FIXED_PATTERNS[@]}" | count_lines)
echo "Total: $fixed_count occurrences"
if [ "$fixed_count" -gt 0 ]; then
  echo "First 20:"
  rg_safe "${TYPES[@]}" -n --pcre2 "${FIXED_PATTERNS[@]}" | head -20
fi

# 2. whitespace-nowrap
print_section "whitespace-nowrap"
NOWRAP_PATTERNS=(-e 'whitespace-nowrap' -e 'white-space:\s*nowrap')
nowrap_count=$(rg_safe "${TYPES[@]}" -n "${NOWRAP_PATTERNS[@]}" | count_lines)
echo "Total: $nowrap_count occurrences"
if [ "$nowrap_count" -gt 0 ]; then
  echo "Top files:"
  rg_safe "${TYPES[@]}" -l "${NOWRAP_PATTERNS[@]}" \
    | while read -r f; do
        c=$(rg_safe -c "${NOWRAP_PATTERNS[@]}" "$f")
        echo "  $c  $f"
      done | sort -rn | head -10
fi

# 3. overflow-x: hidden (suspect: layout breakage cover-up)
print_section "overflow-x: hidden (崩れ隠しの疑い)"
OXH_PATTERNS=(-e 'overflow-x-hidden' -e 'overflow-x:\s*hidden')
oxh_count=$(rg_safe "${TYPES[@]}" -n "${OXH_PATTERNS[@]}" | count_lines)
echo "Total: $oxh_count occurrences"
if [ "$oxh_count" -gt 0 ]; then
  echo "All occurrences:"
  rg_safe "${TYPES[@]}" -n "${OXH_PATTERNS[@]}" | head -20
fi

# 4. clamp() adoption rate among text-size declarations
print_section "clamp() 採用率（テキストサイズ）"
text_decl=$(rg_safe "${TYPES[@]}" -o -e 'text-\[[^]]+\]' -e 'font-size:\s*[^;]+' | count_lines)
clamp_decl=$(rg_safe "${TYPES[@]}" -o -e 'text-\[clamp\([^]]+\]' -e 'font-size:\s*clamp\([^;]+' | count_lines)
if [ "$text_decl" -eq 0 ]; then
  echo "テキストサイズ宣言なし"
else
  rate=$(( clamp_decl * 100 / text_decl ))
  echo "clamp() / total = $clamp_decl / $text_decl  (${rate}%)"
fi

# 5. Font-size pxの hardcode（mobile-first 反例）
print_section "テキストサイズ px のハードコード（参考）"
hardcoded=$(rg_safe "${TYPES[@]}" -o -e 'text-\[[0-9]+px\]' | count_lines)
echo "Total: $hardcoded occurrences (responsive 化候補)"
if [ "$hardcoded" -gt 0 ]; then
  rg_safe "${TYPES[@]}" -o -e 'text-\[[0-9]+px\]' | sort | uniq -c | sort -rn | head -10
fi

printf "\n=== 推奨アクション ===\n"
printf "  - overflow-x: hidden があるなら、その親要素で何が hidden されているか追跡（崩れの根本原因）\n"
printf "  - 固定 px は max-width / flex-basis / grid auto-fit minmax で置換\n"
printf "  - 日本語 nowrap は意味のかたまり単位（feedback_no_orphan_linebreaks）。改行は .line + .chunk + mobile normal の3層\n"
printf "  - clamp(min, vw, max) 採用率を上げ、固定 px hardcode を減らす\n"
printf "  - 検証: ./scripts/responsive-snap.sh <url> <pages> で全 viewport 横スクロール確認\n"
