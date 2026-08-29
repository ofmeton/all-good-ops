"""1080x1920 のストーリー画像を組む。

レイアウト定数は sample の実物（1179x2096）を計測して 1080 換算したもの。
換算係数 0.9160。フォントサイズは pt 直指定ではなく「目標の字面幅／目標の cap
height から二分探索」で決める。フォントを差し替えても構図が崩れず、日付の桁数が
変わっても（8/9 と 12/29）自動で収まる。
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from . import RENDERER_VERSION
from .config import FONT_DISPLAY, PhotoConfig, StoreConfig
from .photos import CANVAS_H, CANVAS_W, load_cover
from .schedule import DayPlan

# 見出しは cap height で決める（実測 125）。字面幅で決めると、書体の 幅/cap 比の差が
# そのまま線の太さの差になってしまう —— sample と自分の出力の食い違いは幅ではなく
# 太さだったので、太さを規定する cap を基準にする。
HEADLINE_CAP_HEIGHT = 120
# 幅の上限。cap 基準にすると幅広な書体で canvas を突き抜けうるので頭を押さえる。
HEADLINE_MAX_WIDTH_RATIO = 0.92
# sample の2枚で日付 41/49・時間 38/49 とばらつくので上寄りの値を採る。
DATE_CAP_HEIGHT = 42
HOURS_CAP_HEIGHT = 46
GAP_HEADLINE_TO_DATE = 99
GAP_DATE_TO_HOURS = 80
TEXT_COLOR = (255, 255, 255)

# --- D+C 装飾（2026-08-20 決定。経緯は README「デザインの根拠」参照） ---
# D: 上端のスクリム（黒グラデ）＋店名ヘッダー。スクリムが影の役割を兼ねるため
# per-photo の縁取りシャドウ（旧 headline_shadow / marker）機構は廃止した。
SCRIM_HEIGHT = 620
SCRIM_TOP_ALPHA = 110

# C: 全周フレーム（白の外枠＋差し色の内枠）。
FRAME_OUTER_INSET = 42
FRAME_OUTER_WIDTH = 3
FRAME_INNER_INSET = 50
FRAME_INNER_WIDTH = 1
# 内枠の差し色が暗すぎる（黒ごまの #0A0A0A 等）と写真に沈むので、輝度が閾値未満なら
# 白の半透明線に自動で切り替える。輝度は ITU-R BT.601。
ACCENT_LUMINANCE_THRESHOLD = 60
INNER_LINE_FALLBACK_ALPHA = 153  # 255 の 60%

# 店名ヘッダー。見出しの上に小さく字間を空けて中央揃えで置く。
BRAND_CAP_HEIGHT = 22
BRAND_TRACKING = 14
BRAND_GAP_ABOVE_HEADLINE = 40
# Instagram はストーリーの上端にアカウント名・アバター・時刻を重ねる。1080x1920 換算で
# 上 250px はその UI に食われるので、店名ヘッダーの上端がそこへ入らないよう、文字ブロック
# 全体を必要なぶんだけ押し下げる（2026-08-29 本人指摘「アカウント名と被る」）。
TOP_SAFE_MARGIN = 250

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

    headline_font = font_for_cap_height(FONT_DISPLAY, HEADLINE_CAP_HEIGHT)
    limit = CANVAS_W * HEADLINE_MAX_WIDTH_RATIO
    if _ink_width(headline_font, store.headline_text) > limit:
        headline_font = font_for_width(FONT_DISPLAY, store.headline_text, limit)
    date_font = font_for_cap_height(FONT_DISPLAY, DATE_CAP_HEIGHT)
    hours_font = font_for_cap_height(FONT_DISPLAY, HOURS_CAP_HEIGHT)

    headline_cap = _ink_height(headline_font, "H")
    # 店名ヘッダーは見出しから相対で置くので、上端の下限は見出し baseline 側で守る。
    lowest_headline_baseline = (
        TOP_SAFE_MARGIN + BRAND_CAP_HEIGHT + BRAND_GAP_ABOVE_HEADLINE + headline_cap
    )
    headline_baseline = max(photo.headline_baseline, lowest_headline_baseline)
    date_baseline = headline_baseline + GAP_HEADLINE_TO_DATE
    hours_baseline = date_baseline + GAP_DATE_TO_HOURS

    return [
        Line(
            "headline",
            store.headline_text,
            headline_font,
            headline_baseline,
            _ink_width(headline_font, store.headline_text),
            headline_cap,
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


def _luminance(rgb: tuple[int, int, int]) -> float:
    """ITU-R BT.601 の輝度。フレーム内枠の差し色が写真に沈むかどうかの判定に使う。"""
    r, g, b = rgb
    return 0.299 * r + 0.587 * g + 0.114 * b


def _apply_top_scrim(canvas: Image.Image) -> None:
    """上端から SCRIM_HEIGHT px、黒 alpha を SCRIM_TOP_ALPHA→0 の縦グラデで敷く。

    店名ヘッダーと見出しの可読性を確保する（旧 headline_shadow の代わり）。
    """
    gradient = Image.new("L", (1, SCRIM_HEIGHT), 0)
    for y in range(SCRIM_HEIGHT):
        alpha = round(SCRIM_TOP_ALPHA * (1 - y / SCRIM_HEIGHT))
        gradient.putpixel((0, y), alpha)
    gradient = gradient.resize((CANVAS_W, SCRIM_HEIGHT))
    black = Image.new("RGB", (CANVAS_W, SCRIM_HEIGHT), (0, 0, 0))
    canvas.paste(black, (0, 0), gradient)


def _draw_frame(canvas: Image.Image, accent: tuple[int, int, int]) -> None:
    """全周フレーム。外枠は白の実線、内枠は差し色（暗すぎれば白の半透明）。"""
    draw = ImageDraw.Draw(canvas)
    draw.rectangle(
        [
            FRAME_OUTER_INSET,
            FRAME_OUTER_INSET,
            CANVAS_W - FRAME_OUTER_INSET,
            CANVAS_H - FRAME_OUTER_INSET,
        ],
        outline=(255, 255, 255),
        width=FRAME_OUTER_WIDTH,
    )

    inner_box = [
        FRAME_INNER_INSET,
        FRAME_INNER_INSET,
        CANVAS_W - FRAME_INNER_INSET,
        CANVAS_H - FRAME_INNER_INSET,
    ]
    if _luminance(accent) < ACCENT_LUMINANCE_THRESHOLD:
        mask = Image.new("L", canvas.size, 0)
        ImageDraw.Draw(mask).rectangle(
            inner_box, outline=INNER_LINE_FALLBACK_ALPHA, width=FRAME_INNER_WIDTH
        )
        canvas.paste(Image.new("RGB", canvas.size, (255, 255, 255)), (0, 0), mask)
    else:
        draw.rectangle(inner_box, outline=accent, width=FRAME_INNER_WIDTH)


def _draw_tracked_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.FreeTypeFont,
    center_x: int,
    baseline: int,
    tracking: int,
    color: tuple[int, int, int],
) -> None:
    widths = []
    for ch in text:
        left, _, right, _ = font.getbbox(ch)
        widths.append(right - left)
    total_width = sum(widths) + tracking * (len(text) - 1)
    x = center_x - total_width / 2
    for ch, w in zip(text, widths):
        draw.text((x, baseline), ch, font=font, fill=color, anchor="ls")
        x += w + tracking


def _draw_brand_header(
    canvas: Image.Image, store: StoreConfig, headline_line: Line, x_center: int
) -> None:
    draw = ImageDraw.Draw(canvas)
    brand_font = font_for_cap_height(FONT_DISPLAY, BRAND_CAP_HEIGHT)
    baseline = headline_line.baseline - headline_line.cap_height - BRAND_GAP_ABOVE_HEADLINE
    _draw_tracked_text(
        draw, store.brand_text, brand_font, x_center, baseline, BRAND_TRACKING, TEXT_COLOR
    )


def render(store: StoreConfig, plan: DayPlan, photo: PhotoConfig) -> Image.Image:
    canvas = load_cover(photo.path, photo.crop_focus)
    lines = _lines(store, plan, photo)
    x_center = CANVAS_W // 2
    accent = _accent_rgb(photo.accent)

    # 描画順: 写真 → スクリム → フレーム → 文字。
    _apply_top_scrim(canvas)
    _draw_frame(canvas, accent)

    headline_line = next(line for line in lines if line.role == "headline")
    _draw_brand_header(canvas, store, headline_line, x_center)

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
