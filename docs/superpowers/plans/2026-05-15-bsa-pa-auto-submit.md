# BSA-PA 提案自動送信 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** BSA-PA パイプラインに「生成後の提案を自動送信するステージ」を追加し、`run.command` のダブルクリックだけで 収集→生成→自動送信→通知→ダッシュボード を人間確認なしで完走できるようにする。

**Architecture:** 新規 Python ドライバ `scripts/auto_submit.py` が DB から対象案件（`fit_score >= 60` ＋ 未送信）を選び、既存の3つの form-fill スクリプトを subprocess として順に起動する。各 form-fill にバッチ用 `--no-keep-open` フラグを足し、失敗時の10分ハングを無効化。終了コードでステータスを振り分け（成功=submitted / ログイン切れ=proposing 据え置き＋媒体スキップ / その他=unable_to_submit）、結果を JSON とサマリ txt に出力。`run.command` に Stage 2.5 を挿入、`gmail.ts` が結果を朝のレポートに同梱、失敗時は `notify.sh` で「要対応」アラート。

**Tech Stack:** Python 3.13（stdlib のみ: sqlite3 / subprocess / json / random / dataclasses）、pytest（`~/.venvs/bsa-pa`）、zsh（run.command）、TypeScript + better-sqlite3（gizmail.ts は既存）。

---

## File Structure

| ファイル | 種別 | 責務 |
|---|---|---|
| `scripts/lib/_lancers_form_fill.py` | 変更 | `--no-keep-open` フラグ追加（バッチ時の10分ハング無効化） |
| `scripts/lib/_crowdworks_form_fill.py` | 変更 | 同上 |
| `scripts/lib/_coconala_form_fill.py` | 変更 | 同上 |
| `scripts/auto_submit.py` | 新規 | バッチ送信ドライバ（対象抽出・subprocess 起動・終了コード分類・結果出力） |
| `scripts/conftest.py` | 新規 | pytest が `scripts/` を import path に追加するための設定 |
| `scripts/tests/__init__.py` | 新規 | テストパッケージマーカー |
| `scripts/tests/test_auto_submit.py` | 新規 | `auto_submit.py` の単体テスト |
| `scripts/run.command` | 変更 | Stage 2.5（自動送信）挿入＋要対応アラート＋kill-switch |
| `src/notifier/gmail.ts` | 変更 | 朝のレポートに自動送信結果セクションを同梱 |
| `CLAUDE.md` | 変更 | 人間確認ルールに BSA-PA 自動送信の例外を明記 |

`auto_submit.py` の公開要素（後続タスクで一貫使用する型・関数）:

- データクラス: `EligibleJob`、`SubmitResult`、`BatchResult`
- 定数: `EXIT_MEANING`（dict）、`SCRIPT_BY_PREFIX`（dict）
- 関数: `fetch_eligible_jobs`、`build_command`、`classify_exit`、`submit_one`、`mark_unable_to_submit`、`run_batch`、`write_result_json`、`write_summary_file`、`main`

---

## Task 1: form-fill 3スクリプトに `--no-keep-open` フラグを追加

**Files:**
- Modify: `scripts/lib/_crowdworks_form_fill.py`
- Modify: `scripts/lib/_lancers_form_fill.py`
- Modify: `scripts/lib/_coconala_form_fill.py`

各スクリプトは失敗時に `keep_browser_open` でブラウザを最大10分開いたまま待つ（`page.wait_for_event("close", timeout=600_000)`）。無人バッチでは1件の失敗が10分のハングになるため、`--no-keep-open` で待ちを無効化できるようにする。`run()` に `keep_open: bool = True` を足し、デフォルトでは現行挙動（ダッシュボード・CLI 用）を維持する。

- [ ] **Step 1: `_crowdworks_form_fill.py` を編集**

`run` の定義を変更（`async def run(job_id: str, auto_submit: bool) -> int:`）:

```python
async def run(job_id: str, auto_submit: bool, keep_open: bool = True) -> int:
```

`finally` ブロック内の `keep_browser_open` 判定を変更（現行 `if keep_browser_open and page is not None:`）:

```python
            if keep_browser_open and keep_open and page is not None:
```

`parse_args` に引数を追加（`--no-auto-submit` の `add_argument` ブロックの直後）:

```python
    p.add_argument(
        "--no-keep-open",
        action="store_true",
        help="失敗時にブラウザを開いたまま待たない（バッチ実行用）",
    )
```

`__main__` の `run(...)` 呼び出しを変更（現行 `auto_submit=not args.no_auto_submit,` の行の直後に追加）:

```python
    sys.exit(
        asyncio.run(
            run(
                args.job_id,
                auto_submit=not args.no_auto_submit,
                keep_open=not args.no_keep_open,
            )
        )
    )
```

- [ ] **Step 2: `_lancers_form_fill.py` を編集**

`run` の定義を変更（現行 `async def run(job_id: str, auto_confirm: bool, auto_submit: bool) -> int:`）:

```python
async def run(job_id: str, auto_confirm: bool, auto_submit: bool, keep_open: bool = True) -> int:
```

`finally` ブロック内の判定を変更（現行 `if keep_browser_open:`）:

```python
            if keep_browser_open and keep_open:
```

`parse_args` に引数を追加（`--no-auto-submit` の `add_argument` ブロックの直後）:

```python
    p.add_argument(
        "--no-keep-open",
        action="store_true",
        help="失敗時にブラウザを開いたまま待たない（バッチ実行用）",
    )
```

`__main__` の `run(...)` 呼び出しに `keep_open` を追加（現行 `auto_submit=not args.no_auto_submit,` の行の直後）:

```python
    sys.exit(
        asyncio.run(
            run(
                args.job_id,
                auto_confirm=not args.no_auto_confirm,
                auto_submit=not args.no_auto_submit,
                keep_open=not args.no_keep_open,
            )
        )
    )
```

- [ ] **Step 3: `_coconala_form_fill.py` を編集**

`run` の定義を変更（現行 `async def run(job_id: str, auto_confirm: bool, auto_submit: bool) -> int:`）:

```python
async def run(job_id: str, auto_confirm: bool, auto_submit: bool, keep_open: bool = True) -> int:
```

`finally` ブロック内の判定を変更（現行 `if keep_browser_open and page is not None:`）:

```python
            if keep_browser_open and keep_open and page is not None:
```

`parse_args` に引数を追加（`--no-auto-submit` の `add_argument` ブロックの直後）:

```python
    p.add_argument(
        "--no-keep-open",
        action="store_true",
        help="失敗時にブラウザを開いたまま待たない（バッチ実行用）",
    )
```

`__main__` の `run(...)` 呼び出しに `keep_open` を追加（現行 `auto_submit=not args.no_auto_submit,` の行の直後）:

```python
    sys.exit(
        asyncio.run(
            run(
                args.job_id,
                auto_confirm=not args.no_auto_confirm,
                auto_submit=not args.no_auto_submit,
                keep_open=not args.no_keep_open,
            )
        )
    )
```

- [ ] **Step 4: 3スクリプトの構文と新フラグを検証**

Run:
```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/outputs/bsa/proposal-automation
for f in _crowdworks_form_fill.py _lancers_form_fill.py _coconala_form_fill.py; do
  ~/.venvs/bsa-pa/bin/python scripts/lib/$f --help | grep -q -- '--no-keep-open' && echo "$f OK" || echo "$f FAIL"
done
```
Expected: 3 行とも `... OK`

- [ ] **Step 5: Commit**

```bash
git add outputs/bsa/proposal-automation/scripts/lib/_crowdworks_form_fill.py outputs/bsa/proposal-automation/scripts/lib/_lancers_form_fill.py outputs/bsa/proposal-automation/scripts/lib/_coconala_form_fill.py
git commit -m "feat(bsa-pa): form-fill に --no-keep-open フラグを追加（バッチ実行用）"
```

---

## Task 2: テスト基盤と `fetch_eligible_jobs`

