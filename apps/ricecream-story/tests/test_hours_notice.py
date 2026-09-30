"""営業時間変更のお知らせ文面の回帰。"""
import unittest
from datetime import date

from ricecream_story.config import ConfigError, load_store
from ricecream_story.hours_notice import build_hours_notice


class HoursNoticeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.store = load_store()

    def test_open_later_matches_the_approved_wording(self):
        """2026-09-29 に本人承認した 10/2(金) 15時開店の文面から1字でもずれたら検出する。"""
        notice = build_hours_notice(self.store, date(2026, 10, 2), "15:00", None)
        self.assertEqual(notice.kind, "open_later")
        self.assertTrue(notice.approved)
        self.assertEqual(
            notice.japanese,
            (
                "10月2日（金）は開店時刻を変更し、",
                "15時〜20時30分の営業となります。",
                "ご迷惑をおかけしますが、",
                "何卒よろしくお願いいたします。",
            ),
        )
        self.assertEqual(
            notice.english,
            (
                "On Friday, Oct 2, we'll be opening",
                "later than usual, at 3 PM.",
                "Closing time is 8:30 PM as usual.",
                "Sorry for any inconvenience!",
            ),
        )

    def test_close_earlier_keeps_usual_opening(self):
        notice = build_hours_notice(self.store, date(2026, 10, 3), None, "18:00")
        self.assertEqual(notice.kind, "close_earlier")
        self.assertFalse(notice.approved)
        self.assertEqual(notice.japanese[1], "13時〜18時の営業となります。")
        self.assertEqual(notice.english[2], "Opening time is 1 PM as usual.")

    def test_both_changed(self):
        notice = build_hours_notice(self.store, date(2026, 10, 4), "15:00", "18:30")
        self.assertEqual(notice.kind, "both")
        self.assertIn("営業時間を変更し", notice.japanese[0])
        self.assertEqual(notice.english[1], "will be 3 PM to 6:30 PM.")

    def test_rejects_closed_weekday(self):
        """定休日の告知は「その曜日は本来やっているのか」と誤読される。"""
        with self.assertRaisesRegex(ConfigError, "not a business day"):
            build_hours_notice(self.store, date(2026, 9, 30), "15:00", None)

    def test_rejects_usual_hours_and_inverted_range(self):
        with self.assertRaisesRegex(ConfigError, "usual hours"):
            build_hours_notice(self.store, date(2026, 10, 2), "13:00", "20:30")
        with self.assertRaisesRegex(ConfigError, "must be before"):
            build_hours_notice(self.store, date(2026, 10, 2), "21:00", None)


if __name__ == "__main__":
    unittest.main()
