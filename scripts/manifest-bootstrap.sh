#!/bin/bash
# manifest-bootstrap.sh — raw/.manifest.json 初回バックフィル（1 回限り）
#
# 対象: raw/publishing/inspirations/ 直下の取り込み済 raw ファイル
# 関連: wiki/SCHEMA.md §ingest プロトコル §manifest check
# 設計: docs/superpowers/specs/2026-05-22-llm-wiki-claude-obsidian-adoption-design.md §Phase 3

set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

python3 << 'PYEOF'
import json
import hashlib
import re
from pathlib import Path

manifest_path = Path("raw/.manifest.json")
manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {
    "schema_version": 1,
    "description": "LLM-managed delta tracking for raw/ ingest. Exempt from raw/ immutability.",
    "sources": {}
}

raw_dir = Path("raw/publishing/inspirations")
wiki_dir = Path("wiki/publishing/inspirations")

def slug_from_raw(name: str) -> str:
    # raw 側の命名: <media>-YYYYMMDD-<slug>.md
    # wiki 側の命名: <media>-YYYY-MM-DD-<slug>.md
    m = re.match(r"^([^-]+)-(\d{4})(\d{2})(\d{2})-(.+)\.md$", name)
    if not m:
        return name
    media, yyyy, mm, dd, rest = m.groups()
    return f"{media}-{yyyy}-{mm}-{dd}-{rest}.md"

added = 0
skipped = 0
for raw_file in sorted(raw_dir.glob("*.md")):
    if raw_file.name == "README.md":
        continue
    rel = str(raw_file)
    if rel in manifest.get("sources", {}):
        skipped += 1
        continue
    h = hashlib.md5(raw_file.read_bytes()).hexdigest()

    # wiki 側のファイル名は日付を YYYY-MM-DD 形式に分割している可能性が高い
    candidates = [
        wiki_dir / raw_file.name,
        wiki_dir / slug_from_raw(raw_file.name),
    ]
    # 英数字以外も探す（日本語混じり対応）
    pages_created = []
    for c in candidates:
        if c.exists():
            pages_created = [str(c)]
            break
    if not pages_created:
        # フォールバック: media + 末尾 slug 部分一致
        prefix = raw_file.stem.split("-")[0]
        for w in wiki_dir.glob(f"{prefix}-*.md"):
            pages_created = [str(w)]
            break

    manifest.setdefault("sources", {})[rel] = {
        "hash": f"md5:{h}",
        "ingested_at": "2026-05-20",
        "pages_created": pages_created,
        "pages_updated": [
            "wiki/publishing/buzz-patterns.md",
            "wiki/publishing/index.md",
            "wiki/publishing/log.md"
        ],
        "backfilled": True
    }
    added += 1

manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
print(f"backfilled: {added}, skipped (already in manifest): {skipped}")
print(f"total manifest entries: {len(manifest.get('sources', {}))}")
PYEOF
