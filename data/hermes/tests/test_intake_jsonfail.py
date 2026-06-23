import os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import intake_enrich as ie
from unittest import mock


def make_card(pid="page1", brief_status=None):
    sel = {"select": {"name": brief_status}} if brief_status else {"select": None}
    return {
        "id": pid,
        "properties": {
            "Title": {"title": [{"plain_text": "X品質改善"}]},
            "Details": {"rich_text": []},
            "BriefStatus": sel,
        },
    }


class TestJsonFailGiveup(unittest.TestCase):
    def setUp(self):
        # heavy 固定・プロフィール空・JSON を含まない散文を常に返す
        self.p = mock.patch.multiple(
            ie,
            triage_card=mock.Mock(return_value={"tier": "heavy", "autonomy": None, "reason": "r"}),
            load_user_profile=mock.Mock(return_value=""),
            run_claude=mock.Mock(return_value=(True, "これは自然言語の散文です。JSONはありません。")),
            add_comment=mock.Mock(),
            patch_page=mock.Mock(),
            save_state=mock.Mock(),
        )
        self.p.start()

    def tearDown(self):
        self.p.stop()

    def test_giveup_after_two_runs_and_then_skips(self):
        state = {}
        card = make_card()

        # run1: 通常+厳格 の2回試行で失敗 → json_fail=1・断念せず再試行余地
        r1 = ie.process_card({}, card, state, dry=False)
        self.assertFalse(r1)
        self.assertEqual(ie.run_claude.call_count, 2)  # 通常+strict
        self.assertEqual(state["page1"]["json_fail"], 1)
        self.assertNotEqual(state["page1"].get("brief_status"), "enriching")
        ie.add_comment.assert_not_called()
        ie.patch_page.assert_not_called()

        # run2: json_fail=1 を引き継ぎ → 2回目で give-up(コメント+BriefStatus退避)
        ie.run_claude.reset_mock()
        r2 = ie.process_card({}, card, state, dry=False)
        self.assertFalse(r2)
        self.assertEqual(ie.run_claude.call_count, 2)
        self.assertEqual(state["page1"]["json_fail"], 2)
        self.assertEqual(state["page1"]["brief_status"], "enriching")
        ie.add_comment.assert_called_once()
        ie.patch_page.assert_called_once()
        # patch は BriefStatus=enriching
        args, _ = ie.patch_page.call_args
        self.assertEqual(args[2]["BriefStatus"]["select"]["name"], "enriching")

        # run3: state.brief_status=enriching なので run_claude を呼ばず skip(=ループ停止)
        ie.run_claude.reset_mock()
        r3 = ie.process_card({}, card, state, dry=False)
        self.assertTrue(r3)  # skip は True を返す
        ie.run_claude.assert_not_called()

    def test_dry_run_does_not_write(self):
        state = {"page1": {"json_fail": 1}}
        r = ie.process_card({}, make_card(), state, dry=True)
        self.assertFalse(r)
        ie.add_comment.assert_not_called()
        ie.patch_page.assert_not_called()
        ie.save_state.assert_not_called()


class TestStrictPrompt(unittest.TestCase):
    def test_strict_preamble_present_only_when_strict(self):
        normal = ie.build_prompt("t", "d", "p", strict=False)
        strict = ie.build_prompt("t", "d", "p", strict=True)
        self.assertNotIn("JSON オブジェクト1個のみ", normal)
        self.assertIn("JSON オブジェクト1個のみ", strict)
        self.assertTrue(strict.lstrip().startswith("【厳守"))


if __name__ == "__main__":
    unittest.main()
