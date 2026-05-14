"""Coconala (coconala.com) 公開依頼 Adapter。

LancersAdapter / CrowdWorksAdapter と同じ責務（fetch_listings / fetch_detail）を持つ。
Coconala の「公開依頼」は cookie 不要で一覧・詳細を閲覧できるため requires_login=False。
（提案投下 = /offers/add/<id> はログイン必須だが、それは form_fill 側の責務）

巡回カテゴリ:
- /requests/categories/500 → ホームページ作成・サイト制作（L2 直撃）
- /requests/categories/503 → LP作成・ランディングページデザイン（L1 直撃）
- /requests/categories/644 → Webサイト修正・カスタマイズ（L4 直撃）

詳細ページ URL: https://coconala.com/requests/{request_id}
request_id は数字のみ（例: 5030575）。

締切表記の注意:
詳細ページの c-requestOutline には「締切日 YYYY年M月D日」と「掲載日 YYYY年M月D日」が
並ぶため、無印の日付正規表現だと掲載日を締切と誤検出する。必ず「締切日」ラベル直後の
日付のみを採る（CW adapter と同じ落とし穴）。
"""

import re
from typing import Optional
from urllib.parse import urljoin
from bs4 import BeautifulSoup
from playwright.async_api import Page

from .base import PlatformAdapter, ListingItem, JobDetail

_BASE = "https://coconala.com"

# 詳細ページ: 「締切日 2026年5月21日」ラベル直後の日付のみを採る
_DEADLINE_LABELED_RE = re.compile(r"締切日[\s　]*(\d{4})年(\d{1,2})月(\d{1,2})日")
# 応募人数: 「応募人数 68」
_APPLICATION_COUNT_RE = re.compile(r"応募人数[\s　]*(\d+)")
# 募集終了マーカー
_CLOSED_MARKERS = (
    "この依頼の募集は終了",
    "募集を終了しました",
    "募集は終了しています",
    "募集を締め切りました",
)


def _parse_budget(budget_text: str) -> tuple[Optional[int], Optional[int]]:
    """予算テキストから (min, max) を抽出。

    例:
      "5万 円 〜 8万 円"  → (50000, 80000)
      "10,000 円 〜 30,000 円" → (10000, 30000)
      "5万 円"            → (50000, 50000)
      "見積り希望"        → (None, None)
    """
    if not budget_text:
        return None, None
    text = budget_text.replace(",", "")
    if "見積" in text:
        return None, None
    has_man = "万" in text
    nums = [int(m) for m in re.findall(r"\d+", text)]
    if not nums:
        return None, None
    if has_man:
        nums = [n * 10000 for n in nums]
    if len(nums) == 1:
        return nums[0], nums[0]
    return min(nums), max(nums)


def _detect_service_category(source_url: str) -> Optional[str]:
    """source URL からサービスカテゴリを推定（generator の product-line-mapper が使う）。"""
    if "/categories/503" in source_url:
        return "lp"
    if "/categories/500" in source_url:
        return "website"
    if "/categories/644" in source_url:
        return "modification"
    return None


def _detail_url_from_href(href: str) -> Optional[str]:
    """href から詳細 URL を組み立てる。/requests/<数字> のみ採用。"""
    if not href:
        return None
    m = re.search(r"/requests/(\d+)(?:[/?#]|$)", href)
    if not m:
        return None
    return urljoin(_BASE, f"/requests/{m.group(1)}")


