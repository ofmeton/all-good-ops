#!/usr/bin/env python3
"""SQLite deals → wiki/business/bsa/deals/ MD 同期 CLI

won 状態の案件を wiki に MD として書き出す。
- ファイル名: <job_id>-<title-slug>.md
- frontmatter は wiki/SCHEMA.md 規約に準拠 (identity: 工藤陸)
- 既存ファイルがあれば updated 日付と本文だけ書き換え（手動加筆を尊重して frontmatter の他は維持）
- deals/index.md は機械生成（毎回上書き）

注意:
- このスクリプトは ingest プロトコルではない（人間対話を経ない受注記録の機械同期）
- frontmatter は最低限。深い学びや顧客特性は ingest で別途追記する想定
- client_contact / notes は wiki に書き出さない（機微情報のため SQLite に閉じる）

使い方:
    python3 sync_deals_to_wiki.py            # 同期実行
    python3 sync_deals_to_wiki.py --dry-run  # 出力先と内容を表示するだけ
"""
from __future__ import annotations

import argparse
import re
import sqlite3
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]  # outputs/bsa/proposal-automation/scripts/ → repo
DB_PATH = Path.home() / "Library" / "Application Support" / "bsa-pa" / "data.db"
WIKI_DEALS_DIR = REPO_ROOT / "wiki" / "business" / "bsa" / "deals"
JST = timezone(timedelta(hours=9))


def slugify(title: str, max_len: int = 40) -> str:
    """日本語タイトルを safe な kebab-case slug に。

    日本語は残しつつ、空白・記号を - に置換。
    """
    s = title.strip()
    # 区切りになる記号類
    s = re.sub(r"[\s/\\|・･,，。、!！?？「」【】\[\]『』（）()<>《》:：;；'\"`~@#$%^&*+=]+", "-", s)
    # 連続するハイフンを1つに
    s = re.sub(r"-+", "-", s).strip("-")
    if len(s) > max_len:
        s = s[:max_len].rstrip("-")
    return s or "untitled"


def jst_today() -> str:
    return datetime.now(JST).strftime("%Y-%m-%d")


