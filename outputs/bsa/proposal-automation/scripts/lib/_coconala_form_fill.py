"""ココナラ公開依頼の提案画面 自動フォーム入力＋自動送信スクリプト。

ダッシュボードの「🚀 ココナラへ自動送信」ボタンから subprocess で起動される。

仕様:
- 引数: --job-id <CN-XXXXXXXX-NNN>
- DB から提案内容（description_md / price / milestones / delivery_days / detail_url）を取得
- `/offers/add/<request_id>` に遷移し各フィールドを自動入力
- 「確認する」をクリック → 確認画面に遷移
- （--auto-submit が True の場合）確認画面の「応募する」を自動クリック
- 送信完了を URL 変化で検知し、DB の jobs.status を 'submitted' に更新
- 失敗時はブラウザを開いたままにして人間が介入できるようにする

仕様差分（Lancers / CrowdWorks と異なる点）:
- **実 Google Chrome + 永続プロファイルを使う**（create_stealth_context のバンドル
  Chromium ではなく channel="chrome"）。ココナラは bot 検知が厳しく、バンドル
  Chromium だとログイン・提案フローで弾かれるため。プロファイルは
  ~/Library/Application Support/bsa-pa/chrome-profile-cn/（_coconala_login.py が作成）。
  この永続プロファイル自体がログインセッションを保持するので cookie ファイルは使わない。
- 提案フォームは単一価格・マイルストーン行なし（LAN のような計画行・追加オプション欄なし）
- 納品希望日は pickadate.js のデートピッカー。#OfferExpireDate は readonly のため
  ピッカー UI 経由で日付を選択する（pickadate API → 失敗時はカレンダー操作 fallback）
- 提案内容は **200 文字以上必須**（200 未満だと確認画面に進めず弾かれる）
- 確認画面あり = LAN 型の 2 段階送信（確認する → 確認画面 → 応募する）

必須環境:
- ~/.venvs/bsa-pa の playwright が install 済み
- /Applications/Google Chrome.app（channel="chrome" で起動）
- ~/Library/Application Support/bsa-pa/chrome-profile-cn/ にログイン済みプロファイル
  （未ログインなら scripts/relogin.sh cn を実行）

参照: memory reference-coconala-propose-dom / 06-coconala-adapter-design.md
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sqlite3
import sys
from datetime import date, timedelta
from pathlib import Path
from typing import Any

from playwright.async_api import async_playwright, Page  # noqa: E402

DB_PATH = Path.home() / "Library" / "Application Support" / "bsa-pa" / "data.db"
PLATFORM_PREFIX = "CN"
# _coconala_login.py が作成・保守するログイン済み永続プロファイル
PROFILE_DIR = (
    Path.home()
    / "Library"
    / "Application Support"
    / "bsa-pa"
    / "chrome-profile-cn"
)
# 提案内容の最低文字数（ココナラのバリデーション）
MIN_CONTENT_LEN = 200


# ----------------------------------------------------------------------------
# DB
# ----------------------------------------------------------------------------


def fetch_proposal_bundle(job_id: str) -> dict[str, Any]:
    """提案文・金額・マイルストーン・納期・detail_url を一括取得。"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            """
            SELECT j.detail_url, j.title,
                   p.description_md, p.milestones_json,
                   p.price, p.delivery_days
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
        "price": row["price"],
        "delivery_days": row["delivery_days"],
    }


def detail_url_to_propose_url(detail_url: str) -> str:
    """https://coconala.com/requests/5030423 → https://coconala.com/offers/add/5030423"""
    m = re.search(r"/requests/(\d+)", detail_url)
    if not m:
        raise SystemExit(f"detail_url の形式が想定外: {detail_url}")
    return f"https://coconala.com/offers/add/{m.group(1)}"


def resolve_delivery_date(bundle: dict[str, Any]) -> str:
    """納品希望日を YYYY-MM-DD で決める。

    優先順位:
      1. milestones の最終 schedule_date（最終納品日）
      2. 1 が無ければ today + delivery_days
      3. delivery_days も無ければ today + 7
    過去日になった場合は today+1 に補正する。
    """
    target: date | None = None
    milestones = bundle.get("milestones") or []
    schedule_dates = [
        m.get("schedule_date") for m in milestones if m.get("schedule_date")
    ]
    if schedule_dates:
        try:
            y, mo, d = (int(x) for x in max(schedule_dates).split("-"))
            target = date(y, mo, d)
        except (ValueError, AttributeError):
            target = None
    if target is None:
        days = bundle.get("delivery_days") or 7
        target = date.today() + timedelta(days=int(days))

    if target <= date.today():
        target = date.today() + timedelta(days=1)
    return target.isoformat()


