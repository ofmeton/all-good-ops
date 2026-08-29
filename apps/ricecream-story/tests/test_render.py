"""レンダリングの回帰。目視でしか判らない部分はコンタクトシートに任せ、ここでは
「サイズ」「決定論」「cover であること」を機械で押さえる。装飾（スクリム／フレーム／
店名ヘッダー）の画素検証は test_decoration.py が持つ。"""
import hashlib
import io
import unittest
from datetime import date

from PIL import Image

from ricecream_story.config import find_photo, load_photos, load_store
from ricecream_story.photos import CANVAS_H, CANVAS_W, load_cover
from ricecream_story.render import (
    FRAME_INNER_INSET,
    HEADLINE_CAP_HEIGHT,
    HEADLINE_SIDE_MARGIN,
    _lines,
    font_for_cap_height,
    render,
)
from ricecream_story.schedule import resolve

DAY = date(2026, 8, 15)


def _png_digest(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, "PNG")
    return hashlib.sha256(buffer.getvalue()).hexdigest()


class RenderTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.store = load_store()
        cls.photos = load_photos()
        cls.plan = resolve(cls.store, DAY)

    def test_canvas_size(self):
        for photo in self.photos:
            with self.subTest(photo=photo.id):
                self.assertEqual(render(self.store, self.plan, photo).size, (CANVAS_W, CANVAS_H))

    def test_deterministic(self):
        # 両機で同じバイト列を出すのが前提。random のグローバル関数や hash() を
        # 使い始めるとここが落ちる。
        photo = find_photo(self.photos, "vanilla-cone-front")
        first = _png_digest(render(self.store, self.plan, photo))
        second = _png_digest(render(self.store, self.plan, photo))
        self.assertEqual(first, second)

    def test_different_days_differ(self):
        photo = find_photo(self.photos, "vanilla-cone-front")
        other = resolve(self.store, date(2026, 8, 16))
        self.assertNotEqual(
            _png_digest(render(self.store, self.plan, photo)),
            _png_digest(render(self.store, other, photo)),
        )

    def test_headline_cap_height_hits_the_target(self):
        from ricecream_story.config import FONT_DISPLAY

        font = font_for_cap_height(FONT_DISPLAY, HEADLINE_CAP_HEIGHT)
        _, top, _, bottom = font.getbbox("H")
        self.assertLessEqual(abs((bottom - top) - HEADLINE_CAP_HEIGHT), 1)

    def test_headline_stays_inside_the_frame(self):
        """長い見出しは縮んで内枠に触れない（"OPEN TODAY" は素の cap 120 だと枠を跨ぐ）。"""
        photos = load_photos()
        photo = find_photo(photos, "vanilla-cone-front")
        plan = resolve(self.store, DAY)
        headline = next(line for line in _lines(self.store, plan, photo) if line.role == "headline")
        limit = CANVAS_W - 2 * (FRAME_INNER_INSET + HEADLINE_SIDE_MARGIN)
        self.assertLessEqual(headline.ink_width, limit)

    def test_font_search_is_monotonic_in_cap_height(self):
        from ricecream_story.config import FONT_DISPLAY

        small = font_for_cap_height(FONT_DISPLAY, 42)
        large = font_for_cap_height(FONT_DISPLAY, 46)
        self.assertLess(small.size, large.size)


class CoverTests(unittest.TestCase):
    def _solid(self, width: int, height: int, color=(200, 40, 30)) -> Image.Image:
        return Image.new("RGB", (width, height), color)

    def test_cover_leaves_no_padding_for_a_wide_source(self):
        # 3:4 の素材（matcha-cone-b）を contain で置くと上下に余白が出る。
        # 単色画像を通せば、余白の有無が画素で判る。
        import tempfile

        color = (200, 40, 30)
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as handle:
            self._solid(941, 1254, color).save(handle.name)
            covered = load_cover(handle.name)
        self.assertEqual(covered.size, (CANVAS_W, CANVAS_H))
        self.assertEqual(set(covered.getdata()), {color})

    def test_crop_focus_selects_the_kept_region(self):
        import tempfile

        source = Image.new("RGB", (1200, 900), (10, 10, 10))
        source.paste(Image.new("RGB", (100, 900), (250, 250, 250)), (0, 0))  # 左端だけ白
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as handle:
            source.save(handle.name)
            left = load_cover(handle.name, focus=(0.0, 0.5))
            right = load_cover(handle.name, focus=(1.0, 0.5))
        self.assertIn((250, 250, 250), set(left.getdata()))
        self.assertNotIn((250, 250, 250), set(right.getdata()))

    def test_real_photos_fill_every_corner(self):
        for photo in load_photos():
            with self.subTest(photo=photo.id):
                image = load_cover(photo.path, photo.crop_focus)
                corners = [
                    image.getpixel((0, 0)),
                    image.getpixel((CANVAS_W - 1, 0)),
                    image.getpixel((0, CANVAS_H - 1)),
                    image.getpixel((CANVAS_W - 1, CANVAS_H - 1)),
                ]
                self.assertNotIn((0, 0, 0), corners)
                self.assertNotIn((255, 255, 255), corners)


if __name__ == "__main__":
    unittest.main()
