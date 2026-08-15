"""config の検証。壊れた config を黙って受け入れて変な画像を出すより、読み込みで落とす。"""
import json
import tempfile
import unittest
from pathlib import Path

from ricecream_story.config import ConfigError, find_photo, load_photos, load_store

VALID_STORE = {
    "version": 1,
    "weekday_convention": "python-monday-0",
    "business_weekdays": [3, 4],
    "default_hours": {"3": "14:00-20:30", "4": "13:00-20:30"},
    "maps_url": "https://maps.app.goo.gl/x",
}


def _write(payload) -> Path:
    handle = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8")
    json.dump(payload, handle)
    handle.close()
    return Path(handle.name)


class StoreConfigTests(unittest.TestCase):
    def test_shipped_config_loads(self):
        store = load_store()
        self.assertTrue(store.maps_url.startswith("https://"))
        self.assertTrue(store.hour_presets)

    def test_rejects_foreign_weekday_convention(self):
        payload = {**VALID_STORE, "weekday_convention": "js-sunday-0"}
        with self.assertRaises(ConfigError):
            load_store(_write(payload))

    def test_rejects_business_weekday_without_default_hours(self):
        payload = {**VALID_STORE, "business_weekdays": [3, 4, 5]}
        with self.assertRaises(ConfigError):
            load_store(_write(payload))

    def test_rejects_malformed_hours(self):
        payload = {**VALID_STORE, "default_hours": {"3": "14:00〜20:30", "4": "13:00-20:30"}}
        with self.assertRaises(ConfigError):
            load_store(_write(payload))

    def test_rejects_malformed_override_date(self):
        payload = {**VALID_STORE, "date_overrides": {"2026/08/15": {"closed": True}}}
        with self.assertRaises(ConfigError):
            load_store(_write(payload))


class PhotoConfigTests(unittest.TestCase):
    def test_shipped_photos_exist_on_disk(self):
        photos = load_photos()
        self.assertEqual(len(photos), 6)
        for photo in photos:
            with self.subTest(photo=photo.id):
                self.assertTrue(photo.path.exists(), photo.path)

    def test_rejects_duplicate_ids(self):
        payload = {
            "photos": [
                {"id": "a", "file": "x.jpg", "accent": "#000000"},
                {"id": "a", "file": "y.jpg", "accent": "#000000"},
            ]
        }
        with self.assertRaises(ConfigError):
            load_photos(_write(payload))

    def test_rejects_non_hex_accent(self):
        payload = {"photos": [{"id": "a", "file": "x.jpg", "accent": "gold"}]}
        with self.assertRaises(ConfigError):
            load_photos(_write(payload))

    def test_rejects_out_of_range_crop_focus(self):
        payload = {
            "photos": [{"id": "a", "file": "x.jpg", "accent": "#000000", "crop_focus": [0.5, 1.4]}]
        }
        with self.assertRaises(ConfigError):
            load_photos(_write(payload))

    def test_find_photo_reports_known_ids(self):
        photos = load_photos()
        with self.assertRaises(ConfigError) as caught:
            find_photo(photos, "nope")
        self.assertIn("vanilla-cone-front", str(caught.exception))


if __name__ == "__main__":
    unittest.main()
