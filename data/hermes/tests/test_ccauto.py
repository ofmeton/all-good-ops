import os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import ccauto_executor as cc
import json, tempfile, pathlib


class TestHardGate(unittest.TestCase):
    def test_migration_path_blocks(self):
        hit, reason = cc.hard_gate_hit("普通のタスク", ["src/app.ts", "supabase/migrations/0007_x.sql"])
        self.assertTrue(hit); self.assertIn("migration", reason)

    def test_env_secret_blocks(self):
        hit, _ = cc.hard_gate_hit("task", [".env.local"])
        self.assertTrue(hit)

    def test_workflow_blocks(self):
        hit, _ = cc.hard_gate_hit("task", [".github/workflows/ci.yml"])
        self.assertTrue(hit)

    def test_card_text_send_money_blocks(self):
        hit, reason = cc.hard_gate_hit("このメールを送信して請求して", ["docs/x.md"])
        self.assertTrue(hit)

    def test_clean_docs_passes(self):
        hit, _ = cc.hard_gate_hit("READMEを直す", ["docs/readme.md", "src/util.ts"])
        self.assertFalse(hit)


class TestDiff(unittest.TestCase):
    def test_over_limit(self):
        self.assertTrue(cc.diff_too_big(401))
    def test_under_limit(self):
        self.assertFalse(cc.diff_too_big(399))


class TestDecideExit(unittest.TestCase):
    def test_merge_when_all_clear(self):
        self.assertEqual(cc.decide_exit(True, False, True, True, True), "merge")
    def test_pr_when_hard_gate(self):
        self.assertEqual(cc.decide_exit(True, True, True, True, True), "pr")
    def test_pr_when_diff_too_big(self):
        self.assertEqual(cc.decide_exit(True, False, False, True, True), "pr")
    def test_pr_when_author_not_ok(self):
        self.assertEqual(cc.decide_exit(True, False, True, True, False), "pr")
    def test_blocked_when_review_ng(self):
        self.assertEqual(cc.decide_exit(False, False, True, True, True), "blocked")
    def test_blocked_when_test_fail(self):
        self.assertEqual(cc.decide_exit(True, False, True, False, True), "blocked")


class TestResolveRepo(unittest.TestCase):
    def test_explicit_repo_line(self):
        p = cc.resolve_repo_from_text("やること\nrepo: all-good-ops\n詳細", "/Users/x/Projects")
        self.assertEqual(p, "/Users/x/Projects/all-good-ops")

    def test_no_repo_returns_none(self):
        self.assertIsNone(cc.resolve_repo_from_text("ただのメモ", "/Users/x/Projects"))


class TestDetectVerify(unittest.TestCase):
    def test_npm_test(self):
        d = tempfile.mkdtemp()
        pathlib.Path(d, "package.json").write_text(json.dumps({"scripts": {"test": "vitest"}}))
        self.assertEqual(cc.detect_verify_cmd(d), ["npm", "test"])

    def test_pytest(self):
        d = tempfile.mkdtemp()
        pathlib.Path(d, "pyproject.toml").write_text("[tool.pytest.ini_options]\n")
        pathlib.Path(d, "tests").mkdir()
        self.assertEqual(cc.detect_verify_cmd(d), ["python3", "-m", "pytest", "-q"])

    def test_none_when_no_test_setup(self):
        d = tempfile.mkdtemp()
        self.assertIsNone(cc.detect_verify_cmd(d))


if __name__ == "__main__":
    unittest.main()
