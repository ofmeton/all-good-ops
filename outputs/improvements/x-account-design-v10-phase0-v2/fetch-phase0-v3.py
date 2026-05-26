"""
Phase 0 v3 競合調査 実 API call スクリプト (query-design-v2 準拠)

A 系 publisher_discovery 5 query + B 系 audience_validation 5 query = 10 query
推定コスト ¥24 (実 dry-run で確定、Codex round 2 C-4 整合)

使い方:
  python3 fetch-phase0-v3.py --dry-run
  python3 fetch-phase0-v3.py --execute --confirm-cost-jpy=24
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

WORKTREE = Path(__file__).resolve().parents[3]  # H-9: worktree 相対パス
sys.path.insert(0, str(WORKTREE / ".claude/scripts"))
from twitterapi_io import Client  # noqa: E402

OUT_BASE = WORKTREE / "raw/publishing/research/2026-05-26-jp-ai-publishers-v3/raw"

# A 系: publisher_discovery (Claude/Codex/Obsidian/MCP 軸)
A_QUERIES = [
    {"id": "A1", "category": "publisher_discovery",
     "query": '"Claude Code" (使い方 OR 設定 OR 活用 OR 導入 OR 解説) -is:retweet lang:ja min_faves:30'},
    {"id": "A2", "category": "publisher_discovery",
     "query": '("Codex" OR "codex cli" OR "@openai/codex") (MCP OR エージェント OR 自動化 OR コマンド) -is:retweet lang:ja min_faves:30'},
    {"id": "A3", "category": "publisher_discovery",
     "query": '("Obsidian" OR "#Obsidian") (Claude OR GPT OR AI OR プロンプト) (運用 OR ワークフロー OR 保存 OR Vault) -is:retweet lang:ja min_faves:20'},
    {"id": "A4", "category": "publisher_discovery",
     "query": '("MCP" OR "Model Context Protocol" OR "Claude Desktop" OR "AIエージェント") (連携 OR ツール OR 実装 OR 自作) -is:retweet lang:ja min_faves:30'},
    {"id": "A5", "category": "publisher_discovery",
     "query": '("Claude Code" OR "Codex" OR "Obsidian" OR "AI agent") (workflow OR automation OR tutorial OR setup) -is:retweet lang:en min_faves:50'},
]

# B 系: audience_validation (中小経営者 / コンサル / 業務代行 / 業務効率化 軸)
B_QUERIES = [
    {"id": "B1", "category": "audience_validation",
     "query": '"AI" ("中小" OR "経営者" OR "1人社長" OR "個人事業主") (困っ OR 始め OR どう OR 使え) -is:retweet lang:ja min_faves:10'},
    {"id": "B2", "category": "audience_validation",
     "query": '"AI" ("コンサル" OR "業務代行" OR "経理代行" OR "事務代行") (実装 OR 効率化 OR 活用) -is:retweet lang:ja min_faves:10'},
    {"id": "B3", "category": "audience_validation",
     "query": '("業務効率化" OR "業務自動化" OR "ChatGPT 活用" OR "AI 導入") -is:retweet lang:ja min_faves:30'},
    {"id": "B4", "category": "audience_validation",
     "query": '"AI" ("経理" OR "請求書" OR "見積" OR "Excel" OR "スプレッドシート") (自動 OR 効率 OR Claude OR GPT) -is:retweet lang:ja min_faves:20'},
    {"id": "B5", "category": "audience_validation",
     "query": '"AI" ("士業" OR "税理士" OR "社労士" OR "行政書士" OR "弁護士") (業務 OR 自動化 OR DX) -is:retweet lang:ja min_faves:10'},
]

ALL_QUERIES = A_QUERIES + B_QUERIES
TWEETS_PER_QUERY = 100


def estimate_cost() -> dict:
    total = len(ALL_QUERIES) * TWEETS_PER_QUERY
    cost_usd = round(total / 1000.0 * 0.15, 4)
    return {
        "queries": len(ALL_QUERIES),
        "tweets_per_query": TWEETS_PER_QUERY,
        "total_tweets": total,
        "cost_usd": cost_usd,
        "cost_jpy": int(cost_usd * 160),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--confirm-cost-jpy", type=int, default=0)
    args = parser.parse_args()

    est = estimate_cost()
    print("=== Phase 0 v3 cost estimate ===")
    for k, v in est.items():
        print(f"  {k}: {v}")

    if args.dry_run:
        return 0
    if not args.execute:
        print("\n--execute を指定すると本実行します")
        return 0
    if args.confirm_cost_jpy != est["cost_jpy"]:
        print(f"\nERROR: --confirm-cost-jpy={args.confirm_cost_jpy} が見積 ¥{est['cost_jpy']} と不一致")
        return 1

    OUT_BASE.mkdir(parents=True, exist_ok=True)
    (OUT_BASE / "publisher-discovery").mkdir(exist_ok=True)
    (OUT_BASE / "audience-validation").mkdir(exist_ok=True)

    client = Client(pacing=2.0)
    handle_hits_a: dict[str, int] = {}
    handle_hits_b: dict[str, int] = {}
    inputs_manifest: list[dict] = []

    for q in ALL_QUERIES:
        try:
            tweets = client.advanced_search(q["query"], queryType="Top", max_results=TWEETS_PER_QUERY)
            sub = "publisher-discovery" if q["category"] == "publisher_discovery" else "audience-validation"
            handle_dict = handle_hits_a if q["category"] == "publisher_discovery" else handle_hits_b
            slug = {
                "A1": "claude-code", "A2": "codex", "A3": "obsidian", "A4": "mcp-agent", "A5": "en-overseas",
                "B1": "business-owner", "B2": "consultant", "B3": "efficiency", "B4": "bookkeeping", "B5": "licensed-pro",
            }[q["id"]]
            out_path = OUT_BASE / sub / f"{q['id']}-{slug}.json"
            out_path.write_text(json.dumps({
                "id": q["id"], "category": q["category"], "query": q["query"],
                "tweets": tweets,
            }, ensure_ascii=False, indent=2, default=str))

            # H-9: inputs manifest
            tweet_ids = [t.get("id") or t.get("id_str") or "" for t in tweets]
            inputs_manifest.append({
                "query_id": q["id"], "category": q["category"], "tweets_count": len(tweets),
                "tweet_ids": tweet_ids,
            })

            for t in tweets:
                author = (t.get("author") or {}).get("userName") or ""
                if author:
                    handle_dict[author] = handle_dict.get(author, 0) + 1
            print(f"  {q['id']} [{q['category'][:3]}]: {len(tweets)} tweets")
        except Exception as e:
            print(f"  {q['id']}: ERROR {e}")

    # merged candidates
    all_handles = {}
    for h, c in handle_hits_a.items():
        all_handles.setdefault(h, {"publisher_hits": 0, "audience_hits": 0})["publisher_hits"] = c
    for h, c in handle_hits_b.items():
        all_handles.setdefault(h, {"publisher_hits": 0, "audience_hits": 0})["audience_hits"] = c

    merged_sorted = sorted(all_handles.items(),
                           key=lambda x: -(x[1]["publisher_hits"] * 2 + x[1]["audience_hits"]))
    (OUT_BASE / "candidates-merged.json").write_text(json.dumps({
        "session_date": datetime.now(timezone.utc).date().isoformat(),
        "publisher_hits_unique": len(handle_hits_a),
        "audience_hits_unique": len(handle_hits_b),
        "merged_total_unique": len(all_handles),
        "by_handle": [{"handle": h, **v} for h, v in merged_sorted],
    }, ensure_ascii=False, indent=2))
    (OUT_BASE / "inputs-manifest.json").write_text(json.dumps({
        "session_date": datetime.now(timezone.utc).date().isoformat(),
        "selection_rule": "top by relevance (queryType=Top) from twitterapi.io advanced_search",
        "queries": inputs_manifest,
    }, ensure_ascii=False, indent=2))
    client.save_meta(OUT_BASE / "query-meta.json")

    print(f"\n=== done ===")
    print(f"  publisher unique handles: {len(handle_hits_a)}")
    print(f"  audience unique handles: {len(handle_hits_b)}")
    print(f"  merged unique: {len(all_handles)}")
    summary = client.get_call_summary()
    for k, v in summary.items():
        print(f"  {k}: {v}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
