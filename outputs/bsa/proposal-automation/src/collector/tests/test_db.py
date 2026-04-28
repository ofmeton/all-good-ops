import pytest
import sqlite3
from datetime import date
from pathlib import Path
import json

import db as db_mod  # collector の db.py
from db import (
    generate_job_id,
    upsert_job,
    update_fit_score,
    insert_run,
    update_session,
    get_session,
)


@pytest.fixture
def conn(tmp_path, monkeypatch):
    """In-memory な SQLite に schema を流し込んだ Connection を返す。"""
    schema_path = Path(__file__).parent.parent.parent / "shared" / "schema.sql"
    schema = schema_path.read_text()
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.executescript(schema)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def test_generate_job_id_first(conn):
    today = date.today().strftime("%Y%m%d")
    job_id = generate_job_id(conn, "LAN")
    assert job_id == f"LAN-{today}-001"


def test_generate_job_id_increments(conn):
    today = date.today().strftime("%Y%m%d")
    # 既存 job を仕込む
    conn.execute(
        """INSERT INTO jobs (job_id, platform_prefix, source_url, detail_url, title, collected_at)
           VALUES (?, 'LAN', 'x', 'y1', 't', datetime('now'))""",
        (f"LAN-{today}-001",),
    )
    conn.execute(
        """INSERT INTO jobs (job_id, platform_prefix, source_url, detail_url, title, collected_at)
           VALUES (?, 'LAN', 'x', 'y2', 't', datetime('now'))""",
        (f"LAN-{today}-002",),
    )
    job_id = generate_job_id(conn, "LAN")
    assert job_id == f"LAN-{today}-003"


def test_upsert_job_inserts_new(conn):
    job = {
        "source_url": "https://www.lancers.jp/work/search/web/lp",
        "detail_url": "https://www.lancers.jp/work/detail/12345",
        "title": "test job",
        "description": "desc",
        "budget_min": 30000, "budget_max": 50000,
        "service_category": "lp",
    }
    job_id = upsert_job(conn, job, "LAN")
    assert job_id.startswith("LAN-")
    row = conn.execute("SELECT * FROM jobs WHERE job_id = ?", (job_id,)).fetchone()
    assert row["title"] == "test job"
    assert row["status"] == "collected"
    # status_history にも entry があるはず
    hist = conn.execute("SELECT * FROM status_history WHERE job_id = ?", (job_id,)).fetchall()
    assert len(hist) == 1
    assert hist[0]["to_status"] == "collected"


def test_upsert_job_updates_existing(conn):
    job = {
        "source_url": "x", "detail_url": "https://www.lancers.jp/work/detail/99999",
        "title": "first", "description": "a",
    }
    first_id = upsert_job(conn, job, "LAN")
    # 同じ detail_url で再 upsert
    job["title"] = "updated"
    second_id = upsert_job(conn, job, "LAN")
    assert second_id == first_id  # 既存 ID を返す
    row = conn.execute("SELECT title FROM jobs WHERE job_id = ?", (first_id,)).fetchone()
    assert row["title"] == "updated"


def test_update_fit_score(conn):
    job = {
        "source_url": "x", "detail_url": "https://www.lancers.jp/work/detail/77777",
        "title": "y",
    }
    job_id = upsert_job(conn, job, "LAN")
    breakdown = {"price": 30, "service": 25, "total": 88}
    update_fit_score(conn, job_id, 88, breakdown, "L1")
    row = conn.execute("SELECT fit_score, fit_score_breakdown, estimated_product_line FROM jobs WHERE job_id = ?", (job_id,)).fetchone()
    assert row["fit_score"] == 88
    assert json.loads(row["fit_score_breakdown"])["total"] == 88
    assert row["estimated_product_line"] == "L1"


def test_insert_run_success(conn):
    run_id = insert_run(conn, stage="collect", status="success", collected_count=42)
    row = conn.execute("SELECT * FROM runs WHERE run_id = ?", (run_id,)).fetchone()
    assert row["stage"] == "collect"
    assert row["status"] == "success"
    assert row["collected_count"] == 42


def test_session_upsert(conn):
    update_session(conn, "LAN", "/path/to/lan-cookies.json", valid=True)
    row = get_session(conn, "LAN")
    assert row["cookie_path"] == "/path/to/lan-cookies.json"
    assert row["valid"] == 1
    # 更新できる
    update_session(conn, "LAN", "/path/to/new.json", valid=False)
    row = get_session(conn, "LAN")
    assert row["cookie_path"] == "/path/to/new.json"
    assert row["valid"] == 0
