# Phase 3拡張 cc-auto 自走コード実行 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notion の `Status=Ready × Autonomy=cc-auto` カードを Mac launchd で拾い、対象リポの worktree で Codex がコード実装→検証→Codexレビュー→機械ガードを通れば自動 merge、そうでなければ PR/Blocked にし、全停止点を Telegram 通知する自走ランナーを作る。

**Architecture:** 単一 Python スクリプト `data/hermes/ccauto_executor.py`（既存 poller と同様 stdlib のみ・外部依存なし）。純ロジック（機械ガード/出口判定/リポ解決/検証コマンド検出）を副作用なし関数に切り出して `unittest` で TDD。I/O（Notion/Telegram/git/Codex）は薄い関数にまとめ `--dry-run` で机上検証。現行 `autorun_executor.py`（draft-only・read-only）とは別ファイル。

**Tech Stack:** Python 3.9（Mac・stdlib のみ：urllib/subprocess/json/pathlib/argparse/unittest）、git worktree、Codex CLI（`codex exec` 系・`approval-policy=never sandbox=workspace-write`）、gh CLI、launchd。

## Global Constraints

- Python 3.9 互換（PEP 604 `X | None` 不可。`Optional[X]` か無注釈）。
- 外部依存禁止：stdlib のみ（既存 poller 同様）。
- 設計 SSOT：`docs/superpowers/specs/2026-06-21-hermes-ccauto-phase3-design.md`。
- 秘密は `~/.hermes/.env` から読む（NOTION_TOKEN / OPENROUTER_API_KEY / TELEGRAM_BOT_TOKEN / TELEGRAM_HOME_CHANNEL）。コードに秘密を書かない。
- Notion DB ID `2159405e11a84e7f90a8b6252bb43d38` / Notion-Version `2022-06-28`。
- キルスイッチ `~/.hermes/ccauto_enabled`（"0" で全停止）。
- 逐次実行（1回1件）。日次件数キャップなし。連続失敗バックストップのみ。
- 硬ゲート denylist は機械判定で絶対則（migration/secret/deploy/送信/金銭/CI）。Codexレビュー OK でも denylist 該当なら自動 merge しない。
- リポジトリ作業の規律：1 タスク 1 ブランチ・worktree 隔離・汎用 `git worktree`（wt-new.sh 非依存）。
- コミットは末尾に Co-Authored-By 行を付ける（リポ規約）。

---

## File Structure

- `data/hermes/ccauto_executor.py` — ランナー本体（純ロジック関数＋I/O 関数＋main ループ）。
- `data/hermes/tests/test_ccauto.py` — 純ロジックの unittest。
- `data/hermes/com.hermes.ccauto.plist` — launchd 定義（リポ控え＋ `~/Library/LaunchAgents` へコピー）。
- `data/hermes/notion-task-db.md` — 稼働控えに cc-auto 行を追記（既存ファイル修正）。

純ロジック（テスト対象・副作用なし）:
- `hard_gate_hit(card_text, changed_files)` → `(bool, reason)`
- `diff_too_big(changed_line_count, limit=400)` → `bool`
- `decide_exit(review_ok, hard_gate_hit, diff_ok, test_ok, author_ok)` → `"merge"|"pr"|"blocked"`
- `resolve_repo_from_text(details, projects_root)` → `Optional[str]`（明示パスのみ。推論は別 I/O 関数）
- `detect_verify_cmd(repo_path)` → `Optional[list]`（package.json scripts / pytest 検出）

I/O（dry-run 検証）:
- `notion(env, method, path, body=None)` / `telegram(env, text)` / `query_ccauto(env)`
- `resolve_repo(env, card, projects_root)`（明示→無ければ Haiku 推論→不能は None）
- `make_worktree(repo_path, slug)` → `(worktree_path, branch)`
- `run_codex(worktree, task_text)` → `(ok, log)`
- `verify(worktree)` → `(ok, log)`
- `codex_review(worktree, diff)` → `(safe, reason)`
- `author_ok(repo_path)` → `bool`
- `finalize(env, card, decision, ctx)` → 出口実行＋Notion/Telegram 記録
- `main()`（kill-switch / backstop / drain / 逐次）

---

