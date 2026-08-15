"""1080x1920 のストーリー画像を組む。

レイアウト定数は sample の実物（1179x2096）を計測して 1080 換算したもの。
換算係数 0.9160。フォントサイズは pt 直指定ではなく「目標の字面幅／目標の cap
height から二分探索」で決める。フォントを差し替えても構図が崩れず、日付の桁数が
変わっても（8/9 と 12/29）自動で収まる。
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from . import RENDERER_VERSION
from .config import FONT_HEADLINE, FONT_TEXT, PhotoConfig, StoreConfig
from .marker import THICKNESS, draw_marker, seeded_rng
from .photos import CANVAS_H, CANVAS_W, load_cover
from .schedule import DayPlan

HEADLINE_WIDTH_RATIO = 0.50
DATE_CAP_HEIGHT = 33
HOURS_CAP_HEIGHT = 40
GAP_HEADLINE_TO_DATE = 99
GAP_DATE_TO_HOURS = 80
TEXT_COLOR = (255, 255, 255)
# 明るい背景（抹茶コーンの上部はベージュのシャッター）に白文字を置く時だけ使う縁。
# ぼかしを効かせすぎると霞んだ汚れに見えるので、狭く濃くする。
SHADOW_BLUR = 12
SHADOW_ALPHA = 210

DEFAULT_MARKER_WIDTHS = {"headline": 1.09, "date": 0.80, "hours": 1.10}

_FONT_SIZE_BOUNDS = (8, 480)


@dataclass(frozen=True)
class Line:
    role: str
    text: str
    font: ImageFont.FreeTypeFont
    baseline: int
    ink_width: int
    cap_height: int


def _ink_width(font: ImageFont.FreeTypeFont, text: str) -> int:
    left, _, right, _ = font.getbbox(text)
    return right - left


def _ink_height(font: ImageFont.FreeTypeFont, text: str) -> int:
    _, top, _, bottom = font.getbbox(text)
    return bottom - top


def _search_font(path: Path, measure, target: float) -> ImageFont.FreeTypeFont:
    """measure(font) が target 以上になる最小サイズを二分探索する。"""
    low, high = _FONT_SIZE_BOUNDS
    while low < high:
        mid = (low + high) // 2
        if measure(ImageFont.truetype(str(path), mid)) < target:
            low = mid + 1
        else:
            high = mid
    return ImageFont.truetype(str(path), low)


def font_for_width(path: Path, text: str, target_width: float) -> ImageFont.FreeTypeFont:
    return _search_font(path, lambda font: _ink_width(font, text), target_width)


def font_for_cap_height(path: Path, target_cap: float) -> ImageFont.FreeTypeFont:
    # 大文字の H で測る。実際の行に小文字や記号が混ざっても基準がぶれない。
    return _search_font(path, lambda font: _ink_height(font, "H"), target_cap)


def _lines(store: StoreConfig, plan: DayPlan, photo: PhotoConfig) -> list[Line]:
    if plan.hours_label is None:
        raise ValueError(f"{plan.date}: 定休日なので画像は作らない")

    headline_font = font_for_width(
        FONT_HEADLINE, store.headline_text, CANVAS_W * HEADLINE_WIDTH_RATIO
    )
    date_font = font_for_cap_height(FONT_TEXT, DATE_CAP_HEIGHT)
    hours_font = font_for_cap_height(FONT_TEXT, HOURS_CAP_HEIGHT)

    headline_baseline = photo.headline_baseline
    date_baseline = headline_baseline + GAP_HEADLINE_TO_DATE
    hours_baseline = date_baseline + GAP_DATE_TO_HOURS

    return [
        Line(
            "headline",
            store.headline_text,
            headline_font,
            headline_baseline,
            _ink_width(headline_font, store.headline_text),
            _ink_height(headline_font, "H"),
        ),
        Line(
            "date",
            plan.date_label,
            date_font,
            date_baseline,
            _ink_width(date_font, plan.date_label),
            DATE_CAP_HEIGHT,
        ),
        Line(
            "hours",
            plan.hours_label,
            hours_font,
            hours_baseline,
            _ink_width(hours_font, plan.hours_label),
            HOURS_CAP_HEIGHT,
        ),
    ]


def _accent_rgb(accent: str) -> tuple[int, int, int]:
    return (int(accent[1:3], 16), int(accent[3:5], 16), int(accent[5:7], 16))


def _draw_shadow(canvas: Image.Image, lines: list[Line], x_center: int) -> None:
    layer = Image.new("L", canvas.size, 0)
    draw = ImageDraw.Draw(layer)
    for line in lines:
        draw.text(
            (x_center, line.baseline), line.text, font=line.font, fill=SHADOW_ALPHA, anchor="ms"
        )
    layer = layer.filter(ImageFilter.GaussianBlur(SHADOW_BLUR))
    canvas.paste(Image.new("RGB", canvas.size, (0, 0, 0)), (0, 0), layer)


def render(store: StoreConfig, plan: DayPlan, photo: PhotoConfig) -> Image.Image:
    canvas = load_cover(photo.path, photo.crop_focus)
    lines = _lines(store, plan, photo)
    x_center = CANVAS_W // 2
    accent = _accent_rgb(photo.accent)

    # 描画順は写真 → マーカー全部 → 文字全部。sample は文字が帯の上に乗っている。
    # marker=False は差し色が背景に沈む写真用（黒ごまの黒帯は暗い店先で汚れに見える）。
    # sample の黒ごま回も帯を引いていない。
    if photo.marker:
        widths = {**DEFAULT_MARKER_WIDTHS, **photo.marker_widths}
        for line in lines:
            draw_marker(
                canvas,
                x_center=x_center,
                baseline=line.baseline,
                text_width=line.ink_width,
                cap_height=line.cap_height,
                color=accent,
                width_ratio=widths[line.role],
                rng=seeded_rng(plan.date.isoformat(), photo.id, line.role),
                thickness=THICKNESS,
            )

    if photo.headline_shadow:
        _draw_shadow(canvas, lines, x_center)

    draw = ImageDraw.Draw(canvas)
    for line in lines:
        draw.text(
            (x_center, line.baseline), line.text, font=line.font, fill=TEXT_COLOR, anchor="ms"
        )

    return canvas


def save(image: Image.Image, out_dir: Path, stem: str) -> dict[str, str]:
    """PNG（無劣化配布用）と JPEG（Telegram プレビュー用）を並べて書き出す。"""
    out_dir.mkdir(parents=True, exist_ok=True)
    png_path = out_dir / f"{stem}.png"
    jpeg_path = out_dir / f"{stem}.jpg"
    image.save(png_path, "PNG", optimize=True)
    image.save(jpeg_path, "JPEG", quality=90, subsampling=0)
    return {"png": str(png_path), "jpeg": str(jpeg_path)}


def render_to_files(
    store: StoreConfig, plan: DayPlan, photo: PhotoConfig, out_dir: Path
) -> dict:
    image = render(store, plan, photo)
    stem = f"open-{plan.date.strftime('%Y%m%d')}-{photo.id}"
    paths = save(image, out_dir, stem)
    return {
        **paths,
        "photo_id": photo.id,
        "accent": photo.accent,
        "date": plan.date.isoformat(),
        "date_label": plan.date_label,
        "hours": plan.hours,
        "hours_label": plan.hours_label,
        "maps_url": store.maps_url,
        "renderer": RENDERER_VERSION,
        "size": list(image.size),
    }
