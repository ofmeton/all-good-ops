"""CrowdWorks adapter の parse_detail_from_html 回帰テスト。

特に重要:
- deadline は「掲載日」ではなく「応募期限」のラベル直後の日付を採ること
- 「このお仕事の募集は終了しています」が含まれる場合 is_closed=True
"""
from pathlib import Path

import pytest

from adapters.base import ListingItem
from adapters.crowdworks import CrowdWorksAdapter

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def adapter():
    return CrowdWorksAdapter()


@pytest.fixture
def listing():
    return ListingItem(
        platform_prefix="CW",
        title="dummy",
        detail_url="https://crowdworks.jp/public/jobs/13104598",
        source_url="https://crowdworks.jp/public/jobs/category/17",
    )


def test_deadline_uses_labeled_date_not_first_date(adapter, listing):
    """掲載日が先に出ても、応募期限の日付が deadline になること。"""
    html = (FIXTURES / "crowdworks_detail_open.html").read_text(encoding="utf-8")
    detail = adapter.parse_detail_from_html(html, listing)
    # 掲載日 2026-05-08 ではなく、応募期限 2026-05-22 が採用される
    assert detail.deadline == "2026-05-22", (
        f"deadline は応募期限であるべき。実際: {detail.deadline} (掲載日 2026-05-08 を誤検出している可能性)"
    )
    assert detail.is_closed is False


def test_closed_marker_sets_is_closed(adapter, listing):
    """「このお仕事の募集は終了しています」が含まれる場合 is_closed=True。"""
    html = (FIXTURES / "crowdworks_detail_closed.html").read_text(encoding="utf-8")
    detail = adapter.parse_detail_from_html(html, listing)
    assert detail.is_closed is True
    # deadline は応募期限を読めるが、is_closed の方が優先で collector スキップ対象
    assert detail.deadline == "2025-05-27"


def test_zfill_for_single_digit_month_day(adapter, listing):
    """1桁の月/日でも YYYY-MM-DD 形式（zfill 済）になること。"""
    html = """
    <html><body>
      <a href="/public/employers/1">x</a>
      <p>仕事の詳細</p>
      <p>掲載日 2026年5月3日</p>
      <p>応募期限 2026年5月9日</p>
    </body></html>
    """
    detail = adapter.parse_detail_from_html(html, listing)
    assert detail.deadline == "2026-05-09"
