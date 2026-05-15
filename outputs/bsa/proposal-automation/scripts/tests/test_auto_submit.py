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
    # pacing 回数の検証:
    #   LAN-001 (index 0, is_last=False): subprocess 実行 → blocked → sleep **あり** (1回)
    #   LAN-002 (index 1): blocked_platforms に LAN あり → continue → sleep **なし**
    #   CW-001  (index 2, is_last=True): 実行 → submitted → is_last なので sleep **なし**
    assert len(sleeps) == 1


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
