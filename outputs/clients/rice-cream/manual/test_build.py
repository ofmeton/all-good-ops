"""build.py のユニットテスト。実画像の見た目はテストしない（サイズ・色域のみ）。"""
from PIL import Image
import build


def test_canvas_size_and_white():
    img = build.make_canvas()
    assert img.size == (1080, 1920)
    assert img.mode == "RGB"
    assert img.getpixel((0, 0)) == (255, 255, 255)