### Task 1: スキャフォールド＋機械ガード純ロジック（TDD）

**Files:**
- Create: `data/hermes/ccauto_executor.py`
- Test: `data/hermes/tests/test_ccauto.py`

**Interfaces:**
- Produces:
  - `hard_gate_hit(card_text: str, changed_files: list) -> tuple` 返り値 `(hit: bool, reason: str)`
  - `diff_too_big(changed_line_count: int, limit: int = 400) -> bool`
  - `decide_exit(review_ok: bool, hard_gate: bool, diff_ok: bool, test_ok: bool, author_ok: bool) -> str`（`"merge"|"pr"|"blocked"`）

- [ ] **Step 1: Write the failing test**

```python
# data/hermes/tests/test_ccauto.py
import os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import ccauto_executor as cc


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


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd data/hermes && python3 -m unittest tests.test_ccauto -v`
Expected: FAIL（`ModuleNotFoundError` か `AttributeError: module 'ccauto_executor' has no attribute 'hard_gate_hit'`）

- [ ] **Step 3: Write minimal implementation**

```python
# data/hermes/ccauto_executor.py （冒頭〜純ロジック）
#!/usr/bin/env python3
"""Phase 3拡張 cc-auto 自走コード実行ランナー（Mac 専用）

Notion Ready×Autonomy=cc-auto を拾い、対象リポの worktree で Codex がコード実装→
test/build→Codexレビュー→機械ガードを通れば squash merge、そうでなければ PR/Blocked。
全停止点を Telegram 通知。read-only の draft-only(autorun_executor.py)とは別物。

設計=docs/superpowers/specs/2026-06-21-hermes-ccauto-phase3-design.md
手動: python3 ccauto_executor.py [--dry-run] [--projects-root PATH]
"""
import re

# 硬ゲート denylist（自律でも越えられない絶対則）
_DENY_PATH_PATTERNS = [
    r"(^|/)migrations?/", r"\.sql$",
    r"\.env", r"secret", r"credential", r"\.pem$", r"\.key$",
    r"\.github/workflows/",
]
_DENY_TEXT_KEYWORDS = [
    "送信", "メール送", "line送", "請求", "支払", "送金", "課金",
    "deploy", "wrangler", "migration", "本番反映",
]


def hard_gate_hit(card_text, changed_files):
    """カード本文 or 変更ファイルが硬ゲート denylist に触れたら (True, 理由)。"""
    for f in changed_files or []:
        low = f.lower()
        for pat in _DENY_PATH_PATTERNS:
            if re.search(pat, low):
                return True, f"denylist path: {f} ({pat})"
    text = (card_text or "").lower()
    for kw in _DENY_TEXT_KEYWORDS:
        if kw.lower() in text:
            return True, f"denylist keyword: {kw}"
    return False, ""


def diff_too_big(changed_line_count, limit=400):
    return changed_line_count > limit


def decide_exit(review_ok, hard_gate, diff_ok, test_ok, author_ok):
    """出口を返す。merge は全条件クリア時のみ。"""
    if not test_ok or not review_ok:
        return "blocked"
    if hard_gate or not diff_ok or not author_ok:
        return "pr"
    return "merge"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd data/hermes && python3 -m unittest tests.test_ccauto -v`
Expected: PASS（全 14 テスト OK）

- [ ] **Step 5: Commit**

```bash
git add data/hermes/ccauto_executor.py data/hermes/tests/test_ccauto.py
git commit -m "feat(hermes): cc-auto 機械ガード純ロジック(硬ゲートdenylist/diff上限/出口判定)+TDD

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: リポ解決（明示パス）＋検証コマンド検出（TDD）

**Files:**
- Modify: `data/hermes/ccauto_executor.py`
- Test: `data/hermes/tests/test_ccauto.py`

**Interfaces:**
- Consumes: なし（純ロジック追加）
- Produces:
  - `resolve_repo_from_text(details: str, projects_root: str) -> Optional[str]`（本文に `repo: <name>` 明示があれば `<projects_root>/<name>` を返す。無ければ None）
  - `detect_verify_cmd(repo_path: str) -> Optional[list]`（`package.json` に test script→`["npm","test"]` / `pytest.ini`|`pyproject.toml`+tests→`["python3","-m","pytest","-q"]` / 無ければ None）

- [ ] **Step 1: Write the failing test**

```python
# tests/test_ccauto.py に追記
import json, tempfile, pathlib


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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd data/hermes && python3 -m unittest tests.test_ccauto -v`
Expected: FAIL（`AttributeError: ... 'resolve_repo_from_text'`）

- [ ] **Step 3: Write minimal implementation**

```python
# ccauto_executor.py に追記
import json as _json
import os
from pathlib import Path
try:
    from typing import Optional