**Files:**
- Create: `outputs/bsa/proposal-automation/scripts/conftest.py`
- Create: `outputs/bsa/proposal-automation/scripts/tests/__init__.py`
- Create: `outputs/bsa/proposal-automation/scripts/auto_submit.py`
- Test: `outputs/bsa/proposal-automation/scripts/tests/test_auto_submit.py`

`auto_submit.py` の土台（モジュール docstring・import・データクラス）と、DB から自動送信対象を抽出する `fetch_eligible_jobs` を実装する。対象条件: `proposals` 行が存在 ＆ `jobs.status IN ('collected','proposing')` ＆ `fit_score >= 60` ＆ `proposals.submitted_at IS NULL`、並び順 `fit_score DESC`。`status='declined'` のジョブは status フィルタで自動的に除外される（生成側の辞退判定の尊重）。

- [ ] **Step 1: `scripts/conftest.py` を作成**

```python
"""pytest 設定: scripts/ を import path に追加し `import auto_submit` を可能にする。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
```

- [ ] **Step 2: `scripts/tests/__init__.py` を作成（空ファイル）**

```python
```

- [ ] **Step 3: 失敗するテストを書く（`scripts/tests/test_auto_submit.py`）**

```python
"""auto_submit.py の単体テスト。"""
from __future__ import annotations

import json
import sqlite3
import subprocess
from datetime import datetime
from pathlib import Path

import auto_submit

# proposal-automation 直下（scripts/tests/ から2階層上）
REPO_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_SQL = (REPO_ROOT / "src" / "shared" / "schema.sql").read_text(encoding="utf-8")


def _make_db(tmp_path: Path) -> Path:
    """schema.sql を適用した空の SQLite DB を作って返す。"""
    db_path = tmp_path / "data.db"
    conn = sqlite3.connect(db_path)
    conn.executescript(SCHEMA_SQL)
    conn.commit()
    conn.close()
    return db_path


def _insert_job(
    db_path: Path,
    job_id: str,
    prefix: str,
    fit_score: int,
    status: str,
    *,
    with_proposal: bool = True,
    submitted_at: str | None = None,
) -> None:
    conn = sqlite3.connect(db_path)
    conn.execute(
        "INSERT INTO jobs (job_id, platform_prefix, source_url, detail_url, title, "
        "collected_at, fit_score, status) VALUES (?,?,?,?,?,?,?,?)",
        (
            job_id,
            prefix,
            "https://src",
            f"https://detail/{job_id}",
            f"title {job_id}",
            "2026-05-15 00:00:00",
            fit_score,
            status,
        ),
    )
    if with_proposal:
        conn.execute(
            "INSERT INTO proposals (proposal_id, job_id, product_line, price, "
            "delivery_days, body_md, generated_at, generated_by, submitted_at) "
            "VALUES (?,?,?,?,?,?,?,?,?)",
            (
                f"P-{job_id}",
                job_id,
                "L1",
                30000,
                3,
                "body",
                "2026-05-15 00:00:00",
                "claude-code-cli",
                submitted_at,
            ),
        )
    conn.commit()
    conn.close()


def test_fetch_eligible_jobs_filters_and_orders(tmp_path):
    db_path = _make_db(tmp_path)
    # 対象: fit>=60 かつ status collected/proposing かつ proposal あり・未送信
    _insert_job(db_path, "LAN-20260515-001", "LAN", 90, "proposing")
    _insert_job(db_path, "CW-20260515-001", "CW", 65, "collected")
    # 除外: fit_score < 60
    _insert_job(db_path, "LAN-20260515-002", "LAN", 55, "proposing")
    # 除外: status=declined（生成側が辞退判定）
    _insert_job(db_path, "LAN-20260515-003", "LAN", 80, "declined")
    # 除外: status=submitted
    _insert_job(db_path, "CW-20260515-002", "CW", 80, "submitted")
    # 除外: proposal なし
    _insert_job(db_path, "CN-20260515-001", "CN", 80, "collected", with_proposal=False)
    # 除外: 既に submitted_at が入っている
    _insert_job(
        db_path, "CN-20260515-002", "CN", 80, "proposing", submitted_at="2026-05-14 10:00:00"
    )

    jobs = auto_submit.fetch_eligible_jobs(db_path)

    assert [j.job_id for j in jobs] == ["LAN-20260515-001", "CW-20260515-001"]
    assert jobs[0].platform_prefix == "LAN"
    assert jobs[0].fit_score == 90
    assert jobs[0].title == "title LAN-20260515-001"


def test_fetch_eligible_jobs_respects_min_fit_score(tmp_path):
    db_path = _make_db(tmp_path)
    _insert_job(db_path, "LAN-20260515-001", "LAN", 70, "proposing")
    _insert_job(db_path, "LAN-20260515-002", "LAN", 60, "proposing")

    jobs = auto_submit.fetch_eligible_jobs(db_path, min_fit_score=70)

    assert [j.job_id for j in jobs] == ["LAN-20260515-001"]
```

- [ ] **Step 4: テストを実行して失敗を確認**

Run:
```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/outputs/bsa/proposal-automation
~/.venvs/bsa-pa/bin/python -m pytest scripts/tests/test_auto_submit.py -v
```
Expected: FAIL（`ModuleNotFoundError: No module named 'auto_submit'`）

- [ ] **Step 5: `scripts/auto_submit.py` を作成（土台＋`fetch_eligible_jobs`）**

```python
"""BSA-PA 提案 自動送信ドライバ。

DB から自動送信対象（fit_score >= 60 ＆ 未送信）を選び、既存の form-fill
スクリプトを subprocess として順に起動する。run.command の Stage 2.5 から
呼ばれる。終了コードでステータスを振り分け、結果を JSON とサマリ txt に出力。

設計: docs/superpowers/specs/2026-05-15-bsa-pa-auto-submit-design.md
"""
from __future__ import annotations

import json
import os
import random
import subprocess
import sqlite3
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path


@dataclass
class EligibleJob:
    job_id: str
    platform_prefix: str  # "LAN" / "CW" / "CN"
    title: str
    fit_score: int


@dataclass
class SubmitResult:
    job_id: str
    platform: str
    title: str
    outcome: str  # "submitted" / "blocked" / "failed"
    reason: str
    exit_code: int | None


@dataclass
class BatchResult:
    started_at: str
    ended_at: str
    eligible_count: int
    submitted: list[SubmitResult] = field(default_factory=list)
    failed: list[SubmitResult] = field(default_factory=list)
    skipped: list[SubmitResult] = field(default_factory=list)

    @property
    def needs_attention(self) -> bool:
        return bool(self.failed or self.skipped)


def fetch_eligible_jobs(db_path, min_fit_score: int = 60) -> list[EligibleJob]:
    """自動送信対象の案件を fit_score 降順で返す。

    対象条件:
    - proposals 行が存在（生成済み）かつ submitted_at が未設定
    - jobs.status が 'collected' か 'proposing'（declined / submitted /
      unable_to_submit は除外）
    - fit_score >= min_fit_score
    """
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            """
            SELECT j.job_id, j.platform_prefix, j.title, j.fit_score
            FROM jobs j
            JOIN proposals p ON p.job_id = j.job_id
            WHERE j.status IN ('collected', 'proposing')
              AND j.fit_score >= ?
              AND p.submitted_at IS NULL
            ORDER BY j.fit_score DESC
            """,
            (min_fit_score,),
        ).fetchall()
    finally:
        conn.close()
    return [
        EligibleJob(r["job_id"], r["platform_prefix"], r["title"], r["fit_score"])
        for r in rows
    ]
```

- [ ] **Step 6: テストを実行して成功を確認**

Run:
```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/outputs/bsa/proposal-automation
~/.venvs/bsa-pa/bin/python -m pytest scripts/tests/test_auto_submit.py -v
```
Expected: PASS（2 tests）

- [ ] **Step 7: Commit**

```bash
git add outputs/bsa/proposal-automation/scripts/conftest.py outputs/bsa/proposal-automation/scripts/tests/__init__.py outputs/bsa/proposal-automation/scripts/tests/test_auto_submit.py outputs/bsa/proposal-automation/scripts/auto_submit.py
git commit -m "feat(bsa-pa): auto_submit ドライバ土台と fetch_eligible_jobs"
```

