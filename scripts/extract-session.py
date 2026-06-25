#!/usr/bin/env python3
"""Claude Codeのjsonlセッションログを読みやすいMarkdownに変換する"""

import json
import sys
import os
import re
from datetime import datetime
from pathlib import Path

CLAUDE_PROJECTS_DIR = Path.home() / ".claude" / "projects"
CHRONICLE_DIR = Path(__file__).parent.parent / "chronicle"
LOGS_DIR = CHRONICLE_DIR / "logs"
SUMMARIES_DIR = CHRONICLE_DIR / "summaries"


def strip_xml_tags(text: str) -> str:
    """システムタグやメタ情報を除去"""
    text = re.sub(r"<local-command-caveat>.*?</local-command-caveat>", "", text, flags=re.DOTALL)
    text = re.sub(r"<command-name>.*?</command-name>", "", text, flags=re.DOTALL)
    text = re.sub(r"<command-message>.*?</command-message>", "", text, flags=re.DOTALL)
    text = re.sub(r"<command-args>.*?</command-args>", "", text, flags=re.DOTALL)
    text = re.sub(r"<local-command-stdout>.*?</local-command-stdout>", "", text, flags=re.DOTALL)
    text = re.sub(r"<system-reminder>.*?</system-reminder>", "", text, flags=re.DOTALL)
    return text.strip()


def extract_text_from_content(content) -> str:
    """contentフィールドからテキストを抽出"""
    if isinstance(content, str):
        return strip_xml_tags(content)
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict):
                if item.get("type") == "text":
                    parts.append(item["text"])
                elif item.get("type") == "tool_use":
                    name = item.get("name", "")
                    inp = item.get("input", {})
                    if name == "Bash":
                        parts.append(f"```bash\n$ {inp.get('command', '')}\n```")
                    elif name in ("Read", "Write", "Edit"):
                        parts.append(f"*[{name}: {inp.get('file_path', '')}]*")
                    elif name == "Grep":
                        parts.append(f"*[検索: {inp.get('pattern', '')}]*")
                elif item.get("type") == "tool_result":
                    text = item.get("content", "")
                    if isinstance(text, str) and len(text) > 200:
                        text = text[:200] + "..."
                    if text:
                        parts.append(f"```\n{text}\n```")
        return "\n".join(parts)
    return ""


def parse_session(jsonl_path: Path) -> dict:
    """jsonlファイルをパースしてセッション情報を返す"""
    messages = []
    session_id = None
    start_time = None
    end_time = None
    cwd = None

    with open(jsonl_path) as f:
        for line in f:
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue

            ts = obj.get("timestamp")
            if ts:
                if start_time is None:
                    start_time = ts
                end_time = ts

            if not session_id:
                session_id = obj.get("sessionId")
            if not cwd:
                cwd = obj.get("cwd")

            msg_type = obj.get("type")

            if msg_type == "user":
                msg = obj.get("message", {})
                if msg.get("role") == "user" and not obj.get("isMeta"):
                    text = extract_text_from_content(msg.get("content", ""))
                    if text:
                        messages.append({"role": "user", "text": text, "ts": ts})

            elif msg_type == "assistant":
                msg = obj.get("message", {})
                if msg.get("role") == "assistant":
                    text = extract_text_from_content(msg.get("content", ""))
                    if text:
                        # 同じアシスタントターンをマージ
                        if messages and messages[-1]["role"] == "assistant":
                            messages[-1]["text"] += "\n" + text
                        else:
                            messages.append({"role": "assistant", "text": text, "ts": ts})

    return {
        "session_id": session_id,
        "start_time": start_time,
        "end_time": end_time,
        "cwd": cwd,
        "messages": messages,
    }


def format_timestamp(ts_str: str) -> str:
    """ISO timestampを読みやすく変換"""
    try:
        dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d %H:%M")
    except (ValueError, AttributeError):
        return ts_str or ""


