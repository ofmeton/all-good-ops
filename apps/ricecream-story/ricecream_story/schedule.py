"""営業日と営業時間の解決。stdlib のみ（gateway 側から同じ規則を再実装しないための単一ソース）。

曜日は Python 規約（月=0 … 日=6）。ricecream-attendance の TypeScript 側は
日=0 なので、値をそのまま持ち込むと2日ずれる。config の weekday_convention で
規約を宣言させ、config.load_store がそれを検証している。
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from .config import StoreConfig, validate_hours

WEEKDAY_LABELS = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")


@dataclass(frozen=True)
class DayPlan:
    date: date
    is_business_day: bool
    hours: str | None
    closed_reason: str | None
    date_label: str
    hours_label: str | None
    note: str | None

    def to_dict(self) -> dict:
        return {
            "date": self.date.isoformat(),
            "weekday": self.date.weekday(),
            "is_business_day": self.is_business_day,
            "hours": self.hours,
            "closed_reason": self.closed_reason,
            "date_label": self.date_label,
            "hours_label": self.hours_label,
            "note": self.note,
        }


def format_date_label(store: StoreConfig, day: date) -> str:
    return store.date_format.format(
        m=day.month, d=day.day, wd=WEEKDAY_LABELS[day.weekday()]
    )


def format_hours_label(store: StoreConfig, hours: str) -> str:
    open_at, close_at = hours.split("-")
    return f"{open_at}{store.time_separator}{close_at}"


def resolve(store: StoreConfig, day: date, hours_override: str | None = None) -> DayPlan:
    """その日を出すか出さないか、出すなら何時から何時かを決める。

    優先順:
      1. 引数の hours_override（Telegram の時間ボタン）
      2. date_overrides[date].closed
      3. closed_dates
      4. date_overrides[date].hours   ← 定休曜日でも営業扱いにできる
      5. business_weekdays に含まれるか → default_hours[weekday]
    """
    key = day.isoformat()
    override = store.date_overrides.get(key)
    label = format_date_label(store, day)
    note = override.note if override else None

    def closed(reason: str) -> DayPlan:
        return DayPlan(day, False, None, reason, label, None, note)

    def open_with(hours: str) -> DayPlan:
        return DayPlan(
            day, True, hours, None, label, format_hours_label(store, hours), note
        )

    if hours_override is not None:
        return open_with(validate_hours(hours_override, "hours_override"))
    if override and override.closed:
        return closed("date_override")
    if key in store.closed_dates:
        return closed("closed_dates")
    if override and override.hours:
        return open_with(override.hours)
    if day.weekday() not in store.business_weekdays:
        return closed("weekday")
    return open_with(store.default_hours[day.weekday()])


def hour_presets_for(store: StoreConfig, current_hours: str | None) -> list[str]:
    """時間変更ボタン用の候補。いま採用している時間と同じものは押させない。"""
    return [preset for preset in store.hour_presets if preset != current_hours]
