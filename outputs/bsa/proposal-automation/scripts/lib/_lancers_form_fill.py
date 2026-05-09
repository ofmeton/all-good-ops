"""ランサーズ提案画面の自動フォーム入力スクリプト。

ダッシュボードの「📤 ランサーズに流し込む」ボタンから subprocess で起動される。

仕様:
- 引数: --job-id <LAN-XXXXXXXX-NNN>
- DB から提案内容（description_md / estimate_md / milestones / options / detail_url）を取得
- cookies を流用して Playwright (headed) で Lancers の `/work/propose_start/<id>` に遷移
- 各フィールドに自動入力
- 「内容を確認する」を自動クリックして確認画面で停止（人間が最終送信）

必須環境:
- ~/.venvs/bsa-pa の playwright + playwright-stealth が install 済み
- ~/Library/Application Support/bsa-pa/lan-cookies.json にログイン済み cookies

参照: 02-tech-research.md R4（フォーム自動入力 / Phase 2-A）
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sqlite3
import sys
from pathlib import Path
from typing import Any

# collector の Python パッケージを import path に追加
SCRIPT_DIR = Path(__file__).resolve().parent
COLLECTOR_DIR = SCRIPT_DIR.parent.parent / "src" / "collector"
sys.path.insert(0, str(COLLECTOR_DIR))

from playwright.async_api import async_playwright, Page  # noqa: E402

from session import CookieManager  # noqa: E402
from stealth import create_stealth_context  # noqa: E402

DB_PATH = Path.home() / "Library" / "Application Support" / "bsa-pa" / "data.db"
PLATFORM_PREFIX = "LAN"


# ----------------------------------------------------------------------------
# DB
# ----------------------------------------------------------------------------


def fetch_proposal_bundle(job_id: str) -> dict[str, Any]:
    """提案文・計画・オプション・detail_url を一括取得。"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            """
            SELECT j.detail_url, j.title,
                   p.description_md, p.estimate_md, p.milestones_json, p.options_json,
                   p.price_exclude_tax, p.price
            FROM jobs j
            LEFT JOIN proposals p ON p.job_id = j.job_id
            WHERE j.job_id = ?
            """,
            (job_id,),
        ).fetchone()
    finally:
        conn.close()

    if row is None:
        raise SystemExit(f"job_id not found: {job_id}")
    if row["description_md"] is None:
        raise SystemExit(f"提案文がまだ生成されていません: {job_id}")

    milestones = json.loads(row["milestones_json"]) if row["milestones_json"] else []
    options = json.loads(row["options_json"]) if row["options_json"] else []
    return {
        "detail_url": row["detail_url"],
        "title": row["title"],
        "description_md": row["description_md"],
        "estimate_md": row["estimate_md"] or "",
        "milestones": milestones,
        "options": options,
        "price_exclude_tax": row["price_exclude_tax"],
        "price": row["price"],
    }


def detail_url_to_propose_url(detail_url: str) -> str:
    """https://www.lancers.jp/work/detail/5534925 → propose_start/5534925"""
    m = re.search(r"/work/detail/(\d+)", detail_url)
    if not m:
        raise SystemExit(f"detail_url の形式が想定外: {detail_url}")
    return f"https://www.lancers.jp/work/propose_start/{m.group(1)}"


# ----------------------------------------------------------------------------
# Form fillers
# ----------------------------------------------------------------------------


async def fill_textareas(page: Page, description_md: str, estimate_md: str) -> None:
    """① 見積もりの詳細欄 ② 自己PR・実績欄。確実に動く textarea ペア。"""
    # ① 見積もりの詳細
    await page.fill('textarea[name="data[Proposal][estimate]"]', estimate_md)
    print(f"  [ok] estimate_md ({len(estimate_md)} chars)")

    # ② 自己PR・実績（required）
    await page.fill('textarea[name="data[Proposal][description]"]', description_md)
    print(f"  [ok] description_md ({len(description_md)} chars)")


