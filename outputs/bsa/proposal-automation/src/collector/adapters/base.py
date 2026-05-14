from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional
from playwright.async_api import Page


@dataclass
class ListingItem:
    platform_prefix: str
    title: str
    detail_url: str
    source_url: str
    budget_text: Optional[str] = None
    posted_at: Optional[str] = None
    # 一覧カードで依頼者名が確実に取れる媒体用（Coconala 等）。
    # 詳細ページ側で取りにくい場合に fetch_detail がこれを引き継ぐ。
    client_name: Optional[str] = None


@dataclass
class JobDetail:
    listing: ListingItem
    description: str
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    deadline: Optional[str] = None
    proposal_count: Optional[int] = None
    client_name: Optional[str] = None
    client_verified: Optional[bool] = None
    client_history_count: Optional[int] = None
    service_category: Optional[str] = None  # lp / website / ad
    is_closed: bool = False  # 募集終了 / 応募期限切れ等で取り込みスキップ対象


class PlatformAdapter(ABC):
    prefix: str = ""
    name: str = ""
    search_urls: list[str] = []
    # 収集（一覧・詳細の閲覧）にログインが必要かどうか。
    # False の媒体は cookie 不要で collect でき、is_logged_in も呼ばれない。
    # （提案投下 = form_fill 側は別途 cookie が必要な場合がある）
    requires_login: bool = True

    @abstractmethod
    async def is_logged_in(self, page: Page) -> bool: ...

    @abstractmethod
    async def fetch_listings(self, page: Page, source_url: str) -> list[ListingItem]: ...

    @abstractmethod
    async def fetch_detail(self, page: Page, listing: ListingItem) -> JobDetail: ...