except Exception:
    Optional = None  # py3.9 にはあるが保険


def resolve_repo_from_text(details, projects_root):
    """本文に 'repo: <name>' があれば絶対パスを返す。"""
    m = re.search(r"repo:\s*([A-Za-z0-9._\-/]+)", details or "")
    if not m:
        return None
    return os.path.join(projects_root, m.group(1).strip())


def detect_verify_cmd(repo_path):
    """リポの test 実行コマンドを検出。検出不能なら None。"""
    pj = Path(repo_path, "package.json")
    if pj.exists():
        try:
            data = _json.loads(pj.read_text(encoding="utf-8"))
            if (data.get("scripts") or {}).get("test"):
                return ["npm", "test"]
        except Exception:
            pass
    has_pytest_cfg = Path(repo_path, "pytest.ini").exists() or (
        Path(repo_path, "pyproject.toml").exists()
        and "pytest" in Path(repo_path, "pyproject.toml").read_text(encoding="utf-8", errors="ignore")
    )
    if has_pytest_cfg and Path(repo_path, "tests").exists():
        return ["python3", "-m", "pytest", "-q"]
    return None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd data/hermes && python3 -m unittest tests.test_ccauto -v`
Expected: PASS（全テスト OK）

- [ ] **Step 5: Commit**

```bash
git add data/hermes/ccauto_executor.py data/hermes/tests/test_ccauto.py
git commit -m "feat(hermes): cc-auto リポ解決(明示)+検証コマンド検出+TDD

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: I/O 層（env/Notion/Telegram/queue）＋ author 検証

**Files:**
- Modify: `data/hermes/ccauto_executor.py`

**Interfaces:**
- Consumes: なし
- Produces:
  - `load_env() -> dict`
  - `notion(env, method, path, body=None) -> dict`
  - `telegram(env, text) -> None`
  - `query_ccauto(env) -> list`（Status=Ready × Autonomy=cc-auto のカード配列）
  - `author_ok(repo_path) -> bool`（`git config user.email` が許可 author か。team リポ判定の簡易版＝既定 True、`.git/config` に team_ 印があり email が許可リスト外なら False）

- [ ] **Step 1: 実装（既存 autorun_executor.py のパターンを流用）**

```python
# ccauto_executor.py に追記
import subprocess
import urllib.request, urllib.parse, urllib.error

HOME = Path.home()
ENV_PATH = HOME / ".hermes" / ".env"
NOTION_DB_ID = "2159405e11a84e7f90a8b6252bb43d38"
NOTION_VER = "2022-06-28"
ALLOWED_GIT_EMAILS = ["off.me.ton@gmail.com"]  # 既定 author


def load_env():
    env = {}
    for raw in ENV_PATH.read_text(encoding="utf-8").splitlines():
        raw = raw.strip()
        if raw and not raw.startswith("#") and "=" in raw:
            k, v = raw.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def notion(env, method, path, body=None):
    data = _json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(
        f"https://api.notion.com/v1/{path}", data=data, method=method,
        headers={"Authorization": f"Bearer {env['NOTION_TOKEN']}", "Notion-Version": NOTION_VER,
                 "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return _json.loads(r.read().decode("utf-8"))


def telegram(env, text):
    chat = env.get("TELEGRAM_HOME_CHANNEL") or env.get("TELEGRAM_ALLOWED_USERS", "").split(",")[0]
    if not chat:
        return
    data = urllib.parse.urlencode({"chat_id": chat, "text": text[:3800]}).encode()
    try:
        urllib.request.urlopen(urllib.request.Request(
            f"https://api.telegram.org/bot{env['TELEGRAM_BOT_TOKEN']}/sendMessage", data=data), timeout=20)
    except Exception:
        pass


def query_ccauto(env):
    body = {"filter": {"and": [
        {"property": "Status", "select": {"equals": "Ready"}},
        {"property": "Autonomy", "select": {"equals": "cc-auto"}},
    ]}, "page_size": 25}
    return notion(env, "POST", f"databases/{NOTION_DB_ID}/query", body).get("results", [])


def author_ok(repo_path):
    try:
        email = subprocess.run(["git", "-C", repo_path, "config", "user.email"],
                               capture_output=True, text=True, timeout=10).stdout.strip()
    except Exception:
        return False
    if not email:
        return False
    return email in ALLOWED_GIT_EMAILS
```

