import pytest
from pathlib import Path
from adapters.lancers import LancersAdapter

FIXTURES = Path(__file__).parent / "fixtures"


def test_parse_listings_from_html():
    """LP fixture から ListingItem 配列が抽出できる"""
    adapter = LancersAdapter()
    html = (FIXTURES / "lancers_listing_lp.html").read_text(encoding="utf-8")
    items = adapter.parse_listings_from_html(html, source_url="https://www.lancers.jp/work/search/web/lp")
    assert len(items) > 0, "案件が1件も取得できていない"
    first = items[0]
    assert first.platform_prefix == "LAN"
    assert first.title  # not empty
    assert first.detail_url.startswith("https://www.lancers.jp/work/detail/")
    assert first.source_url == "https://www.lancers.jp/work/search/web/lp"


def test_parse_listings_website_fixture():
    """website fixture で複数件抽出できる"""
    adapter = LancersAdapter()
    html = (FIXTURES / "lancers_listing_website.html").read_text(encoding="utf-8")
    items = adapter.parse_listings_from_html(html, source_url="https://www.lancers.jp/work/search/web/website")
    # website fixture には 8 件の実案件 (/work/detail/) が存在する
    assert len(items) >= 5


def test_parse_listings_ad_fixture():
    """ad fixture は 404 ページのため 0 件でも許容する（抽出ロジック自体は例外を出さない）"""
    adapter = LancersAdapter()
    html = (FIXTURES / "lancers_listing_ad.html").read_text(encoding="utf-8")
    # lancers_listing_ad.html は取得時に 404 ページが返ったため案件ゼロ
    # ロジックが例外を出さず list を返すことを確認する
    items = adapter.parse_listings_from_html(html, source_url="https://www.lancers.jp/work/search/ad")
    assert isinstance(items, list)


def test_listing_has_budget_text_when_available():
    """予算テキストが取れる案件が一定数ある"""
    adapter = LancersAdapter()
    html = (FIXTURES / "lancers_listing_lp.html").read_text(encoding="utf-8")
    items = adapter.parse_listings_from_html(html, source_url="https://www.lancers.jp/work/search/web/lp")
    with_budget = [it for it in items if it.budget_text]
    # 全件取れることまでは要求しないが、半数以上は budget が見えるはず
    assert len(with_budget) >= len(items) // 2, f"budget が取れた割合が低い: {len(with_budget)}/{len(items)}"


def test_listing_detail_urls_are_unique():
    adapter = LancersAdapter()
    html = (FIXTURES / "lancers_listing_lp.html").read_text(encoding="utf-8")
    items = adapter.parse_listings_from_html(html, source_url="x")
    urls = [it.detail_url for it in items]
    assert len(urls) == len(set(urls)), "重複した detail_url が含まれている"
