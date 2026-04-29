#!/bin/zsh
# scripts/relogin.sh - クッキー期限切れ時の再ログイン
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib/env.sh"

echo "🔑 Lancers 再ログイン"

source "$BSA_PA_VENV/bin/activate"
cd "$BSA_PA_BASE/src/collector"

python <<'PYEOF'
import asyncio
import sys
from pathlib import Path
from playwright.async_api import async_playwright

sys.path.insert(0, str(Path.cwd()))

from session import CookieManager
from stealth import create_stealth_context
from db import get_connection, update_session


async def main():
    async with async_playwright() as p:
        cookie_path = CookieManager.default_path("LAN")
        existing = CookieManager(cookie_path).load()
        ctx, browser = await create_stealth_context(p, storage_state=existing)
        page = await ctx.new_page()
        await page.goto("https://www.lancers.jp/user/login", wait_until="domcontentloaded")
        print("再ログインしてください（2FA 含む）。完了後 Enter")
        input()
        await page.goto("https://www.lancers.jp/mypage", wait_until="domcontentloaded")
        state = await ctx.storage_state()
        CookieManager(cookie_path).save(state)
        conn = get_connection()
        update_session(conn, "LAN", str(cookie_path), valid=True)
        conn.commit()
        conn.close()
        print("✅ Cookie 更新完了")
        await browser.close()


asyncio.run(main())
PYEOF

deactivate
