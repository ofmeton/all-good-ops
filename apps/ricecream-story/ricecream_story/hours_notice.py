"""営業時間変更のお知らせ文面（和文→英文）を日付と時刻から組み立てる。

文面は 2026-09-29 に本人承認した 10/2(金) 15時開店の告知が原本。変わるのは日付と
時刻だけで、言い回しは固定する（対外文章をその都度書き起こさないため）。
「開店だけ」「閉店だけ」「両方」のどれが変わるかで1行目と3行目の型を切り替える。
開店だけ遅らせる型以外は原本からの類推なので、初回は本人に文面を見せてから使う。
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from .config import ConfigError, StoreConfig

WEEKDAY_JA = "月火水木金土日"
WEEKDAY_EN = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
MONTH_EN = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")

# 本人承認済みの型。これ以外は「類推・初回要確認」。
APPROVED_KINDS = frozenset({"open_later"})


@dataclass(frozen=True)
class HoursNotice:
    kind: str
    japanese: tuple[str, ...]
    english: tuple[str, ...]

    @property
    def approved(self) -> bool:
        return self.kind in APPROVED_KINDS


def _minutes(hhmm: str) -> int:
    hour, minute = hhmm.split(":")
    return int(hour) * 60 + int(minute)


def _ja_time(hhmm: str) -> str:
    hour, minute = (int(part) for part in hhmm.split(":"))
    return f"{hour}時" if minute == 0 else f"{hour}時{minute}分"


def _en_time(hhmm: str) -> str:
    hour, minute = (int(part) for part in hhmm.split(":"))
    suffix = "AM" if hour < 12 else "PM"
    hour12 = hour % 12 or 12
    return f"{hour12} {suffix}" if minute == 0 else f"{hour12}:{minute:02d} {suffix}"


def _parse_hhmm(value: str, label: str) -> str:
    try:
        hour, minute = (int(part) for part in value.split(":"))
    except ValueError as error:
        raise ConfigError(f"{label} must be HH:MM, got {value!r}") from error
    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        raise ConfigError(f"{label} out of range: {value!r}")
    return f"{hour:02d}:{minute:02d}"


def build_hours_notice(
    store: StoreConfig, day: date, open_time: str | None, close_time: str | None
) -> HoursNotice:
    weekday = day.weekday()
    if weekday not in store.business_weekdays:
        # 定休日を告知に混ぜると「その曜日は本来やっているのか」と誤読される。
        raise ConfigError(f"{day.isoformat()} is not a business day")
    default_open, default_close = store.default_hours[weekday].split("-")
    new_open = _parse_hhmm(open_time, "--open") if open_time else default_open
    new_close = _parse_hhmm(close_time, "--close") if close_time else default_close
    if _minutes(new_open) >= _minutes(new_close):
        raise ConfigError(f"open {new_open} must be before close {new_close}")

    open_changed = new_open != default_open
    close_changed = new_close != default_close
    if not open_changed and not close_changed:
        raise ConfigError(
            f"{new_open}-{new_close} is the usual hours for {WEEKDAY_EN[weekday]}; nothing to announce"
        )

    date_ja = f"{day.month}月{day.day}日（{WEEKDAY_JA[weekday]}）"
    date_en = f"On {WEEKDAY_EN[weekday]}, {MONTH_EN[day.month - 1]} {day.day},"
    span_ja = f"{_ja_time(new_open)}〜{_ja_time(new_close)}の営業となります。"
    apology_ja = ("ご迷惑をおかけしますが、", "何卒よろしくお願いいたします。")
    apology_en = "Sorry for any inconvenience!"

    if open_changed and not close_changed:
        later = _minutes(new_open) > _minutes(default_open)
        kind = "open_later" if later else "open_earlier"
        japanese = (f"{date_ja}は開店時刻を変更し、", span_ja, *apology_ja)
        english = (
            f"{date_en} we'll be opening",
            f"{'later' if later else 'earlier'} than usual, at {_en_time(new_open)}.",
            f"Closing time is {_en_time(new_close)} as usual.",
            apology_en,
        )
    elif close_changed and not open_changed:
        earlier = _minutes(new_close) < _minutes(default_close)
        kind = "close_earlier" if earlier else "close_later"
        japanese = (f"{date_ja}は閉店時刻を変更し、", span_ja, *apology_ja)
        english = (
            f"{date_en} we'll be closing",
            f"{'earlier' if earlier else 'later'} than usual, at {_en_time(new_close)}.",
            f"Opening time is {_en_time(new_open)} as usual.",
            apology_en,
        )
    else:
        kind = "both"
        japanese = (f"{date_ja}は営業時間を変更し、", span_ja, *apology_ja)
        english = (
            f"{date_en} our hours",
            f"will be {_en_time(new_open)} to {_en_time(new_close)}.",
            apology_en,
        )
    return HoursNotice(kind, japanese, english)
