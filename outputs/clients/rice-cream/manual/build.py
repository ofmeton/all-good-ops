"""RICE CREAM 営業マニュアル スライド生成。

入力: slides.yaml
出力: open-NNN.png / biz-NNN.png

仕様: docs/superpowers/specs/2026-05-15-rice-cream-manual-design.md
"""
from PIL import Image

CANVAS_W = 1080
CANVAS_H = 1920


def make_canvas() -> Image.Image:
    return Image.new("RGB", (CANVAS_W, CANVAS_H), (255, 255, 255))