- [ ] **Step 2: 構文＋既存テスト緑を確認**

Run: `cd data/hermes && python3 -c "import ccauto_executor" && python3 -m unittest tests.test_ccauto -v`
Expected: import 成功＋全テスト PASS（I/O はテスト対象外だが import 破壊がないこと）

- [ ] **Step 3: Commit**

```bash
git add data/hermes/ccauto_executor.py
git commit -m "feat(hermes): cc-auto I/O層(env/Notion/Telegram/queue)+author検証

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: 実行層（worktree/Codex実装/verify/Codexレビュー）

**Files:**
- Modify: `data/hermes/ccauto_executor.py`

**Interfaces:**
- Consumes: `detect_verify_cmd`, `author_ok`
- Produces:
  - `default_branch(repo_path) -> str`
  - `make_worktree(repo_path, slug) -> tuple`（`(worktree_path, branch)`）
  - `cleanup_worktree(repo_path, worktree_path) -> None`
  - `run_codex(worktree, task_text) -> tuple`（`(ok, log)`）
  - `git_diff_stat(worktree) -> tuple`（`(changed_files: list, changed_lines: int)`）
  - `verify(worktree) -> tuple`（`(ok, log)`）
  - `codex_review(worktree, diff_text) -> tuple`（`(safe, reason)`）

- [ ] **Step 1: 実装**

```python
# ccauto_executor.py に追記
import shutil, tempfile

CODEX = shutil.which("codex") or str(HOME / ".local" / "bin" / "codex")
CODEX_TIMEOUT = 1800  # 30分


def default_branch(repo_path):
    r = subprocess.run(["git", "-C", repo_path, "symbolic-ref", "refs/remotes/origin/HEAD"],
                       capture_output=True, text=True)
    if r.returncode == 0 and r.stdout.strip():
        return r.stdout.strip().rsplit("/", 1)[-1]
    return "main"


def make_worktree(repo_path, slug):
    base = default_branch(repo_path)
    subprocess.run(["git", "-C", repo_path, "fetch", "origin", base], capture_output=True, text=True, timeout=120)
    branch = f"ccauto/{slug}"
    wt = tempfile.mkdtemp(prefix="ccauto_wt_")
    subprocess.run(["git", "-C", repo_path, "worktree", "add", "-b", branch, wt, f"origin/{base}"],
                   capture_output=True, text=True, timeout=120, check=True)
    return wt, branch


def cleanup_worktree(repo_path, worktree_path):
    subprocess.run(["git", "-C", repo_path, "worktree", "remove", "--force", worktree_path],
                   capture_output=True, text=True)


def run_codex(worktree, task_text):
    """Codex を sandbox=workspace-write で worktree 内に閉じて実装させる。"""
    prompt = (
        "次の『あとでやる』タスクを実装してください。worktree 内のコードのみ変更可。\n"
        "厳守: 外部送信・git push/merge・課金・migration 実行・secret 書換えは一切しない。\n"
        "実装後、変更点を簡潔に要約して終了。\n\n" + task_text
    )
    try:
        res = subprocess.run(
            [CODEX, "exec", "--sandbox", "workspace-write", "--ask-for-approval", "never", prompt],
            cwd=worktree, capture_output=True, text=True, timeout=CODEX_TIMEOUT)
        ok = res.returncode == 0
        return ok, (res.stdout or "")[-2000:] + (("\nERR:" + res.stderr[-500:]) if res.stderr else "")
    except subprocess.TimeoutExpired:
        return False, f"codex timeout {CODEX_TIMEOUT}s"


