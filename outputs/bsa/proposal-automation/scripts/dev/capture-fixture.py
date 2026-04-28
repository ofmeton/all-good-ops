#!/usr/bin/env python3
"""
Lancers の HTML fixture を手動キャプチャするスクリプト。

Usage:
    source ~/.venvs/bsa-pa/bin/activate

    # 検索ページ (listing) を3つ取得
    python scripts/dev/capture-fixture.py listing-lp
    python scripts/dev/capture-fixture.py listing-website
    python scripts/dev/capture-fixture.py listing-ad

    # 案件詳細ページ (detail) を1つ取得
    python scripts/dev/capture-fixture.py detail <案件詳細URL>

各コマンド初回はブラウザが開くので、Lancers にログイン (2FA含む) してから
ターミナルで Enter を押す。以降は cookie を再利用する。
"""
import asyncio
import sys
from pathlib import Path
from playwright.async_api import async_playwright

# fixtures 出力先 + cookie 保存先
PROJECT_ROOT = Path(__file__).parent.parent.parent
FIXTURES_DIR = PROJECT_ROOT / "src" / "collector" / "tests" / "fixtures"
COOKIE_PATH = PROJECT_ROOT / "scripts" / "dev" / ".dev-cookies.json"

LISTING_URLS = {
    "listing-lp": "https://www.lancers.jp/work/search/web/lp",
    "listing-website": "https://www.lancers.jp/work/search/web/website",
    "listing-ad": "https://www.lancers.jp/work/search/ad",
}


async def capture(target: str, url: str, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as p:
        # 既存 cookie があれば読む
        storage_state = str(COOKIE_PATH) if COOKIE_PATH.exists() else None
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            locale="ja-JP",
            timezone_id="Asia/Tokyo",
            viewport={"width": 1280, "height": 800},
            storage_state=storage_state,
        )
        page = await context.new_page()

        # まずトップを開いてログイン状態を確認
        await page.goto("https://www.lancers.jp/mypage", wait_until="domcontentloaded")
        if "/login" in page.url or "ログイン" in await page.title():
            print("=" * 60)
            print("Lancers にログインしてください（2FA 含む）。")
            print("ログイン完了後、このターミナルで Enter を押してください。")
            print("=" * 60)
            input()
            # cookie を保存
            await context.storage_state(path=str(COOKIE_PATH))
            print(f"[ok] cookie saved: {COOKIE_PATH}")

        # 目的の URL に移動
        print(f"[fetch] {url}")
        await page.goto(url, wait_until="domcontentloaded")

        # listing 系は案件カードが出てくるのを待つ
        if target.startswith("listing"):
            try:
                await page.wait_for_selector(
                    ".c-media, .p-search-job-list__item, [data-job-id]",
                    timeout=15000,
                )
            except Exception:
                print("[warn] 案件カードのセレクタ待ちで timeout。HTML は保存します。")
        else:
            # detail はページ全体の load を少し待つ
            await page.wait_for_load_state("networkidle", timeout=15000)

        html = await page.content()
        output_path.write_text(html, encoding="utf-8")
        print(f"[saved] {output_path} ({len(html):,} bytes)")

        # cookie を更新
        await context.storage_state(path=str(COOKIE_PATH))

        await browser.close()


async def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 1

    target = sys.argv[1]

    if target in LISTING_URLS:
        url = LISTING_URLS[target]
        out = FIXTURES_DIR / f"lancers_{target.replace('-', '_')}.html"
        await capture(target, url, out)
        return 0

    if target == "detail":
        if len(sys.argv) < 3:
            print("Error: detail には案件詳細URLを渡してください。")
            print("  python scripts/dev/capture-fixture.py detail https://www.lancers.jp/work/detail/12345")
            return 1
        url = sys.argv[2]
        out = FIXTURES_DIR / "lancers_detail.html"
        await capture("detail", url, out)
        return 0

    print(f"Error: unknown target '{target}'")
    print(__doc__)
    return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
