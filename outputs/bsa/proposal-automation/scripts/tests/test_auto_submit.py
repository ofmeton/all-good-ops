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