---

## Task 3: `build_command` と `classify_exit`

**Files:**
- Modify: `outputs/bsa/proposal-automation/scripts/auto_submit.py`
- Test: `outputs/bsa/proposal-automation/scripts/tests/test_auto_submit.py`

job_id の prefix から起動コマンドを組み立てる `build_command` と、form-fill の終了コードを `(outcome, reason)` に分類する `classify_exit` を実装する。form-fill の終了コード: 0=成功 / 1=cookie・プロファイル無し / 2=ログイン切れ / 3=フォーム無し / 4=確認ボタン無し / 5=送信失敗。1・2 はその媒体のログイン問題なので `"blocked"`（ジョブ据え置き＋媒体スキップ）、3・4・5・タイムアウトは `"failed"`（unable_to_submit 行き）。

- [ ] **Step 1: 失敗するテストを追加（`test_auto_submit.py` の末尾に追記）**

```python
def test_build_command_per_platform():
    base = Path("/tmp/pa")
    python = Path("/tmp/venv/bin/python")
    cmd = auto_submit.build_command("LAN-20260515-001", "LAN", python, base)
    assert cmd == [
        "/tmp/venv/bin/python",
        "/tmp/pa/scripts/lib/_lancers_form_fill.py",
        "--job-id",
        "LAN-20260515-001",
        "--no-keep-open",
    ]
    cw = auto_submit.build_command("CW-20260515-001", "CW", python, base)
    assert cw[1] == "/tmp/pa/scripts/lib/_crowdworks_form_fill.py"
    cn = auto_submit.build_command("CN-20260515-001", "CN", python, base)
    assert cn[1] == "/tmp/pa/scripts/lib/_coconala_form_fill.py"


def test_build_command_rejects_unknown_prefix():
    import pytest

    with pytest.raises(ValueError):
        auto_submit.build_command("XX-1", "XX", Path("/p"), Path("/b"))


def test_classify_exit():
    assert auto_submit.classify_exit(0)[0] == "submitted"
    assert auto_submit.classify_exit(1)[0] == "blocked"
    assert auto_submit.classify_exit(2)[0] == "blocked"
    assert auto_submit.classify_exit(3)[0] == "failed"
    assert auto_submit.classify_exit(4)[0] == "failed"
    assert auto_submit.classify_exit(5)[0] == "failed"
    assert auto_submit.classify_exit(99)[0] == "failed"
    # None = タイムアウト
    out, reason = auto_submit.classify_exit(None)
    assert out == "failed"
    assert "timeout" in reason.lower()
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run:
```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/outputs/bsa/proposal-automation
~/.venvs/bsa-pa/bin/python -m pytest scripts/tests/test_auto_submit.py -v -k "build_command or classify"
```
Expected: FAIL（`AttributeError: module 'auto_submit' has no attribute 'build_command'`）

- [ ] **Step 3: `auto_submit.py` に定数と2関数を追記（`fetch_eligible_jobs` の下）**

```python
# form-fill の終了コードの意味（_lancers / _crowdworks / _coconala_form_fill.py 共通）
EXIT_MEANING = {
    0: "submitted",
    1: "cookie/profile missing",
    2: "login session expired",
    3: "proposal form not found (closed or already applied)",
    4: "confirm button not found",
    5: "submit failed",
}

SCRIPT_BY_PREFIX = {
    "LAN": "_lancers_form_fill.py",
    "CW": "_crowdworks_form_fill.py",
    "CN": "_coconala_form_fill.py",
}


def build_command(job_id: str, prefix: str, python_path, base_dir) -> list[str]:
    """form-fill スクリプトを subprocess 起動するコマンド配列を組み立てる。

    Raises:
        ValueError: 未対応の platform prefix
    """
    script_name = SCRIPT_BY_PREFIX.get(prefix)
    if script_name is None:
        raise ValueError(f"unsupported platform prefix: {prefix}")
    script = Path(base_dir) / "scripts" / "lib" / script_name
    return [str(python_path), str(script), "--job-id", job_id, "--no-keep-open"]


def classify_exit(exit_code: int | None) -> tuple[str, str]:
    """form-fill の終了コードを (outcome, reason) に分類する。

    exit_code=None は subprocess タイムアウトを表す。
    outcome は "submitted" / "blocked" / "failed" のいずれか。
    """
    if exit_code is None:
        return ("failed", "subprocess timeout")
    if exit_code == 0:
        return ("submitted", "submitted")
    if exit_code in (1, 2):
        return ("blocked", EXIT_MEANING.get(exit_code, "login issue"))
    return ("failed", EXIT_MEANING.get(exit_code, f"unknown exit code {exit_code}"))
```

- [ ] **Step 4: テストを実行して成功を確認**

Run:
```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/outputs/bsa/proposal-automation
~/.venvs/bsa-pa/bin/python -m pytest scripts/tests/test_auto_submit.py -v
```
Expected: PASS（全 5 tests）

- [ ] **Step 5: Commit**

```bash
git add outputs/bsa/proposal-automation/scripts/auto_submit.py outputs/bsa/proposal-automation/scripts/tests/test_auto_submit.py
git commit -m "feat(bsa-pa): auto_submit に build_command と classify_exit を追加"
```

---

## Task 4: `submit_one`（subprocess 起動 ＋ 終了コード分類）

**Files:**
- Modify: `outputs/bsa/proposal-automation/scripts/auto_submit.py`
- Test: `outputs/bsa/proposal-automation/scripts/tests/test_auto_submit.py`

1案件について form-fill を subprocess 起動し、結果を `SubmitResult` で返す `submit_one` を実装する。subprocess には 240 秒のタイムアウトを backstop として設定（`--no-keep-open` が効くので通常はもっと早く終わる）。タイムアウト時は `"failed"`。`runner` 引数で `subprocess.run` を差し替え可能にしてテストする。

- [ ] **Step 1: 失敗するテストを追加（`test_auto_submit.py` の末尾に追記）**

```python
class _FakeProc:
    def __init__(self, returncode: int):
        self.returncode = returncode
        self.stdout = ""
        self.stderr = ""


def _runner_returning(code_by_job: dict):
    """job_id ごとに固定の終了コード（または "timeout"）を返す fake runner。"""

    def _runner(cmd, **kwargs):
        job_id = cmd[cmd.index("--job-id") + 1]
        code = code_by_job[job_id]
        if code == "timeout":
            raise subprocess.TimeoutExpired(cmd, kwargs.get("timeout"))
        return _FakeProc(code)

    return _runner


def _job(job_id: str, prefix: str = "LAN", fit: int = 80) -> auto_submit.EligibleJob:
    return auto_submit.EligibleJob(job_id, prefix, f"title {job_id}", fit)


def test_submit_one_success(tmp_path):
    job = _job("LAN-20260515-001")
    runner = _runner_returning({"LAN-20260515-001": 0})
    result = auto_submit.submit_one(
        job, python_path=Path("/p"), base_dir=tmp_path, runner=runner
    )
    assert result.outcome == "submitted"
    assert result.exit_code == 0


def test_submit_one_blocked_on_login(tmp_path):
    job = _job("CW-20260515-001", prefix="CW")
    runner = _runner_returning({"CW-20260515-001": 2})
    result = auto_submit.submit_one(
        job, python_path=Path("/p"), base_dir=tmp_path, runner=runner
    )
    assert result.outcome == "blocked"
    assert result.exit_code == 2


def test_submit_one_failed(tmp_path):
    job = _job("CN-20260515-001", prefix="CN")
    runner = _runner_returning({"CN-20260515-001": 5})
    result = auto_submit.submit_one(
        job, python_path=Path("/p"), base_dir=tmp_path, runner=runner
    )
    assert result.outcome == "failed"
    assert "exit 5" in result.reason


