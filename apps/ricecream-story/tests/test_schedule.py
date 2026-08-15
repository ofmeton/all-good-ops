"""営業日と営業時間の解決。曜日の 0 が何曜日かを間違えると全部ずれるので表で固定する。"""
import unittest
from datetime import date

from ricecream_story.config import ConfigError, load_store
from ricecream_story.schedule import hour_presets_for, resolve


class ScheduleTests(unittest.TestCase):
    def setUp(self):
        self.store = load_store()

    def test_weekday_table_matches_stated_hours(self):
        # 陸さん申告（2026-08-15）: 木 14:00-20:30 / 金土 13:00-20:30 / 日 13:00-20:00
        # 2026-08-13 が木。以降 月曜まで7日分を並べる。
        expected = {
            date(2026, 8, 13): ("Thu", "14:00-20:30"),
            date(2026, 8, 14): ("Fri", "13:00-20:30"),
            date(2026, 8, 15): ("Sat", "13:00-20:30"),
            date(2026, 8, 16): ("Sun", "13:00-20:00"),
            date(2026, 8, 17): ("Mon", None),
            date(2026, 8, 18): ("Tue", None),
            date(2026, 8, 19): ("Wed", None),
        }
        for day, (label, hours) in expected.items():
            with self.subTest(day=day):
                plan = resolve(self.store, day)
                self.assertIn(label, plan.date_label)
                self.assertEqual(plan.hours, hours)
                self.assertEqual(plan.is_business_day, hours is not None)

    def test_python_weekday_convention(self):
        # ricecream-attendance の TypeScript 側は日=0 で [0,4,5,6]。
        # Python は月=0 なので同じ4日は [3,4,5,6] になる。混ぜると2日ずれる。
        self.assertEqual(self.store.business_weekdays, (3, 4, 5, 6))
        self.assertEqual(date(2026, 8, 13).weekday(), 3)

    def test_labels(self):
        plan = resolve(self.store, date(2026, 8, 16))
        self.assertEqual(plan.date_label, "8/16 Sun.")
        self.assertEqual(plan.hours_label, "13:00 - 20:00")

    def test_hours_override_wins(self):
        plan = resolve(self.store, date(2026, 8, 16), hours_override="13:00-18:00")
        self.assertEqual(plan.hours, "13:00-18:00")
        self.assertEqual(plan.hours_label, "13:00 - 18:00")

    def test_hours_override_reopens_a_closed_weekday(self):
        plan = resolve(self.store, date(2026, 8, 17), hours_override="13:00-18:00")
        self.assertTrue(plan.is_business_day)

    def test_bad_hours_override_rejected(self):
        with self.assertRaises(ConfigError):
            resolve(self.store, date(2026, 8, 16), hours_override="25:00-20:00")

    def test_date_override_closed(self):
        store = self._with_overrides({"2026-08-15": {"closed": True, "note": "臨時休業"}})
        plan = resolve(store, date(2026, 8, 15))
        self.assertFalse(plan.is_business_day)
        self.assertEqual(plan.closed_reason, "date_override")
        self.assertEqual(plan.note, "臨時休業")

    def test_date_override_opens_a_closed_weekday(self):
        store = self._with_overrides({"2026-08-17": {"hours": "15:00-19:00"}})
        plan = resolve(store, date(2026, 8, 17))
        self.assertTrue(plan.is_business_day)
        self.assertEqual(plan.hours, "15:00-19:00")

    def test_closed_dates(self):
        store = self._with_overrides({}, closed=["2026-08-15"])
        plan = resolve(store, date(2026, 8, 15))
        self.assertEqual(plan.closed_reason, "closed_dates")

    def test_presets_drop_the_current_hours(self):
        presets = hour_presets_for(self.store, "13:00-20:30")
        self.assertNotIn("13:00-20:30", presets)
        self.assertIn("13:00-18:00", presets)

    def _with_overrides(self, overrides, closed=()):
        import dataclasses

        from ricecream_story.config import DayOverride

        parsed = {
            key: DayOverride(
                closed=bool(value.get("closed", False)),
                hours=value.get("hours"),
                note=value.get("note"),
            )
            for key, value in overrides.items()
        }
        return dataclasses.replace(
            self.store, date_overrides=parsed, closed_dates=frozenset(closed)
        )


if __name__ == "__main__":
    unittest.main()
