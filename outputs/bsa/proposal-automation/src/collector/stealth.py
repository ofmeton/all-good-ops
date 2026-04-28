"""Playwright Stealth コンテキスト生成。

Lancers 等の運営側 bot 検知に対して、人間ブラウザに近い fingerprint で動作させる。
- playwright-stealth (Python版) を適用
- 一般的な Chrome の User-Agent
- ja-JP ロケール / Asia/Tokyo タイムゾーン
- 1280x800 viewport（自宅 PC 一般的サイズ）
- headless=False（headed mode）が原則（さらに検知耐性が高い）
"""

from typing import Optional

from playwright.async_api import (
    BrowserContext,
    Browser,
    Playwright,
)
from playwright_stealth import Stealth


# 一般的な macOS 上の Chrome 120 の User-Agent
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)


async def create_stealth_context(
    playwright: Playwright,
    storage_state: Optional[dict | str] = None,
    headless: bool = False,
) -> tuple[BrowserContext, Browser]:
    """Stealth + UA偽装 + 日本語ロケール の Browser Context を返す。

    Args:
        playwright: 呼び出し側で `async with async_playwright() as p:` の p を渡す
        storage_state: クッキー保存状態（dict）またはファイルパス文字列。None なら新規セッション
        headless: True にすると headless（デバッグ・CI用途。本番 BSA-PA は False）

    Returns:
        (context, browser) のタプル。終了時は browser.close() を呼ぶこと。

    Note:
        playwright_stealth.Stealth().apply_stealth_async(context) は内部で
        navigator.webdriver 等の bot 痕跡を init script で消す。
    """
    browser = await playwright.chromium.launch(
        headless=headless,
        args=[
            "--disable-blink-features=AutomationControlled",
            "--lang=ja-JP",
        ],
    )
    context = await browser.new_context(
        user_agent=USER_AGENT,
        locale="ja-JP",
        timezone_id="Asia/Tokyo",
        viewport={"width": 1280, "height": 800},
        storage_state=storage_state,
    )
    # playwright-stealth 適用
    await Stealth().apply_stealth_async(context)
    return context, browser