def test_submit_one_timeout(tmp_path):
    job = _job("LAN-20260515-001")
    runner = _runner_returning({"LAN-20260515-001": "timeout"})
    result = auto_submit.submit_one(
        job, python_path=Path("/p"), base_dir=tmp_path, runner=runner
    )
    assert result.outcome == "failed"
    assert "timeout" in result.reason.lower()
    assert result.exit_code is None
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run:
```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/outputs/bsa/proposal-automation
~/.venvs/bsa-pa/bin/python -m pytest scripts/tests/test_auto_submit.py -v -k submit_one
```
Expected: FAIL（`AttributeError: module 'auto_submit' has no attribute 'submit_one'`）

- [ ] **Step 3: `auto_submit.py` に `submit_one` を追記（`classify_exit` の下）**

```python
SUBPROCESS_TIMEOUT_SEC = 240  # form-fill 1件あたりの backstop タイムアウト


def submit_one(
    job: EligibleJob,
    *,
    python_path,
    base_dir,
    timeout_sec: int = SUBPROCESS_TIMEOUT_SEC,
    runner=subprocess.run,
) -> SubmitResult:
    """1案件の form-fill を subprocess 起動し、結果を SubmitResult で返す。"""
    try:
        cmd = build_command(job.job_id, job.platform_prefix, python_path, base_dir)
    except ValueError as e:
        return SubmitResult(
            job.job_id, job.platform_prefix, job.title, "failed", str(e), None
        )

    try:
        proc = runner(
            cmd,
            timeout=timeout_sec,
            capture_output=True,
            text=True,
            cwd=str(base_dir),
        )
    except subprocess.TimeoutExpired:
        outcome, reason = classify_exit(None)
        return SubmitResult(
            job.job_id,
            job.platform_prefix,
            job.title,
            outcome,
            f"{reason} ({timeout_sec}s)",
            None,
        )

    outcome, reason = classify_exit(proc.returncode)
    detail = reason if proc.returncode == 0 else f"{reason} (exit {proc.returncode})"
    return SubmitResult(
        job.job_id, job.platform_prefix, job.title, outcome, detail, proc.returncode
    )
```

- [ ] **Step 4: テストを実行して成功を確認**

Run:
```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/outputs/bsa/proposal-automation
~/.venvs/bsa-pa/bin/python -m pytest scripts/tests/test_auto_submit.py -v
```
Expected: PASS（全 9 tests）

- [ ] **Step 5: Commit**

```bash
git add outputs/bsa/proposal-automation/scripts/auto_submit.py outputs/bsa/proposal-automation/scripts/tests/test_auto_submit.py
git commit -m "feat(bsa-pa): auto_submit に submit_one（subprocess 起動）を追加"
```

---

## Task 5: `mark_unable_to_submit`（失敗ジョブのステータス更新）

**Files:**
- Modify: `outputs/bsa/proposal-automation/scripts/auto_submit.py`
- Test: `outputs/bsa/proposal-automation/scripts/tests/test_auto_submit.py`

送信失敗（outcome="failed"）のジョブを `jobs.status='unable_to_submit'` に更新し、`status_history` に `changed_by='auto'` で記録する `mark_unable_to_submit` を実装する。form-fill スクリプトは成功時しか DB を書かないため、失敗の記録はドライバの責務。

- [ ] **Step 1: 失敗するテストを追加（`test_auto_submit.py` の末尾に追記）**

```python
def test_mark_unable_to_submit(tmp_path):
    db_path = _make_db(tmp_path)
    _insert_job(db_path, "LAN-20260515-001", "LAN", 80, "proposing")

    auto_submit.mark_unable_to_submit(db_path, "LAN-20260515-001", "submit failed (exit 5)")

    conn = sqlite3.connect(db_path)
    try:
        status = conn.execute(
            "SELECT status FROM jobs WHERE job_id = ?", ("LAN-20260515-001",)
        ).fetchone()[0]
        hist = conn.execute(
            "SELECT from_status, to_status, changed_by, note FROM status_history "
            "WHERE job_id = ?",
            ("LAN-20260515-001",),
        ).fetchone()
    finally:
        conn.close()

    assert status == "unable_to_submit"
    assert hist[0] == "proposing"
    assert hist[1] == "unable_to_submit"
    assert hist[2] == "auto"
    assert "exit 5" in hist[3]


def test_mark_unable_to_submit_missing_job_is_noop(tmp_path):
    db_path = _make_db(tmp_path)
    # 存在しない job_id でも例外を投げない
    auto_submit.mark_unable_to_submit(db_path, "LAN-99999999-999", "x")
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run:
```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/outputs/bsa/proposal-automation
~/.venvs/bsa-pa/bin/python -m pytest scripts/tests/test_auto_submit.py -v -k mark_unable
```
Expected: FAIL（`AttributeError: module 'auto_submit' has no attribute 'mark_unable_to_submit'`）

- [ ] **Step 3: `auto_submit.py` に `mark_unable_to_submit` を追記（`submit_one` の下）**

```python
def mark_unable_to_submit(db_path, job_id: str, reason: str) -> None:
    """送信失敗ジョブを status='unable_to_submit' に更新し status_history に記録する。

    job_id が存在しない場合は何もしない（no-op）。
    """
    conn = sqlite3.connect(db_path)
    try:
        row = conn.execute(
            "SELECT status FROM jobs WHERE job_id = ?", (job_id,)
        ).fetchone()
        if row is None:
            return
        from_status = row[0]
        conn.execute(
            "UPDATE jobs SET status = 'unable_to_submit', updated_at = datetime('now') "
            "WHERE job_id = ?",
            (job_id,),
        )
        conn.execute(
            "INSERT INTO status_history (job_id, from_status, to_status, changed_by, note) "
            "VALUES (?, ?, 'unable_to_submit', 'auto', ?)",
            (job_id, from_status, f"auto-submit failed: {reason}"),
        )
        conn.commit()
    finally:
        conn.close()
```

- [ ] **Step 4: テストを実行して成功を確認**

Run:
```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/outputs/bsa/proposal-automation
~/.venvs/bsa-pa/bin/python -m pytest scripts/tests/test_auto_submit.py -v
```
Expected: PASS（全 11 tests）

- [ ] **Step 5: Commit**

```bash
git add outputs/bsa/proposal-automation/scripts/auto_submit.py outputs/bsa/proposal-automation/scripts/tests/test_auto_submit.py
git commit -m "feat(bsa-pa): auto_submit に mark_unable_to_submit を追加"
```

---

## Task 6: `run_batch`（ループ ＋ pacing ＋ 媒体スキップ ＋ 集約）

**Files:**
- Modify: `outputs/bsa/proposal-automation/scripts/auto_submit.py`
- Test: `outputs/bsa/proposal-automation/scripts/tests/test_auto_submit.py`

対象ジョブを順に `submit_one` で処理する `run_batch` を実装する。挙動:
- outcome="submitted" → `submitted` リストへ
- outcome="blocked" → `skipped` リストへ。その媒体を blocked 集合に追加し、以降の同媒体ジョブは subprocess を起動せず即 `skipped`（理由「platform blocked earlier in this run」）。ジョブは `proposing` のまま据え置き（DB 更新しない）
- outcome="failed" → `mark_unable_to_submit` を呼び `failed` リストへ
- 送信間に `random.uniform(30, 90)` 秒の pacing（最後の1件の後は不要）。`sleep_fn` 引数で差し替え可能

- [ ] **Step 1: 失敗するテストを追加（`test_auto_submit.py` の末尾に追記）**

```python
def test_run_batch_aggregates_and_marks_failures(tmp_path):
    db_path = _make_db(tmp_path)
    _insert_job(db_path, "LAN-20260515-001", "LAN", 90, "proposing")
    _insert_job(db_path, "CW-20260515-001", "CW", 80, "proposing")
    jobs = [
        _job("LAN-20260515-001", "LAN", 90),
        _job("CW-20260515-001", "CW", 80),
    ]
    runner = _runner_returning(
        {"LAN-20260515-001": 0, "CW-20260515-001": 5}
    )
    sleeps: list[float] = []

    batch = auto_submit.run_batch(
        jobs,
        python_path=Path("/p"),
        base_dir=tmp_path,
        db_path=db_path,
        runner=runner,
        sleep_fn=sleeps.append,
        now_fn=lambda: datetime(2026, 5, 15, 9, 0, 0),
    )

    assert [r.job_id for r in batch.submitted] == ["LAN-20260515-001"]
    assert [r.job_id for r in batch.failed] == ["CW-20260515-001"]
    assert batch.skipped == []
    assert batch.eligible_count == 2
    assert batch.needs_attention is True
    # pacing は件間 1 回だけ（2件なら 1 回）
    assert len(sleeps) == 1
    assert 30 <= sleeps[0] <= 90
    # 失敗ジョブは unable_to_submit に更新済み
    conn = sqlite3.connect(db_path)
    try:
        cw_status = conn.execute(
            "SELECT status FROM jobs WHERE job_id = ?", ("CW-20260515-001",)
        ).fetchone()[0]
    finally:
        conn.close()
    assert cw_status == "unable_to_submit"


