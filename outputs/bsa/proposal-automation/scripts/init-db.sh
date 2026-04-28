#!/bin/zsh
set -euo pipefail

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APPDATA="$HOME/Library/Application Support/bsa-pa"
DB_PATH="$APPDATA/data.db"
SCHEMA="$BASE_DIR/src/shared/schema.sql"

mkdir -p "$APPDATA"
chmod 700 "$APPDATA"

if [ -f "$DB_PATH" ]; then
  if [ "${1:-}" = "--force" ]; then
    rm -f "$DB_PATH"
    echo "Removed existing DB at $DB_PATH"
  else
    echo "DB already exists at $DB_PATH. Use --force to recreate."
    exit 0
  fi
fi

sqlite3 "$DB_PATH" < "$SCHEMA"
chmod 600 "$DB_PATH"
echo "✅ DB initialized at $DB_PATH"
sqlite3 "$DB_PATH" ".tables"
