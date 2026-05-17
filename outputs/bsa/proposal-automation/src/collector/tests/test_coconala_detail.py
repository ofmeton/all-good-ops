"""Coconala adapter の parse_listings / parse_detail 回帰テスト。

特に重要:
- deadline は「掲載日」ではなく「締切日」のラベル直後の日付を採ること
- description は c-requestContentsDetail/Summary から取り、「この募集内容に似ている仕事」
  等の関連案件ノイズを拾わないこと
- client_name は一覧カードで取得して詳細に引き継ぐこと（詳細ページの募集者名は class 無し）
"""
from pathlib import Path

import pytest

from adapters.base import ListingItem
from adapters.coconala import CoconalaAdapter, _parse_budget

FIXTURES = Path(__file__).parent / "fixtures"
LIST_SOURCE = "https://coconala.com/requests/categories/500"


@pytest.fixture
def adapter():
    return CoconalaAdapter()


@pytest.fixture
def list_html():
    return (FIXTURES / "coconala_list.html").read_text(encoding="utf-8")


@pytest.fixture
def detail_html():
    return (FIXTURES / "coconala_detail_open.html").read_text(encoding="utf-8")


# ── 一覧パース ──────────────────────────────────────────────


def test_parse_listings_returns_items(adapter, list_html):
    items = adapter.parse_listings_from_html(list_html, LIST_SOURCE)
    assert len(items) == 40, f"1ページ40件のはず。実際: {len(items)}"


def test_parse_listings_fields(adapter, list_html):
    items = adapter.parse_listings_from_html(list_html, LIST_SOURCE)
    first = items[0]
    assert first.platform_prefix == "CN"
    assert first.title  # 非空
    assert first.detail_url.startswith("https://coconala.com/requests/")
    assert first.detail_url[-1].isdigit()  # /requests/<数字> で終わる
    # client_name は一覧カードで取れる（詳細では取りにくいため必須）
    assert first.client_name, "一覧カードから依頼者名が取れていない"


def test_parse_listings_dedup(adapter, list_html):
    """同一 detail_url が重複しない。"""
    items = adapter.parse_listings_from_html(list_html, LIST_SOURCE)
    urls = [i.detail_url for i in items]
    assert len(urls) == len(set(urls))


# ── 詳細パース ──────────────────────────────────────────────


@pytest.fixture
def listing():
    # 一覧から引き継がれる client_name を模す
    return ListingItem(
        platform_prefix="CN",
        title="建設会社向けホームページ制作のプロフェッショナルを募集します",
        detail_url="https://coconala.com/requests/5030575",
        source_url=LIST_SOURCE,
        budget_text="5万 円 〜 8万 円",
        client_name="victoire95",
    )


def test_deadline_uses_shimekiri_not_keisai(adapter, detail_html, listing):
    """掲載日が同じ行にあっても、締切日の日付が deadline になること。"""
    detail = adapter.parse_detail_from_html(detail_html, listing)
    # 締切日 2026-05-21 が採られ、掲載日 2026-05-14 を誤検出しない
    assert detail.deadline == "2026-05-21", (
        f"deadline は締切日であるべき。実際: {detail.deadline} "
        "(掲載日 2026-05-14 を誤検出している可能性)"
    )


def test_description_excludes_related_jobs_noise(adapter, detail_html, listing):
    """description が「この募集内容に似ている仕事」等の関連案件を拾わないこと。"""
    detail = adapter.parse_detail_from_html(detail_html, listing)
    assert "この募集内容に似ている仕事" not in detail.description
    assert "詳細を見る" not in detail.description
    # 本文の実体は含む
    assert "建設会社" in detail.description


def test_client_name_inherited_from_listing(adapter, detail_html, listing):
    """client_name は一覧の値が引き継がれること。"""
    detail = adapter.parse_detail_from_html(detail_html, listing)
    assert detail.client_name == "victoire95"


def test_detail_basic_fields(adapter, detail_html, listing):
    detail = adapter.parse_detail_from_html(detail_html, listing)
    assert detail.budget_min == 50000
    assert detail.budget_max == 80000
    assert detail.proposal_count == 68
    assert detail.client_history_count == 0
    assert detail.service_category == "website"
    assert detail.is_closed is False


def test_client_verified_unverified_returns_false(adapter, detail_html, listing):
    """fixture は未認証クライアント（victoire95）。本人確認行に -minus-thin
    アイコンがあるため client_verified=False になること。
    認証済みケースの fixture は未取得（実運用観察に委ねる）。
    """
    detail = adapter.parse_detail_from_html(detail_html, listing)
    assert detail.client_verified is False


# ── 予算パース ──────────────────────────────────────────────


@pytest.mark.parametrize(
    "text,expected",
    [
        ("5万 円 〜 8万 円", (50000, 80000)),
        ("10,000 円 〜 30,000 円", (10000, 30000)),
        ("5万 円", (50000, 50000)),
        ("見積り希望", (None, None)),
        ("", (None, None)),
        (None, (None, None)),
    ],
)
def test_parse_budget(text, expected):
    assert _parse_budget(text) == expected


# ── service_category（巡回 URL からの推定） ─────────────────


@pytest.mark.parametrize(
    "source_url,expected",
    [
        ("https://coconala.com/requests/categories/500", "website"),
        ("https://coconala.com/requests/categories/503", "lp"),
        ("https://coconala.com/requests/categories/644", "modification"),
        ("https://coconala.com/requests/categories/999", None),
    ],
)
def test_service_category_detection(adapter, detail_html, source_url, expected):
    listing = ListingItem(
        platform_prefix="CN",
        title="x",
        detail_url="https://coconala.com/requests/5030575",
        source_url=source_url,
    )
    detail = adapter.parse_detail_from_html(detail_html, listing)
    assert detail.service_category == expected


# ── 募集終了マーカー ─────────────────────────────────────────


def test_closed_marker_detection(adapter, listing):
    """募集終了マーカーを含む HTML で is_closed=True。"""
    closed_html = (
        "<html><body>"
        "<div class='c-requestContentsDetail'>本文</div>"
        "<p>この依頼の募集は終了しました</p>"
        "</body></html>"
    )
    detail = adapter.parse_detail_from_html(closed_html, listing)
    assert detail.is_closed is True