def test_run_batch_short_circuits_blocked_platform(tmp_path):
    db_path = _make_db(tmp_path)
    for jid in ("LAN-20260515-001", "LAN-20260515-002", "CW-20260515-001"):
        prefix = jid.split("-")[0]
        _insert_job(db_path, jid, prefix, 80, "proposing")
    jobs = [
        _job("LAN-20260515-001", "LAN", 92),
        _job("LAN-20260515-002", "LAN", 88),
        _job("CW-20260515-001", "CW", 80),
    ]
    # 1件目の LAN がログイン切れ（exit 2）。2件目の LAN は subprocess を
    # 起動せずスキップされる想定なので runner には登録しない。
    runner = _runner_returning(
        {"LAN-20260515-001": 2, "CW-20260515-001": 0}
    )

    batch = auto_submit.run_batch(
        jobs,
        python_path=Path("/p"),
        base_dir=tmp_path,
        db_path=db_path,
        runner=runner,
        sleep_fn=lambda _: None,
        now_fn=lambda: datetime(2026, 5, 15, 9, 0, 0),
    )

    assert [r.job_id for r in batch.submitted] == ["CW-20260515-001"]
    assert {r.job_id for r in batch.skipped} == {
        "LAN-20260515-001",
        "LAN-20260515-002",
    }
    assert batch.failed == []
    # ブロックされた LAN ジョブは proposing のまま据え置き
    conn = sqlite3.connect(db_path)
    try:
        statuses = {
            jid: conn.execute(
                "SELECT status FROM jobs WHERE job_id = ?", (jid,)
            ).fetchone()[0]
            for jid in ("LAN-20260515-001", "LAN-20260515-002")
        }
    finally:
        conn.close()
    assert statuses == {
        "LAN-20260515-001": "proposing",
        "LAN-20260515-002": "proposing",
    }
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run:
```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/outputs/bsa/proposal-automation
~/.venvs/bsa-pa/bin/python -m pytest scripts/tests/test_auto_submit.py -v -k run_batch
```
Expected: FAIL（`AttributeError: module 'auto_submit' has no attribute 'run_batch'`）

- [ ] **Step 3: `auto_submit.py` に `run_batch` を追記（`mark_unable_to_submit` の下）**

```python
PACING_RANGE_SEC = (30, 90)  # 送信間のランダム待機（スパム判定回避の人間的ペーシング）


def run_batch(
    jobs: list[EligibleJob],
    *,
    python_path,
    base_dir,
    db_path,
    timeout_sec: int = SUBPROCESS_TIMEOUT_SEC,
    pacing_range: tuple[int, int] = PACING_RANGE_SEC,
    runner=subprocess.run,
    sleep_fn=time.sleep,
    now_fn=datetime.now,
) -> BatchResult:
    """対象ジョブを順に送信し、結果を BatchResult に集約する。

    - "submitted": form-fill が status=submitted を記録済み
    - "blocked"  : ログイン問題。ジョブは proposing 据え置き＋以降の同媒体をスキップ
    - "failed"   : mark_unable_to_submit でステータス更新
    """
    started = now_fn().isoformat(timespec="seconds")
    batch = BatchResult(started_at=started, ended_at=started, eligible_count=len(jobs))
    blocked_platforms: set[str] = set()

    for i, job in enumerate(jobs):
        is_last = i == len(jobs) - 1

        if job.platform_prefix in blocked_platforms:
            batch.skipped.append(
                SubmitResult(
                    job.job_id,
                    job.platform_prefix,
                    job.title,
                    "skipped",
                    "platform blocked earlier in this run",
                    None,
                )
            )
            continue

        result = submit_one(
            job,
            python_path=python_path,
            base_dir=base_dir,
            timeout_sec=timeout_sec,
            runner=runner,
        )

        if result.outcome == "submitted":
            batch.submitted.append(result)
        elif result.outcome == "blocked":
            blocked_platforms.add(job.platform_prefix)
            batch.skipped.append(result)  # ジョブは proposing 据え置き（DB 更新しない）
        else:  # "failed"
            mark_unable_to_submit(db_path, job.job_id, result.reason)
            batch.failed.append(result)

        if not is_last:
            sleep_fn(random.uniform(*pacing_range))

    batch.ended_at = now_fn().isoformat(timespec="seconds")
    return batch
```

- [ ] **Step 4: テストを実行して成功を確認**

Run:
```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/outputs/bsa/proposal-automation
~/.venvs/bsa-pa/bin/python -m pytest scripts/tests/test_auto_submit.py -v
```
Expected: PASS（全 13 tests）

- [ ] **Step 5: Commit**

```bash
git add outputs/bsa/proposal-automation/scripts/auto_submit.py outputs/bsa/proposal-automation/scripts/tests/test_auto_submit.py
git commit -m "feat(bsa-pa): auto_submit に run_batch（ループ・pacing・媒体スキップ）を追加"
```

---

## Task 7: 結果出力（`write_result_json` / `write_summary_file`）と `main`

**Files:**
- Modify: `outputs/bsa/proposal-automation/scripts/auto_submit.py`
- Test: `outputs/bsa/proposal-automation/scripts/tests/test_auto_submit.py`

`BatchResult` を JSON（`gmail.ts` 用）とサマリ txt（`run.command` 用）に書き出す関数と、env 変数からパスを解決して全体を駆動する `main` ＋ CLI エントリを実装する。

- 結果 JSON: `$BSA_PA_APPDATA/auto-submit-result.json`
- サマリ txt: `$BSA_PA_APPDATA/auto-submit-summary.txt`（内容: `<needs_attention 0|1> <submitted件数> <要対応件数>` の1行）
- `main` は失敗があっても終了コード 0 を返す（`run.command` の `set -e` で後続ステージが止まらないように。失敗は通知で報告する）

- [ ] **Step 1: 失敗するテストを追加（`test_auto_submit.py` の末尾に追記）**

