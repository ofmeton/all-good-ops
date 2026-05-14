"""CrowdWorks (crowdworks.jp) Adapter。

LancersAdapter と同じ責務（is_logged_in / fetch_listings / fetch_detail）を持つが、
CW のページ構造に合わせてセレクタが異なる。

CW のカテゴリ ID:
- /public/jobs/category/17  → LP（ランディングページ）制作
- /public/jobs/category/14  → ホームページ作成
- /public/jobs/category/285 → Webサイト修正・更新・機能追加

詳細ページ URL: https://crowdworks.jp/public/jobs/{job_number}
job_number は数字のみ（例: 12926094）。
"""

import re
from typing import Optional
from urllib.parse import urljoin
from bs4 import BeautifulSoup
from playwright.async_api import Page

from .base import PlatformAdapter, ListingItem, JobDetail

_BASE = "https://crowdworks.jp"

# 締切表記:
# CW 詳細ページは「掲載日 / 応募期限」の順で年月日が並ぶため、最初に出る日付を
# そのまま拾うと「掲載日（投稿日）」を締切として誤保存する。必ず「応募期限」
# ラベルの直後の日付だけを採る。
_DEADLINE_LABELED_RE = re.compile(
    r"応募期限[\s　]*(\d{4})年(\d{1,2})月(\d{1,2})日"
)
# 募集終了マーカー（応募期限が未来でも、既に締め切られているケースを検知）
_CLOSED_MARKERS = (
    "このお仕事の募集は終了して",
    "募集は終了しています",
)
_PROPOSAL_COUNT_RE = re.compile(r"応募\s*(\d+)|提案\s*(\d+)")
_BUDGET_RE = re.compile(r"([\d,]+)\s*円")
_BUDGET_MAN_RE = re.compile(r"([\d,]+)\s*万円")


def _parse_budget(price_text: str) -> tuple[Optional[int], Optional[int]]:
    """予算テキストから (min, max) を抽出。

    例:
      "10,000 円 〜 30,000 円"  → (10000, 30000)
      "5万円 〜 10万円"         → (50000, 100000)
      "5万円"                  → (50000, 50000)
    """
    if not price_text:
        return None, None
    text = price_text.replace(",", "")
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
    if "/category/17" in source_url:
        return "lp"
    if "/category/14" in source_url:
        return "website"
    if "/category/285" in source_url:
        return "modification"
    return None


def _detail_url_from_href(href: str) -> Optional[str]:
    """href から詳細 URL を組み立てる。
    /public/jobs/12926094 のような数字のみの末尾を持つもののみ採用。
    """
    if not href:
        return None
    # 末尾が「/jobs/<数字>」のもの
    m = re.match(r"^/public/jobs/(\d+)/?$", href)
    if not m:
        return None
    return urljoin(_BASE, f"/public/jobs/{m.group(1)}")