def utc_to_jst_date(utc_str: str) -> str:
    """SQLite の '2026-05-10 09:43:22' (UTC) を JST 'YYYY-MM-DD' に。"""
    try:
        dt = datetime.strptime(utc_str, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
        return dt.astimezone(JST).strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        return utc_str.split(" ", 1)[0] if utc_str else ""


def fetch_won_deals(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        """
        SELECT j.job_id, j.platform_prefix, j.title, j.detail_url, j.budget_text,
               j.client_name, j.estimated_product_line, j.fit_score,
               d.contracted_at, d.contract_amount, d.delivery_due,
               d.product_line_actual, d.delivered_at, d.paid_at
        FROM deals d
        JOIN jobs j USING(job_id)
        WHERE j.status = 'won'
        ORDER BY d.contracted_at ASC
        """
    ).fetchall()
    cols = [
        "job_id", "platform_prefix", "title", "detail_url", "budget_text",
        "client_name", "estimated_product_line", "fit_score",
        "contracted_at", "contract_amount", "delivery_due",
        "product_line_actual", "delivered_at", "paid_at",
    ]
    return [dict(zip(cols, r)) for r in rows]


FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n", re.DOTALL)


def parse_existing_created(path: Path) -> str | None:
    """既存ファイルから created 日付を取り出す（手動加筆を尊重）。"""
    if not path.exists():
        return None
    text = path.read_text(encoding="utf-8")
    m = FRONTMATTER_RE.match(text)
    if not m:
        return None
    fm = m.group(1)
    cm = re.search(r"^created:\s*(\S+)", fm, re.MULTILINE)
    return cm.group(1) if cm else None


def render_deal_md(deal: dict, created: str | None) -> str:
    today = jst_today()
    created_date = created or utc_to_jst_date(deal["contracted_at"]) or today
    pf = "Lancers" if deal["platform_prefix"] == "LAN" else "CrowdWorks"
    line = deal["product_line_actual"] or deal["estimated_product_line"] or "—"
    amount = f"{deal['contract_amount']:,} 円（税込）"
    contracted_jst = utc_to_jst_date(deal["contracted_at"])

    fm = (
        "---\n"
        "type: source\n"
        f"created: {created_date}\n"
        f"updated: {today}\n"
        "sources: []\n"
        f"related: [[overview]], [[pricing-catalog]]\n"
        "tags: [bsa, deal, won]\n"
        "status: active\n"
        "identity: 工藤陸\n"
        "---\n"
    )

    # 本文（最低限。深い学びは ingest で追記）
    body = [
        f"# {deal['title']}",
        "",
        f"- **媒体**: {pf}",
        f"- **job_id**: `{deal['job_id']}`",
        f"- **発注者**: {deal['client_name'] or '—'}",
        f"- **募集予算**: {deal['budget_text'] or '—'}",
        f"- **契約金額**: {amount}",
        f"- **採用ライン**: {line}",
        f"- **受注日**: {contracted_jst}",
    ]
    if deal.get("delivery_due"):
        body.append(f"- **納期**: {deal['delivery_due']}")
    if deal.get("delivered_at"):
        body.append(f"- **納品日**: {utc_to_jst_date(deal['delivered_at'])}")
    if deal.get("paid_at"):
        body.append(f"- **入金日**: {utc_to_jst_date(deal['paid_at'])}")
    if deal.get("fit_score") is not None:
        body.append(f"- **fit_score**: {deal['fit_score']}")
    body += [
        "",
        f"- 募集 URL: <{deal['detail_url']}>",
        "",
        "## メモ",
        "",
        "（学びや顧客対応の特記事項はここに追記）",
        "",
    ]
    return fm + "\n".join(body)


def render_index_md(deals: list[dict]) -> str:
    today = jst_today()
    fm = (
        "---\n"
        "type: topic\n"
        f"created: 2026-04-22\n"
        f"updated: {today}\n"
        "sources: []\n"
        "related: [[overview]]\n"
        "tags: [bsa, deals, index]\n"
        "status: active\n"
        "identity: 工藤陸\n"
        "---\n\n"
        "# BSA 受注台帳 INDEX\n\n"
        "`sync_deals_to_wiki.py` により自動生成（手動編集禁止 — 個別ページに加筆して）\n\n"
    )
    if not deals:
        return fm + "（受注案件なし）\n"

    total = sum(d["contract_amount"] for d in deals)
    fm += f"- 累計受注: **{len(deals)} 件 / {total:,} 円**\n\n"
    fm += "| 受注日 | job_id | 媒体 | ライン | 金額 | タイトル |\n"
    fm += "|---|---|---|---|---:|---|\n"
    for d in deals:
        slug = slugify(d["title"])
        link = f"[{d['job_id']}]({d['job_id']}-{slug}.md)"
        pf = "LAN" if d["platform_prefix"] == "LAN" else "CW"
        line = d["product_line_actual"] or d["estimated_product_line"] or "—"
        amount = f"{d['contract_amount']:,}"
        date_str = utc_to_jst_date(d["contracted_at"])
        title_clipped = d["title"][:40] + ("…" if len(d["title"]) > 40 else "")
        fm += f"| {date_str} | {link} | {pf} | {line} | {amount} 円 | {title_clipped} |\n"
    return fm


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="SQLite deals → wiki 同期")
    parser.add_argument("--dry-run", action="store_true", help="ファイル書き込みせず内容表示")
    args = parser.parse_args(argv)

    if not DB_PATH.exists():
        print(f"DB なし: {DB_PATH}", file=sys.stderr)
        return 1

    conn = sqlite3.connect(str(DB_PATH))
    deals = fetch_won_deals(conn)

    if not deals:
        print("won 案件はありません。スキップします。")
        # それでも index.md は空表示で更新（手動で消した状態を防ぐ）
        index_path = WIKI_DEALS_DIR / "index.md"
        if not args.dry_run:
            WIKI_DEALS_DIR.mkdir(parents=True, exist_ok=True)
            index_path.write_text(render_index_md(deals), encoding="utf-8")
            print(f"  → {index_path.relative_to(REPO_ROOT)} を更新（empty）")
        return 0

    WIKI_DEALS_DIR.mkdir(parents=True, exist_ok=True)
    written = 0
    for deal in deals:
        slug = slugify(deal["title"])
        path = WIKI_DEALS_DIR / f"{deal['job_id']}-{slug}.md"
        existing_created = parse_existing_created(path)
        content = render_deal_md(deal, existing_created)
        if args.dry_run:
            print(f"--- [dry-run] {path.relative_to(REPO_ROOT)} ---")
            print(content[:400] + ("\n…(省略)" if len(content) > 400 else ""))
            print()
        else:
            path.write_text(content, encoding="utf-8")
            print(f"  ✓ {path.relative_to(REPO_ROOT)}")
            written += 1

    index_path = WIKI_DEALS_DIR / "index.md"
    index_content = render_index_md(deals)
    if args.dry_run:
        print(f"--- [dry-run] {index_path.relative_to(REPO_ROOT)} ---")
        print(index_content)
    else:
        index_path.write_text(index_content, encoding="utf-8")
        print(f"  ✓ {index_path.relative_to(REPO_ROOT)} (index)")
        written += 1

    print(f"\n完了: {written} ファイル更新（won 案件 {len(deals)} 件）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