# ----------------------------------------------------------------------------
# Form fillers
# ----------------------------------------------------------------------------


async def fill_content(page: Page, description_md: str) -> None:
    """提案内容欄。デフォルトでテンプレ文が入っているので fill が上書きクリアする。"""
    text = description_md
    if len(text) < MIN_CONTENT_LEN:
        # 200 文字未満だと確認画面に進めない。末尾に注記を足して最低長を満たす。
        # （通常 BSA の提案文は 200 文字を超えるので、このパスは保険）
        pad = (
            "\n\n――――――――――\n"
            "ご不明点・ご要望がございましたらお気軽にメッセージください。"
            "対応範囲やお見積りは柔軟に調整いたします。どうぞよろしくお願いいたします。"
        )
        text = text + pad
        print(
            f"  [warn] description_md が {len(description_md)} 文字（200 未満）。"
            f"定型文を付加して {len(text)} 文字に補正",
            file=sys.stderr,
        )
    await page.fill("#OfferContent", text)
    print(f"  [ok] 提案内容 ({len(text)} chars)")


async def fill_price(page: Page, price: int | None) -> None:
    """提案金額欄（税込総額）。"""
    if not price or price <= 0:
        print("  [warn] price が空 / 0。金額欄は手動入力してください", file=sys.stderr)
        return
    await page.fill("#OfferPrice", str(int(price)))
    print(f"  [ok] 提案金額 {price}")


async def fill_delivery_date(page: Page, ymd: str) -> None:
    """納品希望日。#OfferExpireDate は readonly な pickadate.js ピッカー。

    手順:
      1. pickadate の jQuery API（picker.set）で直接セット（最も確実）
      2. 失敗時: フィールドをクリックしてピッカーを開き、月送り→日クリック
    どちらも hidden の data[Offer][expire_date] に YYYY-MM-DD が入れば成功。
    """
    y, mo, d = (int(x) for x in ymd.split("-"))

    # --- 方法 1: pickadate API ---
    api_result = await page.evaluate(
        """([y, mo, d]) => {
          const $ = window.jQuery || window.$;
          if (!$) return 'no-jquery';
          try {
            const picker = $('#OfferExpireDate').pickadate('picker');
            if (!picker) return 'no-picker';
            // pickadate の month は 0-indexed
            picker.set('select', [y, mo - 1, d]);
            return 'ok';
          } catch (e) {
            return 'api-error:' + e.message;
          }
        }""",
        [y, mo, d],
    )
    hidden = await page.evaluate(
        "() => document.querySelector('input[name=\"data[Offer][expire_date]\"]')?.value || ''"
    )
    if hidden == ymd:
        print(f"  [ok] 納品希望日 {ymd}（pickadate API）")
        return
    print(f"  [info] pickadate API 結果={api_result} hidden={hidden!r} → カレンダー操作にfallback", file=sys.stderr)

    # --- 方法 2: カレンダー UI 操作 ---
    await page.click("#OfferExpireDate")
    await page.wait_for_timeout(600)
    # 目標年月になるまで「次月」を押す（最大 24 回 = 2 年分で打ち切り）
    for _ in range(24):
        # 表示中の年月を取得（pickadate: .picker__month / .picker__year、
        # または select 要素になっている場合あり）
        cur = await page.evaluate(
            """() => {
              const root = document.querySelector('.picker--opened');
              if (!root) return null;
              const ms = root.querySelector('.picker__month');
              const ys = root.querySelector('.picker__year');
              // select 版
              const msel = root.querySelector('select.picker__select--month');
              const ysel = root.querySelector('select.picker__select--year');
              const m = msel ? Number(msel.value) : (ms ? ms.getAttribute('data-value') : null);
              const yv = ysel ? Number(ysel.value) : (ys ? Number(ys.textContent) : null);
              return { month: m, year: yv };
            }"""
        )
        if not cur or cur.get("year") is None or cur.get("month") is None:
            break
        cur_y, cur_m0 = int(cur["year"]), int(cur["month"])  # month は 0-indexed
        if cur_y == y and cur_m0 == mo - 1:
            break
        if (cur_y, cur_m0) < (y, mo - 1):
            nxt = page.locator(".picker--opened .picker__nav--next").first
            if await nxt.count() == 0:
                break
            await nxt.click()
        else:
            prv = page.locator(".picker--opened .picker__nav--prev").first
            if await prv.count() == 0:
                break
            await prv.click()
        await page.wait_for_timeout(250)

    clicked = await page.evaluate(
        """(d) => {
          const root = document.querySelector('.picker--opened');
          if (!root) return 'no-root';
          const target = [...root.querySelectorAll('.picker__day')].find(
            el => el.textContent.trim() === String(d)
                  && !el.classList.contains('picker__day--disabled')
                  && !el.classList.contains('picker__day--outfocus')
          );
          if (!target) return 'no-day';
          target.click();
          return 'ok';
        }""",
        d,
    )
    await page.wait_for_timeout(400)
    hidden2 = await page.evaluate(
        "() => document.querySelector('input[name=\"data[Offer][expire_date]\"]')?.value || ''"
    )
    if hidden2 == ymd:
        print(f"  [ok] 納品希望日 {ymd}（カレンダー操作）")
    else:
        print(
            f"  [warn] 納品希望日の自動設定に失敗（click={clicked} hidden={hidden2!r}）。"
            "ブラウザで手動選択してください",
            file=sys.stderr,
        )


