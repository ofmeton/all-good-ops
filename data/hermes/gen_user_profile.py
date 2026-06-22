#!/usr/bin/env python3
"""Generate Hermes user context projection from wiki/self and Claude Code memory."""
import json
import os
import sys
import urllib.request

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MEMORY_DIR = os.path.expanduser("~/.claude/projects/-Users-rikukudo-Projects-private-agents-all-good-ops/memory")
SOURCES = [
    os.path.join(REPO, "wiki", "self", "profile.md"),
    os.path.join(REPO, "wiki", "self", "goals.md"),
    os.path.join(REPO, "wiki", "self", "streams.md"),
    os.path.join(MEMORY_DIR, "user_basic_profile.md"),
    os.path.join(MEMORY_DIR, "user_skills.md"),
    os.path.join(MEMORY_DIR, "user_career_history.md"),
]
OUT = os.path.join(os.path.dirname(__file__), "context", "USER_PROFILE.md")
MODEL = "anthropic/claude-haiku-4.5"


def collect_sources(paths) -> str:
    chunks = []
    for path in paths:
        try:
            with open(path, encoding="utf-8") as f:
                body = f.read()
        except FileNotFoundError:
            continue
        except Exception as e:
            print(f"WARN: skipped unreadable source {path}: {e}", file=sys.stderr)
            continue
        chunks.append(f"### {os.path.basename(path)}\n{body}")
    return "\n\n".join(chunks)


def compress(raw, api_key) -> str:
    instruction = (
        "あなたは個人用エージェントに渡すユーザー文脈の投影を作る編集者です。\n"
        "以下の素材を、3000字以内の Markdown に圧縮してください。\n"
        "冒頭は必ず '# ユーザー文脈（Hermes向け自動生成）' にしてください。\n"
        "節は必ず '## WHO' '## STYLE' '## PROJECTS' '## CONSTRAINTS' の4つだけにしてください。\n"
        "私的内省、感情の詳細、パスワード、秘密鍵、機密情報、過度に個人的な履歴は除外してください。\n"
        "Hermes が Telegram/メモ/カレンダー由来の『あとでやる』を判断する助けになる事実だけを残してください。\n\n"
        f"素材:\n{raw[:18000]}"
    )
    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": instruction}],
        "max_tokens": 1200,
        "temperature": 0,
    }
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=80) as r:
        j = json.loads(r.read().decode("utf-8"))
    return j["choices"][0]["message"]["content"][:3000]


def _load_env_key():
    if os.environ.get("OPENROUTER_API_KEY"):
        return _clean_env_value(os.environ["OPENROUTER_API_KEY"])
    env_path = os.path.expanduser("~/.hermes/.env")
    try:
        with open(env_path, encoding="utf-8-sig") as f:
            lines = f.read().splitlines()
    except Exception:
        return ""
    for raw in lines:
        raw = raw.strip()
        if not raw or raw.startswith("#") or "=" not in raw:
            continue
        key, value = raw.split("=", 1)
        if key.strip() == "OPENROUTER_API_KEY":
            return _clean_env_value(value)
    return ""


def _clean_env_value(v):
    return v.strip().strip('"').strip("'")


def main() -> None:
    dry = "--dry-run" in sys.argv
    raw = collect_sources(SOURCES)
    api_key = _load_env_key()
    if not api_key:
        print("ERROR: OPENROUTER_API_KEY not found", file=sys.stderr)
        sys.exit(1)
    profile = compress(raw, api_key)
    if dry:
        print(profile)
        return
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(profile)
    print(f"wrote {OUT} ({len(profile)} chars)")


if __name__ == "__main__":
    main()
