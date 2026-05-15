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
    assert result.reason == "submitted"


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


def test_submit_one_unsupported_prefix(tmp_path):
    """build_command が ValueError を投げる未対応 prefix では runner に到達せず failed を返す。"""
    job = _job("XX-20260515-001", prefix="XX")
    runner = _runner_returning({})  # 呼ばれない
    result = auto_submit.submit_one(
        job, python_path=Path("/p"), base_dir=tmp_path, runner=runner
    )
    assert result.outcome == "failed"
    assert result.exit_code is None
    assert "XX" in result.reason  # "unsupported platform prefix: XX"