class CrowdWorksAdapter(PlatformAdapter):
    prefix = "CW"
    name = "CrowdWorks"
    # BSA 商品ライン（L1/L2/L4）の供給源として巡回する 3 カテゴリ
    search_urls = [
        "https://crowdworks.jp/public/jobs/category/17",   # LP制作（L1 直撃）
        "https://crowdworks.jp/public/jobs/category/14",   # HP作成（L2 直撃）
        "https://crowdworks.jp/public/jobs/category/285",  # Webサイト修正（L4 直撃）
    ]

    # ------------------------------------------------------------------
    # Auth check
    # ------------------------------------------------------------------

    async def is_logged_in(self, page: Page) -> bool:
        """CW のログイン状態を URL ベースで判定。

        /mypage を開いて、結果として /login にリダイレクトされなければ
        ログイン済み。
        """
        try:
            await page.goto(
                "https://crowdworks.jp/mypage",
                wait_until="domcontentloaded",
                timeout=15000,
            )
        except Exception:
            return False
        url = page.url
        if "/login" in url or "/users/sign_in" in url:
            return False
        return True

    # ------------------------------------------------------------------
    # Core HTML parser (pure function)
    # ------------------------------------------------------------------

    def parse_listings_from_html(self, html: str, source_url: str) -> list[ListingItem]:
        """CW の検索結果 HTML から ListingItem 一覧を返す。

        セレクタ戦略:
        - a[href ^= "/public/jobs/"] で末尾が数字のみのものを案件リンクと見なす
        - タイトル: anchor の get_text(strip=True)
        - カード（祖先要素）から予算・投稿日時を best-effort で取得
        """
        soup = BeautifulSoup(html, "html.parser")
        items: list[ListingItem] = []
        seen_urls: set[str] = set()

        for anchor in soup.select('a[href^="/public/jobs/"]'):
            href = anchor.get("href", "").strip()
            detail_url = _detail_url_from_href(href)
            if not detail_url or detail_url in seen_urls:
                continue
            title = anchor.get_text(strip=True)
            if not title:
                continue
            seen_urls.add(detail_url)

            # カードコンテナを上方に辿って予算と日時を best-effort で抽出
            card = self._find_card(anchor)
            budget_text: Optional[str] = None
            posted_at: Optional[str] = None

            if card is not None:
                # 予算テキスト: 「円」を含む短いテキストを最初の候補として拾う
                price_candidates = card.find_all(
                    string=lambda s: s and "円" in s and len(s.strip()) < 80
                )
                if price_candidates:
                    budget_text = " ".join(price_candidates[0].split())

                # 投稿時刻: <time> タグがあれば
                time_el = card.find("time")
                if time_el:
                    posted_at = time_el.get_text(strip=True) or time_el.get(
                        "datetime"
                    )

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
        """anchor から祖先を最大 8 階層辿って、案件カード（li / article / div）を返す。"""
        node = anchor
        for _ in range(8):
            node = node.parent
            if node is None:
                return None
            tag = (node.name or "").lower()
            if tag in ("li", "article"):
                return node
        return None

    # ------------------------------------------------------------------
    # Playwright-based methods
    # ------------------------------------------------------------------

    async def fetch_listings(self, page: Page, source_url: str) -> list[ListingItem]:
        await page.goto(source_url, wait_until="domcontentloaded")
        # CW は Vue.js 系の SPA 寄り。リスト要素が出るまで待つ。混雑時間帯対応で 30秒。
        try:
            await page.wait_for_selector(
                'a[href^="/public/jobs/"]', timeout=30000
            )
        except Exception:
            pass
        html = await page.content()
        return self.parse_listings_from_html(html, source_url)

    def parse_detail_from_html(self, html: str, listing: ListingItem) -> JobDetail:
        """CW 詳細ページ HTML から JobDetail を返す（純粋関数）。

        CW の詳細ページは SPA 系で構造が変わりやすいので、
        汎用的なセレクタ + 正規表現で best-effort 抽出する。
        """
        soup = BeautifulSoup(html, "html.parser")
        full_text = soup.get_text("\n", strip=True)
        description = full_text  # 詳細セクションが特定できない場合のフォールバック

        # 1) 本文の絞り込み: 「仕事の詳細」または「依頼内容」セクション以降を取る
        for marker in ("仕事の詳細", "依頼内容", "依頼概要"):
            idx = full_text.find(marker)
            if idx >= 0:
                description = full_text[idx : idx + 6000]
                break

        # 2) 予算（best-effort）: 「契約金額」または「固定報酬制」周辺を見る
        budget_min: Optional[int] = None
        budget_max: Optional[int] = None
        for phrase in ("固定報酬制", "契約金額", "予算"):
            idx = full_text.find(phrase)
            if idx >= 0:
                snippet = full_text[idx : idx + 200]
                budget_min, budget_max = _parse_budget(snippet)
                if budget_min:
                    break

        # 3) 締切: 必ず「応募期限」ラベル直後の日付のみを拾う
        # （「掲載日 = 投稿日」が先に出るため、無印 \d{4}年\d{1,2}月\d{1,2}日 だと誤検出する）
        deadline: Optional[str] = None
        m = _DEADLINE_LABELED_RE.search(full_text)
        if m:
            y, mo, d = m.group(1), m.group(2).zfill(2), m.group(3).zfill(2)
            deadline = f"{y}-{mo}-{d}"

        # 4) 提案/応募数
        proposal_count: Optional[int] = None
        m2 = _PROPOSAL_COUNT_RE.search(full_text)
        if m2:
            try:
                proposal_count = int(m2.group(1) or m2.group(2))
            except (TypeError, ValueError):
                pass

        # 5) クライアント名: 詳細ページの「クライアント情報」セクションから抽出
        client_name: Optional[str] = None
        # CW の慣例: <a href="/public/employers/<id>"> のテキスト
        cli = soup.select_one('a[href^="/public/employers/"]')
        if cli:
            client_name = cli.get_text(strip=True) or None

        # 6) クライアント本人確認 / 認証
        client_verified: bool = (
            "本人確認済み" in full_text or "本人確認" in full_text
        )

        # 7) クライアント発注実績
        client_history_count: Optional[int] = None
        m3 = re.search(r"発注実績.*?(\d+)\s*件", full_text)
        if m3:
            try:
                client_history_count = int(m3.group(1))
            except ValueError:
                pass

        # 8) service_category
        service_category = _detect_service_category(listing.source_url)

        # 9) 募集終了判定（応募期限が未来でも、サイト側で募集打切られているケース）
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

    async def fetch_detail(self, page: Page, listing: ListingItem) -> JobDetail:
        """Playwright で詳細ページに遷移して HTML を取り、parse_detail_from_html に流す。"""
        await page.goto(listing.detail_url, wait_until="domcontentloaded")
        try:
            await page.wait_for_selector(
                'a[href^="/public/employers/"], h1', timeout=10000
            )
        except Exception:
            pass
        html = await page.content()
        return self.parse_detail_from_html(html, listing)