def git_diff_stat(worktree):
    subprocess.run(["git", "-C", worktree, "add", "-A"], capture_output=True, text=True)
    files = subprocess.run(["git", "-C", worktree, "diff", "--cached", "--name-only"],
                           capture_output=True, text=True).stdout.split()
    numstat = subprocess.run(["git", "-C", worktree, "diff", "--cached", "--numstat"],
                             capture_output=True, text=True).stdout.strip().splitlines()
    lines = 0
    for ln in numstat:
        parts = ln.split("\t")
        for n in parts[:2]:
            if n.isdigit():
                lines += int(n)
    return files, lines


def verify(worktree):
    cmd = detect_verify_cmd(worktree)
    if not cmd:
        return True, "(検証コマンド検出なし→skip)"  # テスト無しは緑扱い（docs等）
    try:
        res = subprocess.run(cmd, cwd=worktree, capture_output=True, text=True, timeout=900)
        return res.returncode == 0, (res.stdout or "")[-1500:] + (res.stderr or "")[-500:]
    except subprocess.TimeoutExpired:
        return False, "verify timeout"


def codex_review(worktree, diff_text):
    """別 Codex パスで diff の安全性/正しさを判定。'SAFE' 行があれば safe。"""
    prompt = (
        "次の git diff をレビューし、安全に main へ自動マージしてよいか判定。\n"
        "破壊的変更・秘密混入・意図不明な広範囲変更・送信/課金/migration があれば不可。\n"
        "可なら最初の行に 'VERDICT: SAFE'、不可なら 'VERDICT: UNSAFE: <理由>' を出力。\n\n"
        + diff_text[:12000]
    )
    try:
        res = subprocess.run([CODEX, "exec", "--sandbox", "read-only", "--ask-for-approval", "never", prompt],
                             cwd=worktree, capture_output=True, text=True, timeout=600)
        out = res.stdout or ""
        safe = "VERDICT: SAFE" in out
        reason = "" if safe else out[-400:]
        return safe, reason
    except subprocess.TimeoutExpired:
        return False, "codex review timeout"
```

- [ ] **Step 2: 構文＋既存テスト緑**

Run: `cd data/hermes && python3 -c "import ccauto_executor" && python3 -m unittest tests.test_ccauto`
Expected: import 成功＋テスト PASS

- [ ] **Step 3: Commit**

```bash
git add data/hermes/ccauto_executor.py
git commit -m "feat(hermes): cc-auto 実行層(worktree/Codex実装/diff-stat/verify/Codexレビュー)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: 出口実行（finalize: merge/PR/blocked）＋Notion/Telegram記録

**Files:**
- Modify: `data/hermes/ccauto_executor.py`

**Interfaces:**
- Consumes: `notion`, `telegram`, `decide_exit`
- Produces:
  - `set_status(env, page_id, status) -> None`
  - `add_comment(env, page_id, text) -> None`
  - `push_branch(worktree, branch) -> bool`
  - `open_pr(repo_path, worktree, branch, title) -> Optional[str]`（gh で PR 作成・URL 返す）
  - `squash_merge(repo_path, worktree, branch, base) -> bool`
  - `finalize(env, card, decision, ctx) -> None`（ctx=dict: repo_path, worktree, branch, base, title, summary, reason）

- [ ] **Step 1: 実装**

