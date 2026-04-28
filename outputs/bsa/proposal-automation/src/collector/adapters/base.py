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


class PlatformAdapter(ABC):
    prefix: str = ""
    name: str = ""
    search_urls: list[str] = []

    @abstractmethod
    async def is_logged_in(self, page: Page) -> bool: ...

    @abstractmethod
    async def fetch_listings(self, page: Page, source_url: str) -> list[ListingItem]: ...

    @abstractmethod
    async def fetch_detail(self, page: Page, listing: ListingItem) -> JobDetail: ...
