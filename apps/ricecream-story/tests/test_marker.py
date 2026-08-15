"""マーカー帯の性質。乱数を使うので「決定論」と「形の性質」を押さえる。"""
import unittest

from PIL import Image

from ricecream_story.marker import THICKNESS, _band_mask, draw_marker, seeded_rng


class SeedTests(unittest.TestCase):
    def test_same_parts_same_sequence(self):
        a = seeded_rng("2026-08-15", "vanilla-cone-front", "headline")
        b = seeded_rng("2026-08-15", "vanilla-cone-front", "headline")
        self.assertEqual([a.random() for _ in range(5)], [b.random() for _ in range(5)])

    def test_different_role_different_sequence(self):
        a = seeded_rng("2026-08-15", "vanilla-cone-front", "headline")
        b = seeded_rng("2026-08-15", "vanilla-cone-front", "date")
        self.assertNotEqual([a.random() for _ in range(5)], [b.random() for _ in range(5)])

    def test_seed_is_stable_across_processes(self):
        # seed が hashlib 由来なので PYTHONHASHSEED に左右されず、別プロセス・別マシンでも
        # この値になる。組み込み hash() に戻すとここが落ちる。
        rng = seeded_rng("2026-08-15", "vanilla-cone-front", "headline")
        self.assertEqual(round(rng.random(), 12), 0.084057032857)


class BandShapeTests(unittest.TestCase):
    def test_band_is_about_the_requested_thickness_in_the_middle(self):
        mask = _band_mask(600, THICKNESS, seeded_rng("t", 1))
        column = [mask.getpixel((mask.width // 2, y)) for y in range(mask.height)]
        painted = [y for y, value in enumerate(column) if value > 0]
        height = painted[-1] - painted[0] + 1
        self.assertLessEqual(abs(height - THICKNESS), THICKNESS * 0.25)

    def test_band_tapers_towards_the_ends(self):
        width = 600
        mask = _band_mask(width, THICKNESS, seeded_rng("t", 2))
        def painted_at(x):
            return sum(1 for y in range(mask.height) if mask.getpixel((x, y)) > 0)
        middle = painted_at(mask.width // 2)
        near_end = painted_at(30 + 4)
        self.assertLess(near_end, middle)

    def test_draw_marker_paints_the_accent_colour(self):
        canvas = Image.new("RGB", (1080, 400), (255, 255, 255))
        draw_marker(
            canvas,
            x_center=540,
            baseline=200,
            text_width=540,
            cap_height=120,
            color=(176, 138, 51),
            width_ratio=1.09,
            rng=seeded_rng("2026-08-15", "photo", "headline"),
        )
        painted = sum(1 for pixel in canvas.getdata() if pixel != (255, 255, 255))
        self.assertGreater(painted, 540 * THICKNESS * 0.5)

    def test_draw_marker_is_deterministic(self):
        def once():
            canvas = Image.new("RGB", (1080, 400), (255, 255, 255))
            draw_marker(
                canvas,
                x_center=540,
                baseline=200,
                text_width=540,
                cap_height=120,
                color=(176, 138, 51),
                width_ratio=1.09,
                rng=seeded_rng("2026-08-15", "photo", "headline"),
            )
            return list(canvas.getdata())

        self.assertEqual(once(), once())


if __name__ == "__main__":
    unittest.main()
