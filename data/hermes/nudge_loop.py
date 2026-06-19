#!/usr/bin/env python3
"""Phase 4 催促ループ（VM 24/7 / Telegram ダイジェスト）

Notion「あとでやるタスク」の停滞カードを拾い、Telegram にまとめて催促する。
静時間帯(22:00-08:00 JST)は送らない。同一カードは LastNudge により 1日1回まで。

催促対象:
- Status=Blocked        … 詰まってる(要対応)
- Status=NeedInfo       … 情報待ち(返事して)
- Autonomy=reminder かつ Status in {Ready,Inbox} … リマインド(期日あれば表示)
- Status=Inbox かつ reminder以外 かつ作成から1日以上 … 未整理(放置)

cron(毎時)から実行。手動: python3 nudge_loop.py [--dry-run] [--force(静時間帯無視)]
"""
import json
import sys
import urllib.request
import urllib.parse
from datetime import datetime, timedelta, timezone
from pathlib import Path

HOME = Path.home()
ENV_PATH = HOME / ".hermes" / ".env"
LOG_PATH = HOME / ".hermes" / "logs" / "nudge_loop.log"
NOTION_DB_ID = "2159405e11a84e7f90a8b6252bb43d38"
NOTION_VER = "2022-06-28"
JST = timezone(timedelta(hours=9))


def now_jst():
    return datetime.now(JST)


def log(msg):
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    line = f"{now_jst().strftime('%Y-%m-%d %H:%M:%S')} {msg}"
    print(line)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def load_env():
    env = {}
    for raw in ENV_PATH.read_text(encoding="utf-8").splitlines():
        raw = raw.strip()
        if raw and not raw.startswith("#") and "=" in raw:
            k, v = raw.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def notion(env, method, path, body=None):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(
        f"https://api.notion.com/v1/{path}", data=data, method=method,
        headers={"Authorization": f"Bearer {env['NOTION_TOKEN']}", "Notion-Version": NOTION_VER,
                 "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read().decode("utf-8"))


def sel(p, name):
    return (p.get(name, {}).get("select") or {}).get("name")


def title_of(p):
    return "".join(x.get("plain_text", "") for x in p.get("Title", {}).get("title", []))


def telegram(env, text):
    chat = env.get("TELEGRAM_HOME_CHANNEL") or env.get("TELEGRAM_ALLOWED_USERS", "").split(",")[0]
    data = urllib.parse.urlencode({"chat_id": chat, "text": text[:3800]}).encode()
    urllib.request.urlopen(urllib.request.Request(
        f"https://api.telegram.org/bot{env['TELEGRAM_BOT_TOKEN']}/sendMessage", data=data), timeout=20)


def classify_card(p, created_jst, today):
    """催促理由を返す。対象外なら None。"""
    st = sel(p, "Status")
    au = sel(p, "Autonomy")
    if st == "Blocked":
        return "🚧 詰まってる(要対応)"
    if st == "NeedInfo":
        return "❓ 情報待ち(返事ほしい)"
    if au == "reminder" and st in ("Ready", "Inbox"):
        return "⏰ リマインド"
    if st == "Inbox" and au != "reminder" and created_jst.date() < today:
        return "🗂 未整理(Inboxに放置)"
    return None


def main():
    dry = "--dry-run" in sys.argv
    force = "--force" in sys.argv
    env = load_env()
    h = now_jst().hour
    if not force and (h < 8 or h >= 22):
        log(f"静時間帯(JST {h}時) -> 送らない"); return
    today = now_jst().date()
    today_str = today.isoformat()

    body = {"filter": {"and": [
        {"property": "Status", "select": {"does_not_equal": "Done"}},
        {"property": "Status", "select": {"does_not_equal": "Review"}},
        {"property": "Status", "select": {"does_not_equal": "InProgress"}},
    ]}, "page_size": 100}
    cards = notion(env, "POST", f"databases/{NOTION_DB_ID}/query", body).get("results", [])

    buckets = {}
    to_stamp = []
    for c in cards:
        p = c["properties"]
        ln = (p.get("LastNudge", {}).get("date") or {}).get("start")
        if ln and ln[:10] == today_str:
            continue
        created = c.get("created_time", "")
        try:
            created_jst = datetime.fromisoformat(created.replace("Z", "+00:00")).astimezone(JST)
        except Exception:
            created_jst = now_jst()
        reason = classify_card(p, created_jst, today)
        if not reason:
            continue
        t = title_of(p)
        due = (p.get("Due", {}).get("date") or {}).get("start")
        line = f"・{t}" + (f"（期日 {due[:10]}）" if due else "")
        buckets.setdefault(reason, []).append(line)
        to_stamp.append(c["id"])

    if not buckets:
        log("催促対象なし"); return

    parts = ["📋 あとでやる｜気になってるやつ\n"]
    for reason, lines in buckets.items():
        parts.append(reason)
        parts.extend(lines)
        parts.append("")
    msg = "\n".join(parts).strip()
    log(f"催促 {len(to_stamp)}件 / dry={dry}")
    if dry:
        print("----\n" + msg + "\n----"); return

    telegram(env, msg)
    for pid in to_stamp:
        try:
            notion(env, "PATCH", f"pages/{pid}",
                   {"properties": {"LastNudge": {"date": {"start": today_str}}}})
        except Exception as e:
            log(f"  LastNudge更新失敗 {pid[:8]}: {e}")
    log(f"送信完了 {len(to_stamp)}件")


if __name__ == "__main__":
    main()
