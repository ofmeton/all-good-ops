#!/usr/bin/env python3
"""BSA KPI レポート CLI

BSA 期間（2026-04-22 〜 2026-08-22, 16週）の Week 別 KPI を SQLite から集計して stdout に表示。

集計軸:
- Week 別: 投下 / 返信 / 受注 / 返信率 / 受注率
- Platform 別累計（BSA 期間内）
- ファネル全体: collected → proposing → submitted → replied → won

返信は status_history で to_status='replied' を「返信あり」と数える。
受注は jobs.status='won' のスナップショットで数える。
Week 帰属は status_history.changed_at（投下/返信/受注の発生日）基準。

使い方:
    python3 kpi_report.py            # default: 全 Week + 累計
    python3 kpi_report.py --week 3   # 特定 Week のみ詳細
"""
from __future__ import annotations

import argparse
import sqlite3
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

DB_PATH = (
    Path.home() / "Library" / "Application Support" / "bsa-pa" / "data.db"
)
BSA_START = date(2026, 4, 22)        # Week 1 Day 1
BSA_TOTAL_WEEKS = 16
JST = timezone(timedelta(hours=9))


def week_range(week_no: int) -> tuple[date, date]:
    """Week N の (start, end) を返す。end は inclusive (Day 7)。"""
    start = BSA_START + timedelta(days=(week_no - 1) * 7)
    end = start + timedelta(days=6)
    return start, end


def current_week() -> int:
    today = datetime.now(JST).date()
    delta = (today - BSA_START).days
    if delta < 0:
        return 0
    return delta // 7 + 1


def fmt_pct(num: int, den: int) -> str:
    if den == 0:
        return "  -  "
    return f"{num * 100 / den:5.1f}%"


def count_in_window(
    conn: sqlite3.Connection,
    to_status: str,
    start: date,
    end: date,
    platform: str | None = None,
) -> int:
    """status_history で to_status への遷移件数（JST 期間内）。

    changed_at は UTC 保存。JST 期間 [start, end+1) に対応する UTC 範囲で WHERE する。
    平日境界の取りこぼし回避のため datetime() で範囲指定。
    """
    # JST [start 00:00, end+1 00:00) → UTC [start-9h, end+1-9h)
    utc_from = datetime(start.year, start.month, start.day, 0, 0, tzinfo=JST).astimezone(timezone.utc)
    utc_to = datetime(end.year, end.month, end.day, 0, 0, tzinfo=JST) + timedelta(days=1)
    utc_to = utc_to.astimezone(timezone.utc)
    sql = (
        "SELECT COUNT(*) FROM status_history sh "
        "JOIN jobs j USING(job_id) "
        "WHERE sh.to_status = ? AND sh.changed_at >= ? AND sh.changed_at < ?"
    )
    params: list = [to_status, utc_from.strftime("%Y-%m-%d %H:%M:%S"), utc_to.strftime("%Y-%m-%d %H:%M:%S")]
    if platform:
        sql += " AND j.platform_prefix = ?"
        params.append(platform)
    return conn.execute(sql, params).fetchone()[0]


def funnel_snapshot(conn: sqlite3.Connection) -> dict[str, int]:
    """jobs.status の現在値で件数を返す（スナップショット）。"""
    rows = conn.execute(
        "SELECT status, COUNT(*) FROM jobs GROUP BY status"
    ).fetchall()
    return {s: c for s, c in rows}


def platform_totals(conn: sqlite3.Connection) -> list[tuple[str, int, int, int, int]]:
    """Platform 別: (prefix, submitted, replied, won, lost) を BSA 期間内で集計。

    BSA 期間内＝status_history.changed_at が BSA_START 以降。
    """
    utc_from = datetime(BSA_START.year, BSA_START.month, BSA_START.day, 0, 0, tzinfo=JST).astimezone(timezone.utc)
    utc_str = utc_from.strftime("%Y-%m-%d %H:%M:%S")
    out: list[tuple[str, int, int, int, int]] = []
    for prefix in ("LAN", "CW"):
        result: dict[str, int] = {"submitted": 0, "replied": 0, "won": 0, "lost": 0}
        for status in result:
            n = conn.execute(
                "SELECT COUNT(*) FROM status_history sh JOIN jobs j USING(job_id) "
                "WHERE sh.to_status = ? AND sh.changed_at >= ? AND j.platform_prefix = ?",
                (status, utc_str, prefix),
            ).fetchone()[0]
            result[status] = n
        out.append((prefix, result["submitted"], result["replied"], result["won"], result["lost"]))
    return out


def kpi_target_for_week(week_no: int) -> dict[str, int]:
    """Week 別の目安目標。実際の KPI は wiki に確定したらこちらを差し替える。

    現状は overview.md にも明示的な数値表が無いため、暫定目標を内部固定で表示。
    """
    # 暫定: Week1=20, Week2=30, Week3-=30 提案 / 全Week 1件受注
    submitted = 20 if week_no == 1 else 30
    return {"submitted": submitted, "won": 1}