```python
def _sample_batch() -> auto_submit.BatchResult:
    batch = auto_submit.BatchResult("2026-05-15T09:00:00", "2026-05-15T09:05:00", 3)
    batch.submitted.append(
        auto_submit.SubmitResult(
            "LAN-20260515-001", "LAN", "title A", "submitted", "submitted", 0
        )
    )
    batch.failed.append(
        auto_submit.SubmitResult(
            "CW-20260515-001", "CW", "title B", "failed", "submit failed (exit 5)", 5
        )
    )
    batch.skipped.append(
        auto_submit.SubmitResult(
            "CN-20260515-001", "CN", "title C", "skipped", "login session expired", 2
        )
    )
    return batch


def test_write_result_json(tmp_path):
    path = tmp_path / "auto-submit-result.json"
    auto_submit.write_result_json(_sample_batch(), path)
    data = json.loads(path.read_text(encoding="utf-8"))
    assert data["eligible_count"] == 3
    assert data["needs_attention"] is True
    assert [e["job_id"] for e in data["submitted"]] == ["LAN-20260515-001"]
    assert data["failed"][0]["reason"] == "submit failed (exit 5)"
    assert data["skipped"][0]["platform"] == "CN"


def test_write_summary_file(tmp_path):
    path = tmp_path / "auto-submit-summary.txt"
    auto_submit.write_summary_file(_sample_batch(), path)
    assert path.read_text(encoding="utf-8").strip() == "1 1 2"


def test_write_summary_file_clean_run(tmp_path):
    path = tmp_path / "auto-submit-summary.txt"
    clean = auto_submit.BatchResult("2026-05-15T09:00:00", "2026-05-15T09:01:00", 0)
    auto_submit.write_summary_file(clean, path)
    assert path.read_text(encoding="utf-8").strip() == "0 0 0"
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run:
```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/outputs/bsa/proposal-automation
~/.venvs/bsa-pa/bin/python -m pytest scripts/tests/test_auto_submit.py -v -k "write_result or write_summary"
```
Expected: FAIL（`AttributeError: module 'auto_submit' has no attribute 'write_result_json'`）

- [ ] **Step 3: `auto_submit.py` に出力関数と `main` を追記（`run_batch` の下）**

```python
def _serialize_results(results: list[SubmitResult]) -> list[dict]:
    return [
        {
            "job_id": r.job_id,
            "platform": r.platform,
            "title": r.title,
            "reason": r.reason,
            "exit_code": r.exit_code,
        }
        for r in results
    ]


def write_result_json(batch: BatchResult, path) -> None:
    """BatchResult を JSON で書き出す（gmail.ts が朝のレポートに同梱する）。"""
    payload = {
        "started_at": batch.started_at,
        "ended_at": batch.ended_at,
        "eligible_count": batch.eligible_count,
        "needs_attention": batch.needs_attention,
        "submitted": _serialize_results(batch.submitted),
        "failed": _serialize_results(batch.failed),
        "skipped": _serialize_results(batch.skipped),
    }
    Path(path).write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def write_summary_file(batch: BatchResult, path) -> None:
    """run.command が読む1行サマリ: `<needs_attention> <submitted> <要対応>`。"""
    needs = 1 if batch.needs_attention else 0
    attention = len(batch.failed) + len(batch.skipped)
    Path(path).write_text(
        f"{needs} {len(batch.submitted)} {attention}\n", encoding="utf-8"
    )


def main() -> int:
    base_dir = Path(
        os.environ.get("BSA_PA_BASE", Path(__file__).resolve().parent.parent)
    )
    appdata = Path(
        os.environ.get(
            "BSA_PA_APPDATA",
            Path.home() / "Library" / "Application Support" / "bsa-pa",
        )
    )
    db_path = Path(os.environ.get("BSA_PA_DB", appdata / "data.db"))
    venv = Path(
        os.environ.get("BSA_PA_VENV", Path.home() / ".venvs" / "bsa-pa")
    )
    python_path = venv / "bin" / "python"
    result_path = appdata / "auto-submit-result.json"
    summary_path = appdata / "auto-submit-summary.txt"

    jobs = fetch_eligible_jobs(db_path)
    print(f"📋 自動送信対象: {len(jobs)} 件 (fit_score >= 60)")
    for j in jobs:
        print(f"  - {j.job_id} [{j.platform_prefix}] fit={j.fit_score} {j.title[:40]}")

    if not jobs:
        now = datetime.now().isoformat(timespec="seconds")
        empty = BatchResult(started_at=now, ended_at=now, eligible_count=0)
        write_result_json(empty, result_path)
        write_summary_file(empty, summary_path)
        print("送信対象なし。終了します。")
        return 0

    batch = run_batch(
        jobs, python_path=python_path, base_dir=base_dir, db_path=db_path
    )
    write_result_json(batch, result_path)
    write_summary_file(batch, summary_path)

    print()
    print(f"✅ 送信成功: {len(batch.submitted)} 件")
    print(f"❌ 送信失敗: {len(batch.failed)} 件 (unable_to_submit に更新)")
    print(f"⏭  スキップ: {len(batch.skipped)} 件 (ログイン切れ等・proposing 据え置き)")
    print(f"結果ファイル: {result_path}")
    # 失敗があっても 0 を返す（run.command の後続ステージを止めない）。
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: テストを実行して成功を確認**

Run:
```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/outputs/bsa/proposal-automation
~/.venvs/bsa-pa/bin/python -m pytest scripts/tests/test_auto_submit.py -v
```
Expected: PASS（全 16 tests）

- [ ] **Step 5: `main` の実 DB スモークテスト（送信対象0件で安全に動くか）**

Run:
```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/outputs/bsa/proposal-automation
BSA_PA_DB=/tmp/empty-smoke.db ~/.venvs/bsa-pa/bin/python -c "
import sqlite3, pathlib
schema = pathlib.Path('src/shared/schema.sql').read_text()
conn = sqlite3.connect('/tmp/empty-smoke.db'); conn.executescript(schema); conn.close()
"
BSA_PA_DB=/tmp/empty-smoke.db BSA_PA_APPDATA=/tmp ~/.venvs/bsa-pa/bin/python scripts/auto_submit.py
cat /tmp/auto-submit-summary.txt
rm -f /tmp/empty-smoke.db /tmp/auto-submit-result.json /tmp/auto-submit-summary.txt
```
Expected: `📋 自動送信対象: 0 件` と `送信対象なし。終了します。` が出力され、`auto-submit-summary.txt` の内容が `0 0 0`

- [ ] **Step 6: Commit**

```bash
git add outputs/bsa/proposal-automation/scripts/auto_submit.py outputs/bsa/proposal-automation/scripts/tests/test_auto_submit.py
git commit -m "feat(bsa-pa): auto_submit に結果出力と main を追加（ドライバ完成）"
```

---

## Task 8: 媒体別スキップの env レバー（LAN date picker フォールバック用）

**Files:**
- Modify: `outputs/bsa/proposal-automation/scripts/auto_submit.py`
- Test: `outputs/bsa/proposal-automation/scripts/tests/test_auto_submit.py`

spec の最優先リスク（LAN の React date picker が無人化で日付欠落を起こしうる）への対策。`BSA_PA_AUTOSUBMIT_SKIP` 環境変数（カンマ区切りの prefix、例: `LAN`）で指定した媒体を自動送信対象から外せるようにする。LAN date picker の検証が通るまで `BSA_PA_AUTOSUBMIT_SKIP=LAN` で LAN だけ手動フォールバックにできる。

- [ ] **Step 1: 失敗するテストを追加（`test_auto_submit.py` の末尾に追記）**

```python
def test_filter_by_platform():
    jobs = [
        _job("LAN-20260515-001", "LAN"),
        _job("CW-20260515-001", "CW"),
        _job("CN-20260515-001", "CN"),
    ]
    out = auto_submit.filter_by_platform(jobs, {"LAN"})
    assert [j.job_id for j in out] == ["CW-20260515-001", "CN-20260515-001"]


def test_filter_by_platform_empty_skip_is_passthrough():
    jobs = [_job("LAN-20260515-001", "LAN"), _job("CW-20260515-001", "CW")]
    assert auto_submit.filter_by_platform(jobs, set()) == jobs
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run:
```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/outputs/bsa/proposal-automation
~/.venvs/bsa-pa/bin/python -m pytest scripts/tests/test_auto_submit.py -v -k filter_by_platform
```
Expected: FAIL（`AttributeError: module 'auto_submit' has no attribute 'filter_by_platform'`）

- [ ] **Step 3: `auto_submit.py` に `filter_by_platform` を追記（`fetch_eligible_jobs` の直後）**

```python
def filter_by_platform(jobs: list[EligibleJob], skip_prefixes: set[str]) -> list[EligibleJob]:
    """skip_prefixes に含まれる platform_prefix のジョブを除外する。"""
    if not skip_prefixes:
        return jobs
    return [j for j in jobs if j.platform_prefix not in skip_prefixes]
