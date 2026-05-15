"""クラウドワークス提案画面の自動フォーム入力＋自動送信スクリプト。

ダッシュボードの「🚀 CrowdWorks へ自動送信」ボタンから subprocess で起動される。

仕様:
- 引数: --job-id <CW-XXXXXXXX-NNN>
- DB から提案内容（description_md / milestones / price_exclude_tax）を取得
- cookies を流用して Playwright (headed) で `/proposals/new?job_offer_id=<id>` に遷移
- 各フィールドに自動入力（Rails name 属性ベース・安定）
- （--auto-submit が True の場合）「応募する」を直接クリック
  → CW は確認画面が無い1段階送信。クリック＝送信完了

仕様差分（Lancers と異なる点）:
- 確認画面なし。「応募する」クリックで即送信
- 追加オプション欄が無い（options は無視。本文 or マイルストーン分割で表現）
- 完了予定日は 3 つの select（年/月/日）に分解して投入
- 金額は visible の `amount_dummy[]` に税抜き値を fill。JS が hidden の
  `amount_without_sales_tax` を裏で更新する

必須環境:
- ~/.venvs/bsa-pa の playwright + playwright-stealth が install 済み
- ~/Library/Application Support/bsa-pa/cw-cookies.json にログイン済み cookies
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
PLATFORM_PREFIX = "CW"


# ----------------------------------------------------------------------------
# DB
# ----------------------------------------------------------------------------


def fetch_proposal_bundle(job_id: str) -> dict[str, Any]:
    """提案文・マイルストーン・detail_url・税抜き総額を一括取得。"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            """
            SELECT j.detail_url, j.title,
                   p.description_md, p.milestones_json,
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
    return {
        "detail_url": row["detail_url"],
        "title": row["title"],
        "description_md": row["description_md"],
        "milestones": milestones,
        "price_exclude_tax": row["price_exclude_tax"],
        "price": row["price"],
    }


def detail_url_to_propose_url(detail_url: str) -> str:
    """https://crowdworks.jp/public/jobs/12926094 → proposals/new?job_offer_id=12926094"""
    m = re.search(r"/public/jobs/(\d+)", detail_url)
    if not m:
        raise SystemExit(f"detail_url の形式が想定外: {detail_url}")
    return f"https://crowdworks.jp/proposals/new?job_offer_id={m.group(1)}"


# ----------------------------------------------------------------------------
# Form fillers
# ----------------------------------------------------------------------------


async def _fill_with_change(page: Page, selector: str, value: str) -> None:
    """fill 後に change/blur を発火。jQuery で hidden を計算する欄向け。"""
    loc = page.locator(selector).first
    await loc.fill(value)
    try:
        await loc.dispatch_event("change")
        await loc.dispatch_event("blur")
    except Exception:
        pass


async def fill_message_body(page: Page, description_md: str) -> None:
    """メッセージ欄。CW では description_md をそのまま流し込む（estimate は無い）。"""
    sel = 'textarea[name="proposal[conditions_attributes][0][message_attributes][body]"]'
    await page.fill(sel, description_md)
    print(f"  [ok] message body ({len(description_md)} chars)")


async def add_milestone_rows_if_needed(page: Page, count: int) -> None:
    """初期 1 行存在。count - 1 回「マイルストーンを追加する」を押下。"""
    need = max(0, count - 1)
    if need == 0:
        return
    add_link = page.locator("a.add-milestone").first
    for i in range(need):
        try:
            await add_link.click()
            await page.wait_for_timeout(250)
        except Exception as e:
            print(f"  [warn] add-milestone#{i + 1}: {e}", file=sys.stderr)
            break
    print(f"  [ok] milestone rows added: {need}")


