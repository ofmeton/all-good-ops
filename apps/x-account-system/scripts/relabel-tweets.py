#!/usr/bin/env python3
"""
既存 Phase 0 競合調査の 928 tweets (10 アカ) を primary_hook + devices で再ラベリング。

入力データ:
  - jp-publishers ブランチの outputs/publishing/research/2026-05-24-jp-ai-publishers/raw/posts/<handle>.json
  - 同 analysis/top-tweets-per-handle.json
  (本 worktree には posts JSON は含まれない。git show で別ブランチから引いてくる)

使い方:
  # Phase 0 worktree から数 (推奨):
  cd /Users/rikukudo/Projects/all-good-ops-phase0
  python3 ../all-good-ops-impl/apps/x-account-system/scripts/relabel-tweets.py \\
      --posts-dir /tmp/phase0/posts \\
      --output /Users/rikukudo/Projects/all-good-ops-impl/apps/x-account-system/data/relabeled-928.json

  # or git show 経由:
  python3 scripts/relabel-tweets.py --git-branch task/260524-jp-ai-publishers-research --output data/relabeled-928.json

出力:
  data/relabeled-928.json : 928 tweets × {handle, id, text, likeCount, primary_hook, devices, confidence}
  stdout:                 集計サマリ (handle × primary_hook ヒートマップ + devices 出現率)
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path

# classify.py を import (PYTHONPATH 解決のため相対 import せず、ファイル位置から path 追加)
THIS = Path(__file__).resolve()
sys.path.insert(0, str(THIS.parent.parent / "lib" / "hook-classifier"))
from classify import classify  # noqa: E402


HANDLES = [
    "umiyuki_ai", "Shimayus", "SuguruKun_ai", "masahirochaen", "kosuke_agos",
    "ClaudeCode_love", "minorun365", "icoxfog417", "ai_jitan", "milbon_",
]


def load_posts_from_dir(posts_dir: Path) -> dict[str, list[dict]]:
    """posts_dir/<handle>.json を全て読み込む。"""
    out: dict[str, list[dict]] = {}
    for h in HANDLES:
        p = posts_dir / f"{h}.json"
        if not p.exists():
            print(f"warn: {p} not found, skip", file=sys.stderr)
            continue
        with p.open(encoding="utf-8") as f:
            out[h] = json.load(f)
    return out


def load_posts_from_git(branch: str) -> dict[str, list[dict]]:
    """git show で別ブランチから JSON を引く。"""
    out: dict[str, list[dict]] = {}
    base = "outputs/publishing/research/2026-05-24-jp-ai-publishers/raw/posts"
    for h in HANDLES:
        path = f"{branch}:{base}/{h}.json"
        try:
            raw = subprocess.run(
                ["git", "show", path],
                check=True, capture_output=True, text=True,
            ).stdout
            out[h] = json.loads(raw)
        except subprocess.CalledProcessError as e:
            print(f"warn: git show {path} failed: {e.stderr}", file=sys.stderr)
    return out


def relabel(posts_by_handle: dict[str, list[dict]]) -> list[dict]:
    rows: list[dict] = []
    for handle, posts in posts_by_handle.items():
        for p in posts:
            if p.get("isReply"):
                continue
            text = p.get("text") or ""
            a = classify(text)
            rows.append({
                "handle": handle,
                "id": p.get("id"),
                "url": p.get("url"),
                "text_preview": text[:120],
                "likeCount": p.get("likeCount", 0),
                "viewCount": p.get("viewCount", 0),
                "primary_hook": a.primary_hook,
                "devices": a.devices,
                "confidence": a.confidence,
            })
    return rows


def summarize(rows: list[dict]) -> dict:
    """handle × primary_hook ヒートマップ + devices 出現率 + 平均 engagement / primary_hook。"""
    by_handle: dict[str, Counter] = defaultdict(Counter)
    device_counter = Counter()
    engagement_by_primary: dict[str, list[float]] = defaultdict(list)

    for r in rows:
        by_handle[r["handle"]][r["primary_hook"]] += 1
        for d in r["devices"]:
            device_counter[d] += 1
        if r.get("viewCount") and r.get("likeCount") is not None:
            views = max(int(r["viewCount"]), 1)
            eng = (int(r["likeCount"]) + 1) / views
            engagement_by_primary[r["primary_hook"]].append(eng)

    primary_dist = Counter()
    for h, cnt in by_handle.items():
        for k, v in cnt.items():
            primary_dist[k] += v

    total = sum(primary_dist.values()) or 1
    return {
        "total_posts": total,
        "primary_distribution_pct": {
            k: round(v / total * 100, 1) for k, v in primary_dist.most_common()
        },
        "by_handle": {
            h: {k: cnt[k] for k in sorted(cnt)} for h, cnt in by_handle.items()
        },
        "devices_top": dict(device_counter.most_common(15)),
        "engagement_by_primary": {
            k: {
                "n": len(v),
                "avg": round(sum(v) / len(v), 5) if v else 0,
                "max": round(max(v), 5) if v else 0,
            }
            for k, v in engagement_by_primary.items()
        },
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--posts-dir", type=Path, help="<handle>.json の入っているローカル dir")
    parser.add_argument("--git-branch", type=str, help="git show で引くブランチ名")
    parser.add_argument("--output", type=Path, default=Path("data/relabeled-928.json"))
    args = parser.parse_args()

    if args.posts_dir:
        posts = load_posts_from_dir(args.posts_dir)
    elif args.git_branch:
        posts = load_posts_from_git(args.git_branch)
    else:
        sys.exit("--posts-dir か --git-branch が必要")

    if not posts:
        sys.exit("posts data 取得失敗")

    rows = relabel(posts)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")

    summary = summarize(rows)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"\n=> {len(rows)} rows written to {args.output}", file=sys.stderr)


if __name__ == "__main__":
    main()
