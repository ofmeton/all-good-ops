"""Collector メインフロー。

デスクトップアイコン .command から呼ばれ、Lancers の3 search URL を巡回して
案件を SQLite に upsert + fit_score を計算する。
"""

import asyncio
import random
import sys
from typing import Optional

from playwright.async_api import async_playwright

from adapters.lancers import LancersAdapter
from adapters.crowdworks import CrowdWorksAdapter
from session import CookieManager
from stealth import create_stealth_context
from scorer import calculate_fit_score
from db import (
    get_connection,
    upsert_job,
    update_fit_score,
    insert_run,
    update_session,
)


async def collect_for_adapter(adapter, max_per_url: int = 17) -> tuple[int, Optional[str]]:
    """1 adapter で複数 URL を巡回。(success_count, error_message) を返す。"""
    cookie_path = CookieManager.default_path(adapter.prefix)
    cookies = CookieManager(cookie_path)
    state = cookies.load()
    if state is None:
        return 0, "cookie not found - 初回 setup.sh / scripts/dev/capture-fixture.py で初回ログインしてください"

    async with async_playwright() as p:
        context, browser = await create_stealth_context(p, storage_state=state)
        try:
            page = await context.new_page()
            if not await adapter.is_logged_in(page):
                conn = get_connection()
                update_session(conn, adapter.prefix, str(cookie_path), valid=False)
                conn.commit()
                conn.close()
                return 0, "ログインセッション切れ - relogin.sh を実行してください"

            collected = 0
            conn = get_connection()
            try:
                for source_url in adapter.search_urls:
                    # bot 検知や混雑による一時的な失敗に備え 1回リトライ。
                    listings: list = []
                    last_err: Exception | None = None
                    for attempt in (1, 2):
                        try:
                            listings = await adapter.fetch_listings(page, source_url)
                            last_err = None
                            break
                        except Exception as e:
                            last_err = e
                            if attempt == 1:
                                print(
                                    f"⚠️  fetch_listings retry for {source_url}: {e}",
                                    file=sys.stderr,
                                )
                                # リトライ前に少し待つ（5-8秒のランダム）
                                await asyncio.sleep(random.uniform(5, 8))
                    if last_err is not None:
                        print(
                            f"❌ fetch_listings failed for {source_url}: {last_err}",
                            file=sys.stderr,
                        )
                        continue
                    listings = listings[:max_per_url]

                    for listing in listings:
                        try:
                            detail = await adapter.fetch_detail(page, listing)
                            job_data = {
                                "source_url": listing.source_url,
                                "detail_url": listing.detail_url,
                                "title": listing.title,
                                "description": detail.description,
                                "budget_text": listing.budget_text,
                                "budget_min": detail.budget_min,
                                "budget_max": detail.budget_max,
                                "deadline": detail.deadline,
                                "proposal_count": detail.proposal_count,
                                "client_name": detail.client_name,
                                "client_verified": detail.client_verified,
                                "client_history_count": detail.client_history_count,
                                "service_category": detail.service_category,
                                "posted_at": listing.posted_at,
                            }
                            with conn:  # トランザクション境界
                                job_id = upsert_job(conn, job_data, adapter.prefix)
                                total, breakdown = calculate_fit_score(job_data)
                                update_fit_score(conn, job_id, total, breakdown, None)
                            collected += 1
                            print(f"  [ok] {job_id} - {listing.title[:40]} (fit={total})")
                        except Exception as e:
                            print(f"  [skip] {listing.detail_url}: {e}", file=sys.stderr)

                        # リクエスト間隔: 3-5秒のランダム
                        await asyncio.sleep(random.uniform(3, 5))

                update_session(conn, adapter.prefix, str(cookie_path), valid=True)
            finally:
                conn.close()

            return collected, None
        finally:
            # cookie を上書き保存（セッション延命）
            new_state = await context.storage_state()
            cookies.save(new_state)
            await browser.close()


async def main() -> int:
    # 媒体ごとの adapter。1つがエラーでも他は継続するため break しない。
    adapters = [LancersAdapter(), CrowdWorksAdapter()]
    total = 0
    error: Optional[str] = None
    errors: list[str] = []
    for adapter in adapters:
        n, err = await collect_for_adapter(adapter)
        total += n
        if err:
            errors.append(f"[{adapter.prefix}] {err}")
    if errors:
        error = " / ".join(errors)

    conn = get_connection()
    try:
        insert_run(
            conn,
            stage="collect",
            status="success" if error is None else "error",
            collected_count=total,
            error_message=error,
            error_stage="collect" if error else None,
        )
        conn.commit()
    finally:
        conn.close()

    print(f"\n✅ 収集完了: {total} 件")
    if error:
        print(f"❌ エラー: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