```

- [ ] **Step 4: `main` に env レバーを組み込む**

`main` 内の現行:
```python
    jobs = fetch_eligible_jobs(db_path)
    print(f"📋 自動送信対象: {len(jobs)} 件 (fit_score >= 60)")
```

を以下に置き換える:
```python
    skip_prefixes = {
        p.strip().upper()
        for p in os.environ.get("BSA_PA_AUTOSUBMIT_SKIP", "").split(",")
        if p.strip()
    }
    jobs = fetch_eligible_jobs(db_path)
    if skip_prefixes:
        before = len(jobs)
        jobs = filter_by_platform(jobs, skip_prefixes)
        print(
            f"⏭  媒体スキップ {sorted(skip_prefixes)}: {before - len(jobs)} 件を対象外"
        )
    print(f"📋 自動送信対象: {len(jobs)} 件 (fit_score >= 60)")
```

- [ ] **Step 5: テストを実行して成功を確認**

Run:
```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/outputs/bsa/proposal-automation
~/.venvs/bsa-pa/bin/python -m pytest scripts/tests/test_auto_submit.py -v
```
Expected: PASS（全 18 tests）

- [ ] **Step 6: Commit**

```bash
git add outputs/bsa/proposal-automation/scripts/auto_submit.py outputs/bsa/proposal-automation/scripts/tests/test_auto_submit.py
git commit -m "feat(bsa-pa): auto_submit に BSA_PA_AUTOSUBMIT_SKIP 媒体スキップレバーを追加"
```

---

## Task 9: `run.command` に Stage 2.5 を挿入

**Files:**
- Modify: `outputs/bsa/proposal-automation/scripts/run.command`

`Stage 2 generator` と `Stage 3 notify` の間に Stage 2.5（自動送信）を挿入する。`BSA_PA_NO_AUTO_SUBMIT=1` で旧来「ダッシュボードで止まる」挙動に戻せる kill-switch を付ける。スキップ時は古い結果ファイルを削除（`gmail.ts` が前回分を誤って同梱しないため）。自動送信後、要対応フラグが立っていれば `notify.sh` で「要対応」アラートを出す。

- [ ] **Step 1: `run.command` を編集**

`# Stage 3: notify` の行（現行 54 行目付近）の直前に、以下のブロックを挿入する。挿入位置は `npx tsx src/main.ts`（Stage 2 の最終行）と空行の後、`# Stage 3: notify` のコメント行の前:

```sh
# Stage 2.5: auto-submit
echo ""
if [ "${BSA_PA_NO_AUTO_SUBMIT:-0}" = "1" ]; then
  echo "⏭  Stage 2.5: 自動送信スキップ (BSA_PA_NO_AUTO_SUBMIT=1)"
  rm -f "$BSA_PA_APPDATA/auto-submit-result.json" "$BSA_PA_APPDATA/auto-submit-summary.txt"
else
  echo "📨 Stage 2.5: 提案を自動送信中..."
  source "$BSA_PA_VENV/bin/activate"
  python "$BSA_PA_BASE/scripts/auto_submit.py"
  deactivate
  SUMMARY_FILE="$BSA_PA_APPDATA/auto-submit-summary.txt"
  if [ -f "$SUMMARY_FILE" ]; then
    read -r NEEDS_ATTENTION SUBMITTED_N ATTENTION_N < "$SUMMARY_FILE" || true
    if [ "${NEEDS_ATTENTION:-0}" = "1" ] && [ -x "$NOTIFY" ]; then
      bash "$NOTIFY" "❌ BSA-PA 自動送信 要対応" \
        "成功 ${SUBMITTED_N:-0} 件 / 要対応 ${ATTENTION_N:-0} 件。ログとダッシュボードを確認してください"
    fi
  fi
fi
```

また、ファイル冒頭のステージ説明コメント（現行 2-6 行目）を実態に合わせて更新する。現行:

```sh
# scripts/run.command - デスクトップから呼ばれるメインスクリプト。
# Stage 1: collector (Lancers 収集 + fit_score 計算)
# Stage 2: generator (上位10件の提案文生成)
# Stage 3: notifier (macOS 通知 + Gmail 送信)
# Stage 4: dashboard 起動 + ブラウザで開く
```

を以下に置き換える:

```sh
# scripts/run.command - デスクトップから呼ばれるメインスクリプト。
# Stage 1:   collector (Lancers/CW/CN 収集 + fit_score 計算)
# Stage 2:   generator (提案文生成)
# Stage 2.5: auto-submit (fit_score>=60 の提案を自動送信。BSA_PA_NO_AUTO_SUBMIT=1 でスキップ)
# Stage 3:   notifier (macOS 通知 + Gmail 送信)
# Stage 4:   dashboard 起動 + ブラウザで開く
```

- [ ] **Step 2: zsh 構文チェック**

Run:
```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/outputs/bsa/proposal-automation
zsh -n scripts/run.command && echo "SYNTAX OK"
```
Expected: `SYNTAX OK`

- [ ] **Step 3: kill-switch の動作確認（スキップ分岐のみを安全に検証）**

Run:
```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/outputs/bsa/proposal-automation
touch "$HOME/Library/Application Support/bsa-pa/auto-submit-result.json"
touch "$HOME/Library/Application Support/bsa-pa/auto-submit-summary.txt"
BSA_PA_NO_AUTO_SUBMIT=1 zsh -c '
  source scripts/lib/env.sh
  if [ "${BSA_PA_NO_AUTO_SUBMIT:-0}" = "1" ]; then
    echo "⏭  skip branch reached"
    rm -f "$BSA_PA_APPDATA/auto-submit-result.json" "$BSA_PA_APPDATA/auto-submit-summary.txt"
  fi
'
ls "$HOME/Library/Application Support/bsa-pa/" | grep -c "auto-submit" || echo "0 (cleaned, expected)"
```
Expected: `⏭  skip branch reached` が出力され、最後の行が `0 (cleaned, expected)`（古い結果ファイルが削除された）

- [ ] **Step 4: Commit**

```bash
git add outputs/bsa/proposal-automation/scripts/run.command
git commit -m "feat(bsa-pa): run.command に Stage 2.5（自動送信）と kill-switch を追加"
```

---

## Task 10: `gmail.ts` に自動送信結果セクションを同梱

**Files:**
- Modify: `outputs/bsa/proposal-automation/src/notifier/gmail.ts`

朝のレポートメールに「自動送信結果」セクションを追加する。`auto-submit-result.json` が存在すれば読み込み、件名と本文に反映する。検証しやすいよう `BSA_NOTIFIER_DRY_RUN=1` のとき実送信せず本文を標準出力に出すガードも入れる。

- [ ] **Step 1: import を追加（現行 import 群の末尾、`import { join } from 'node:path';` の直後）**

```typescript
import { existsSync, readFileSync } from 'node:fs';
```

- [ ] **Step 2: 定数と型を追加（現行 `const DB_PATH = ...` ブロックの直後）**

```typescript
const AUTO_SUBMIT_RESULT_PATH = join(
  homedir(),
  'Library/Application Support/bsa-pa/auto-submit-result.json'
);

interface AutoSubmitEntry {
  job_id: string;
  platform: string;
  title: string;
  reason: string;
  exit_code: number | null;
}

interface AutoSubmitResult {
  started_at: string;
  ended_at: string;
  eligible_count: number;
  needs_attention: boolean;
  submitted: AutoSubmitEntry[];
  failed: AutoSubmitEntry[];
  skipped: AutoSubmitEntry[];
}
```

- [ ] **Step 3: 読み込み関数とセクション生成関数を追加（現行 `buildBody` 関数の直後）**

