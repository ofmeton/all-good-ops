"""config/*.json の読み込みと検証、およびリポ相対のパス解決。

パスはすべて __file__ 起点で解く。/Users/... のような絶対パスをコードへ書くと
MacBook Air（rikukudo）と Mac mini（riku-macmini）のどちらかで静かに死ぬ。
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

APP_DIR = Path(__file__).resolve().parents[1]
CONFIG_DIR = APP_DIR / "config"
ASSETS_DIR = APP_DIR / "assets"
FONT_DIR = ASSETS_DIR / "fonts"
PHOTO_DIR = ASSETS_DIR / "photos"
SAMPLE_DIR = ASSETS_DIR / "samples"
OUT_DIR = APP_DIR / "out"

# 見出しも日付も時間も同じ1本。sample の実物は3行とも同じ太さで組まれている。
FONT_DISPLAY = FONT_DIR / "Merriweather-Black.ttf"

HOURS_RE = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


class ConfigError(ValueError):
    """config の内容が仕様を満たしていない。"""


@dataclass(frozen=True)
class DayOverride:
    closed: bool = False
    hours: str | None = None
    note: str | None = None


@dataclass(frozen=True)
class StoreConfig:
    business_weekdays: tuple[int, ...]
    default_hours: dict[int, str]
    date_overrides: dict[str, DayOverride]
    closed_dates: frozenset[str]
    hour_presets: tuple[str, ...]
    headline_text: str
    date_format: str
    time_separator: str
    maps_url: str
    timezone: str


@dataclass(frozen=True)
class PhotoConfig:
    """写真1枚ぶんのレイアウト指示。

    商品名ブロック（sample の左下にある縦積みラベル）は 2026-08-15 に陸さんが
    「入れなくてOK」と判断したため実装していない。復活させるなら render 側に
    描画関数を足すところから。
    """

    id: str
    file: str
    accent: str
    marker: bool = True
    headline_baseline: int = 275
    headline_shadow: bool = False
    crop_focus: tuple[float, float] = (0.5, 0.5)
    marker_widths: dict[str, float] = field(default_factory=dict)
    enabled: bool = True

    @property
    def path(self) -> Path:
        return PHOTO_DIR / self.file


def _require(mapping: dict, key: str, ctx: str):
    if key not in mapping:
        raise ConfigError(f"{ctx}: required key missing: {key}")
    return mapping[key]


def validate_hours(value: str, ctx: str) -> str:
    if not isinstance(value, str) or not HOURS_RE.match(value):
        raise ConfigError(f'{ctx}: hours must look like "13:00-20:30", got {value!r}')
    return value


def _validate_hex(value: str, ctx: str) -> str:
    if not isinstance(value, str) or not HEX_RE.match(value):
        raise ConfigError(f'{ctx}: color must be "#RRGGBB", got {value!r}')
    return value.upper()


def load_store(path: Path | None = None) -> StoreConfig:
    path = path or CONFIG_DIR / "store.json"
    raw = json.loads(path.read_text(encoding="utf-8"))
    ctx = path.name

    convention = raw.get("weekday_convention")
    if convention != "python-monday-0":
        # 曜日の 0 が何曜日かは事故の常連（ricecream-attendance は日=0）。
        # config 側に規約を書かせて、読む側で必ず突き合わせる。
        raise ConfigError(
            f'{ctx}: weekday_convention must be "python-monday-0", got {convention!r}'
        )

    weekdays = _require(raw, "business_weekdays", ctx)
    if not isinstance(weekdays, list) or any(
        not isinstance(w, int) or not 0 <= w <= 6 for w in weekdays
    ):
        raise ConfigError(f"{ctx}: business_weekdays must be ints 0..6 (Mon=0)")

    default_hours: dict[int, str] = {}
    for key, value in _require(raw, "default_hours", ctx).items():
        try:
            wd = int(key)
        except (TypeError, ValueError):
            raise ConfigError(f"{ctx}: default_hours key must be 0..6, got {key!r}")
        if not 0 <= wd <= 6:
            raise ConfigError(f"{ctx}: default_hours key out of range: {key!r}")
        default_hours[wd] = validate_hours(value, f"{ctx}.default_hours[{key}]")

    missing = [w for w in weekdays if w not in default_hours]
    if missing:
        raise ConfigError(f"{ctx}: business_weekdays {missing} have no default_hours")

    overrides: dict[str, DayOverride] = {}
    for key, value in raw.get("date_overrides", {}).items():
        if not DATE_RE.match(key):
            raise ConfigError(f"{ctx}: date_overrides key must be YYYY-MM-DD, got {key!r}")
        hours = value.get("hours")
        if hours is not None:
            hours = validate_hours(hours, f"{ctx}.date_overrides[{key}].hours")
        overrides[key] = DayOverride(
            closed=bool(value.get("closed", False)), hours=hours, note=value.get("note")
        )

    closed_dates = raw.get("closed_dates", [])
    for value in closed_dates:
        if not DATE_RE.match(value):
            raise ConfigError(f"{ctx}: closed_dates entry must be YYYY-MM-DD, got {value!r}")

    presets = raw.get("hour_presets", [])
    for value in presets:
        validate_hours(value, f"{ctx}.hour_presets")

    return StoreConfig(
        business_weekdays=tuple(sorted(set(weekdays))),
        default_hours=default_hours,
        date_overrides=overrides,
        closed_dates=frozenset(closed_dates),
        hour_presets=tuple(presets),
        headline_text=raw.get("headline_text", "OPEN!"),
        date_format=raw.get("date_format", "{m}/{d} {wd}."),
        time_separator=raw.get("time_separator", " - "),
        maps_url=_require(raw, "maps_url", ctx),
        timezone=raw.get("timezone", "Asia/Tokyo"),
    )


def load_photos(path: Path | None = None) -> list[PhotoConfig]:
    path = path or CONFIG_DIR / "photos.json"
    raw = json.loads(path.read_text(encoding="utf-8"))
    ctx = path.name

    photos: list[PhotoConfig] = []
    seen: set[str] = set()
    for index, entry in enumerate(_require(raw, "photos", ctx)):
        where = f"{ctx}.photos[{index}]"
        pid = _require(entry, "id", where)
        if pid in seen:
            raise ConfigError(f"{where}: duplicate id {pid!r}")
        seen.add(pid)

        focus = entry.get("crop_focus", [0.5, 0.5])
        if len(focus) != 2 or any(not 0.0 <= float(f) <= 1.0 for f in focus):
            raise ConfigError(f"{where}.crop_focus: two floats in 0..1 required")

        widths = entry.get("marker_widths", {})
        for role, value in widths.items():
            if role not in ("headline", "date", "hours"):
                raise ConfigError(f"{where}.marker_widths: unknown role {role!r}")
            if not 0.1 <= float(value) <= 2.0:
                raise ConfigError(f"{where}.marker_widths[{role}]: out of range")

        photos.append(
            PhotoConfig(
                id=pid,
                file=_require(entry, "file", where),
                accent=_validate_hex(_require(entry, "accent", where), f"{where}.accent"),
                marker=bool(entry.get("marker", True)),
                headline_baseline=int(entry.get("headline_baseline", 275)),
                headline_shadow=bool(entry.get("headline_shadow", False)),
                crop_focus=(float(focus[0]), float(focus[1])),
                marker_widths={k: float(v) for k, v in widths.items()},
                enabled=bool(entry.get("enabled", True)),
            )
        )

    if not photos:
        raise ConfigError(f"{ctx}: photos must not be empty")
    return photos


def find_photo(photos: list[PhotoConfig], photo_id: str) -> PhotoConfig:
    for photo in photos:
        if photo.id == photo_id:
            return photo
    known = ", ".join(p.id for p in photos)
    raise ConfigError(f"unknown photo id {photo_id!r} (known: {known})")
