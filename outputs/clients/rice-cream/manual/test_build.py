"""build.py のユニットテスト。実画像の見た目はテストしない（サイズ・色域のみ）。"""
from PIL import Image
import build


def test_canvas_size_and_white():
    img = build.make_canvas()
    assert img.size == (1080, 1920)
    assert img.mode == "RGB"
    assert img.getpixel((0, 0)) == (255, 255, 255)


def test_header_draws_dark_band():
    img = build.make_canvas()
    build.draw_header(img, phase="開店準備", index="1 / 38")
    px = img.getpixel((540, 20))
    assert px != (255, 255, 255), f"ヘッダ帯が白のまま: {px}"


def test_paste_photo_fits_in_photo_area(tmp_path):
    photo_path = tmp_path / "dummy.png"
    Image.new("RGB", (1000, 500), (200, 50, 50)).save(photo_path)
    img = build.make_canvas()
    build.paste_photo(img, str(photo_path))
    px = img.getpixel((540, 600))
    assert px[0] > 100 and px[1] < 100, f"写真が貼られていない: {px}"