async def fill_milestone_row(page: Page, index: int, ms: dict) -> None:
    """N 行目の 1 マイルストーンを埋める。

    Rails 形式の name 属性で安定。
    - amount_dummy[]    : 税抜き visible 入力（JS が hidden の amount_without_sales_tax を更新）
    - [...][note]        : 内容（任意だが BSA は説明として使う）
    - [...][deadline(1i/2i/3i)] : 完了予定日（年/月/日 の 3 select）
    """
    base = f"proposal[conditions_attributes][0][milestones_attributes][{index}]"

    # 金額（税抜）。amount_dummy[] は配列なので nth(index) で行を指定
    amount = ms.get("amount_exclude_tax", 0)
    try:
        amount_loc = page.locator('input[name="amount_dummy[]"]').nth(index)
        await amount_loc.fill(str(amount))
        await amount_loc.dispatch_event("change")
        await amount_loc.dispatch_event("blur")
        print(f"  [ok] milestone#{index} amount={amount}")
    except Exception as e:
        print(f"  [warn] milestone#{index} amount: {e}", file=sys.stderr)

    # 内容 note（CW は単一マイルストーン時はデフォルト非表示。複数時のみ可視）
    # 非表示の時に fill するとデフォルト 30 秒 timeout で待ちが発生するため、
    # まず可視判定を行い、見えない時は黙ってスキップ。
    note_text = ms.get("description") or ms.get("title") or ""
    if note_text:
        note_loc = page.locator(f'input[name="{base}[note]"]').first
        try:
            visible = await note_loc.is_visible()
        except Exception:
            visible = False
        if not visible:
            print(
                f"  [skip] milestone#{index} note (CW は note 欄が非表示。message_body に記載済)",
                file=sys.stderr,
            )
        else:
            try:
                await note_loc.fill(note_text)
                print(f"  [ok] milestone#{index} note ({len(note_text)} chars)")
            except Exception as e:
                print(f"  [warn] milestone#{index} note: {e}", file=sys.stderr)

    # 完了予定日 (YYYY-MM-DD → 3 select)
    schedule = ms.get("schedule_date", "")
    if schedule:
        m = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})$", schedule.strip())
        if not m:
            print(f"  [warn] milestone#{index} schedule_date 形式不正: {schedule}", file=sys.stderr)
            return
        y, mo, d = m.group(1), str(int(m.group(2))), str(int(m.group(3)))
        for label, key, val in (("年", "1i", y), ("月", "2i", mo), ("日", "3i", d)):
            sel = f'select[name="{base}[deadline({key})]"]'
            try:
                await page.select_option(sel, value=val)
            except Exception as e:
                print(f"  [warn] milestone#{index} deadline {label}={val}: {e}", file=sys.stderr)
        print(f"  [ok] milestone#{index} deadline={schedule}")


async def fill_milestones(page: Page, milestones: list[dict], total_amount: int | None) -> None:
    """マイルストーン群を埋める。0件なら total_amount を使った 1 行ダミーを生成。"""
    if not milestones:
        if total_amount and total_amount > 0:
            # 提案 JSON にマイルストーンが無いケース。総額を 1 行で投入
            await fill_milestone_row(
                page,
                0,
                {"amount_exclude_tax": total_amount, "description": ""},
            )
        else:
            print("  [skip] milestones (空・総額不明)", file=sys.stderr)
        return

    await add_milestone_rows_if_needed(page, len(milestones))
    for i, ms in enumerate(milestones):
        await fill_milestone_row(page, i, ms)


async def click_submit(page: Page) -> bool:
    """「応募する」を直接クリック。CW は確認画面なし＝即送信。

    Returns:
        True: ナビゲーション完了で submitted とみなせる
        False: ボタン未検出 / 送信検知失敗
    """
    sel = 'input[type="submit"][name="commit"][value="応募する"]'
    btn = page.locator(sel).first
    if await btn.count() == 0:
        print("  [warn] 「応募する」ボタンが見つかりませんでした", file=sys.stderr)
        return False

    pre_url = page.url
    print(f"  [info] 送信前 URL: {pre_url}")
    try:
        async with page.expect_navigation(timeout=30_000):
            await btn.click()
    except Exception as e:
        print(f"  [warn] expect_navigation: {e}", file=sys.stderr)

    await page.wait_for_timeout(1500)
    post_url = page.url
    print(f"  [info] 送信後 URL: {post_url}")

    # /proposals/new から離れていれば成功とみなす
    if "/proposals/new" in post_url and pre_url == post_url:
        print("  [warn] URL が変化していません。送信失敗の可能性があります。", file=sys.stderr)
        return False
    return True


