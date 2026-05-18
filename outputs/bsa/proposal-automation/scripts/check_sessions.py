"""各媒体のログインセッション切れ判定スクリプト。

run.command の Stage 3.5 から呼ばれる。Playwright headless で各媒体の
「ログイン必須ページ」に cookie/プロファイル付きで GET し、ログイン
画面にリダイレクトされたら「切れ」と判定する。

stdout に切れている platform prefix（小文字、relogin.sh の引数形式）を
空白区切りで出力。すべて健全なら空文字列を出力。
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
COLLECTOR_DIR = SCRIPT_DIR.parent / "src" / "collector"
sys.path.insert(0, str(COLLECTOR_DIR))

from playwright.async_api import async_playwright  # noqa: E402

from session import CookieManager  # noqa: E402
from stealth import create_stealth_context  # noqa: E402

APPDATA = Path.home() / "Library" / "Application Support" / "bsa-pa"
CHROME_PROFILE_CN = APPDATA / "chrome-profile-cn"

# 各媒体のログイン必須 URL と「未ログイン時のリダイレクト先 URL に含まれる文字列」
CHECKS = {
    "LAN": ("https://www.lancers.jp/dashboard", "/user/login"),
    "CW":  ("https://crowdworks.jp/mypage", "/login"),
    "CN":  ("https://coconala.com/mypage", "/login"),
}

TIMEOUT_MS = 15000


async def check_with_cookies(p, prefix: str, url: str, login_marker: str) -> bool:
    """LAN/CW: storage_state からロードして bundled chromium + stealth で疎通テスト。"""
    cookie_path = CookieManager.default_path(prefix)
    cookies = CookieManager(cookie_path).load()
    if cookies is None:
        return False
    context, browser = await create_stealth_context(
        p, storage_state=cookies, headless=True
    )
    try:
        page = await context.new_page()
        await page.goto(url, wait_until="domcontentloaded", timeout=TIMEOUT_MS)
        return login_marker not in page.url
    finally:
        try:
            await browser.close()
        except Exception:
            pass


async def check_cn(p, url: str, login_marker: str) -> bool:
    """CN: 実 Chrome の永続プロファイルで疎通テスト（提案投下と同じ環境）。"""
    if not CHROME_PROFILE_CN.exists():
        return False
    ctx = await p.chromium.launch_persistent_context(
        user_data_dir=str(CHROME_PROFILE_CN),
        channel="chrome",
        headless=True,
        locale="ja-JP",
        timezone_id="Asia/Tokyo",
        viewport={"width": 1280, "height": 900},
        args=["--disable-blink-features=AutomationControlled"],
    )
    try:
        page = ctx.pages[0] if ctx.pages else await ctx.new_page()
        await page.goto(url, wait_until="domcontentloaded", timeout=TIMEOUT_MS)
        return login_marker not in page.url
    finally:
        try:
            await ctx.close()
        except Exception:
            pass


async def main() -> int:
    expired: list[str] = []
    async with async_playwright() as p:
        for prefix, (url, marker) in CHECKS.items():
            try:
                if prefix == "CN":
                    valid = await check_cn(p, url, marker)
                else:
                    valid = await check_with_cookies(p, prefix, url, marker)
            except Exception as e:
                print(f"# {prefix} check error: {e}", file=sys.stderr)
                valid = False  # 例外は安全側に倒して「切れ」扱い
            print(f"# {prefix}: {'valid' if valid else 'EXPIRED'}", file=sys.stderr)
            if not valid:
                expired.append(prefix.lower())
    print(" ".join(expired))
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
