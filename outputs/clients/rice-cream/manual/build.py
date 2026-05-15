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