def mark_submitted_in_db(job_id: str, note: str = "auto-submitted via dashboard (CW)") -> None:
    """jobs.status='submitted' に更新し、status_history に記録。"""
    conn = sqlite3.connect(DB_PATH)
    try:
        row = conn.execute(
            "SELECT status FROM jobs WHERE job_id = ?", (job_id,)
        ).fetchone()
        if row is None:
            print(f"  [warn] DB 更新失敗: job_id={job_id} 見つからず", file=sys.stderr)
            return
        from_status = row[0]
        conn.execute(
            "UPDATE jobs SET status = 'submitted', updated_at = datetime('now') WHERE job_id = ?",
            (job_id,),
        )
        conn.execute(
            "INSERT INTO status_history (job_id, from_status, to_status, changed_by, note) "
            "VALUES (?, ?, 'submitted', 'auto', ?)",
            (job_id, from_status, note),
        )
        conn.execute(
            "UPDATE proposals SET submitted_at = datetime('now') WHERE job_id = ?",
            (job_id,),
        )
        conn.commit()
        print(f"  [ok] DB 更新: {job_id} status={from_status} → submitted")
    finally:
        conn.close()


# ----------------------------------------------------------------------------
# Main flow
# ----------------------------------------------------------------------------


async def run(job_id: str, auto_submit: bool, keep_open: bool = True) -> int:
    bundle = fetch_proposal_bundle(job_id)
    propose_url = detail_url_to_propose_url(bundle["detail_url"])
    print(f"📤 {job_id} を {propose_url} に流し込みます")

    cookie_path = CookieManager.default_path(PLATFORM_PREFIX)
    cookies = CookieManager(cookie_path).load()
    if cookies is None:
        print(
            "❌ cookies が見つかりません。先に CrowdWorks にログインしてください "
            "(scripts/relogin.sh cw)",
            file=sys.stderr,
        )
        return 1

    async with async_playwright() as p:
        context, browser = await create_stealth_context(p, storage_state=cookies, headless=False)
        keep_browser_open = False
        page = None
        try:
            page = await context.new_page()

            await page.goto(propose_url, wait_until="domcontentloaded")
            if "/login" in page.url or "/users/sign_in" in page.url:
                print(
                    "❌ ログインセッション切れ。scripts/relogin.sh cw を実行してください。",
                    file=sys.stderr,
                )
                return 2

            # メッセージ欄が出るまで待つ（提案フォーム判定）
            try:
                await page.wait_for_selector(
                    'textarea[name="proposal[conditions_attributes][0][message_attributes][body]"]',
                    timeout=15000,
                )
            except Exception:
                print(
                    "❌ 提案フォームが見つかりません（既に応募済 / 募集終了の可能性）。",
                    file=sys.stderr,
                )
                return 3

            print("📝 フィールドを順に埋めます...")
            await fill_milestones(page, bundle["milestones"], bundle["price_exclude_tax"])
            await fill_message_body(page, bundle["description_md"])

            if not auto_submit:
                print("✅ 自動入力完了。--no-auto-submit 指定のためここで停止。")
                print("   ブラウザで内容確認の上、「応募する」を手動クリックしてください。")
                keep_browser_open = True
                return 0

            # 「応募する」を直接クリック → 即送信
            print("📨 「応募する」をクリックします（CW は確認画面なし・即送信）...")
            await page.wait_for_timeout(500)
            submitted = await click_submit(page)
            if not submitted:
                print(
                    "❌ 自動送信に失敗。ブラウザ上で確認・手動送信してください。",
                    file=sys.stderr,
                )
                keep_browser_open = True
                return 5

            mark_submitted_in_db(job_id)

            print()
            print(f"✅ 提案送信完了: {job_id}")
            print(f"   送信後 URL: {page.url}")
            await page.wait_for_timeout(3_000)
            return 0
        except Exception as e:
            print(f"❌ 想定外のエラー: {e}", file=sys.stderr)
            keep_browser_open = True
            raise
        finally:
            if keep_browser_open and keep_open and page is not None:
                print(
                    "⏸  ブラウザは開いたままにします（最大10分）。閉じるとスクリプト終了。",
                    file=sys.stderr,
                )
                try:
                    await page.wait_for_event("close", timeout=600_000)
                except Exception:
                    pass
            try:
                await browser.close()
            except Exception:
                pass


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="クラウドワークス提案画面に自動入力 → 自動送信"
    )
    p.add_argument("--job-id", required=True, help="例: CW-20260505-001")
    p.add_argument(
        "--no-auto-submit",
        action="store_true",
        help="「応募する」ボタンの自動クリックを無効化（入力のみで停止）",
    )
    p.add_argument(
        "--no-keep-open",
        action="store_true",
        help="失敗時にブラウザを開いたまま待たない（バッチ実行用）",
    )
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    sys.exit(
        asyncio.run(
            run(
                args.job_id,
                auto_submit=not args.no_auto_submit,
                keep_open=not args.no_keep_open,
            )
        )
    )