```python
# ccauto_executor.py に追記
def set_status(env, page_id, status):
    notion(env, "PATCH", f"pages/{page_id}", {"properties": {"Status": {"select": {"name": status}}}})


def add_comment(env, page_id, text):
    notion(env, "POST", "comments",
           {"parent": {"page_id": page_id}, "rich_text": [{"text": {"content": text[:1900]}}]})


def push_branch(worktree, branch):
    subprocess.run(["git", "-C", worktree, "commit", "-m",
                    f"feat(cc-auto): {branch}\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"],
                   capture_output=True, text=True)
    r = subprocess.run(["git", "-C", worktree, "push", "-u", "origin", branch], capture_output=True, text=True)
    return r.returncode == 0


def open_pr(repo_path, worktree, branch, title):
    r = subprocess.run(["gh", "pr", "create", "--head", branch, "--title", title,
                        "--body", "🤖 cc-auto 自動生成。レビューしてください。\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)"],
                       cwd=worktree, capture_output=True, text=True)
    if r.returncode == 0:
        return r.stdout.strip().splitlines()[-1]
    return None


def squash_merge(repo_path, worktree, branch, base):
    # PR 経由 squash merge（main 直 commit 保護を回避）
    pr = open_pr(repo_path, worktree, branch, f"cc-auto: {branch}")
    if not pr:
        return False
    r = subprocess.run(["gh", "pr", "merge", branch, "--squash", "--delete-branch"],
                       cwd=worktree, capture_output=True, text=True)
    return r.returncode == 0


def finalize(env, card, decision, ctx):
    pid = card["id"]; title = ctx["title"]; summary = ctx.get("summary", "")
    if decision == "merge":
        ok = squash_merge(env and ctx["repo_path"], ctx["worktree"], ctx["branch"], ctx["base"])
        if ok:
            set_status(env, pid, "Done")
            add_comment(env, pid, f"✅ cc-auto 完了→main反映\n\n{summary}")
            telegram(env, f"✅ 完了→main反映: {title}\n{summary[:400]}")
            return
        decision = "pr"  # merge 失敗→PR にフォールバック
    if decision == "pr":
        push_branch(ctx["worktree"], ctx["branch"])
        pr = open_pr(ctx["repo_path"], ctx["worktree"], ctx["branch"], f"cc-auto: {title}")
        set_status(env, pid, "Review")
        add_comment(env, pid, f"📝 cc-auto PR作成（要レビュー）\n{pr or '(PR作成失敗)'}\n\n{summary}")
        telegram(env, f"📝 PR上げた→確認して: {title}\n{pr or ''}")
        return
    # blocked
    push_branch(ctx["worktree"], ctx["branch"])
    set_status(env, pid, "Blocked")
    add_comment(env, pid, f"⚠️ cc-auto 中断: {ctx.get('reason','')}\n\n{summary}")
    telegram(env, f"⚠️ 止まった→Blocked: {title}\n{ctx.get('reason','')[:300]}")
```

- [ ] **Step 2: 構文＋既存テスト緑**

Run: `cd data/hermes && python3 -c "import ccauto_executor" && python3 -m unittest tests.test_ccauto`
Expected: import 成功＋テスト PASS

- [ ] **Step 3: Commit**

```bash
git add data/hermes/ccauto_executor.py
git commit -m "feat(hermes): cc-auto 出口実行(finalize: squash-merge/PR/blocked)+Notion/Telegram記録

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: main ループ（kill-switch/backstop/drain/逐次）＋dry-run

**Files:**
- Modify: `data/hermes/ccauto_executor.py`

**Interfaces:**
- Consumes: 全 I/O＋純ロジック
- Produces: `main()` / `process_card(env, card, projects_root, dry)`

- [ ] **Step 1: 実装**

```python
# ccauto_executor.py に追記
import sys, argparse

KILL_PATH = HOME / ".hermes" / "ccauto_enabled"
LOG_PATH = HOME / ".hermes" / "logs" / "ccauto_executor.log"
FAIL_BACKSTOP = 3


def log(msg):
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    line = f"{subprocess.run(['date','+%Y-%m-%d %H:%M:%S'],capture_output=True,text=True).stdout.strip()} {msg}"
    print(line)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def _title(card):
    return "".join(x.get("plain_text", "") for x in card["properties"].get("Title", {}).get("title", []))


def _details(card):
    return "".join(x.get("plain_text", "") for x in card["properties"].get("Details", {}).get("rich_text", []))


def _slug(title):
    s = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return (s or "task")[:32]


