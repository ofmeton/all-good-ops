#!/usr/bin/env bash
set -euo pipefail
OUT=/tmp/xad-bundle
rm -rf "$OUT"
npx wrangler deploy --dry-run --outdir "$OUT"
# 実行される bundle (*.js) のみ検査。*.js.map (source map の sourcesContent) は
# 元ソースを丸ごと含むため、未使用の依存 (例: @anthropic-ai/sdk の self-hosted
# agent-toolset = node:fs/child_process) の文字列が残るが、配布も実行もされない。
# node:fs/child_process は wrangler.toml [alias] で空 stub に置換済 (詳細:
# src/stubs/node-empty.js)。本当の混入は実 .js に出るのでそこだけ見る。
if grep -RE --include='*.js' "node:child_process|node:fs|require\(['\"]fs['\"]\)" "$OUT" ; then
  echo "❌ forbidden node:* module leaked into bundle" >&2
  exit 1
fi
echo "OK: no forbidden node:* modules in bundle (*.js)"