class CoconalaAdapter(PlatformAdapter):
    prefix = "CN"
    name = "Coconala"
    requires_login = False  # 公開依頼の閲覧は cookie 不要
    search_urls = [
        "https://coconala.com/requests/categories/500",  # HP作成（L2）
        "https://coconala.com/requests/categories/503",  # LP制作（L1）
        "https://coconala.com/requests/categories/644",  # Web修正（L4）
    ]

    # ------------------------------------------------------------------
    # Auth check（requires_login=False のため main.py からは呼ばれないが、
    # 抽象メソッドなので実装する。常に True を返す）
    # ------------------------------------------------------------------

    async def is_logged_in(self, page: Page) -> bool:
        return True

    # ------------------------------------------------------------------
    # Core HTML parser (pure functions)
    # ------------------------------------------------------------------

    def parse_listings_from_html(self, html: str, source_url: str) -> list[ListingItem]:
        """Coconala の公開依頼一覧 HTML から ListingItem 一覧を返す。

        セレクタ戦略:
        - カード: div.c-searchItemWrapper
        - タイトル: div.c-itemInfo_title
        - 詳細リンク: a.c-searchItem_detailLink[href]
        - 予算: div.d-requestBudget のテキスト（「見積り希望」もそのまま budget_text に）
        - 投稿日時: div.c-itemInfoUser_created
        """
        soup = BeautifulSoup(html, "html.parser")
        items: list[ListingItem] = []
        seen_urls: set[str] = set()

        for card in soup.select("div.c-searchItemWrapper"):
            link = card.select_one("a.c-searchItem_detailLink[href]")
            detail_url = _detail_url_from_href(link.get("href", "")) if link else None
            if not detail_url or detail_url in seen_urls:
                continue

            title_el = card.select_one("div.c-itemInfo_title")
            title = title_el.get_text(strip=True) if title_el else ""
            if not title:
                continue
            seen_urls.add(detail_url)

            # 予算テキスト（「5万 円 〜 8万 円」or「見積り希望」）
            budget_text: Optional[str] = None
            budget_el = card.select_one("div.d-requestBudget") or card.select_one(
                "div.c-itemTileContent_inner-budget"
            )
            if budget_el:
                budget_text = " ".join(budget_el.get_text(" ", strip=True).split())

            # 投稿日時（「投稿日時： 5時間前」）
            posted_at: Optional[str] = None
            posted_el = card.select_one("div.c-itemInfoUser_created")
            if posted_el:
                posted_at = posted_el.get_text(strip=True).replace("投稿日時：", "").strip()

            # 依頼者名（一覧カードで確実に取れる。詳細ページの募集者セクションは
            # 名前要素が class 無しのため、ここで取って fetch_detail に引き継ぐ）
            client_name: Optional[str] = None
            user_el = card.select_one("div.c-itemInfoUser_name")
            if user_el:
                client_name = user_el.get_text(strip=True) or None

            items.append(
                ListingItem(
                    platform_prefix=self.prefix,
                    title=title,
                    detail_url=detail_url,
                    source_url=source_url,
                    budget_text=budget_text,
                    posted_at=posted_at,
                    client_name=client_name,
                )
            )

        return items

    def parse_detail_from_html(self, html: str, listing: ListingItem) -> JobDetail:
        """Coconala 公開依頼の詳細ページ HTML から JobDetail を返す（純粋関数）。"""
        soup = BeautifulSoup(html, "html.parser")
        full_text = soup.get_text("\n", strip=True)

        # 1) 本文: c-requestContentsSummary（業種・用途・ページ数等のサマリ）+
        # c-requestContentsDetail（募集内容の本文）を結合。
        # 全文フォールバックは「この募集内容に似ている仕事」等のノイズを拾うため避ける。
        parts: list[str] = []
        summary_el = soup.select_one("div.c-requestContentsSummary")
        if summary_el:
            parts.append(summary_el.get_text(" ", strip=True))
        detail_el = soup.select_one("div.c-requestContentsDetail")
        if detail_el:
            parts.append(detail_el.get_text(" ", strip=True))
        description = "\n\n".join(parts) if parts else full_text[:6000]

        # 2) 予算: c-requestOutlineRow の「予算 ...」行を見る。
        budget_text_for_parse = listing.budget_text or ""
        for row in soup.select("div.c-requestOutlineRow"):
            row_text = row.get_text(" ", strip=True)
            if row_text.startswith("予算"):
                budget_text_for_parse = row_text
                break
        budget_min, budget_max = _parse_budget(budget_text_for_parse)

        # 3) 締切: 「締切日 YYYY年M月D日」ラベル直後の日付のみ。
        # （同じ行に「掲載日」があるため無印の日付正規表現は使わない）
        deadline: Optional[str] = None
        m = _DEADLINE_LABELED_RE.search(full_text)
        if m:
            y, mo, d = m.group(1), m.group(2).zfill(2), m.group(3).zfill(2)
            deadline = f"{y}-{mo}-{d}"

        # 4) 応募人数: 「応募人数 68」
        proposal_count: Optional[int] = None
        m2 = _APPLICATION_COUNT_RE.search(full_text)
        if m2:
            try:
                proposal_count = int(m2.group(1))
            except (TypeError, ValueError):
                pass

        # 5) 依頼者名: 一覧カードから引き継ぐ。
        # （詳細ページの c-requestDetailRequester は名前要素が class 無しで取りにくい）
        client_name: Optional[str] = listing.client_name

        # 6) 本人確認 / 7) 発注実績: 募集者情報セクション内から抽出。
        client_verified: bool = False
        client_history_count: Optional[int] = None
        req_el = soup.select_one("div.c-requestDetailRequester")
        if req_el:
            req_text = req_el.get_text(" ", strip=True)
            # 認証状況テーブルに「本人確認」+「済」が出ていれば確認済み
            client_verified = "本人確認" in req_text and "済" in req_text
            # 発注実績テーブル: 「発注件数」heading に対応する body の数値
            for heading in req_el.select("div.c-infoRequesterTableColumn_heading"):
                if heading.get_text(strip=True) == "発注件数":
                    body = heading.find_previous_sibling(
                        "div", class_="c-infoRequesterTableColumn_body"
                    )
                    if body:
                        try:
                            client_history_count = int(body.get_text(strip=True))
                        except ValueError:
                            pass
                    break

        # 8) service_category
        service_category = _detect_service_category(listing.source_url)

        # 9) 募集終了判定
        is_closed = any(marker in full_text for marker in _CLOSED_MARKERS)

        return JobDetail(
            listing=listing,
            description=description,
            budget_min=budget_min,
            budget_max=budget_max,
            deadline=deadline,
            proposal_count=proposal_count,
            client_name=client_name,
            client_verified=client_verified,
            client_history_count=client_history_count,
            service_category=service_category,
            is_closed=is_closed,
        )

    # ------------------------------------------------------------------
    # Playwright-based methods
    # ------------------------------------------------------------------

    async def fetch_listings(self, page: Page, source_url: str) -> list[ListingItem]:
        await page.goto(source_url, wait_until="domcontentloaded")
        try:
            await page.wait_for_selector("div.c-searchItemWrapper", timeout=30000)
        except Exception:
            pass
        html = await page.content()
        return self.parse_listings_from_html(html, source_url)

    async def fetch_detail(self, page: Page, listing: ListingItem) -> JobDetail:
        await page.goto(listing.detail_url, wait_until="domcontentloaded")
        try:
            await page.wait_for_selector("h1, div.c-requestOutline", timeout=10000)
        except Exception:
            pass
        html = await page.content()
        return self.parse_detail_from_html(html, listing)