async def fill_milestones(page: Page, milestones: list[dict]) -> None:
    """③ 計画。

    ランサーズは初期表示で1件の計画フォーム（data[Milestone][10]）を持つ。
    我々の milestones は基本1件なので、1件目を上書きで対応。複数件は
    「計画を追加する」ボタンを必要回数押下した後に同じ手順で埋める。

    各フィールドは React 管理で name 属性なし。placeholder / type / 順序で特定する。
    """
    if not milestones:
        print("  [skip] milestones (空)")
        return

    # h2"計画" 配下の <ul> 構造を React で管理している前提。
    # 1件目のフィールド群:
    # - input[type=text][value="プロジェクトの完成"]  → タイトル
    # - input[type=text][value=""]                   → 納期日（YYYY/MM/DD）
    # - textarea[placeholder*="計画のタイトルが達成"]  → 詳細
    # - input[type=number][step="1000"]              → 金額（税抜）

    # 既存1件目はランサーズが事前に1行レンダリングしている前提。
    # 「計画を追加する」ボタンで N 件に増やしてから、N行分を埋める。
    add_btn_selector = 'button:has-text("計画を追加する")'

    # 必要件数 - 既存1件 = 追加押下回数
    need_to_add = len(milestones) - 1
    for _ in range(max(0, need_to_add)):
        await page.click(add_btn_selector)
        await page.wait_for_timeout(300)

    # 全行を取得して順に埋める
    # 計画行は h2"計画" の次の section / div 配下に並ぶ前提。
    # シンプルに: 計画タイトル input（プロジェクトの完成 が初期値）を全件取得して順に埋める
    title_inputs = await page.locator(
        'input[type="text"][value="プロジェクトの完成"], input[type="text"]:near(:text("タイトル"))'
    ).all()

    # フォールバック: 計画タイトル欄は「計画」見出しの後に出てくる
    # `class="_base_1c4fz_42"` を持つ input を順番に取得する戦略
    rows = await page.locator(".p-proposal-form input._base_1c4fz_42, input._base_1c4fz_42").all()
    if not rows:
        # ラフな fallback: 「計画」セクション内の最初の text input を順に取る
        print("  [warn] 計画行のセレクタが想定外。実機 DOM を確認してください。手動入力を推奨。")

    for idx, ms in enumerate(milestones):
        # タイトル
        await _fill_milestone_row(page, idx, ms)


async def _fill_milestone_row(page: Page, row_idx: int, ms: dict) -> None:
    """N 行目の計画フォームを埋める。

    React 管理のため、行ごとの DOM コンテナを順序で特定する。
    実機 DOM 構造に依存するので、変更があればここを直す。
    """
    # 計画行のコンテナ: h2"計画" の親 section の <ul><li>...</li></ul> 配下
    # 安全策として、計画行のフィールドを順番（n番目）で特定する
    # 1行 = 4フィールド（title / date / detail textarea / amount）

    title_locator = page.locator('input._base_1c4fz_42').nth(row_idx)
    detail_locator = page.locator(
        'textarea[placeholder*="計画のタイトルが達成"]'
    ).nth(row_idx)
    amount_locator = page.locator('input[type="number"][step="1000"]').nth(row_idx)

    # タイトル入力
    try:
        await title_locator.fill(ms.get("title", ""))
    except Exception as e:
        print(f"  [warn] title row#{row_idx}: {e}")

    # 詳細 textarea
    try:
        await detail_locator.fill(ms.get("description", ""))
    except Exception as e:
        print(f"  [warn] description row#{row_idx}: {e}")

    # 金額（税抜）
    try:
        await amount_locator.fill(str(ms.get("amount_exclude_tax", 0)))
    except Exception as e:
        print(f"  [warn] amount row#{row_idx}: {e}")

    # 納期日（YYYY-MM-DD → date picker / text input に投入）
    schedule = ms.get("schedule_date", "")  # "2026-05-12"
    if schedule:
        # date picker は React 製。input[placeholder*="年/月/日"] や class を試す
        # まずはシンプルに、納期欄を nth で特定してテキスト投入
        try:
            date_inputs = page.locator(
                'input[type="text"]:not([value="プロジェクトの完成"])'
            )
            # 計画行の納期だけを正確に取るのは難度高い。後段で対処（人手）。
            await date_inputs.nth(row_idx).fill(schedule.replace("-", "/"))
        except Exception as e:
            print(f"  [warn] schedule row#{row_idx}: {e}（date picker は手動入力推奨）")

    print(f"  [ok] milestone#{row_idx}: {ms.get('title','')[:30]}")