# ----------------------------------------------------------------------------
# Submit flow
# ----------------------------------------------------------------------------


async def click_confirm_button(page: Page) -> bool:
    """入力ページの「確認する」をクリック → 確認画面へ。"""
    btn = page.locator('button.comp-submit-animate:has-text("確認する")').first
    if await btn.count() == 0:
        # テキスト無し fallback
        btn = page.locator("button.comp-submit-animate").first
    if await btn.count() == 0:
        print("  [warn] 「確認する」ボタンが見つかりませんでした", file=sys.stderr)
        return False
    await btn.click()
    await page.wait_for_timeout(3000)
    print("  [ok] 「確認する」をクリック")
    return True


async def is_on_confirm_page(page: Page) -> bool:
    """確認画面に遷移できたか判定。

    確認画面: 「入力内容を修正する」リンク/ボタンがある & 見出しが「応募内容を確認する」。
    入力ページのまま（バリデーションエラー）の場合は False。
    """
    body = await page.inner_text("body")
    if "入力内容を修正する" in body and "応募内容を確認する" in body:
        return True
    # バリデーションエラーの典型文言
    for err in ("文字以上で入力してください", "選択してください", "入力してください"):
        if err in body:
            print(f"  [warn] バリデーションエラー検出: 「{err}」", file=sys.stderr)
            return False
    return False


async def submit_on_confirmation_page(page: Page) -> bool:
    """確認画面の「応募する」をクリック → 送信。

    確認画面には「応募する」ボタンが複数（comp-submit-animate と js_ignite-submit）
    あるが、可視のものを先頭から1つ押せば送信される。
    """
    pre_url = page.url
    print(f"  [info] 確認画面 URL: {pre_url}")

    candidates = [
        'button.comp-submit-animate:has-text("応募する")',
        'button.js_ignite-submit:has-text("応募する")',
        'button:has-text("応募する")',
    ]
    submit_btn = None
    for sel in candidates:
        loc = page.locator(sel).first
        if await loc.count() > 0:
            try:
                if await loc.is_visible():
                    submit_btn = loc
                    print(f"  [ok] 送信ボタン検出: {sel}")
                    break
            except Exception:
                continue
    if submit_btn is None:
        print("  [warn] 確認画面の「応募する」ボタンが見つかりませんでした", file=sys.stderr)
        return False

    try:
        async with page.expect_navigation(timeout=30_000):
            await submit_btn.click()
    except Exception as e:
        print(f"  [warn] expect_navigation: {e}", file=sys.stderr)

    await page.wait_for_timeout(1500)
    post_url = page.url
    print(f"  [info] 送信後 URL: {post_url}")

    # /offers/add/ から離れていれば送信完了とみなす
    if "/offers/add/" in post_url:
        # 送信完了画面が同 URL の可能性も考慮し、本文の完了文言も確認
        body = await page.inner_text("body")
        if any(kw in body for kw in ("応募が完了", "応募しました", "提案しました", "送信しました")):
            return True
        print("  [warn] URL が /offers/add/ のまま。送信失敗の可能性があります", file=sys.stderr)
        return False
    return True


