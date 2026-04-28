from typing import Optional
from urllib.parse import urljoin
from bs4 import BeautifulSoup
from playwright.async_api import Page

from .base import PlatformAdapter, ListingItem, JobDetail

_BASE = "https://www.lancers.jp"


class LancersAdapter(PlatformAdapter):
    prefix = "LAN"
    name = "Lancers"
    search_urls = [
        "https://www.lancers.jp/work/search/web/lp",
        "https://www.lancers.jp/work/search/web/website",
        "https://www.lancers.jp/work/search/ad",
    ]

    # ------------------------------------------------------------------
    # Auth check
    # ------------------------------------------------------------------

    async def is_logged_in(self, page: Page) -> bool:
        await page.goto("https://www.lancers.jp/mypage", wait_until="domcontentloaded")
        try:
            if "/login" in page.url or "/user/login" in page.url:
                return False
            await page.wait_for_selector(
                ".header__user, .nav-globalHeader__userIcon, .p-mypage, [data-user-menu]",
                timeout=5000,
            )
            return True
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Core HTML parser (pure function — testable without Playwright)
    # ------------------------------------------------------------------

    def parse_listings_from_html(self, html: str, source_url: str) -> list[ListingItem]:
        """Lancers 検索結果 HTML から ListingItem 一覧を返す。

        セレクタ戦略:
        - タイトルアンカー: ``a[href^="/work/detail/"]`` で確実に実案件のみに絞る
        - カード取得: タイトルアンカーの祖先を上に辿り、.p-search-job-media__price と
          .p-search-job-media__time-text の両方を持つ最初の要素をカードと見なす
        - 404 ページなど案件ゼロのケースは空リストを返す（例外なし）
        """
        soup = BeautifulSoup(html, "html.parser")
        items: list[ListingItem] = []
        seen_urls: set[str] = set()

        # /work/detail/ から始まる href を持つアンカーを全件取得
        # (tech-agent.lancers.jp など外部 URL は除外される)
        for anchor in soup.select('a[href^="/work/detail/"]'):
            href = anchor.get("href", "").strip()
            title = anchor.get_text(strip=True)
            if not href or not title:
                continue

            detail_url = urljoin(_BASE, href)
            if detail_url in seen_urls:
                continue
            seen_urls.add(detail_url)

            # 祖先を遡って、価格と時間の両方を含む最小カード要素を探す
            card = self._find_card(anchor)

            budget_text: Optional[str] = None
            posted_at: Optional[str] = None

            if card is not None:
                price_el = card.select_one(".p-search-job-media__price")
                if price_el:
                    budget_text = " ".join(price_el.get_text().split())

                time_el = card.select_one(
                    ".p-search-job-media__time-text, .p-search-job-media__time-remaining"
                )
                if time_el:
                    posted_at = time_el.get_text(strip=True)

            items.append(
                ListingItem(
                    platform_prefix=self.prefix,
                    title=title,
                    detail_url=detail_url,
                    source_url=source_url,
                    budget_text=budget_text,
                    posted_at=posted_at,
                )
            )

        return items

    @staticmethod
    def _find_card(anchor):
        """アンカーから祖先を最大 12 階層まで辿り、価格と時間の両方を持つ要素を返す。

        見つからなければ ``None`` を返す（例外なし）。
        """
        node = anchor
        for _ in range(12):
            node = node.parent
            if node is None:
                return None
            has_price = bool(node.select_one(".p-search-job-media__price"))
            has_time = bool(
                node.select_one(
                    ".p-search-job-media__time-text, .p-search-job-media__time-remaining"
                )
            )
            if has_price and has_time:
                return node
        return None

    # ------------------------------------------------------------------
    # Playwright-based methods
    # ------------------------------------------------------------------

    async def fetch_listings(self, page: Page, source_url: str) -> list[ListingItem]:
        await page.goto(source_url, wait_until="domcontentloaded")
        await page.wait_for_selector('a[href^="/work/detail/"]', timeout=15000)
        html = await page.content()
        return self.parse_listings_from_html(html, source_url)

    async def fetch_detail(self, page: Page, listing: ListingItem) -> JobDetail:
        # Task 7 で実装
        raise NotImplementedError
