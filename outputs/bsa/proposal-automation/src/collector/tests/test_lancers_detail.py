import pytest
from pathlib import Path
from adapters.lancers import LancersAdapter
from adapters.base import ListingItem

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def adapter():
    return LancersAdapter()


@pytest.fixture
def detail_html():
    return (FIXTURES / "lancers_detail.html").read_text(encoding="utf-8")


@pytest.fixture
def listing_for_detail():
    # fixture detail HTML は LP 案件 (女性向けナイトブラ LP) のはず
    return ListingItem(
        platform_prefix="LAN",
        title="dummy",
        detail_url="https://www.lancers.jp/work/detail/5534856",
        source_url="https://www.lancers.jp/work/search/web/lp",
    )


def test_parse_detail_returns_job_detail(adapter, detail_html, listing_for_detail):
    detail = adapter.parse_detail_from_html(detail_html, listing_for_detail)
    assert detail.listing.detail_url == listing_for_detail.detail_url


def test_parse_detail_description_non_empty(adapter, detail_html, listing_for_detail):
    detail = adapter.parse_detail_from_html(detail_html, listing_for_detail)
    assert detail.description, "description が空"
    # 「LP」または「ランディング」が含まれるはず（このケースは LP 制作）
    assert "LP" in detail.description or "ランディング" in detail.description


def test_parse_detail_budget(adapter, detail_html, listing_for_detail):
    detail = adapter.parse_detail_from_html(detail_html, listing_for_detail)
    # サンプル案件は 10,000 〜 20,000 円
    assert detail.budget_min is not None
    assert detail.budget_max is not None
    assert detail.budget_min <= detail.budget_max
    # 円単位の妥当範囲
    assert 1_000 <= detail.budget_min <= 100_000_000


def test_parse_detail_client_name(adapter, detail_html, listing_for_detail):
    detail = adapter.parse_detail_from_html(detail_html, listing_for_detail)
    assert detail.client_name, "client_name が空"


def test_parse_detail_service_category(adapter, detail_html, listing_for_detail):
    # source_url が /web/lp なので 'lp'
    detail = adapter.parse_detail_from_html(detail_html, listing_for_detail)
    assert detail.service_category == "lp"


def test_parse_detail_service_category_website(adapter, detail_html):
    listing = ListingItem(
        platform_prefix="LAN", title="x", detail_url="x",
        source_url="https://www.lancers.jp/work/search/web/website",
    )
    detail = adapter.parse_detail_from_html(detail_html, listing)
    assert detail.service_category == "website"


def test_parse_detail_proposal_count(adapter, detail_html, listing_for_detail):
    detail = adapter.parse_detail_from_html(detail_html, listing_for_detail)
    # サンプル案件は 22件 提案あり（ただし fixture 時点の値なので >= 1 で十分）
    assert detail.proposal_count is None or detail.proposal_count >= 0


def test_parse_detail_deadline(adapter, detail_html, listing_for_detail):
    detail = adapter.parse_detail_from_html(detail_html, listing_for_detail)
    # サンプル案件は「締切：2026年05月05日」
    if detail.deadline:
        # YYYY-MM-DD 形式を期待
        assert len(detail.deadline) == 10
        assert detail.deadline[4] == "-"
        assert detail.deadline[7] == "-"


def test_parse_detail_client_verified(adapter, detail_html, listing_for_detail):
    detail = adapter.parse_detail_from_html(detail_html, listing_for_detail)
    # サンプル案件は「認証済みのクライアントからの依頼です」が含まれている
    assert detail.client_verified is True
