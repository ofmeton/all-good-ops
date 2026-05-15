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
    outcome: str  # "submitted" / "blocked" / "failed" / "skipped"
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
