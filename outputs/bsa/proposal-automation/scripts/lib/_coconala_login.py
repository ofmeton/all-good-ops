#!/usr/bin/env python3
"""Coconala 手動ログイン → cookie 保存 ヘルパー。

setup.sh / relogin.sh から `python _coconala_login.py [--reuse]` で呼ばれる。
heredoc 経由ではなく独立スクリプトにしているのは、stdin で input() が使えるようにするため。

Coconala の公開依頼は collector（一覧・詳細閲覧）では cookie 不要だが、
提案投下（/offers/add/<id>）はログイン必須なため、form_fill 用に cookie を取得する。

【バンドル Chromium ではなく実 Google Chrome を使う理由】
Coconala のログインは bot 検知が厳しく、Playwright バンドルの素の Chromium だと
「認証できませんでした」で弾かれる（UA とエンジンのバージョン不一致・実 Chrome
固有の機能欠落・まっさらプロファイル等が fingerprint で見抜かれる）。
launch_persistent_context(channel="chrome") で実 Google Chrome + 永続プロファイルを
駆動することで、UA・機能・fingerprint がすべて本物になり検知を回避する。
UA は偽装しない（実 Chrome のものをそのまま使う = バージョン不一致を作らない）。

cwd は問わない（COLLECTOR_DIR を sys.path に追加して import する）。
"""
import asyncio
import sys
from pathlib import Path

# src/collector/ を import path に追加
COLLECTOR_DIR = Path(__file__).resolve().parent.parent.parent / "src" / "collector"
sys.path.insert(0, str(COLLECTOR_DIR))

from playwright.async_api import async_playwright  # noqa: E402

from session import CookieManager  # noqa: E402
from db import get_connection, update_session  # noqa: E402


REUSE = "--reuse" in sys.argv

# 実 Chrome のプロファイルを永続化する dir。launch_persistent_context が
# ここにセッションを保持するため、一度ログインすれば次回以降は自動でログイン状態。
# （--reuse の有無に関わらず永続プロファイルが reuse を担保する）
PROFILE_DIR = (
    Path.home()
    / "Library"
    / "Application Support"
    / "bsa-pa"
    / "chrome-profile-cn"
)


async def main() -> int:
    cookie_path = CookieManager.default_path("CN")
    PROFILE_DIR.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as p:
        # launch_persistent_context: 実 Google Chrome + 永続プロファイル。
        # storage_state は渡せない（永続 dir 側がセッションを保持するため不要）。
        ctx = await p.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE_DIR),
            channel="chrome",
            headless=False,
            locale="ja-JP",
            timezone_id="Asia/Tokyo",
            viewport={"width": 1280, "height": 800},
            args=["--disable-blink-features=AutomationControlled"],
        )
        try:
            page = ctx.pages[0] if ctx.pages else await ctx.new_page()
            # coconala.com/login は広告・計測スクリプトが多く domcontentloaded が
            # 遅延するため、ナビゲーション確定（commit）だけ待つ。中身のロードは
            # 人間が見てログインする間に裏で進む。失敗してもブラウザは開いたまま、
            # アドレスバー手動入力で続行できるようにする。
            try:
                await page.goto(
                    "https://coconala.com/login",
                    wait_until="commit",
                    timeout=60000,
                )
            except Exception as e:
                print(
                    f"[warn] ログインページの初回ロードに失敗しました（{e}）。\n"
                    "       開いているブラウザのアドレスバーに\n"
                    "       https://coconala.com/login を直接入力してログインしてください。",
                    file=sys.stderr,
                )
            print("ブラウザでログインを完了したら Enter を押してください", flush=True)
            try:
                input()
            except EOFError:
                print(
                    "[warn] stdin 読み取り失敗。bg実行 or 入力リダイレクトの可能性。",
                    file=sys.stderr,
                )
                return 1

            # ログイン状態の確認: マイページに遷移してログイン画面に戻されないこと
            try:
                await page.goto(
                    "https://coconala.com/mypage", wait_until="commit", timeout=60000
                )
            except Exception:
                pass  # 確認は best-effort。cookie 保存は続行する
            if "/login" in page.url:
                print(
                    "[warn] /mypage がログイン画面にリダイレクトされました。"
                    "ログインが完了していない可能性があります。",
                    file=sys.stderr,
                )

            state = await ctx.storage_state()
            CookieManager(cookie_path).save(state)

            conn = get_connection()
            try:
                update_session(conn, "CN", str(cookie_path), valid=True)
                conn.commit()
            finally:
                conn.close()

            print(f"✅ Cookie saved to {cookie_path}")
            return 0
        finally:
            await ctx.close()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
