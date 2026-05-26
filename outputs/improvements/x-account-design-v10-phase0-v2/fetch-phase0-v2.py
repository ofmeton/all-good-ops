"""
Phase 0 v2 実 API call スクリプト
================================

Spec: outputs/improvements/x-account-design-v10-phase0-v2/query-design.md

実行内容:
- 20 アカ direct fetch (from:handle since:90d, 100 tweets/acct)
- Q1-Q5 advanced_search (各 100 tweets)
- 24 アカ + 候補 user_info

出力先: raw/publishing/research/2026-05-26-jp-ai-publishers-v2/raw/

cost 想定: $0.375 (= ¥60 概算)
- 20 アカ × 100 tweets = 2,000 tweets → $0.30
- 5 query × 100 tweets = 500 tweets → $0.075
- user_info (24 アカ) は数 ¥ 程度 (cost に含めない概算)

使い方:
  python3 fetch-phase0-v2.py --dry-run
  python3 fetch-phase0-v2.py --execute --confirm-cost-jpy=60
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

WORKTREE_ROOT = Path("/Users/rikukudo/Projects/all-good-ops-x-account-phase0-v2")
sys.path.insert(0, str(WORKTREE_ROOT / ".claude/scripts"))
from twitterapi_io import Client  # noqa: E402


OUT_BASE = WORKTREE_ROOT / "raw/publishing/research/2026-05-26-jp-ai-publishers-v2/raw"

# 20 アカ (raw/publishing/inspirations/2026-05-26-reference-accounts.md §2 より)
HANDLES_20 = [
    "ClaudeCode_UT", "obsidianstudio9", "MakeAI_CEO", "mmmiyama_D", "tetumemo",
    "claudecode_lab", "ObsidianOtaku", "so_ainsight", "Codestudiopjbk", "exploraX_",
    "jason_coder0", "heynavtoor", "ethancoder0", "cyrilXBT", "daifukujinji",
    "Fluyeporlaweb", "commte", "csaba_kissi", "ai_explorer25", "Atenov_D",
]
# 既存 4 アカ (raw 流用、新規 fetch 不要だが user_info だけ取得して最新メトリクスを更新)
HANDLES_4_EXISTING = ["Shimayus", "SuguruKun_ai", "masahirochaen", "ClaudeCode_love"]

# query-design.md §1.3 の Q1-Q5
QUERIES = [
    {"id": "Q1", "query": '"AI" ("中小" OR "経営者" OR "1人社長") -is:retweet lang:ja min_faves:50'},
    {"id": "Q2", "query": '"AI" ("士業" OR "経理代行" OR "事務代行" OR "業務代行") -is:retweet lang:ja min_faves:30'},  # v1.2 で改訂
    {"id": "Q3", "query": '("業務効率化" OR "業務自動化") "AI" -is:retweet lang:ja min_faves:50'},
    {"id": "Q4", "query": '"Claude" ("経理" OR "請求書" OR "見積") -is:retweet lang:ja min_faves:30'},
    {"id": "Q5", "query": '"AI automation" ("small business" OR "non-engineer" OR "non-coder") -is:retweet lang:en min_faves:100'},
]

TWEETS_PER_FETCH = 100
SINCE_DAYS = 90


def estimate_cost() -> dict:
    direct_tweets = len(HANDLES_20) * TWEETS_PER_FETCH
    search_tweets = len(QUERIES) * TWEETS_PER_FETCH
    total_tweets = direct_tweets + search_tweets
    cost_usd = round(total_tweets / 1000.0 * 0.15, 4)
    return {
        "direct_fetch_tweets": direct_tweets,
        "search_query_tweets": search_tweets,
        "total_tweets": total_tweets,
        "user_info_calls": len(HANDLES_20) + len(HANDLES_4_EXISTING),
        "estimated_cost_usd": cost_usd,
        "estimated_cost_jpy": int(cost_usd * 160),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--confirm-cost-jpy", type=int, default=0)
    args = parser.parse_args()

    est = estimate_cost()
    print("=== Phase 0 v2 cost estimate ===")
    for k, v in est.items():
        print(f"  {k}: {v}")

    if args.dry_run:
        return 0

    if not args.execute:
        print("\n--execute を指定すると本実行します")
        return 0

    if args.confirm_cost_jpy != est["estimated_cost_jpy"]:
        print(f"\nERROR: --confirm-cost-jpy={args.confirm_cost_jpy} が見積 ¥{est['estimated_cost_jpy']} と不一致")
        return 1

    OUT_BASE.mkdir(parents=True, exist_ok=True)
    (OUT_BASE / "posts").mkdir(exist_ok=True)

    client = Client(pacing=2.0)
    since_date = (datetime.now(timezone.utc) - timedelta(days=SINCE_DAYS)).date().isoformat()
    print(f"\nsince:{since_date}")

    # ---- 1. 20 アカ direct fetch ----
    print(f"\n=== 1. 20 アカ direct fetch (since:{since_date}, {TWEETS_PER_FETCH}/acct) ===")
    summary_posts: dict[str, dict] = {}
    for i, h in enumerate(HANDLES_20, 1):
        try:
            tweets = client.from_user_tweets(h, since=since_date, max_results=TWEETS_PER_FETCH)
            out_path = OUT_BASE / "posts" / f"{h}.json"
            out_path.write_text(json.dumps({"handle": h, "since": since_date, "tweets": tweets},
                                          ensure_ascii=False, indent=2, default=str))
            summary_posts[h] = {"tweets_fetched": len(tweets), "path": str(out_path.relative_to(OUT_BASE))}
            print(f"  [{i}/{len(HANDLES_20)}] {h}: {len(tweets)} tweets")
        except Exception as e:
            print(f"  [{i}/{len(HANDLES_20)}] {h}: ERROR {e}")
            summary_posts[h] = {"tweets_fetched": 0, "error": str(e)}

    # ---- 2. Q1-Q5 advanced search ----
    print(f"\n=== 2. Q1-Q5 advanced_search ({TWEETS_PER_FETCH}/query) ===")
    handle_hits: dict[str, int] = {}
    for q in QUERIES:
        try:
            tweets = client.advanced_search(q["query"], queryType="Top",
                                            max_results=TWEETS_PER_FETCH)
            out_path = OUT_BASE / f"bursts-{q['id'].lower()}.json"
            out_path.write_text(json.dumps({
                "id": q["id"], "query": q["query"], "tweets": tweets,
            }, ensure_ascii=False, indent=2, default=str))
            for t in tweets:
                author = (t.get("author") or {}).get("userName") or ""
                if author:
                    handle_hits[author] = handle_hits.get(author, 0) + 1
            print(f"  {q['id']}: {len(tweets)} tweets")
        except Exception as e:
            print(f"  {q['id']}: ERROR {e}")

    candidates = sorted(handle_hits.items(), key=lambda x: x[1], reverse=True)
    (OUT_BASE / "candidates-from-search.json").write_text(json.dumps({
        "by_handle_count": [{"handle": h, "hit_count": c} for h, c in candidates],
    }, ensure_ascii=False, indent=2))
    print(f"  candidates discovered: {len(candidates)} unique handles")

    # ---- 3. user_info for 24 accounts (20 new + 4 existing) ----
    print(f"\n=== 3. user_info for {len(HANDLES_20) + len(HANDLES_4_EXISTING)} accounts ===")
    user_metrics: dict[str, dict] = {}
    for h in HANDLES_20 + HANDLES_4_EXISTING:
        try:
            info = client.user_info(h)
            user_metrics[h] = info.get("data") or info
        except Exception as e:
            user_metrics[h] = {"error": str(e)}
    (OUT_BASE / "account-metrics.json").write_text(json.dumps(user_metrics, ensure_ascii=False, indent=2, default=str))

    # ---- 4. summary + query-meta.json ----
    (OUT_BASE / "posts" / "_summary.json").write_text(json.dumps({
        "session_date": datetime.now(timezone.utc).date().isoformat(),
        "since_date": since_date,
        "handles_fetched": summary_posts,
    }, ensure_ascii=False, indent=2))
    client.save_meta(OUT_BASE / "query-meta.json")

    print("\n=== done ===")
    summary = client.get_call_summary()
    for k, v in summary.items():
        print(f"  {k}: {v}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
