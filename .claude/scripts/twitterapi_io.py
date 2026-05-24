"""
twitterapi.io 薄ラッパー
================================

`.env.local` の `TWITTERAPI_IO_KEY` を読んで、pacing / retry / cursor pagination 込みで叩く再利用 wrapper。

## 利用例

```python
from twitterapi_io import Client

c = Client()  # key は env から自動ロード
info = c.user_info("karaage0703")
print(info["data"]["followers"])

tweets = c.advanced_search("Claude Code lang:ja min_faves:300 since:2026-02-24", queryType="Top", max_results=100)
for t in tweets:
    print(t["likeCount"], t["text"][:80])
```

## デザイン原則
- pacing default 2 秒（rate-limit window 不明な API の安全値）
- retry-on-429: 指数バックオフ (15s → 30s → 60s → 120s)
- cursor pagination: has_next_page == false or cursor 空で break
- response 形状の差異吸収（data dict / data list / top-level tweets）

## 関連 memory
- feedback_external_api_wrapper_first.md (rate-limited API は wrapper 1 ファイル化が原則)
- feedback_external_api_cost_check.md (新規 API は 1 アクション単価先出し)
- reference_twitterapi_io_response_shape.md (response 形状の SSOT)
"""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


DEFAULT_ENV = Path("/Users/rikukudo/Projects/private-agents/all-good-ops/money-bot/.env.local")
BASE_URL = "https://api.twitterapi.io"
DEFAULT_PACING = 2.0  # seconds between calls (safe default for unknown rate-limit window)
RETRY_WAITS = [15, 30, 60, 120]  # exponential backoff on 429


def _load_key(env_path: Path = DEFAULT_ENV) -> str:
    """`.env.local` から TWITTERAPI_IO_KEY をロード（環境変数優先）"""
    key = os.environ.get("TWITTERAPI_IO_KEY")
    if key:
        return key
    if not env_path.exists():
        raise RuntimeError(
            f"TWITTERAPI_IO_KEY が環境変数にも {env_path} にも見つかりません。"
            "money-bot/.env.local を確認してください。"
        )
    for line in env_path.read_text().splitlines():
        if line.startswith("TWITTERAPI_IO_KEY="):
            return line.split("=", 1)[1].strip().strip('"')
    raise RuntimeError(f"TWITTERAPI_IO_KEY 行が {env_path} に見つかりません")


class Client:
    """twitterapi.io 共通クライアント"""

    def __init__(self, api_key: str | None = None, pacing: float = DEFAULT_PACING):
        self.api_key = api_key or _load_key()
        self.pacing = pacing
        self._last_call = 0.0

    def _wait(self) -> None:
        elapsed = time.time() - self._last_call
        if elapsed < self.pacing:
            time.sleep(self.pacing - elapsed)

    def _get(self, path: str, **params: Any) -> dict:
        """単発 GET。429 は指数バックオフでリトライ。pacing 自動。"""
        self._wait()
        qs = urllib.parse.urlencode(params)
        url = f"{BASE_URL}{path}?{qs}"
        for i, wait in enumerate([0] + RETRY_WAITS):
            if wait:
                time.sleep(wait)
            try:
                req = urllib.request.Request(url, headers={"x-api-key": self.api_key})
                with urllib.request.urlopen(req, timeout=30) as resp:
                    self._last_call = time.time()
                    return json.loads(resp.read())
            except urllib.error.HTTPError as e:
                if e.code == 429 and i < len(RETRY_WAITS):
                    print(f"  429 → backoff {RETRY_WAITS[i]}s ({path})", flush=True)
                    continue
                raise
        raise RuntimeError(f"giving up after {len(RETRY_WAITS)} retries on {path}")

    # --------------- 高レベル API ---------------

    def user_info(self, user_name: str) -> dict:
        """指定ハンドルの user 情報を取得"""
        return self._get("/twitter/user/info", userName=user_name)

    def last_tweets(self, user_name: str) -> list[dict]:
        """指定ハンドルの直近 tweets（最大 20 件、無料 endpoint）"""
        d = self._get("/twitter/user/last_tweets", userName=user_name)
        data = d.get("data")
        if isinstance(data, dict):
            return data.get("tweets", [])
        if isinstance(data, list):
            return data
        return d.get("tweets", [])

    def advanced_search(
        self,
        query: str,
        queryType: str = "Latest",
        max_results: int = 20,
        max_pages: int = 5,
    ) -> list[dict]:
        """advanced_search に cursor pagination を被せて max_results まで取得。

        max_pages で safety cap（5 page = 100 件が default）。
        """
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
        """指定ハンドルの直近投稿を advanced_search 経由で取得（last_tweets の 20 件上限を超える時用）

        since: "2026-02-24" 形式の日付文字列
        """
        return self.advanced_search(
            query=f"from:{user_name} since:{since}",
            queryType="Latest",
            max_results=max_results,
        )


# CLI usage: python twitterapi_io.py user_info karaage0703
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
