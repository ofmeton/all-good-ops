#!/usr/bin/env python3
"""Google カレンダー → Notion「あとでやるタスク」捕捉 poller (Phase 2b)

直近N日の予定を取得 → event_id+更新時刻で dedup → 新規/更新のみ Haiku で「準備が要るか」を判定 →
要準備の予定だけ Notion に準備タスクを作成 (Source=Calendar, Due=予定日)。
ルーチン/些末(昼食/通勤/ジム等)・辞退済み・終日の単なる記念日 は skip。

読み取り専用(calendar.readonly)。Mac でも VM でも動くよう秘密は ~/.hermes/.env から読む:
  OPENROUTER_API_KEY / NOTION_TOKEN
  GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_CALENDAR_REFRESH_TOKEN
状態(処理済み event_id→更新時刻)は ~/.hermes/gcal_state.json。本文/予定詳細は状態に保存しない。

cron/launchd 想定。手動: python3 calendar_capture.py [--days N] [--dry-run]
"""
import json
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

from hermes_context import profile_block

HOME = Path.home()
ENV_PATH = HOME / ".hermes" / ".env"
STATE_PATH = HOME / ".hermes" / "gcal_state.json"
LOG_PATH = HOME / ".hermes" / "logs" / "calendar_capture.log"

NOTION_DB_ID = "2159405e11a84e7f90a8b6252bb43d38"
NOTION_VER = "2022-06-28"
MODEL = "anthropic/claude-haiku-4.5"
JST = timezone(timedelta(hours=9))


def _now():
    return datetime.now(JST).strftime("%Y-%m-%d %H:%M:%S")


def log(msg):
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    line = f"{_now()} {msg}"
    print(line)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def load_env():
    env = {}
    if not ENV_PATH.exists():
        log(f"ERROR: {ENV_PATH} が無い"); sys.exit(1)
    for raw in ENV_PATH.read_text(encoding="utf-8").splitlines():
        raw = raw.strip()
        if not raw or raw.startswith("#") or "=" not in raw:
            continue
        k, v = raw.split("=", 1)
        env[k.strip()] = v.strip()
    return env


def load_state():
    if STATE_PATH.exists():
        try:
            return json.loads(STATE_PATH.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def save_state(state):
    STATE_PATH.write_text(json.dumps(state, ensure_ascii=False), encoding="utf-8")


def access_token(env):
    """refresh token → access token。"""
    data = urllib.parse.urlencode({
        "client_id": env["GOOGLE_OAUTH_CLIENT_ID"],
        "client_secret": env["GOOGLE_OAUTH_CLIENT_SECRET"],
        "refresh_token": env["GOOGLE_CALENDAR_REFRESH_TOKEN"],
        "grant_type": "refresh_token",
    }).encode("utf-8")
    req = urllib.request.Request("https://oauth2.googleapis.com/token", data=data)
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read().decode("utf-8"))["access_token"]


def fetch_events(token, days):
    """primary カレンダーの直近 days 日の予定を返す。"""
    now = datetime.now(timezone.utc)
    params = urllib.parse.urlencode({
        "timeMin": now.isoformat(),
        "timeMax": (now + timedelta(days=days)).isoformat(),
        "singleEvents": "true",
        "orderBy": "startTime",
        "maxResults": "100",
    })
    url = f"https://www.googleapis.com/calendar/v3/calendars/primary/events?{params}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read().decode("utf-8")).get("items", [])


def declined(ev):
    for a in ev.get("attendees", []):
        if a.get("self") and a.get("responseStatus") == "declined":
            return True
    return False


def start_info(ev):
    """(date_str, is_all_day, human_time) を返す。"""
    s = ev.get("start", {})
    if s.get("dateTime"):
        try:
            dt = datetime.fromisoformat(s["dateTime"]).astimezone(JST)
            return dt.strftime("%Y-%m-%d"), False, dt.strftime("%m/%d %H:%M")
        except Exception:
            return s["dateTime"][:10], False, s["dateTime"][:16]
    d = s.get("date", "")
    return d, True, d


def build_prompt(ev, human_time):
    summary = ev.get("summary", "(無題)")
    loc = ev.get("location", "")
    desc = (ev.get("description", "") or "")[:800]
    return profile_block() + (
        "あなたは予定の事前準備判定器。次のカレンダー予定に『事前準備の行動』が要るか判定する。\n"
        "JSONのみ出力: {\"needs_prep\": true/false, \"title\": \"準備タスク名(20字程度)\", \"summary\": \"何を準備すべきか1文\"}\n"
        "- needs_prep=true: 資料/アジェンダ作成、持ち物/書類準備、予約/手配、下調べ、発表スライド 等が要る予定。\n"
        "- needs_prep=false: 昼食/通勤/ジム/休憩/単なるリマインダ/記念日 等、準備不要のルーチン。\n"
        f"予定: {summary}\n日時: {human_time}\n場所: {loc}\n詳細: {desc}\n"
    )