def session_to_markdown(session: dict) -> str:
    """セッション情報をMarkdownに変換"""
    lines = []
    date_str = format_timestamp(session["start_time"])
    lines.append(f"# セッションログ {date_str}")
    lines.append("")
    lines.append(f"- **セッションID**: `{session['session_id']}`")
    lines.append(f"- **開始**: {format_timestamp(session['start_time'])}")
    lines.append(f"- **終了**: {format_timestamp(session['end_time'])}")
    lines.append(f"- **作業ディレクトリ**: `{session['cwd']}`")
    lines.append(f"- **やりとり数**: {len(session['messages'])}")
    lines.append("")
    lines.append("---")
    lines.append("")

    for msg in session["messages"]:
        if msg["role"] == "user":
            lines.append("## Human")
            lines.append("")
            lines.append(msg["text"])
        else:
            lines.append("## Assistant")
            lines.append("")
            lines.append(msg["text"])
        lines.append("")

    return "\n".join(lines)


def generate_summary_template(session: dict) -> str:
    """発信用の要約テンプレートを生成"""
    date_str = format_timestamp(session["start_time"])
    user_messages = [m for m in session["messages"] if m["role"] == "user"]
    topics = []
    for m in user_messages[:10]:
        text = m["text"].strip()
        # tool_resultやコード出力をスキップ
        if text.startswith("```") or text.startswith("*[") or not text:
            continue
        text = text[:80].replace("\n", " ")
        topics.append(f"- {text}")

    return f"""# セッション要約 {date_str}

## 何をしたか
<!-- 1-2行で概要を書く -->


## トピック
{chr(10).join(topics[:5])}

## 学び・気づき
<!-- エージェント育成やAI活用で得た知見 -->
-

## 発信ネタ候補
<!-- SNS/ブログに使えそうなポイント -->
-

## 次にやること
-
"""


def find_project_dirs() -> list[Path]:
    """Claude Codeのプロジェクトディレクトリを探す"""
    if not CLAUDE_PROJECTS_DIR.exists():
        return []
    return [d for d in CLAUDE_PROJECTS_DIR.iterdir() if d.is_dir()]


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Claude Codeセッションログ変換")
    parser.add_argument("jsonl", nargs="?", help="変換するjsonlファイルパス")
    parser.add_argument("--all", action="store_true", help="全セッションを変換")
    parser.add_argument("--project", default="-Users-rikukudo-Projects-private-agents",
                        help="プロジェクトディレクトリ名")
    parser.add_argument("--summary", action="store_true", help="要約テンプレートも生成")
    args = parser.parse_args()

    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    SUMMARIES_DIR.mkdir(parents=True, exist_ok=True)

    if args.jsonl:
        jsonl_files = [Path(args.jsonl)]
    elif args.all:
        project_dir = CLAUDE_PROJECTS_DIR / args.project
        jsonl_files = sorted(project_dir.glob("*.jsonl"))
    else:
        # 最新のjsonlを変換
        project_dir = CLAUDE_PROJECTS_DIR / args.project
        jsonl_files = sorted(project_dir.glob("*.jsonl"), key=lambda p: p.stat().st_mtime)
        jsonl_files = jsonl_files[-1:] if jsonl_files else []

    if not jsonl_files:
        print("変換対象のjsonlファイルが見つかりません")
        sys.exit(1)

    for jsonl_path in jsonl_files:
        print(f"変換中: {jsonl_path.name}")
        session = parse_session(jsonl_path)

        if not session["messages"]:
            print(f"  スキップ（メッセージなし）")
            continue

        # ファイル名: 日付_セッションID
        date_prefix = format_timestamp(session["start_time"]).replace(" ", "_").replace(":", "")
        sid_short = (session["session_id"] or "unknown")[:8]
        base_name = f"{date_prefix}_{sid_short}"

        # ログ出力
        log_path = LOGS_DIR / f"{base_name}.md"
        log_path.write_text(session_to_markdown(session))
        print(f"  → {log_path}")

        # 要約テンプレート出力
        if args.summary:
            summary_path = SUMMARIES_DIR / f"{base_name}_summary.md"
            if not summary_path.exists():
                summary_path.write_text(generate_summary_template(session))
                print(f"  → {summary_path}")

    print("完了")


if __name__ == "__main__":
    main()
