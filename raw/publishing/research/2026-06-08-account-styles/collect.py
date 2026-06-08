#!/usr/bin/env python3
"""6アカウントの投稿スタイル分析用データ収集（twitterapi.io）。

チャエン分析(2026-06-05)と同じ手法。直近~40日のオリジナル投稿+プロフィールを取得。
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, "/Users/rikukudo/Projects/private-agents/all-good-ops/.claude/scripts")
from twitterapi_io import Client  # noqa: E402

OUT = Path(__file__).parent
TWEETS_DIR = OUT / "tweets"
TWEETS_DIR.mkdir(parents=True, exist_ok=True)

HANDLES = [
    "MakeAI_CEO",
    "ClaudeCode_love",
    "ClaudeCode_UT",
    "nobel_824",
    "Gencoin8",
    "obsidianstudio9",
]
SINCE = "2026-04-29"  # ~40日前
MAX_PER = 200

c = Client()

for h in HANDLES:
    print(f"=== {h} ===", flush=True)
    try:
        info = c.user_info(h)
        (OUT / f"{h}.json").write_text(
            json.dumps(info, ensure_ascii=False, indent=2)
        )
        prof = info.get("data", info)
        print(
            f"  profile: followers={prof.get('followers')} "
            f"name={prof.get('name')}", flush=True
        )
    except Exception as e:
        print(f"  user_info ERROR: {e}", flush=True)

    try:
        tweets = c.advanced_search(
            query=f"from:{h} since:{SINCE}",
            queryType="Latest",
            max_results=MAX_PER,
            max_pages=15,
        )
        (TWEETS_DIR / f"{h}.json").write_text(
            json.dumps(tweets, ensure_ascii=False, indent=2)
        )
        print(f"  tweets: {len(tweets)}", flush=True)
    except Exception as e:
        print(f"  tweets ERROR: {e}", flush=True)

c.save_meta(OUT / "query-meta.json")
print("\n=== SUMMARY ===", flush=True)
print(json.dumps(c.get_call_summary(), ensure_ascii=False, indent=2), flush=True)