def process_card(env, card, projects_root, dry):
    pid = card["id"]; title = _title(card); details = _details(card)
    log(f"  pickup: {title[:40]}")
    # pre-flight 硬ゲート（カード本文）
    hit, reason = hard_gate_hit(details + " " + title, [])
    if hit:
        log(f"    pre-flight 硬ゲート: {reason} → Blocked")
        if not dry:
            set_status(env, pid, "Blocked"); add_comment(env, pid, f"⚠️ 硬ゲート: {reason}")
            telegram(env, f"⚠️ 硬ゲートで実行せず: {title}\n{reason}")
        return False
    repo = resolve_repo_from_text(details, projects_root)
    if not repo or not Path(repo, ".git").exists():
        log("    リポ解決不能 → NeedInfo")
        if not dry:
            set_status(env, pid, "NeedInfo")
            telegram(env, f"❓ どのリポ？ 'repo: <name>' を教えて: {title}")
        return False
    if dry:
        log(f"    DRY: repo={repo} まで解決。Codex実行/merge はskip"); return True
    set_status(env, pid, "InProgress"); telegram(env, f"🤖 着手: {title}")
    wt, branch = make_worktree(repo, _slug(title))
    try:
        ok, clog = run_codex(wt, f"{title}\n\n{details}")
        files, lines = git_diff_stat(wt)
        hit2, reason2 = hard_gate_hit("", files)
        test_ok, vlog = verify(wt) if ok else (False, clog)
        diff_text = subprocess.run(["git", "-C", wt, "diff", "--cached"], capture_output=True, text=True).stdout
        safe, sreason = codex_review(wt, diff_text) if ok and test_ok else (False, "実装/検証失敗")
        decision = decide_exit(safe, hit2, not diff_too_big(lines), test_ok, author_ok(repo))
        ctx = {"repo_path": repo, "worktree": wt, "branch": branch, "base": default_branch(repo),
               "title": title, "summary": clog[-600:], "reason": reason2 or sreason or vlog[-300:]}
        finalize(env, card, decision, ctx)
        log(f"    decision={decision} files={len(files)} lines={lines}")
        return decision != "blocked"
    finally:
        cleanup_worktree(repo, wt)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--projects-root", default=str(HOME / "Projects"))
    args = ap.parse_args()
    if KILL_PATH.exists() and KILL_PATH.read_text().strip() == "0":
        log("kill-switch ON → 何もしない"); return
    env = load_env()
    cards = query_ccauto(env)
    log(f"start dry={args.dry_run} Ready×cc-auto={len(cards)}件")
    fails = 0
    for card in cards:
        try:
            ok = process_card(env, card, args.projects_root, args.dry_run)
            fails = 0 if ok else fails + 1
        except Exception as e:
            fails += 1; log(f"    例外: {e}")
        if fails >= FAIL_BACKSTOP:
            log(f"連続失敗 {fails} → バックストップ停止"); telegram(env, "⚠️ cc-auto 連続失敗で一時停止"); break
    log("done")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: dry-run スモーク（実 merge/Codex なし）**

Run: `cd data/hermes && cp ccauto_executor.py ~/.hermes/ && python3 -u ~/.hermes/ccauto_executor.py --dry-run`
Expected: `start dry=True Ready×cc-auto=N件` が出てクラッシュなく `done`（カード0でも可）。例外なし。

- [ ] **Step 3: 全テスト緑＋構文**

Run: `cd data/hermes && python3 -m unittest tests.test_ccauto -v`
Expected: 全 PASS

- [ ] **Step 4: Commit**

```bash
git add data/hermes/ccauto_executor.py
git commit -m "feat(hermes): cc-auto main ループ(kill-switch/連続失敗backstop/drain/逐次)+dry-run

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: launchd 配備＋隔離実証＋控え更新

**Files:**
- Create: `data/hermes/com.hermes.ccauto.plist`
- Modify: `data/hermes/notion-task-db.md`

**Interfaces:**
- Consumes: 完成した `ccauto_executor.py`

- [ ] **Step 1: launchd plist 作成**

```xml
<!-- data/hermes/com.hermes.ccauto.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.hermes.ccauto</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/python3</string>
    <string>/Users/rikukudo/.hermes/ccauto_executor.py</string>
  </array>
  <key>StartInterval</key><integer>900</integer>
  <key>RunAtLoad</key><false/>
  <key>StandardOutPath</key><string>/Users/rikukudo/.hermes/logs/ccauto_cron.log</string>
  <key>StandardErrorPath</key><string>/Users/rikukudo/.hermes/logs/ccauto_cron.log</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/Users/rikukudo/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string></dict>
