import pytest
from adapters.base import PlatformAdapter, ListingItem, JobDetail


def test_listing_item_dataclass():
    item = ListingItem(
        platform_prefix="LAN",
        title="Test LP",
        detail_url="https://example.com/job/1",
        source_url="https://example.com/search",
    )
    assert item.platform_prefix == "LAN"
    assert item.title == "Test LP"


def test_platform_adapter_is_abstract():
    with pytest.raises(TypeError):
        PlatformAdapter()


def test_subclass_must_implement_methods():
    class IncompleteAdapter(PlatformAdapter):
        prefix = "TST"
        name = "Test"
    with pytest.raises(TypeError):
        IncompleteAdapter()