def classify(env, ev, human_time):
    """Haiku で {needs_prep, title, summary} を判定。失敗時 needs_prep=False。"""
    prompt = build_prompt(ev, human_time)
    payload = {"model": MODEL, "messages": [{"role": "user", "content": prompt}],
               "max_tokens": 150, "temperature": 0}
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {env['OPENROUTER_API_KEY']}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            content = json.loads(r.read().decode("utf-8"))["choices"][0]["message"]["content"]
    except Exception as e:
        log(f"  classify 失敗 ({ev.get('summary','')[:20]}): {e}"); return {"needs_prep": False}
    m = re.search(r"\{.*\}", content, re.S)
    if not m:
        return {"needs_prep": False}
    try:
        return json.loads(m.group(0))
    except Exception:
        return {"needs_prep": False}


def notion(env, method, path, body=None):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(
        f"https://api.notion.com/v1/{path}", data=data, method=method,
        headers={"Authorization": f"Bearer {env['NOTION_TOKEN']}", "Notion-Version": NOTION_VER,
                 "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read().decode("utf-8"))


def card_exists(env, event_id):
    """同じ RawSourceId のカードが既に Notion にあれば True(マシン跨ぎの重複防止)。"""
    body = {"filter": {"property": "RawSourceId", "rich_text": {"equals": event_id}}, "page_size": 1}
    try:
        r = notion(env, "POST", f"databases/{NOTION_DB_ID}/query", body)
        return len(r.get("results", [])) > 0
    except Exception as e:
        log(f"  dedup照会失敗(作成は続行) {event_id[:12]}: {e}")
        return False


def create_card(env, ev, verdict, date_str, human_time, dry):
    title = (verdict.get("title") or f"{ev.get('summary','予定')}の準備").strip()[:100]
    summary = (verdict.get("summary") or "").strip()
    loc = ev.get("location", "")
    details = f"[カレンダー予定] {ev.get('summary','')} @ {human_time}"
    if loc:
        details += f" / 場所: {loc}"
    if summary:
        details += f"\n準備: {summary}"
    props = {
        "Title": {"title": [{"text": {"content": title}}]},
        "Status": {"select": {"name": "Inbox"}},
        "Source": {"select": {"name": "Calendar"}},
        "Owner": {"select": {"name": "AI"}},
        "RawSourceId": {"rich_text": [{"text": {"content": ev["id"][:200]}}]},
        "Details": {"rich_text": [{"text": {"content": details[:1900]}}]},
    }
    if summary:
        props["NextAction"] = {"rich_text": [{"text": {"content": summary[:300]}}]}
    if date_str:
        props["Due"] = {"date": {"start": date_str}}
    if dry:
        log(f"  DRY: カード作成予定 -> {title[:30]} (Due {date_str})"); return True
    body = json.dumps({"parent": {"database_id": NOTION_DB_ID}, "properties": props}).encode("utf-8")
    req = urllib.request.Request(
        "https://api.notion.com/v1/pages", data=body,
        headers={"Authorization": f"Bearer {env['NOTION_TOKEN']}", "Notion-Version": NOTION_VER,
                 "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            json.loads(r.read().decode("utf-8")); return True
    except urllib.error.HTTPError as e:
        log(f"  Notion作成失敗 {e.code}: {e.read().decode()[:160]}"); return False
    except Exception as e:
        log(f"  Notion作成失敗: {e}"); return False


def main():
    days = 14
    dry = "--dry-run" in sys.argv
    if "--days" in sys.argv:
        try:
            days = int(sys.argv[sys.argv.index("--days") + 1])
        except Exception:
            pass
    env = load_env()
    for need in ("GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_CALENDAR_REFRESH_TOKEN"):
        if need not in env:
            log(f"ERROR: {need} が .env に無い → 先に gcal_oauth_setup.py を実行"); sys.exit(1)
    state = load_state()
    try:
        token = access_token(env)
    except Exception as e:
        log(f"ERROR: access token 取得失敗: {e}"); sys.exit(1)
    events = fetch_events(token, days)
    log(f"start days={days} dry={dry} 取得={len(events)}件 既処理={len(state)}件")
    new_cnt = created = skipped = 0
    for ev in events:
        eid = ev.get("id")
        if not eid or declined(ev):
            continue
        updated = ev.get("updated", "")
        if state.get(eid) == updated:
            continue  # 未変更
        new_cnt += 1
        date_str, all_day, human_time = start_info(ev)
        verdict = classify(env, ev, human_time)
        state[eid] = updated  # 判定に関わらず処理済みに(再判定しない)
        if not verdict.get("needs_prep"):
            skipped += 1
            continue
        if not dry and card_exists(env, eid):
            skipped += 1
            log(f"  既存カードあり→skip ({(verdict.get('title') or ev.get('summary',''))[:24]})")
            continue
        if create_card(env, ev, verdict, date_str, human_time, dry):
            created += 1
            log(f"  capture: {(verdict.get('title') or ev.get('summary',''))[:30]} (予定 {human_time})")
    if not dry:
        save_state(state)
    log(f"done 新規/更新={new_cnt} 作成={created} skip(準備不要)={skipped}")


if __name__ == "__main__":
    main()