def mark_submitted_in_db(job_id: str, note: str = "auto-submitted via dashboard (CN)") -> None:
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


async def run(job_id: str, auto_confirm: bool, auto_submit: bool, keep_open: bool = True) -> int:
    bundle = fetch_proposal_bundle(job_id)
    propose_url = detail_url_to_propose_url(bundle["detail_url"])
    delivery_date = resolve_delivery_date(bundle)
    print(f"📤 {job_id} を {propose_url} に流し込みます（納品希望日={delivery_date}）")

    if not PROFILE_DIR.exists():
        print(
            "❌ ログイン済みプロファイルがありません。"
            "先に scripts/relogin.sh cn を実行してください。",
            file=sys.stderr,
        )
        return 1

    async with async_playwright() as p:
        # 実 Google Chrome + ログイン済み永続プロファイル。
        # storage_state は渡さない（永続 dir 側がセッションを保持する）。
        ctx = await p.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE_DIR),
            channel="chrome",
            headless=False,
            locale="ja-JP",
            timezone_id="Asia/Tokyo",
            viewport={"width": 1280, "height": 900},
            args=["--disable-blink-features=AutomationControlled"],
        )
        keep_browser_open = False
        page = None
        try:
            page = ctx.pages[0] if ctx.pages else await ctx.new_page()

            await page.goto(propose_url, wait_until="domcontentloaded")
            if "/login" in page.url:
                print(
                    "❌ ログインセッション切れ。scripts/relogin.sh cn を実行してください。",
                    file=sys.stderr,
                )
                return 2

            # 提案フォームの主要要素が出るまで待つ
            try:
                await page.wait_for_selector("#OfferContent", timeout=15000)
            except Exception:
                print(
                    "❌ 提案フォームが見つかりません（募集終了 / 応募済 の可能性）。",
                    file=sys.stderr,
                )
                return 3

            print("📝 フィールドを順に埋めます...")
            await fill_content(page, bundle["description_md"])
            await fill_price(page, bundle["price"])
            await fill_delivery_date(page, delivery_date)

            if not auto_confirm:
                print("✅ 自動入力完了。--no-auto-confirm 指定のためここで停止。")
                print("   ブラウザで内容確認の上、「確認する」を手動クリックしてください。")
                keep_browser_open = True
                return 0

            # 「確認する」をクリック → 確認画面へ
            await page.wait_for_timeout(500)
            if not await click_confirm_button(page):
                print("❌ 「確認する」ボタンが見つかりません。手動操作してください。", file=sys.stderr)
                keep_browser_open = True
                return 4

            if not await is_on_confirm_page(page):
                print(
                    "❌ 確認画面に遷移できませんでした（入力エラーの可能性）。"
                    "ブラウザで内容を確認・修正してください。",
                    file=sys.stderr,
                )
                keep_browser_open = True
                return 4

            if not auto_submit:
                print("✅ 確認画面まで遷移しました。--no-auto-submit 指定のためここで停止。")
                print("   ブラウザで内容確認の上、「応募する」を手動クリックしてください。")
                keep_browser_open = True
                return 0

            print("📨 確認画面で最終送信します...")
            if not await submit_on_confirmation_page(page):
                print("❌ 自動送信に失敗。ブラウザ上で確認・手動送信してください。", file=sys.stderr)
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
                await ctx.close()
            except Exception:
                pass


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="ココナラ提案画面に自動入力 → 確認 → 自動送信"
    )
    p.add_argument("--job-id", required=True, help="例: CN-20260515-001")
    p.add_argument(
        "--no-auto-confirm",
        action="store_true",
        help="「確認する」ボタンの自動クリックを無効化（入力のみで停止）",
    )
    p.add_argument(
        "--no-auto-submit",
        action="store_true",
        help="確認画面での最終送信ボタンの自動クリックを無効化（確認画面で停止）",
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
                auto_confirm=not args.no_auto_confirm,
                auto_submit=not args.no_auto_submit,
                keep_open=not args.no_keep_open,
            )
        )
    )