</dict></plist>
```

- [ ] **Step 2: 隔離実証（ダミーリポで3ケース）**

```bash
# ダミーリポ作成（~/Projects/ccauto-smoke）
mkdir -p ~/Projects/ccauto-smoke && cd ~/Projects/ccauto-smoke && git init -q && git commit --allow-empty -qm init
# Notion に手動で「repo: ccauto-smoke / READMEにこんにちは追記」cc-auto×Ready カードを1枚作り
cp ~/Projects/private-agents/all-good-ops/.claude/worktrees/hermes-todo-partner-spec/data/hermes/ccauto_executor.py ~/.hermes/
python3 -u ~/.hermes/ccauto_executor.py --dry-run   # repo 解決まで確認
```
Expected: dry-run で `repo=.../ccauto-smoke まで解決` がログに出る。
（本実行は Codex/gh が要るため、まず docs 1件で本番投入時に確認＝Step 4）

- [ ] **Step 3: 控え更新＋コミット**

`data/hermes/notion-task-db.md` のステータス節に追記:
```markdown
- [x] **Phase 3拡張 cc-auto 実装**（2026-06-21）: `data/hermes/ccauto_executor.py`＝Ready×cc-auto を Mac launchd(15分)で拾い、対象リポ worktree で Codex(sandbox=workspace-write)実装→verify→Codexレビュー→機械ガード(硬ゲートdenylist/diff>400/test/author)→ merge / PR / Blocked。全停止点 Telegram。キルスイッチ `~/.hermes/ccauto_enabled`。launchd `com.hermes.ccauto`(15分)。設計=specs/2026-06-21-hermes-ccauto-phase3-design.md
```

```bash
cd ~/Projects/private-agents/all-good-ops/.claude/worktrees/hermes-todo-partner-spec
git add data/hermes/com.hermes.ccauto.plist data/hermes/notion-task-db.md
git commit -m "feat(hermes): cc-auto launchd定義+稼働控え更新

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 4: 本番投入（段階）**

```bash
cp data/hermes/com.hermes.ccauto.plist ~/Library/LaunchAgents/
echo -n "1" > ~/.hermes/ccauto_enabled
launchctl unload ~/Library/LaunchAgents/com.hermes.ccauto.plist 2>/dev/null
launchctl load ~/Library/LaunchAgents/com.hermes.ccauto.plist
```
最初は all-good-ops の docs 更新タスク1件（`repo: all-good-ops` 明示）を cc-auto×Ready にして、自動 merge まで通るか実機確認。問題あれば `echo -n "0" > ~/.hermes/ccauto_enabled` で即停止。

---

## Self-Review

**1. Spec coverage:**
- §2 決定事項 → Global Constraints＋各タスクに反映（Mac/全リポ/全リポmerge/逐次/poll15分）✓
- §3 パイプライン → Task 6 `process_card` の順序で実装 ✓
- §4 コンポーネント → Task 2-5 の関数群 ✓
- §5 機械ガード（denylist/diff/test/author/path健全性）→ Task 1 `hard_gate_hit`＋Task 3 `author_ok`＋Task 6 で結線 ✓（path traversal は worktree 隔離＋`git diff --cached` が worktree 内限定で担保）
- §6 出口判定 → Task 1 `decide_exit`＋Task 5 `finalize` ✓
- §7 通知 → Task 5/6 の telegram 呼び出し（着手/完了/PR/Blocked/NeedInfo）✓
- §8 安全装置（kill-switch/backstop/逐次/ログ）→ Task 6 ✓
- §9 インジェクション対策 → denylist＋sandbox=workspace-write（Task 4）＋逐次worktree ✓
- §10 テスト → Task 1-2 unittest＋Task 6 dry-run＋Task 7 隔離実証 ✓

**2. Placeholder scan:** 各 step に実コード・実コマンド・期待出力あり。TBD/TODO なし。✓

**3. Type consistency:** `hard_gate_hit`→`(bool,str)`、`decide_exit`→str、`make_worktree`→`(wt,branch)`、`finalize(env,card,decision,ctx)` の ctx キー（repo_path/worktree/branch/base/title/summary/reason）が Task 6 の生成と Task 5 の参照で一致 ✓

**注意（実装時に確認）:** Codex CLI の実引数（`codex exec --sandbox ... --ask-for-approval never`）は環境の Codex バージョンで要確認。差異あれば Task 4 で調整。`gh pr merge` は対象リポに gh 認証＋PR 権限が要る。
