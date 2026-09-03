"""notice レーンの受け入れ回帰。"""
import hashlib
import io
import unittest

from PIL import Image

from ricecream_story.config import ConfigError, FONT_DISPLAY, find_photo, load_photos, load_store
from ricecream_story.photos import CANVAS_H, CANVAS_W
from ricecream_story.render import (
    FRAME_INNER_INSET,
    FRAME_INNER_WIDTH,
    HEADLINE_SIDE_MARGIN,
    NOTICE_SCRIM_TAIL,
    NOTICE_SCRIM_TEXT_PAD,
    TOP_SAFE_MARGIN,
    NoticeContent,
    _apply_notice_scrim,
    _assert_glyph_coverage,
    _notice_lines,
    font_for_cap_height,
    render_notice,
)


def _is_whiteish(pixel, tolerance=4) -> bool:
    return all(abs(component - 255) <= tolerance for component in pixel)


def _png_digest(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, "PNG")
    return hashlib.sha256(buffer.getvalue()).hexdigest()


class NoticeRenderTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.store = load_store()
        cls.photo = find_photo(load_photos(), "vanilla-cone-door")
        cls.content = NoticeContent(
            headline_lines=("今週は", "お休みします"),
            sub="CLOSED THIS WEEK",
            detail_lines=("台風のため、", "9/3(木)〜9/6(日) は休業します", "次の営業は 9/10(木) からです"),
        )

    def test_same_notice_arguments_produce_identical_png_bytes(self):
        """乱数・環境依存の描画を入れると同じ入力でのPNGが変わる。"""
        self.assertEqual(
            _png_digest(render_notice(self.store, self.content, self.photo)),
            _png_digest(render_notice(self.store, self.content, self.photo)),
        )

    def test_notice_canvas_is_story_size(self):
        """coverやnotice描画がcanvas寸法を変えると投稿できない。"""
        self.assertEqual(render_notice(self.store, self.content, self.photo).size, (CANVAS_W, CANVAS_H))

    def test_notice_text_keeps_instagram_top_safe_band_clear(self):
        """店名・告知文字がInstagramの上部UIと重なる変更を検出する。"""
        image = render_notice(self.store, self.content, self.photo)
        inside = FRAME_INNER_INSET + FRAME_INNER_WIDTH
        band = image.crop((inside, inside, CANVAS_W - inside, TOP_SAFE_MARGIN))
        whiteish = sum(1 for pixel in band.getdata() if _is_whiteish(pixel))
        self.assertLess(whiteish, 200, "セーフエリアに文字が入り込んでいる")

    def test_notice_renders_without_subtitle(self):
        """副見出しなしの告知が例外になると最小限の告知を作れない。"""
        content = NoticeContent(("臨時休業",), None, ("本日はお休みします",))
        self.assertEqual(render_notice(self.store, content, self.photo).size, (CANVAS_W, CANVAS_H))

    def test_missing_glyph_raises_config_error(self):
        """和文を欧文フォントで描いて.tofuを出す回帰を検出する。"""
        font = font_for_cap_height(FONT_DISPLAY, 34)
        with self.assertRaisesRegex(ConfigError, "臨.*Merriweather-Black.ttf"):
            _assert_glyph_coverage(font, "臨", FONT_DISPLAY.name)

    def test_notice_headline_does_not_exceed_inner_text_limit(self):
        """明示改行の見出しが内枠を越えてフレームに触れる変更を検出する。"""
        lines = _notice_lines(self.store, self.content, self.photo)
        limit = CANVAS_W - 2 * (FRAME_INNER_INSET + HEADLINE_SIDE_MARGIN)
        for line in lines:
            if line.role == "headline":
                with self.subTest(text=line.text):
                    self.assertLessEqual(line.ink_width, limit)

    def test_overlong_group_shrinks_to_one_shared_font_size(self):
        """長い行だけ級数を変えると同一グループの整列感が崩れる。"""
        content = NoticeContent(
            ("臨時休業のお知らせについて", "ご来店前にご確認ください"),
            None,
            (),
        )
        lines = _notice_lines(self.store, content, self.photo)
        headlines = [line for line in lines if line.role == "headline"]
        limit = CANVAS_W - 2 * (FRAME_INNER_INSET + HEADLINE_SIDE_MARGIN)
        self.assertLess(headlines[0].font.size, 120)
        self.assertEqual({line.font.size for line in headlines}, {headlines[0].font.size})
        self.assertTrue(all(line.ink_width <= limit for line in headlines))


class NoticeScrimTests(unittest.TestCase):
    def test_notice_scrim_stays_dark_through_the_last_text_baseline_then_fades_out(self):
        """詳細行まで薄い既存スクリムを伸ばすと白文字が明るい写真に埋もれる。"""
        store = load_store()
        photo = find_photo(load_photos(), "vanilla-cone-door")
        content = NoticeContent(
            ("今週は", "お休みします"),
            "CLOSED THIS WEEK",
            ("台風のため、", "9/3(木)〜9/6(日) は休業します", "次の営業は 9/10(木) からです"),
        )
        last_baseline = _notice_lines(store, content, photo)[-1].baseline
        plateau_end = last_baseline + NOTICE_SCRIM_TEXT_PAD
        canvas = Image.new("RGB", (CANVAS_W, CANVAS_H), (200, 200, 200))

        _apply_notice_scrim(canvas, plateau_end)

        self.assertLess(sum(canvas.getpixel((CANVAS_W - 10, last_baseline))), 600)
        self.assertEqual(
            canvas.getpixel((CANVAS_W - 10, plateau_end + NOTICE_SCRIM_TAIL + 5)),
            (200, 200, 200),
        )


if __name__ == "__main__":
    unittest.main()
