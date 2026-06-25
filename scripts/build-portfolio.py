#!/usr/bin/env python3
"""蓄積されたセッションログと要約からポートフォリオインデックスを生成する"""

import re
from pathlib import Path
from datetime import datetime

CHRONICLE_DIR = Path(__file__).parent.parent / "chronicle"
LOGS_DIR = CHRONICLE_DIR / "logs"
SUMMARIES_DIR = CHRONICLE_DIR / "summaries"


def extract_session_meta(log_path: Path) -> dict:
    """ログファイルからメタ情報を抽出"""
    text = log_path.read_text()
    meta = {"path": log_path.name}

    m = re.search(r"# セッションログ (.+)", text)
    meta["date"] = m.group(1) if m else ""

    m = re.search(r"\*\*やりとり数\*\*: (\d+)", text)
    meta["turns"] = int(m.group(1)) if m else 0

    m = re.search(r"\*\*作業ディレクトリ\*\*: `(.+)`", text)
    meta["cwd"] = m.group(1) if m else ""

    # Human発言からトピックを抽出（コード出力やtool_resultを除外）
    topics = re.findall(r"## Human\n\n(.+?)(?:\n\n|$)", text)
    first_topic = ""
    for t in topics:
        t = t.strip()
        if t and not t.startswith("```") and not t.startswith("*["):
            first_topic = t[:60]
            break
    meta["first_topic"] = first_topic

    return meta


def extract_summary_content(summary_path: Path) -> dict:
    """要約ファイルから記入済みの内容を抽出"""
    if not summary_path.exists():
        return {}

    text = summary_path.read_text()
    result = {}

    m = re.search(r"## 何をしたか\n(?:<!--.*?-->\n)*\n?(.+?)(?:\n\n##|\Z)", text, re.DOTALL)
    if m:
        content = m.group(1).strip()
        if content and not content.startswith("<!--") and not content.startswith("## "):
            result["what"] = content

    m = re.search(r"## 学び・気づき\n(?:<!--.*?-->\n)?\n?(.+?)(?:\n\n##|\Z)", text, re.DOTALL)
    if m:
        content = m.group(1).strip()
        if content and content != "-":
            result["learnings"] = content

    return result


def build_portfolio():
    """ポートフォリオMarkdownを生成"""
    logs = sorted(LOGS_DIR.glob("*.md"), reverse=True)

    if not logs:
        print("ログがありません")
        return

    lines = []
    lines.append("# AI開発ポートフォリオ")
    lines.append("")
    lines.append("Claude Codeを使ったエージェントチーム構築・運用の全記録。")
    lines.append("")

    # 統計
    total_turns = 0
    sessions_by_month: dict[str, list] = {}

    for log_path in logs:
        meta = extract_session_meta(log_path)
        total_turns += meta["turns"]

        month = meta["date"][:7] if meta["date"] else "不明"
        sessions_by_month.setdefault(month, []).append(meta)

    lines.append("## 統計")
    lines.append("")
    lines.append(f"- **総セッション数**: {len(logs)}")
    lines.append(f"- **総やりとり数**: {total_turns}")
    lines.append(f"- **記録期間**: {logs[-1].name[:10]} 〜 {logs[0].name[:10]}")
    lines.append("")

    # 月別セッション一覧
    lines.append("## セッション一覧")
    lines.append("")

    for month, sessions in sorted(sessions_by_month.items(), reverse=True):
        lines.append(f"### {month}")
        lines.append("")
        lines.append("| 日時 | トピック | やりとり数 | ログ | 要約 |")
        lines.append("|------|---------|-----------|------|------|")

        for meta in sessions:
            log_link = f"[ログ](logs/{meta['path']})"
            summary_name = meta["path"].replace(".md", "_summary.md")
            summary_path = SUMMARIES_DIR / summary_name

            # 要約から記入済み内容があればそちらを使う
            summary_content = extract_summary_content(summary_path)
            topic = summary_content.get("what", meta["first_topic"])

            summary_link = f"[要約](summaries/{summary_name})" if summary_path.exists() else "-"
            lines.append(f"| {meta['date']} | {topic} | {meta['turns']} | {log_link} | {summary_link} |")

        lines.append("")

    # 学び・知見セクション
    learnings = []
    for log_path in logs:
        summary_name = log_path.name.replace(".md", "_summary.md")
        summary_path = SUMMARIES_DIR / summary_name
        content = extract_summary_content(summary_path)
        if "learnings" in content:
            meta = extract_session_meta(log_path)
            learnings.append(f"**{meta['date']}**: {content['learnings']}")

    if learnings:
        lines.append("## 学び・知見")
        lines.append("")
        for l in learnings:
            lines.append(f"- {l}")
        lines.append("")

    output_path = CHRONICLE_DIR / "portfolio.md"
    output_path.write_text("\n".join(lines))
    print(f"ポートフォリオ生成: {output_path}")


if __name__ == "__main__":
    build_portfolio()
