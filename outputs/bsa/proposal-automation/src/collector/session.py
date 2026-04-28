"""Cookie 管理 (CookieManager)。

Playwright の context.storage_state() で取得できる JSON を保存・読込する。
保存場所のデフォルトは macOS の Application Support 配下。
パーミッション 600 を維持し、書き込み時は一時ファイル経由で atomic に置き換える。
"""

import json
import os
from pathlib import Path
from typing import Optional


class CookieManager:
    def __init__(self, cookie_path: Path | str):
        self.cookie_path = Path(cookie_path)

    def save(self, storage_state: dict) -> None:
        """storage_state を JSON で保存する。
        親ディレクトリは必要なら自動作成。
        書き込みは tmp ファイル → rename の atomic 操作。
        最終ファイルは mode 0o600。
        """
        self.cookie_path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.cookie_path.with_suffix(self.cookie_path.suffix + ".tmp")
        tmp.write_text(json.dumps(storage_state), encoding="utf-8")
        os.chmod(tmp, 0o600)
        os.replace(tmp, self.cookie_path)

    def load(self) -> Optional[dict]:
        """ファイルが存在すれば dict を返す、なければ None。"""
        if not self.cookie_path.exists():
            return None
        return json.loads(self.cookie_path.read_text(encoding="utf-8"))

    @staticmethod
    def default_path(platform_prefix: str) -> Path:
        """macOS の Application Support 配下に platform 別の cookie ファイルパスを返す。
        例: prefix='LAN' -> ~/Library/Application Support/bsa-pa/lan-cookies.json
        """
        appdata = Path.home() / "Library" / "Application Support" / "bsa-pa"
        return appdata / f"{platform_prefix.lower()}-cookies.json"
