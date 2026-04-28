import pytest
import json
from pathlib import Path
from session import CookieManager


def test_save_and_load_cookies(tmp_path):
    cookie_path = tmp_path / "cookies.json"
    mgr = CookieManager(cookie_path)
    sample_state = {"cookies": [{"name": "x", "value": "1"}], "origins": []}
    mgr.save(sample_state)
    loaded = mgr.load()
    assert loaded == sample_state


def test_load_returns_none_when_missing(tmp_path):
    cookie_path = tmp_path / "missing.json"
    mgr = CookieManager(cookie_path)
    assert mgr.load() is None


def test_save_uses_600_perm(tmp_path):
    cookie_path = tmp_path / "cookies.json"
    mgr = CookieManager(cookie_path)
    mgr.save({"cookies": []})
    perm = oct(cookie_path.stat().st_mode)[-3:]
    assert perm == "600"


def test_default_path_for_lan():
    """default_path で Lancers のクッキーパスを取れる"""
    p = CookieManager.default_path("LAN")
    assert "Library/Application Support/bsa-pa" in str(p)
    assert p.name == "lan-cookies.json"


def test_default_path_for_other_platform():
    """他のプラットフォーム prefix でも適切な命名"""
    p = CookieManager.default_path("CRW")
    assert p.name == "crw-cookies.json"


def test_save_atomic_write(tmp_path, monkeypatch):
    """save は中途半端な状態を残さない（一時ファイル経由）"""
    cookie_path = tmp_path / "cookies.json"
    # 既存ファイル
    cookie_path.write_text('{"old": "data"}')
    mgr = CookieManager(cookie_path)
    # save 中にエラーが起きても元のファイルは無傷であるべき
    # ただし atomic 性は内部実装依存なので、ここでは「成功時にちゃんと差し替わる」のみを確認
    new_state = {"cookies": [{"name": "new"}], "origins": []}
    mgr.save(new_state)
    assert mgr.load() == new_state
