#!/usr/bin/env bash
set -euo pipefail
OUT=/tmp/xad-bundle
rm -rf "$OUT"
npx wrangler deploy --dry-run --outdir "$OUT"
if grep -RE "node:child_process|node:fs|require\(['\"]fs['\"]\)" "$OUT" ; then
  echo "❌ forbidden node:* module leaked into bundle" >&2
  exit 1
fi
echo "OK: no forbidden node:* modules in bundle"
