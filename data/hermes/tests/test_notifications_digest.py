import os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import autorun_executor as ae
import ccauto_executor as cc
import nudge_loop as nl


def card(status="Review", edited="2026-06-24T01:00:00.000Z", url="https://notion.so/card"):
    return {
        "id": "p1",
        "url": url,
        "created_time": "2026-06-23T00:00:00.000Z",
        "last_edited_time": edited,
        "properties": {
            "Title": {"title": [{"plain_text": "タスクA"}]},
            "Status": {"select": {"name": status}},
            "Due": {"date": None},
        },
    }


class TestTerseNotices(unittest.TestCase):
    def test_autorun_blocked_notice_is_terse_with_link(self):
        msg = ae.blocked_notice("長い調査", "line1\nline2 " + "x" * 200, "https://n")
        self.assertIn("🚧詰まった: 長い調査", msg)
        self.assertIn("→ https://n", msg)
        self.assertNotIn("x" * 120, msg)

    def test_ccauto_hard_gate_notice_is_terse_with_link(self):
        msg = cc.ccauto_notice("hard_gate", "実装", "https://n", "denylist keyword: migration " + "x" * 200)
        self.assertIn("⚠️硬ゲート停止: 実装", msg)
        self.assertIn("→ https://n", msg)
        self.assertNotIn("x" * 120, msg)


class TestDigestPureFunctions(unittest.TestCase):
    def test_digest_hours_gate(self):
        self.assertTrue(nl.should_send_digest_hour(9))
        self.assertTrue(nl.should_send_digest_hour(13))
        self.assertTrue(nl.should_send_digest_hour(19))
        self.assertFalse(nl.should_send_digest_hour(8))
        self.assertTrue(nl.should_send_digest_hour(8, force=True))

    def test_updated_filter_requires_review_or_done_and_newer_than_state(self):
        last = "2026-06-24T09:30:00+09:00"
        self.assertTrue(nl.is_updated_since(card("Review", "2026-06-24T01:00:01.000Z"), last))
        self.assertTrue(nl.is_updated_since(card("Done", "2026-06-24T01:00:01.000Z"), last))
        self.assertFalse(nl.is_updated_since(card("InProgress", "2026-06-24T01:00:01.000Z"), last))
        self.assertFalse(nl.is_updated_since(card("Review", "2026-06-24T00:30:00.000Z"), last))

    def test_update_line_has_status_label_and_url(self):
        self.assertIn("下書き確認 → https://notion.so/card", nl.update_line_for_card(card("Review")))
        self.assertIn("main反映 → https://notion.so/card", nl.update_line_for_card(card("Done")))

    def test_initial_digest_baseline_uses_now_to_avoid_review_done_flood(self):
        now = "2026-06-24T19:00:00+09:00"
        self.assertEqual(nl.digest_baseline_ts({}, now), now)
        self.assertEqual(nl.updated_digest_lines([card("Review", "2026-06-24T00:00:00.000Z")], now), [])

    def test_missing_url_renders_empty_not_none(self):
        c = card(url=None)
        self.assertNotIn("None", nl.update_line_for_card(c))


if __name__ == "__main__":
    unittest.main()
