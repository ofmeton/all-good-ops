"""RICE CREAM 営業マニュアル スライド生成。

入力: slides.yaml
出力: open-NNN.png / biz-NNN.png

仕様: docs/superpowers/specs/2026-05-15-rice-cream-manual-design.md
"""
from PIL import Image, ImageDraw, ImageFont

CANVAS_W = 1080
CANVAS_H = 1920
HEADER_H = 60
FONT_HEAVY = "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc"
FONT_REG = "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc"
COLOR_DARK = (32, 32, 32)
COLOR_HEADER_TEXT = (255, 255, 255)


def make_canvas() -> Image.Image:
    return Image.new("RGB", (CANVAS_W, CANVAS_H), (255, 255, 255))


def draw_header(img: Image.Image, phase: str, index: str) -> None:
    """画面最上部に暗色帯＋フェーズ名（左）と連番（右）を描く。"""
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, CANVAS_W, HEADER_H], fill=COLOR_DARK)
    font = ImageFont.truetype(FONT_HEAVY, 28)
    draw.text((32, 14), phase, fill=COLOR_HEADER_TEXT, font=font)
    bbox = draw.textbbox((0, 0), index, font=font)
    iw = bbox[2] - bbox[0]
    draw.text((CANVAS_W - 32 - iw, 14), index, fill=COLOR_HEADER_TEXT, font=font)


PHOTO_TOP = HEADER_H  # 60
PHOTO_BOTTOM = 1360  # 文字領域上端
PHOTO_AREA_H = PHOTO_BOTTOM - PHOTO_TOP  # 1300
COLOR_PHOTO_BG = (240, 240, 240)


def paste_photo(canvas: Image.Image, photo_path: str) -> None:
    """写真を写真領域(1080x1300)に letterbox 配置（余白は薄グレー）。"""
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([0, PHOTO_TOP, CANVAS_W, PHOTO_BOTTOM], fill=COLOR_PHOTO_BG)
    photo = Image.open(photo_path).convert("RGB")
    photo.thumbnail((CANVAS_W, PHOTO_AREA_H), Image.LANCZOS)
    pw, ph = photo.size
    x = (CANVAS_W - pw) // 2
    y = PHOTO_TOP + (PHOTO_AREA_H - ph) // 2
    canvas.paste(photo, (x, y))


TEXT_TOP = PHOTO_BOTTOM  # 1360
TEXT_BOTTOM = CANVAS_H  # 1920
TEXT_AREA_H = TEXT_BOTTOM - TEXT_TOP  # 560
COLOR_TEXT = (32, 32, 32)
MARGIN_X = 48


def _wrap_text(text: str, font: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    """日本語前提のシンプル折返し（文字単位）。"""
    lines: list[str] = []
    buf = ""
    for ch in text:
        if ch == "\n":
            lines.append(buf)
            buf = ""
            continue
        trial = buf + ch
        bbox = font.getbbox(trial)
        if bbox[2] - bbox[0] > max_w and buf:
            lines.append(buf)
            buf = ch
        else:
            buf = trial
    if buf:
        lines.append(buf)
    return lines


def draw_text_block(canvas: Image.Image, heading: str, body: str) -> None:
    """文字領域に見出し+本文を描く。"""
    draw = ImageDraw.Draw(canvas)
    f_heading = ImageFont.truetype(FONT_HEAVY, 72)
    f_body = ImageFont.truetype(FONT_REG, 48)
    max_w = CANVAS_W - MARGIN_X * 2

    y = TEXT_TOP + 32
    for line in _wrap_text(heading, f_heading, max_w):
        draw.text((MARGIN_X, y), line, fill=COLOR_TEXT, font=f_heading)
        y += 84
    y += 16
    for line in _wrap_text(body, f_body, max_w):
        draw.text((MARGIN_X, y), line, fill=COLOR_TEXT, font=f_body)
        y += 60


BAND_H = 90
COLOR_RED = (200, 50, 50)
COLOR_BLUE = (40, 90, 180)
COLOR_BAND_TEXT = (255, 255, 255)


def draw_note_band(canvas: Image.Image, kind: str, text: str) -> None:
    """文字領域下端に注意/補足の帯を描く。

    kind: "note"=赤帯（注意）, "info"=青帯（補足）
    """
    color = COLOR_RED if kind == "note" else COLOR_BLUE
    draw = ImageDraw.Draw(canvas)
    band_top = CANVAS_H - BAND_H
    draw.rectangle([0, band_top, CANVAS_W, CANVAS_H], fill=color)
    f = ImageFont.truetype(FONT_HEAVY, 40)
    prefix = "⚠ " if kind == "note" else "ℹ "
    msg = prefix + text
    max_w = CANVAS_W - MARGIN_X * 2
    lines = _wrap_text(msg, f, max_w)
    y = band_top + (BAND_H - len(lines) * 48) // 2
    for line in lines:
        draw.text((MARGIN_X, y), line, fill=COLOR_BAND_TEXT, font=f)
        y += 48