```typescript
function readAutoSubmitResult(): AutoSubmitResult | null {
  if (!existsSync(AUTO_SUBMIT_RESULT_PATH)) return null;
  try {
    return JSON.parse(
      readFileSync(AUTO_SUBMIT_RESULT_PATH, 'utf-8')
    ) as AutoSubmitResult;
  } catch {
    return null;
  }
}

function buildAutoSubmitSection(r: AutoSubmitResult): string {
  const lines = [
    '',
    '## 自動送信結果',
    '',
    `対象 ${r.eligible_count} 件 / 送信成功 ${r.submitted.length} 件 / ` +
      `失敗 ${r.failed.length} 件 / スキップ ${r.skipped.length} 件`,
    '',
  ];
  if (r.submitted.length) {
    lines.push('### 送信成功');
    r.submitted.forEach((e) =>
      lines.push(`- [${e.platform}] ${e.job_id} ${e.title}`)
    );
    lines.push('');
  }
  if (r.failed.length) {
    lines.push('### ❌ 送信失敗（unable_to_submit に記録・要レビュー）');
    r.failed.forEach((e) =>
      lines.push(`- [${e.platform}] ${e.job_id} ${e.title} — ${e.reason}`)
    );
    lines.push('');
  }
  if (r.skipped.length) {
    lines.push('### ⏭ スキップ（ログイン切れ等・proposing のまま据え置き）');
    r.skipped.forEach((e) =>
      lines.push(`- [${e.platform}] ${e.job_id} ${e.title} — ${e.reason}`)
    );
    lines.push('');
  }
  return lines.join('\n');
}
```

- [ ] **Step 4: `main` を書き換え（現行 `main` 関数の `try` ブロック内、`const summary = ...` から `await sendViaClaudeMcp(...)` までを置き換え）**

現行:
```typescript
    const summary = buildSummary(db);
    const subject = `[BSA] ${summary.date} 朝の収集レポート (${summary.proposals.length}件提案準備完了)`;
    const body = buildBody(summary);
    const to = process.env.BSA_GMAIL_TO ?? 'off.me.ton@gmail.com';
    await sendViaClaudeMcp(subject, body, to);
    console.log(`✅ Gmail 送信完了 → ${to}`);
```

を以下に置き換える:
```typescript
    const summary = buildSummary(db);
    let subject = `[BSA] ${summary.date} 朝の収集レポート (${summary.proposals.length}件提案準備完了)`;
    let body = buildBody(summary);

    const autoResult = readAutoSubmitResult();
    if (autoResult) {
      body += '\n' + buildAutoSubmitSection(autoResult);
      const attn = autoResult.needs_attention ? ' ⚠️要対応あり' : '';
      subject =
        `[BSA] ${summary.date} 収集・自動送信レポート ` +
        `(送信${autoResult.submitted.length}件${attn})`;
    }

    const to = process.env.BSA_GMAIL_TO ?? 'off.me.ton@gmail.com';
    if (process.env.BSA_NOTIFIER_DRY_RUN === '1') {
      console.log(`--- DRY RUN (送信しません) ---\nTo: ${to}\nSubject: ${subject}\n\n${body}`);
      return 0;
    }
    await sendViaClaudeMcp(subject, body, to);
    console.log(`✅ Gmail 送信完了 → ${to}`);
```

- [ ] **Step 5: TypeScript の型チェック**

Run:
```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/outputs/bsa/proposal-automation/src/notifier
npx tsc --noEmit
```
Expected: エラーなし（終了コード 0）

- [ ] **Step 6: フィクスチャで dry-run 検証**

Run:
```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/outputs/bsa/proposal-automation/src/notifier
cat > "$HOME/Library/Application Support/bsa-pa/auto-submit-result.json" <<'JSON'
{
  "started_at": "2026-05-15T09:00:00",
  "ended_at": "2026-05-15T09:05:00",
  "eligible_count": 2,
  "needs_attention": true,
  "submitted": [{"job_id":"LAN-20260515-001","platform":"LAN","title":"テスト案件A","reason":"submitted","exit_code":0}],
  "failed": [{"job_id":"CW-20260515-001","platform":"CW","title":"テスト案件B","reason":"submit failed (exit 5)","exit_code":5}],
  "skipped": []
}
JSON
BSA_NOTIFIER_DRY_RUN=1 npx tsx gmail.ts
rm -f "$HOME/Library/Application Support/bsa-pa/auto-submit-result.json"
```
Expected: 標準出力に `--- DRY RUN` と件名 `[BSA] ... 収集・自動送信レポート (送信1件 ⚠️要対応あり)`、本文に `## 自動送信結果` と `### ❌ 送信失敗` セクションが含まれる

- [ ] **Step 7: Commit**

```bash
git add outputs/bsa/proposal-automation/src/notifier/gmail.ts
git commit -m "feat(bsa-pa): gmail.ts に自動送信結果セクションを同梱（dry-run ガード付き）"
```

---

## Task 11: CLAUDE.md に人間確認ルールの例外を明記

**Files:**
- Modify: `CLAUDE.md`

BSA-PA の提案自動送信は人間確認ルール（外部送信＝文面提示→承認）の例外であることを「確認不要の操作」リストに明記する。

- [ ] **Step 1: `CLAUDE.md` を編集**

`## 人間確認ルール` セクションの `### 確認不要の操作` リスト内、`- raw/ 配下への素材追加（既存ファイルの上書き・削除はしない）` の行の直後に以下を追加:

```markdown
- **BSA-PA の提案自動送信**（`outputs/bsa/proposal-automation/scripts/auto_submit.py` 経由。ゲート: `fit_score >= 60` ＋ `status` フィルタで decline 済みを自動除外。送信は工藤陸名義・取り消し不可のため、ゲート条件の変更は戦略変更として人間確認対象。kill-switch は環境変数 `BSA_PA_NO_AUTO_SUBMIT=1`）
```

- [ ] **Step 2: 追加内容を確認**

Run:
```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops
grep -n "BSA-PA の提案自動送信" CLAUDE.md
```
Expected: 1 行ヒットする（`### 確認不要の操作` セクション内）

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md に BSA-PA 提案自動送信の人間確認例外を明記"
```

---

## 最終確認（全タスク完了後）

- [ ] **Step 1: 全テストを実行**

Run:
```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/outputs/bsa/proposal-automation
~/.venvs/bsa-pa/bin/python -m pytest scripts/tests/ -v
```
Expected: 18 tests PASS

- [ ] **Step 2: 既存テストへの非回帰確認（collector / generator）**

Run:
```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/outputs/bsa/proposal-automation/src/collector
~/.venvs/bsa-pa/bin/python -m pytest -q
cd ../generator
npm test
```
Expected: 既存テストが全て PASS（form-fill の `--no-keep-open` 追加が既存テストを壊していないこと）

- [ ] **Step 3: LAN date picker ブロッカーの検証（LAN 自動送信を信頼してよいか）**

spec の最優先リスク。LAN の「計画」日付ピッカーは React 製で `page.fill()` が効かないケースがあり、無人化すると日付欠落のまま確認画面に進む恐れがある。`proposing` 状態の LAN 案件が1件以上ある状態で、`--no-auto-submit`（送信せず入力のみ）で form-fill を単体起動し、計画行の納期欄が正しく埋まるか目視確認する:

```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops/outputs/bsa/proposal-automation
# <LAN-JOB-ID> は実際に proposing 状態の LAN 案件 ID に置き換える
~/.venvs/bsa-pa/bin/python scripts/lib/_lancers_form_fill.py --job-id <LAN-JOB-ID> --no-auto-submit
```
- 計画行の納期日が正しく入っていれば LAN 自動送信を有効のままにする
- 納期日が空 / 不正なら、`run.command` を `BSA_PA_AUTOSUBMIT_SKIP=LAN` で運用する（CW/CN のみ自動送信、LAN は従来どおりダッシュボードで手動送信）。その場合は別途 LAN date picker 修正を Issue 化する

- [ ] **Step 4: 初回実運用（人間が立ち会う1回目）**

`BSA_PA_NO_AUTO_SUBMIT` を設定せずに（Step 3 で LAN が NG なら `BSA_PA_AUTOSUBMIT_SKIP=LAN` を付けて）`~/Desktop/📥 BSA 案件収集.command` をダブルクリックし、Stage 2.5 で実際に提案が送信される様子を1回だけ人間が観測する。問題があれば `BSA_PA_NO_AUTO_SUBMIT=1` で即座に旧挙動へ戻せる。
