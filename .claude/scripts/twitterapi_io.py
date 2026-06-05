"""
twitterapi.io 薄ラッパー (v0.2.0)
================================

`.env.local` の `TWITTERAPI_IO_KEY` を読んで、pacing / retry / cursor pagination 込みで叩く再利用 wrapper。

v0.2.0 (2026-05-26):
- call_history を保持、save_meta(path) で query 永続化用 metadata を出力
- query 文字列・cursor chain・取得件数を再現可能な形で記録

## 利用例

```python
from twitterapi_io import Client

c = Client()
tweets = c.advanced_search("Claude lang:ja min_faves:50", max_results=100)
print(c.get_call_summary())
c.save_meta("query-meta.json")
```

## 関連 memory
- feedback_external_api_wrapper_first.md
- reference_twitterapi_io_response_shape.md
- s1-51 / s3-51 (query 文字列の永続化必須)
"""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


WRAPPER_VERSION = "0.2.0"
DEFAULT_ENV = Path("/Users/rikukudo/Projects/private-agents/all-good-ops/money-bot/.env.local")
BASE_URL = "https://api.twitterapi.io"
DEFAULT_PACING = 2.0
RETRY_WAITS = [15, 30, 60, 120]
COST_PER_1000_TWEETS_USD = 0.15  # advanced_search / from:handle search のコスト基準


def _load_key(env_path: Path = DEFAULT_ENV) -> str:
    key = os.environ.get("TWITTERAPI_IO_KEY")
    if key:
        return key
    if not env_path.exists():
        raise RuntimeError(
            f"TWITTERAPI_IO_KEY が環境変数にも {env_path} にも見つかりません。"
        )
    for line in env_path.read_text().splitlines():
        if line.startswith("TWITTERAPI_IO_KEY="):
            return line.split("=", 1)[1].strip().strip('"')
    raise RuntimeError(f"TWITTERAPI_IO_KEY 行が {env_path} に見つかりません")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class Client:
    def __init__(self, api_key: str | None = None, pacing: float = DEFAULT_PACING):
        self.api_key = api_key or _load_key()
        self.pacing = pacing
        self._last_call = 0.0
        self.call_history: list[dict] = []

    def _wait(self) -> None:
        elapsed = time.time() - self._last_call
        if elapsed < self.pacing:
            time.sleep(self.pacing - elapsed)

    def _get(self, path: str, **params: Any) -> dict:
        self._wait()
        qs = urllib.parse.urlencode(params)
        url = f"{BASE_URL}{path}?{qs}"
        ts = _now_iso()
        for i, wait in enumerate([0] + RETRY_WAITS):
            if wait:
                time.sleep(wait)
            try:
                req = urllib.request.Request(url, headers={"x-api-key": self.api_key})
                with urllib.request.urlopen(req, timeout=30) as resp:
                    self._last_call = time.time()
                    body = json.loads(resp.read())
                    count = len(body.get("tweets", []) or [])
                    self.call_history.append({
                        "ts": ts,
                        "path": path,
                        "params": {k: v for k, v in params.items() if k != "cursor"},
                        "cursor_in": params.get("cursor", ""),
                        "cursor_out": body.get("next_cursor", "") or "",
                        "has_next_page": bool(body.get("has_next_page")),
                        "tweets_returned": count,
                    })
                    return body
            except urllib.error.HTTPError as e:
                if e.code == 429 and i < len(RETRY_WAITS):
                    print(f"  429 → backoff {RETRY_WAITS[i]}s ({path})", flush=True)
                    continue
                self.call_history.append({
                    "ts": ts, "path": path, "params": params,
                    "error": f"HTTP {e.code}: {e.reason}",
                })
                raise
        raise RuntimeError(f"giving up after {len(RETRY_WAITS)} retries on {path}")

    # --------------- 高レベル API ---------------

    def user_info(self, user_name: str) -> dict:
        return self._get("/twitter/user/info", userName=user_name)

    def advanced_search(
        self, query: str, queryType: str = "Latest",
        max_results: int = 20, max_pages: int = 5,
    ) -> list[dict]:
        results: list[dict] = []
        cursor = ""
        pages = 0
        while len(results) < max_results and pages < max_pages:
            params: dict[str, Any] = {"query": query, "queryType": queryType}
            if cursor:
                params["cursor"] = cursor
            d = self._get("/twitter/tweet/advanced_search", **params)
            ts = d.get("tweets", [])
            if not ts:
                break
            results.extend(ts)
            cursor = d.get("next_cursor") or ""
            if not cursor or not d.get("has_next_page"):
                break
            pages += 1
        return results[:max_results]

    def from_user_tweets(self, user_name: str, since: str, max_results: int = 100) -> list[dict]:
        """指定ハンドルの直近投稿を from:handle since:YYYY-MM-DD で取得"""
        return self.advanced_search(
            query=f"from:{user_name} since:{since}",
            queryType="Latest",
            max_results=max_results,
        )

    # --------------- メタデータ管理 ---------------

    def get_call_summary(self) -> dict:
        total_tweets = sum(c.get("tweets_returned", 0) for c in self.call_history)
        cost_usd = round(total_tweets / 1000.0 * COST_PER_1000_TWEETS_USD, 4)
        return {
            "wrapper_version": WRAPPER_VERSION,
            "total_calls": len(self.call_history),
            "total_tweets_returned": total_tweets,
            "estimated_cost_usd": cost_usd,
            "estimated_cost_jpy": int(cost_usd * 160),  # 1 USD = ¥160 概算
        }

    def save_meta(self, path: str | Path) -> None:
        meta = {
            "session_date": datetime.now(timezone.utc).date().isoformat(),
            **self.get_call_summary(),
            "calls": self.call_history,
        }
        Path(path).write_text(json.dumps(meta, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)
    c = Client()
    method = sys.argv[1]
    args = sys.argv[2:]
    result = getattr(c, method)(*args)
    print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
