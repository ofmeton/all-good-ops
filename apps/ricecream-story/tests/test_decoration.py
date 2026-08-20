"""D+C 装飾（スクリム／額装フレーム／店名ヘッダー）の画素回帰。

2026-08-20、手描き風の帯装飾（marker）を廃止しこの3点へ一本化した経緯は
README「デザインの根拠」参照。フレーム／スクリムは実写真だと偶然の一致で
検証がぶれうるので、コアの塗り関数は単色キャンバスに対して直接検証する。
"""
import hashlib
import io
import unittest
from datetime import date

from PIL import Image

from ricecream_story.config import find_photo, load_photos, load_store
from ricecream_story.photos import CANVAS_H, CANVAS_W
from ricecream_story.render import (
    FRAME_INNER_INSET,
    FRAME_OUTER_INSET,
    SCRIM_HEIGHT,
    _apply_top_scrim,
    _draw_frame,
    render,
)
from ricecream_story.schedule import resolve

DAY = date(2026, 8, 15)
BASE_GRAY = (128, 128, 128)
BRIGHT_ACCENT = (0xB0, 0x8A, 0x33)  # vanilla-cone-front. 輝度 >= 60
DARK_ACCENT = (0x0A, 0x0A, 0x0A)  # kurogoma-float(黒ごま). 輝度 < 60


def _is_whiteish(pixel, tolerance=4) -> bool:
    return all(abs(c - 255) <= tolerance for c in pixel)


def _matches(pixel, color, tolerance=2) -> bool:
    return all(abs(c - w) <= tolerance for c, w in zip(pixel, color))


class FrameTests(unittest.TestCase):
    """フレーム外枠（inset 42px・白 3px）。"""

    @classmethod
    def setUpClass(cls):
        cls.canvas = Image.new("RGB", (CANVAS_W, CANVAS_H), BASE_GRAY)
        _draw_frame(cls.canvas, BRIGHT_ACCENT)

    def test_white_line_runs_down_around_the_vertical_center(self):
        x = FRAME_OUTER_INSET + 1
        y_mid = CANVAS_H // 2
        for y in range(y_mid - 3, y_mid + 4):
            with self.subTest(y=y):
                self.assertTrue(_is_whiteish(self.canvas.getpixel((x, y))))

    def test_outer_frame_present_on_all_four_sides(self):
        mid_x, mid_y = CANVAS_W // 2, CANVAS_H // 2
        probes = {
            "top": (mid_x, FRAME_OUTER_INSET + 1),
            "bottom": (mid_x, CANVAS_H - FRAME_OUTER_INSET - 1),
            "left": (FRAME_OUTER_INSET + 1, mid_y),
            "right": (CANVAS_W - FRAME_OUTER_INSET - 1, mid_y),
        }
        for side, point in probes.items():
            with self.subTest(side=side):
                self.assertTrue(_is_whiteish(self.canvas.getpixel(point)), f"{side} 辺に白い外枠が無い")


class InnerLineTests(unittest.TestCase):
    """フレーム内枠（inset 50px）。輝度が低い差し色は白 alpha 60% へ自動フォールバックする。"""

    def _inner_row(self, accent):
        canvas = Image.new("RGB", (CANVAS_W, CANVAS_H), BASE_GRAY)
        _draw_frame(canvas, accent)
        y = FRAME_INNER_INSET
        return [canvas.getpixel((x, y)) for x in range(FRAME_INNER_INSET, CANVAS_W - FRAME_INNER_INSET)]

    def test_bright_accent_paints_its_own_color(self):
        row = self._inner_row(BRIGHT_ACCENT)
        self.assertTrue(any(_matches(p, BRIGHT_ACCENT) for p in row))

    def test_dark_accent_does_not_paint_its_raw_color(self):
        row = self._inner_row(DARK_ACCENT)
        self.assertFalse(
            any(_matches(p, DARK_ACCENT) for p in row), "#0A0A0A がそのまま乗っている(フォールバック未発動)"
        )
        # 白との半透明合成で、地の gray よりは明るい線になっているはず
        self.assertTrue(any(sum(p) > sum(BASE_GRAY) for p in row))


class ScrimTests(unittest.TestCase):
    def test_top_is_darker_than_below_the_scrim(self):
        # 写真依存を避けるため単色画像で検証する。
        canvas = Image.new("RGB", (CANVAS_W, CANVAS_H), (200, 200, 200))
        _apply_top_scrim(canvas)
        near_top = canvas.getpixel((CANVAS_W - 10, 50))
        below_scrim = canvas.getpixel((CANVAS_W - 10, 600))
        self.assertLess(sum(near_top), sum(below_scrim))

    def test_scrim_fades_out_by_its_declared_height(self):
        canvas = Image.new("RGB", (CANVAS_W, CANVAS_H), (200, 200, 200))
        _apply_top_scrim(canvas)
        just_below = canvas.getpixel((CANVAS_W - 10, SCRIM_HEIGHT + 5))
        self.assertEqual(just_below, (200, 200, 200))


class BrandHeaderTests(unittest.TestCase):
    def test_white_pixels_exist_above_the_headline(self):
        store = load_store()
        photos = load_photos()
        plan = resolve(store, DAY)
        photo = find_photo(photos, "vanilla-cone-front")
        image = render(store, plan, photo)

        # 店名 baseline = 見出し baseline(275) - 見出し cap(120) - 40 = 115 付近。
        # ヘッダーの字面が乗る帯だけを覗く。
        band = image.crop((0, 90, CANVAS_W, 118))
        whiteish = sum(1 for pixel in band.getdata() if _is_whiteish(pixel))
        self.assertGreater(whiteish, 50, "店名ヘッダーの白画素が見つからない")


class DeterminismTests(unittest.TestCase):
    def test_same_args_same_bytes(self):
        store = load_store()
        photos = load_photos()
        plan = resolve(store, DAY)
        photo = find_photo(photos, "vanilla-cone-front")

        def digest() -> str:
            buffer = io.BytesIO()
            render(store, plan, photo).save(buffer, "PNG")
            return hashlib.sha256(buffer.getvalue()).hexdigest()

        self.assertEqual(digest(), digest())


if __name__ == "__main__":
    unittest.main()
