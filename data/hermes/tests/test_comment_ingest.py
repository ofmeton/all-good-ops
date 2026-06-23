import os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import comment_ingest as ci
from unittest import mock


def comment(cid, author, created, text):
    return {
        "id": cid,
        "created_by": {"id": author},
        "created_time": created,
        "rich_text": [{"plain_text": text}],
    }


class TestCommentExtraction(unittest.TestCase):
    def test_extract_user_comments_excludes_bot_and_old_comments(self):
        comments = [
            comment("old", "user", "2026-06-24T00:00:00.000Z", "古い"),
            comment("bot", "bot", "2026-06-24T01:00:00.000Z", "質問"),
            comment("new", "user", "2026-06-24T02:00:00.000Z", "回答です"),
        ]
        out = ci.extract_user_comments(comments, "bot", "2026-06-24T00:30:00.000Z")
        self.assertEqual([x["text"] for x in out], ["回答です"])

    def test_missing_bot_user_id_skips_all(self):
        out = ci.extract_user_comments([comment("new", "user", "2026-06-24T02:00:00.000Z", "回答")], "", "")
        self.assertEqual(out, [])

    def test_missing_created_by_is_safe_and_treated_as_non_bot(self):
        c = comment("new", "user", "2026-06-24T02:00:00.000Z", "回答")
        c.pop("created_by")
        out = ci.extract_user_comments([c], "bot", "")
        self.assertEqual([x["text"] for x in out], ["回答"])


class TestFallbackIntent(unittest.TestCase):
    def test_approval_words_approve_only_for_breakdown_waiting(self):
        self.assertEqual(ci.fallback_intent("OK", True)["intent"], "approve_breakdown")
        self.assertEqual(ci.fallback_intent("承認お願いします", True)["intent"], "approve_breakdown")
        self.assertEqual(ci.fallback_intent("1", True)["intent"], "approve_breakdown")
        self.assertEqual(ci.fallback_intent("OK", False)["intent"], "answer")

    def test_non_approval_defaults_to_answer(self):
        self.assertEqual(ci.fallback_intent("詳細はA案です", True)["intent"], "answer")


class TestConversationLog(unittest.TestCase):
    def test_append_conversation_log_formats_jst_timestamp(self):
        out = ci.append_conversation_log("既存", "  回答\nです  ", "2026-06-24T00:30:00.000Z")
        self.assertIn("既存", out)
        self.assertIn("[2026-06-24 09:30 本人] 回答 です", out)

    def test_append_conversation_log_trims_to_limit(self):
        out = ci.append_conversation_log("x" * 50, "回答", "2026-06-24T00:30:00.000Z", limit=40)
        self.assertLessEqual(len(out), 40)
        self.assertIn("回答", out)


class TestProcessCardState(unittest.TestCase):
    def test_apply_failure_does_not_advance_state(self):
        state = {"page1": "2026-06-24T01:00:00.000Z"}
        card_obj = {"id": "page1", "properties": {"Title": {"title": [{"plain_text": "T"}]}}}
        comments = [comment("new", "user", "2026-06-24T02:00:00.000Z", "回答")]
        with mock.patch.object(ci, "list_comments", return_value=comments), \
             mock.patch.object(ci, "classify_intent", return_value={"intent": "answer", "note": ""}), \
             mock.patch.object(ci, "latest_bot_comment_text", return_value=""), \
             mock.patch.object(ci, "apply_intent", side_effect=RuntimeError("patch failed")), \
             mock.patch.object(ci, "save_state") as save:
            with self.assertRaises(RuntimeError):
                ci.process_card({"HERMES_BOT_USER_ID": "bot"}, card_obj, state, dry=False)
        self.assertEqual(state, {"page1": "2026-06-24T01:00:00.000Z"})
        save.assert_not_called()

    def test_no_new_comments_does_not_count_as_processed(self):
        card_obj = {"id": "page1", "properties": {"Title": {"title": [{"plain_text": "T"}]}}}
        with mock.patch.object(ci, "list_comments", return_value=[]):
            self.assertFalse(ci.process_card({"HERMES_BOT_USER_ID": "bot"}, card_obj, {}, dry=False))

    def test_first_seen_card_records_baseline_without_processing_old_comments(self):
        state = {}
        card_obj = {"id": "page1", "properties": {"Title": {"title": [{"plain_text": "T"}]}}}
        comments = [
            comment("old-user", "user", "2026-06-24T01:00:00.000Z", "過去回答"),
            comment("old-bot", "bot", "2026-06-24T02:00:00.000Z", "過去質問"),
        ]
        with mock.patch.object(ci, "list_comments", return_value=comments), \
             mock.patch.object(ci, "apply_intent") as apply_intent, \
             mock.patch.object(ci, "classify_intent") as classify_intent, \
             mock.patch.object(ci, "save_state") as save:
            self.assertFalse(ci.process_card({"HERMES_BOT_USER_ID": "bot"}, card_obj, state, dry=False))
        self.assertEqual(state["page1"], "2026-06-24T02:00:00.000Z")
        save.assert_called_once_with(state)
        apply_intent.assert_not_called()
        classify_intent.assert_not_called()

    def test_first_seen_dry_run_does_not_record_baseline(self):
        state = {}
        card_obj = {"id": "page1", "properties": {"Title": {"title": [{"plain_text": "T"}]}}}
        comments = [comment("old-user", "user", "2026-06-24T01:00:00.000Z", "過去回答")]
        with mock.patch.object(ci, "list_comments", return_value=comments), \
             mock.patch.object(ci, "save_state") as save:
            self.assertFalse(ci.process_card({"HERMES_BOT_USER_ID": "bot"}, card_obj, state, dry=True))
        self.assertEqual(state, {})
        save.assert_not_called()

    def test_seen_card_processes_only_user_comments_newer_than_baseline(self):
        state = {"page1": "2026-06-24T02:00:00.000Z"}
        card_obj = {"id": "page1", "properties": {"Title": {"title": [{"plain_text": "T"}]}}}
        comments = [
            comment("old-user", "user", "2026-06-24T01:00:00.000Z", "古い"),
            comment("bot", "bot", "2026-06-24T03:00:00.000Z", "bot追記"),
            comment("new-user", "user", "2026-06-24T04:00:00.000Z", "新しい"),
        ]
        captured = {}
        def fake_apply(env, card, intent, user_text, created_time, dry):
            captured["text"] = user_text
            captured["created_time"] = created_time
        with mock.patch.object(ci, "list_comments", return_value=comments), \
             mock.patch.object(ci, "classify_intent", return_value={"intent": "answer", "note": ""}), \
             mock.patch.object(ci, "latest_bot_comment_text", return_value=""), \
             mock.patch.object(ci, "apply_intent", side_effect=fake_apply), \
             mock.patch.object(ci, "save_state") as save:
            self.assertTrue(ci.process_card({"HERMES_BOT_USER_ID": "bot"}, card_obj, state, dry=False))
        self.assertEqual(captured["text"], "新しい")
        self.assertEqual(captured["created_time"], "2026-06-24T04:00:00.000Z")
        self.assertEqual(state["page1"], "2026-06-24T04:00:00.000Z")
        save.assert_called_once_with(state)


if __name__ == "__main__":
    unittest.main()
