import re
from typing import Optional
from urllib.parse import urljoin
from bs4 import BeautifulSoup
from playwright.async_api import Page

from .base import PlatformAdapter, ListingItem, JobDetail

_BASE = "https://www.lancers.jp"

_DEADLINE_RE = re.compile(r"締切[：:]\s*(\d{4})年(\d{1,2})月(\d{1,2})日")
_PROPOSAL_COUNT_RE = re.compile(r"提案数\s*(\d+)")


def _parse_budget(price_text: str) -> tuple[Optional[int], Optional[int]]:
    """
    例:
      "10,000 円 ~ 20,000 円 / 固定" -> (10000, 20000)
      "5万円 ~ 10万円"               -> (50000, 100000)
      "5万円"                        -> (50000, 50000)
    """
    if not price_text:
        return None, None
    text = price_text.replace(",", "")
    nums = [int(m.group(1)) for m in re.finditer(r"(\d+)", text)]
    if not nums:
        return None, None
    has_man = "万" in text
    if has_man:
        nums = [n * 10000 for n in nums]
    if len(nums) == 1:
        return nums[0], nums[0]
    return min(nums), max(nums)


def _detect_service_category(source_url: str) -> Optional[str]:
    if "/web/lp" in source_url:
        return "lp"
    if "/web/website" in source_url:
        return "website"
    if "/ad" in source_url:
        return "ad"
    return None


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

    def parse_detail_from_html(self, html: str, listing: ListingItem) -> JobDetail:
        """詳細ページ HTML から JobDetail を返す（純粋関数 — Playwright 不要）。"""
        soup = BeautifulSoup(html, "html.parser")

        # 1) 本文（メイン領域 = work_detail_lefter）
        lefter = soup.select_one(".work_detail_lefter")
        full_text = lefter.get_text("\n", strip=True) if lefter else ""
        description = full_text

        # 2) 予算
        budget_min: Optional[int] = None
        budget_max: Optional[int] = None
        price_el = soup.select_one(".p-search-job-media__price")
        if price_el:
            budget_min, budget_max = _parse_budget(price_el.get_text(" ", strip=True))

        # 3) 締切
        deadline: Optional[str] = None
        m = _DEADLINE_RE.search(full_text)
        if m:
            y, mo, d = m.group(1), m.group(2).zfill(2), m.group(3).zfill(2)
            deadline = f"{y}-{mo}-{d}"

        # 4) 提案数
        proposal_count: Optional[int] = None
        m2 = _PROPOSAL_COUNT_RE.search(full_text)
        if m2:
            proposal_count = int(m2.group(1))

        # 5) クライアント名
        client_name: Optional[str] = None
        client_el = soup.select_one(".client_name a.c-link")
        if client_el:
            raw = client_el.get_text(strip=True)
            # "会社名 (ID)" 形式 → 「(」より前
            client_name = re.split(r"[\(（]", raw, maxsplit=1)[0].strip() or None

        # 6) クライアント本人確認
        client_verified: bool = "認証済みのクライアントからの依頼" in full_text

        # 7) クライアント発注実績（Phase 1 では feedback-info の最初の数値を流用）
        client_history_count: Optional[int] = None
        feedback_nums = soup.select(".p-work-detail-client-box-feedback-info__number")
        if feedback_nums:
            try:
                client_history_count = int(feedback_nums[0].get_text(strip=True))
            except (ValueError, AttributeError):
                client_history_count = None

        # 8) service_category
        service_category = _detect_service_category(listing.source_url)

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
        )

    async def fetch_detail(self, page: Page, listing: ListingItem) -> JobDetail:
        """Playwright で詳細ページに遷移して HTML を取り、parse_detail_from_html に流す。"""
        await page.goto(listing.detail_url, wait_until="domcontentloaded")
        try:
            await page.wait_for_selector(".work_detail_lefter, .client_name", timeout=10000)
        except Exception:
            pass  # HTML を best effort で parse
        html = await page.content()
        return self.parse_detail_from_html(html, listing)
