#!/usr/bin/env python3
"""CrowdWorks 手動ログイン → cookie 保存 ヘルパー。

setup.sh / relogin.sh から `python _crowdworks_login.py [--reuse]` で呼ばれる。
"""
import asyncio
import sys
from pathlib import Path

# src/collector/ を import path に追加
COLLECTOR_DIR = Path(__file__).resolve().parent.parent.parent / "src" / "collector"
sys.path.insert(0, str(COLLECTOR_DIR))

from playwright.async_api import async_playwright  # noqa: E402

from session import CookieManager  # noqa: E402
from stealth import create_stealth_context  # noqa: E402
from db import get_connection, update_session  # noqa: E402


REUSE = "--reuse" in sys.argv


async def main() -> int:
    async with async_playwright() as p:
        cookie_path = CookieManager.default_path("CW")
        existing = CookieManager(cookie_path).load() if REUSE else None
        ctx, browser = await create_stealth_context(p, storage_state=existing)
        try:
            page = await ctx.new_page()
            await page.goto(
                "https://crowdworks.jp/login",
                wait_until="domcontentloaded",
            )
            print("ブラウザで CrowdWorks にログインを完了したら Enter を押してください", flush=True)
            try:
                input()
            except EOFError:
                print(
                    "[warn] stdin 読み取り失敗。bg実行 or 入力リダイレクトの可能性。",
                    file=sys.stderr,
                )
                return 1

            await page.goto("https://crowdworks.jp/mypage", wait_until="domcontentloaded")
            # /login にリダイレクトされていればログイン失敗
            if "/login" in page.url or "/users/sign_in" in page.url:
                print("❌ ログインが完了していないようです。再度試してください。", file=sys.stderr)
                return 2

            state = await ctx.storage_state()
            CookieManager(cookie_path).save(state)

            conn = get_connection()
            try:
                update_session(conn, "CW", str(cookie_path), valid=True)
                conn.commit()
            finally:
                conn.close()

            print(f"✅ Cookie saved to {cookie_path}")
            return 0
        finally:
            await browser.close()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
