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
METRICS_PATH = HOME / ".hermes" / "task_metrics.jsonl"
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
    try:
        lines = ENV_PATH.read_text(encoding="utf-8").splitlines()
    except Exception as e:
        log(f"ERROR: {ENV_PATH} 読込失敗: {e}")
        return env
    for raw in lines:
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


def text_of(p, name):
    return "".join(x.get("plain_text", "") for x in p.get(name, {}).get("rich_text", []))


def checked(p, name):
    return bool(p.get(name, {}).get("checkbox"))


def telegram(env, text):
    chat = env.get("TELEGRAM_HOME_CHANNEL") or env.get("TELEGRAM_ALLOWED_USERS", "").split(",")[0]
    data = urllib.parse.urlencode({"chat_id": chat, "text": text[:3800]}).encode()
    urllib.request.urlopen(urllib.request.Request(
        f"https://api.telegram.org/bot{env['TELEGRAM_BOT_TOKEN']}/sendMessage", data=data), timeout=20)


CAL_LEAD_DAYS = 7  # カレンダー準備タスクは予定の何日前から催促するか


def _due_date(p):
    s = (p.get("Due", {}).get("date") or {}).get("start")
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(JST).date()
    except Exception:
        try:
            return datetime.strptime(s[:10], "%Y-%m-%d").date()
        except Exception:
            return None


def _parse_time(s):
    if not s:
        return now_jst()
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(JST)
    except Exception:
        return now_jst()


def card_age_days(card):
    basis = card.get("last_edited_time") or card.get("created_time") or ""
    dt = _parse_time(basis)
    return (now_jst() - dt).total_seconds() / 86400


def _line(title, action, p):
    due = (p.get("Due", {}).get("date") or {}).get("start")
    suffix = f"（期日 {due[:10]}）" if due else ""
    return f"・{title}{suffix} — {action}"


def stale_keys_for_card(card):
    p = card["properties"]
    st = sel(p, "Status")
    au = sel(p, "Autonomy")
    brief = sel(p, "BriefStatus")
    age = card_age_days(card)
    has_breakdown = bool(text_of(p, "BreakdownProposal").strip())
    approve_breakdown = checked(p, "ApproveBreakdown")
    keys = []
    if st == "Inbox" and brief != "ready" and age > 0.5:
        keys.append("inbox_not_ready")
    if st == "NeedInfo" and age > 1:
        keys.append("needinfo")
    if brief == "ready" and not au and age > 1:
        keys.append("ready_no_autonomy")
    if has_breakdown and not approve_breakdown and age > 1:
        keys.append("unapproved_breakdown")
    if st == "Ready" and au and age > 1:
        keys.append("ready_idle")
    return keys


def classify_cards(card, today):
    """[(カテゴリ, 1行メッセージ)] を返す。"""
    p = card["properties"]
    st = sel(p, "Status")
    au = sel(p, "Autonomy")
    src = sel(p, "Source")
    title = title_of(p) or "(無題)"
    items = []
    for key in stale_keys_for_card(card):
        if key == "inbox_not_ready":
            items.append(("🧩 intake未完", _line(title, "intake未完。文脈を埋めにいくか、質問に答えて", p)))
        elif key == "needinfo":
            items.append(("❓ 回答待ち", _line(title, f"回答待ち: {title}", p)))
        elif key == "ready_no_autonomy":
            items.append(("✅ 承認待ち", _line(title, "Autonomy未承認。提案を確認して(承認で自走開始)", p)))
        elif key == "unapproved_breakdown":
            items.append(("🪓 分解承認待ち", _line(title, "分解案あり。承認(ApproveBreakdownチェック)で子展開", p)))
        elif key == "ready_idle":
            items.append(("▶️ 着手待ち", _line(title, "着手されてない。進める?", p)))
    if items:
        return items
    if st == "Blocked":
        return [("🚧 詰まってる(要対応)", _line(title, "詰まりを確認して解除/方針決め", p))]
    # カレンダー由来の準備タスクは「放置」扱いせず、予定が近づいた時だけ催促(遠い未来を毎日鳴らさない)
    if src == "Calendar":
        due = _due_date(p)
        if due is not None and today <= due <= today + timedelta(days=CAL_LEAD_DAYS):
            return [("📅 まもなく予定(要準備)", _line(title, "予定が近い。準備を確認", p))]
        return []
    if au == "reminder" and st in ("Ready", "Inbox"):
        return [("⏰ リマインド", _line(title, "リマインド。やる/延期/Doneを決める", p))]
    created_jst = _parse_time(card.get("created_time", ""))
    if st == "Inbox" and au != "reminder" and created_jst.date() < today:
        return [("🗂 未整理(Inboxに放置)", _line(title, "未整理。Inboxから進め方を決める", p))]
    return []


def query_cards(env):
    body = {"page_size": 100}
    cards = []
    cursor = None
    while True:
        q = dict(body)
        if cursor:
            q["start_cursor"] = cursor
        page = notion(env, "POST", f"databases/{NOTION_DB_ID}/query", q)
        cards.extend(page.get("results", []))
        if not page.get("has_more"):
            break
        cursor = page.get("next_cursor")
        if not cursor:
            break
    return cards


STALE_KEYS = ("inbox_not_ready", "needinfo", "ready_no_autonomy", "unapproved_breakdown", "ready_idle")


def metric_snapshot(cards):
    status_counts = {}
    stale_counts = {k: 0 for k in STALE_KEYS}
    approval_queue_depth = 0
    today = now_jst().date()
    for c in cards:
        p = c["properties"]
        st = sel(p, "Status") or "(empty)"
        status_counts[st] = status_counts.get(st, 0) + 1
        brief = sel(p, "BriefStatus")
        au = sel(p, "Autonomy")
        has_breakdown = bool(text_of(p, "BreakdownProposal").strip())
        approve_breakdown = checked(p, "ApproveBreakdown")
        if st == "NeedInfo":
            approval_queue_depth += 1
        if brief == "ready" and not au:
            approval_queue_depth += 1
        if has_breakdown and not approve_breakdown:
            approval_queue_depth += 1
        for stale_key in stale_keys_for_card(c):
            stale_counts[stale_key] += 1
    return {
        "ts": now_jst().isoformat(),
        "status_counts": status_counts,
        "approval_queue_depth": approval_queue_depth,
        "stale_counts": stale_counts,
    }


def write_metrics(cards, dry):
    if dry:
        return
    METRICS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(METRICS_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(metric_snapshot(cards), ensure_ascii=False) + "\n")


def main():
    dry = "--dry-run" in sys.argv
    force = "--force" in sys.argv
    env = load_env()
    if not env.get("NOTION_TOKEN"):
        log("ERROR: .env 必須キー不足: NOTION_TOKEN"); return
    h = now_jst().hour
    today = now_jst().date()
    today_str = today.isoformat()

    try:
        cards = query_cards(env)
    except Exception as e:
        log(f"ERROR: Notion query失敗: {e}"); return
    write_metrics(cards, dry)
    if not force and (h < 8 or h >= 22):
        log(f"静時間帯(JST {h}時) -> 送らない"); return

    buckets = {}
    to_stamp = []
    for c in cards:
        p = c["properties"]
        if sel(p, "Status") in ("Done", "Review", "InProgress"):
            continue
        ln = (p.get("LastNudge", {}).get("date") or {}).get("start")
        if ln and ln[:10] == today_str:
            continue
        items = classify_cards(c, today)
        if not items:
            continue
        for reason, line in items:
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