async def fill_options(page: Page, options: list[dict]) -> None:
    """④ 追加オプション。

    初期状態 0件。「追加オプションを追加する」を必要回数押下してから、
    各行の name 属性付き input/textarea を埋める。
    """
    if not options:
        print("  [skip] options (空)")
        return

    # オプション追加ボタン: js-proposal-option-form-add-trigger
    add_btn = page.locator(".js-proposal-option-form-add-trigger").first

    for i, opt in enumerate(options):
        # 行 i を生成
        try:
            await add_btn.click()
            await page.wait_for_timeout(200)
        except Exception as e:
            print(f"  [warn] option add#{i}: {e}")
            continue

        # 名前付きフィールドで埋める（添字 i を使う）
        try:
            await page.fill(
                f'input[name="data[ProposalOption][{i}][title]"]',
                opt.get("title", ""),
            )
            await page.fill(
                f'textarea[name="data[ProposalOption][{i}][description]"]',
                opt.get("description", ""),
            )
            await page.fill(
                f'input[name="data[ProposalOption][{i}][contract_amount]"]',
                str(opt.get("contract_amount_exclude_tax", 0)),
            )
            print(f"  [ok] option#{i}: {opt.get('title','')[:30]}")
        except Exception as e:
            print(f"  [warn] option#{i} fill: {e}")


async def click_confirm_button(page: Page) -> None:
    """「内容を確認する」ボタンをクリック → 確認画面に遷移。"""
    btn = page.locator('input[type="submit"][name="send"][value="内容を確認する"]')
    if await btn.count() == 0:
        print("  [warn] 「内容を確認する」ボタンが見つかりませんでした")
        return
    await btn.click()
    print("  [ok] 「内容を確認する」をクリック → 確認画面へ")


# ----------------------------------------------------------------------------
# Main flow
# ----------------------------------------------------------------------------


async def run(job_id: str, auto_confirm: bool) -> int:
    bundle = fetch_proposal_bundle(job_id)
    propose_url = detail_url_to_propose_url(bundle["detail_url"])
    print(f"📤 {job_id} を {propose_url} に流し込みます")

    cookie_path = CookieManager.default_path(PLATFORM_PREFIX)
    cookies = CookieManager(cookie_path).load()
    if cookies is None:
        print("❌ cookies が見つかりません。先に Lancers にログインしてください。", file=sys.stderr)
        return 1

    async with async_playwright() as p:
        context, browser = await create_stealth_context(p, storage_state=cookies, headless=False)
        try:
            page = await context.new_page()

            # 提案画面に遷移（cookie 切れの場合は /user/login にリダイレクトされる）
            await page.goto(propose_url, wait_until="domcontentloaded")
            if "/user/login" in page.url:
                print("❌ ログインセッション切れ。relogin.sh を実行してください。", file=sys.stderr)
                return 2

            # フォームの主要要素が出るまで待つ
            try:
                await page.wait_for_selector(
                    'textarea[name="data[Proposal][description]"]', timeout=15000
                )
            except Exception:
                print("❌ 提案フォームが見つかりません。提案ボタンが押せない案件の可能性。", file=sys.stderr)
                return 3

            print("📝 フィールドを順に埋めます...")
            await fill_textareas(page, bundle["description_md"], bundle["estimate_md"])
            await fill_milestones(page, bundle["milestones"])
            await fill_options(page, bundle["options"])

            if auto_confirm:
                # 軽くスクロールして送信ボタンの位置に戻す（人間が入力ミスを目視できる時間も確保）
                await page.wait_for_timeout(500)
                await click_confirm_button(page)

            print()
            print("✅ 自動入力完了。ブラウザで内容を確認の上、")
            print("   ・確認画面に進んだら「提案を送信する」を手動クリック")
            print("   ・問題があればブラウザ上で修正")
            print("   ブラウザを閉じるとこのスクリプトも終了します。")

            # ブラウザが閉じられるまで待機（人間が送信完了するのを待つ）
            try:
                await page.wait_for_event("close", timeout=600_000)  # 最大10分
            except Exception:
                pass
        finally:
            try:
                await browser.close()
            except Exception:
                pass
    return 0


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="ランサーズ提案画面に提案内容を自動入力する")
    p.add_argument("--job-id", required=True, help="例: LAN-20260429-004")
    p.add_argument(
        "--no-auto-confirm",
        action="store_true",
        help="「内容を確認する」ボタンの自動クリックを無効化（入力のみで停止）",
    )
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    sys.exit(asyncio.run(run(args.job_id, auto_confirm=not args.no_auto_confirm)))
