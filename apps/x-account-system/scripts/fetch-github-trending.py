"""
GitHub Trending 日次取得スクリプト (v1.2 で導入)

style-guide-v1.2 §1.2 / §2.5 No.3 に従い、毎日 07:00 JST に GitHub Trending を scrape して
raw/publishing/github-trending/YYYY-MM-DD.json に永続化する。

公式 API が無いため HTML scrape で取得。1 req/day = 無料。

実行:
  python3 apps/x-account-system/scripts/fetch-github-trending.py
  python3 apps/x-account-system/scripts/fetch-github-trending.py --since-period weekly
  python3 apps/x-account-system/scripts/fetch-github-trending.py --languages python,typescript,javascript
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

DEFAULT_LANGUAGES = ["", "python", "typescript", "javascript", "go", "rust"]
BASE = "https://github.com/trending"
USER_AGENT = "ofmeton-trending-fetch/1.0 (https://github.com/ofmeton/all-good-ops)"


class TrendingParser(HTMLParser):
    """github.com/trending の article 要素から repo メタを抽出する最小 parser"""

    def __init__(self) -> None:
        super().__init__()
        self.repos: list[dict] = []
        self._in_article = False
        self._current: dict = {}
        self._capture: str | None = None
        self._buffer = ""

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "article" and "Box-row" in a.get("class", ""):
            self._in_article = True
            self._current = {}
        if not self._in_article:
            return
        if tag == "a" and "owner" not in a.get("href", "")[1:].split("/")[:1] and a.get("href", "").count("/") == 2:
            # /owner/repo 形式の最初の link が repo URL
            if "full_name" not in self._current:
                self._current["full_name"] = a["href"].lstrip("/")
                self._current["url"] = f"https://github.com{a['href']}"
        if tag == "p":
            cls = a.get("class", "")
            if "col-9" in cls or "my-1" in cls or "pr-4" in cls:
                self._capture = "description"
                self._buffer = ""
        if tag == "span":
            cls = a.get("class", "")
            if "d-inline-block" in cls and "ml-0" in cls:
                self._capture = "language"
                self._buffer = ""

    def handle_data(self, data):
        if self._capture:
            self._buffer += data

    def handle_endtag(self, tag):
        if tag == "p" and self._capture == "description":
            self._current["description"] = re.sub(r"\s+", " ", self._buffer).strip()
            self._capture = None
        if tag == "span" and self._capture == "language":
            lang = re.sub(r"\s+", " ", self._buffer).strip()
            if lang:
                self._current["language"] = lang
            self._capture = None
        if tag == "article" and self._in_article:
            if self._current.get("full_name"):
                self.repos.append(self._current)
            self._in_article = False
            self._current = {}


def fetch_trending(language: str = "", since: str = "daily") -> list[dict]:
    url = BASE + (f"/{language}" if language else "") + f"?since={since}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        html = resp.read().decode("utf-8", errors="ignore")
    p = TrendingParser()
    p.feed(html)
    repos = p.repos[:25]  # GitHub Trending は通常 25 件
    for r in repos:
        r["fetched_language_filter"] = language or "all"
        r["since"] = since
    return repos


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--since-period", choices=["daily", "weekly", "monthly"], default="daily")
    parser.add_argument("--languages", default=",".join(DEFAULT_LANGUAGES),
                        help="comma-separated languages (空文字 = all). default: all,python,typescript,javascript,go,rust")
    parser.add_argument("--output-dir", default=None,
                        help="default: <repo>/raw/publishing/github-trending/")
    args = parser.parse_args()

    today = datetime.now(timezone.utc).date().isoformat()
    out_dir = Path(args.output_dir) if args.output_dir else (
        Path(__file__).resolve().parents[3] / "raw/publishing/github-trending"
    )
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{today}.json"

    all_repos: dict[str, list[dict]] = {}
    for lang in args.languages.split(","):
        lang = lang.strip()
        key = lang or "all"
        try:
            repos = fetch_trending(language=lang, since=args.since_period)
            all_repos[key] = repos
            print(f"  [{key:<12}] {len(repos)} repos")
            time.sleep(1.0)  # 連続 req を避ける
        except Exception as e:
            print(f"  [{key:<12}] ERROR {e}", file=sys.stderr)
            all_repos[key] = []

    payload = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "since_period": args.since_period,
        "total_repos": sum(len(v) for v in all_repos.values()),
        "by_language": all_repos,
    }
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2))
    print(f"\nwrote {out_path} (total {payload['total_repos']} repos)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
