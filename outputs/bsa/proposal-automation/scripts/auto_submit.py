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