def render_weekly_table(conn: sqlite3.Connection, weeks: list[int]) -> None:
    today = datetime.now(JST).date()
    cw = current_week()
    print("Week | 期間              | 投下/目安 | 返信 | 受注/目安 | 返信率 | 受注率")
    print("-----|-------------------|-----------|------|-----------|--------|--------")
    for w in weeks:
        start, end = week_range(w)
        submitted = count_in_window(conn, "submitted", start, end)
        replied = count_in_window(conn, "replied", start, end)
        won = count_in_window(conn, "won", start, end)
        # 返信率 = replied / submitted (同 Week)、受注率 = won / submitted (同 Week)
        reply_rate = fmt_pct(replied, submitted)
        win_rate = fmt_pct(won, submitted)
        target = kpi_target_for_week(w)
        marker = " ← 今週" if w == cw else ""
        # 期間表示は m/d - m/d
        period = f"{start.strftime('%m/%d')}-{end.strftime('%m/%d')}"
        sub_str = f"{submitted:3d}/{target['submitted']:<3d}"
        won_str = f"{won:3d}/{target['won']:<3d}"
        print(
            f"W{w:02d}  | {period}        | {sub_str}    | {replied:4d} | {won_str}    | {reply_rate} | {win_rate}{marker}"
        )
    print()


def render_platform_table(conn: sqlite3.Connection) -> None:
    print("Platform 累計（BSA 期間内）")
    print("---- | 投下 | 返信 | 受注 | 失注")
    print("---- | ---- | ---- | ---- | ----")
    for prefix, sub, rep, won, lost in platform_totals(conn):
        print(f"{prefix:4s} | {sub:4d} | {rep:4d} | {won:4d} | {lost:4d}")
    print()


def render_funnel(conn: sqlite3.Connection) -> None:
    snap = funnel_snapshot(conn)
    print("ファネル（現在のスナップショット）")
    print("collected → proposing → submitted → replied → won")
    print(
        f"  {snap.get('collected', 0):4d}    "
        f"  {snap.get('proposing', 0):4d}     "
        f"  {snap.get('submitted', 0):4d}     "
        f"  {snap.get('replied', 0):4d}    "
        f"  {snap.get('won', 0):4d}"
    )
    other = {k: v for k, v in snap.items() if k not in {"collected", "proposing", "submitted", "replied", "won"}}
    if other:
        rest = ", ".join(f"{k}={v}" for k, v in sorted(other.items()))
        print(f"その他: {rest}")
    print()


def render_week_detail(conn: sqlite3.Connection, week_no: int) -> None:
    start, end = week_range(week_no)
    print(f"# Week {week_no} 詳細  ({start} 〜 {end})")
    print()
    # その週に投下した案件一覧
    utc_from = datetime(start.year, start.month, start.day, 0, 0, tzinfo=JST).astimezone(timezone.utc)
    utc_to = (datetime(end.year, end.month, end.day, 0, 0, tzinfo=JST) + timedelta(days=1)).astimezone(timezone.utc)
    rows = conn.execute(
        """
        SELECT j.job_id, j.platform_prefix, substr(j.title, 1, 50) AS title,
               j.status, sh.changed_at
        FROM status_history sh
        JOIN jobs j USING(job_id)
        WHERE sh.to_status = 'submitted'
          AND sh.changed_at >= ? AND sh.changed_at < ?
        ORDER BY sh.changed_at ASC
        """,
        (utc_from.strftime("%Y-%m-%d %H:%M:%S"), utc_to.strftime("%Y-%m-%d %H:%M:%S")),
    ).fetchall()
    if not rows:
        print("（この週に投下された案件はなし）")
        return
    print(f"投下件数: {len(rows)}")
    print()
    print("job_id            | pf  | 現状      | title")
    print("------------------|-----|-----------|------------------------------")
    for jid, pf, title, status, _ in rows:
        print(f"{jid:18s}| {pf:4s}| {status:10s}| {title}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="BSA KPI レポート CLI")
    parser.add_argument(
        "--week",
        type=int,
        default=None,
        help="特定 Week の詳細を表示（1〜16）",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="全 16 Week を表示（default は 1〜現在Week）",
    )
    args = parser.parse_args(argv)

    if not DB_PATH.exists():
        print(f"DB が見つかりません: {DB_PATH}", file=sys.stderr)
        return 1

    conn = sqlite3.connect(str(DB_PATH))

    today = datetime.now(JST).date()
    cw = current_week()
    day_n = (today - BSA_START).days + 1

    print(f"# BSA KPI Report")
    print(f"Generated: {datetime.now(JST).strftime('%Y-%m-%d %H:%M:%S')} JST")
    print(f"BSA: Day {day_n}/{BSA_TOTAL_WEEKS * 7} ({day_n * 100 // (BSA_TOTAL_WEEKS * 7)}%) / Week {cw}/{BSA_TOTAL_WEEKS}")
    print()

    if args.week is not None:
        if not (1 <= args.week <= BSA_TOTAL_WEEKS):
            print(f"--week は 1〜{BSA_TOTAL_WEEKS} の範囲で指定", file=sys.stderr)
            return 1
        render_week_detail(conn, args.week)
        return 0

    weeks = list(range(1, BSA_TOTAL_WEEKS + 1)) if args.all else list(range(1, max(cw, 1) + 1))
    render_weekly_table(conn, weeks)
    render_platform_table(conn)
    render_funnel(conn)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
