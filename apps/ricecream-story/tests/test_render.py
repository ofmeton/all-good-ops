"""レンダリングの回帰。目視でしか判らない部分はコンタクトシートに任せ、ここでは
「サイズ」「決定論」「マーカーが文字の背面」「cover であること」を機械で押さえる。"""
import dataclasses
import hashlib
import io
import unittest
from datetime import date

from PIL import Image

from ricecream_story.config import find_photo, load_photos, load_store
from ricecream_story.photos import CANVAS_H, CANVAS_W, load_cover
from ricecream_story.render import (
    HEADLINE_WIDTH_RATIO,
    font_for_cap_height,
    font_for_width,
    render,
)
from ricecream_story.schedule import resolve

DAY = date(2026, 8, 15)
NEAR_WHITE = 250
ACCENT_TOLERANCE = 12
MIN_ACCENT_PIXELS = 3000


def _png_digest(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, "PNG")
    return hashlib.sha256(buffer.getvalue()).hexdigest()


def _count_near_white(image: Image.Image, box) -> int:
    region = image.crop(box)
    return sum(
        1 for r, g, b in region.getdata() if r > NEAR_WHITE and g > NEAR_WHITE and b > NEAR_WHITE
    )


def _count_accent(image: Image.Image, accent: str) -> int:
    want = (int(accent[1:3], 16), int(accent[3:5], 16), int(accent[5:7], 16))
    return sum(
        1
        for r, g, b in image.getdata()
        if abs(r - want[0]) <= ACCENT_TOLERANCE
        and abs(g - want[1]) <= ACCENT_TOLERANCE
        and abs(b - want[2]) <= ACCENT_TOLERANCE
    )


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

    def test_accent_is_actually_painted(self):
        for photo in self.photos:
            if not photo.marker:
                continue
            with self.subTest(photo=photo.id):
                image = render(self.store, self.plan, photo)
                self.assertGreater(_count_accent(image, photo.accent), MIN_ACCENT_PIXELS)

    def test_marker_disabled_paints_no_accent_band(self):
        photo = find_photo(self.photos, "kurogoma-float")
        self.assertFalse(photo.marker)
        with_marker = dataclasses.replace(photo, marker=True)
        self.assertGreater(
            _count_accent(render(self.store, self.plan, with_marker), photo.accent),
            _count_accent(render(self.store, self.plan, photo), photo.accent),
        )

    def test_marker_is_behind_the_text(self):
        # マーカーを消しても白文字の画素数がほぼ変わらないなら、帯は文字を潰していない。
        # 帯を文字の前に描くと glyph が塗られて白画素が激減する。
        photo = find_photo(self.photos, "vanilla-cone-front")
        band = (0, photo.headline_baseline - 130, CANVAS_W, photo.headline_baseline + 10)
        with_marker = _count_near_white(render(self.store, self.plan, photo), band)
        without = _count_near_white(
            render(self.store, self.plan, dataclasses.replace(photo, marker=False)), band
        )
        self.assertGreater(without, 5000, "見出しの白画素が取れていない（測定範囲が外れている）")
        self.assertGreaterEqual(with_marker, without * 0.99)

    def test_headline_width_within_target(self):
        font = font_for_width(
            __import__("ricecream_story.config", fromlist=["FONT_HEADLINE"]).FONT_HEADLINE,
            self.store.headline_text,
            CANVAS_W * HEADLINE_WIDTH_RATIO,
        )
        left, _, right, _ = font.getbbox(self.store.headline_text)
        target = CANVAS_W * HEADLINE_WIDTH_RATIO
        self.assertLessEqual(abs((right - left) - target) / target, 0.03)

    def test_font_search_is_monotonic_in_cap_height(self):
        from ricecream_story.config import FONT_TEXT

        small = font_for_cap_height(FONT_TEXT, 33)
        large = font_for_cap_height(FONT_TEXT, 40)
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
