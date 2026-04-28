"""SQLite operations for collector.

メインの DB 実体は ~/Library/Application Support/bsa-pa/data.db。
get_connection() でデフォルトパスを開く。
テストでは in-memory の sqlite3.Connection を直接渡す形にして、
全関数は Connection 引数を取るように設計する。
"""

import json
import sqlite3
from datetime import date
from pathlib import Path
from typing import Optional


DB_PATH = Path.home() / "Library" / "Application Support" / "bsa-pa" / "data.db"


def get_connection(path: Optional[Path] = None) -> sqlite3.Connection:
    p = path or DB_PATH
    conn = sqlite3.connect(p)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def generate_job_id(conn: sqlite3.Connection, prefix: str) -> str:
    """その日の連番を採番して {PREFIX}-YYYYMMDD-NNN を返す。"""
    today = date.today().strftime("%Y%m%d")
    cur = conn.execute(
        "SELECT COUNT(*) FROM jobs WHERE job_id LIKE ?",
        (f"{prefix}-{today}-%",),
    )
    count = cur.fetchone()[0]
    return f"{prefix}-{today}-{count + 1:03d}"


def upsert_job(conn: sqlite3.Connection, job: dict, prefix: str) -> str:
    """detail_url で UNIQUE 制約。既存なら UPDATE、新規なら INSERT して新 job_id を返す。
    新規 INSERT 時は status_history にも (NULL → 'collected') を記録する。
    """
    existing = conn.execute(
        "SELECT job_id FROM jobs WHERE detail_url = ?",
        (job["detail_url"],),
    ).fetchone()
    if existing:
        conn.execute(
            """UPDATE jobs SET
                 title=?, description=?, budget_text=?, budget_min=?, budget_max=?,
                 deadline=?, proposal_count=?, client_name=?, client_verified=?,
                 client_history_count=?, service_category=?, posted_at=?,
                 updated_at=datetime('now')
               WHERE job_id=?""",
            (
                job.get("title"), job.get("description"), job.get("budget_text"),
                job.get("budget_min"), job.get("budget_max"),
                job.get("deadline"), job.get("proposal_count"),
                job.get("client_name"),
                int(job.get("client_verified")) if job.get("client_verified") is not None else None,
                job.get("client_history_count"), job.get("service_category"),
                job.get("posted_at"),
                existing["job_id"],
            ),
        )
        return existing["job_id"]

    job_id = generate_job_id(conn, prefix)
    conn.execute(
        """INSERT INTO jobs (
            job_id, platform_prefix, source_url, detail_url, title, description,
            budget_text, budget_min, budget_max, deadline, proposal_count,
            client_name, client_verified, client_history_count, service_category,
            posted_at, collected_at, status
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'collected')""",
        (
            job_id, prefix, job["source_url"], job["detail_url"],
            job.get("title"), job.get("description"),
            job.get("budget_text"), job.get("budget_min"), job.get("budget_max"),
            job.get("deadline"), job.get("proposal_count"),
            job.get("client_name"),
            int(job.get("client_verified")) if job.get("client_verified") is not None else None,
            job.get("client_history_count"), job.get("service_category"),
            job.get("posted_at"),
        ),
    )
    conn.execute(
        "INSERT INTO status_history (job_id, from_status, to_status, changed_by) VALUES (?, NULL, 'collected', 'auto')",
        (job_id,),
    )
    return job_id


def update_fit_score(
    conn: sqlite3.Connection, job_id: str, total: int, breakdown: dict, product_line: Optional[str]
) -> None:
    conn.execute(
        """UPDATE jobs SET fit_score=?, fit_score_breakdown=?, estimated_product_line=?,
              updated_at=datetime('now')
           WHERE job_id=?""",
        (total, json.dumps(breakdown, ensure_ascii=False), product_line, job_id),
    )


def insert_run(
    conn: sqlite3.Connection,
    stage: str,
    status: str,
    collected_count: int = 0,
    generated_count: int = 0,
    error_message: Optional[str] = None,
    error_stage: Optional[str] = None,
) -> int:
    cur = conn.execute(
        """INSERT INTO runs (started_at, ended_at, stage, collected_count, generated_count, status, error_message, error_stage)
           VALUES (datetime('now'), datetime('now'), ?, ?, ?, ?, ?, ?)""",
        (stage, collected_count, generated_count, status, error_message, error_stage),
    )
    return cur.lastrowid


def get_session(conn: sqlite3.Connection, prefix: str) -> Optional[sqlite3.Row]:
    return conn.execute(
        "SELECT * FROM sessions WHERE platform_prefix = ?", (prefix,)
    ).fetchone()


def update_session(conn: sqlite3.Connection, prefix: str, cookie_path: str, valid: bool) -> None:
    conn.execute(
        """INSERT INTO sessions (platform_prefix, cookie_path, logged_in_at, last_validated_at, valid)
           VALUES (?, ?, datetime('now'), datetime('now'), ?)
           ON CONFLICT(platform_prefix) DO UPDATE SET
             cookie_path=excluded.cookie_path,
             last_validated_at=datetime('now'),
             valid=excluded.valid""",
        (prefix, cookie_path, 1 if valid else 0),
    )
