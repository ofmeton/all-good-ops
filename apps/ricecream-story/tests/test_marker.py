"""マーカー帯。2026-08-15 に手描き風から直線へ変更したので、矩形であることを押さえる。"""
import unittest

from PIL import Image

from ricecream_story.marker import THICKNESS, draw_marker

ACCENT = (176, 138, 51)
WHITE = (255, 255, 255)


def _canvas() -> Image.Image:
    return Image.new("RGB", (1080, 400), WHITE)


def _paint(**overrides) -> Image.Image:
    canvas = _canvas()
    kwargs = {
        "x_center": 540,
        "center_y": 200,
        "width": 500,
        "color": ACCENT,
    }
    kwargs.update(overrides)
    draw_marker(canvas, **kwargs)
    return canvas


class MarkerShapeTests(unittest.TestCase):
    def test_band_is_a_rectangle(self):
        canvas = _paint()
        box = canvas.convert("RGB").point(lambda v: v).getbbox()  # 白背景なので bbox は帯そのもの
        painted = sum(1 for pixel in canvas.getdata() if pixel == ACCENT)
        # 矩形なら塗られた画素数は幅 x 太さにぴったり一致する（端の先細りが無い）。
        self.assertEqual(painted, 501 * (THICKNESS + 1))
        self.assertIsNotNone(box)

    def test_every_painted_pixel_is_the_exact_accent(self):
        # ぼかしやムラを入れていたら中間色が現れる。
        colours = {pixel for pixel in _paint().getdata()}
        self.assertEqual(colours, {WHITE, ACCENT})

    def test_width_scales_the_band(self):
        narrow = sum(1 for p in _paint(width=250).getdata() if p == ACCENT)
        wide = sum(1 for p in _paint(width=500).getdata() if p == ACCENT)
        self.assertLess(narrow, wide)

    def test_band_is_centred_on_center_y(self):
        canvas = _paint(center_y=200)
        column = [canvas.getpixel((540, y)) for y in range(canvas.height)]
        painted = [y for y, pixel in enumerate(column) if pixel == ACCENT]
        self.assertAlmostEqual((painted[0] + painted[-1]) / 2, 200, delta=1)

    def test_band_is_horizontally_centred(self):
        canvas = _paint(x_center=300)
        row = [canvas.getpixel((x, 200)) for x in range(canvas.width)]
        painted = [x for x, pixel in enumerate(row) if pixel == ACCENT]
        self.assertAlmostEqual((painted[0] + painted[-1]) / 2, 300, delta=1)

    def test_is_deterministic(self):
        self.assertEqual(list(_paint().getdata()), list(_paint().getdata()))


if __name__ == "__main__":
    unittest.main()
