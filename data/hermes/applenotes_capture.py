#!/usr/bin/env python3
"""Apple Notes → Notion「あとでやるタスク」捕捉 poller (Mac 専用 / Phase 2a)

決定的フロー: osascript で直近N日に更新されたメモを取得 → note_id+更新時刻で dedup →
新規/更新のみ OpenRouter(Haiku) で「タスクか/私的か」を分類 → タスクのみ Notion API で
Inbox カード作成 (Source=AppleNotes)。私的(journal/感情/パスワード等)・非タスクは skip し本文は保存しない。

設定/秘密は ~/.hermes/.env から読む (OPENROUTER_API_KEY / NOTION_TOKEN)。
状態(処理済み note_id→更新時刻)は ~/.hermes/applenotes_state.json。本文は状態に保存しない。

cron/launchd から定期実行する想定。手動: python3 applenotes_capture.py [--days N] [--dry-run]
"""
import json
import os
import re
import subprocess
import sys
import urllib.request
import urllib.error
from pathlib import Path

HOME = Path.home()
ENV_PATH = HOME / ".hermes" / ".env"
STATE_PATH = HOME / ".hermes" / "applenotes_state.json"
LOG_PATH = HOME / ".hermes" / "logs" / "applenotes_capture.log"

NOTION_DB_ID = "2159405e11a84e7f90a8b6252bb43d38"
NOTION_VER = "2022-06-28"
MODEL = "anthropic/claude-haiku-4.5"

US = "\x1f"  # unit separator (field)
RS = "\x1e"  # record separator (note)


def log(msg: str) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    line = f"{_now()} {msg}"
    print(line)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def _now() -> str:
    return subprocess.run(["date", "+%Y-%m-%d %H:%M:%S"], capture_output=True, text=True).stdout.strip()


def load_env() -> dict:
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


def load_state() -> dict:
    if STATE_PATH.exists():
        try:
            return json.loads(STATE_PATH.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def save_state(state: dict) -> None:
    STATE_PATH.write_text(json.dumps(state, ensure_ascii=False), encoding="utf-8")


def fetch_recent_notes(days: int) -> list[dict]:
    """osascript で直近 days 日に更新されたメモを (id,name,mod,folder,body) で返す。"""
    script = f'''
    set cutoff to (current date) - ({days} * days)
    set out to ""
    tell application "Notes"
        set ns to notes whose modification date > cutoff
        repeat with n in ns
            set fname to ""
            try
                set fname to name of container of n
            end try
            set out to out & (id of n) & "{US}" & (name of n) & "{US}" & ((modification date of n) as string) & "{US}" & fname & "{US}" & (plaintext of n) & "{RS}"
        end repeat
    end tell
    return out
    '''
    try:
        res = subprocess.run(["osascript", "-e", script], capture_output=True, text=True, timeout=120)
    except subprocess.TimeoutExpired:
        log("ERROR: osascript timeout"); return []
    if res.returncode != 0:
        log(f"ERROR: osascript rc={res.returncode}: {res.stderr.strip()[:200]}"); return []
    notes = []
    for rec in res.stdout.split(RS):
        if not rec.strip():
            continue
        parts = rec.split(US)
        if len(parts) < 5:
            continue
        nid, name, mod, folder, body = parts[0], parts[1], parts[2], parts[3], US.join(parts[4:]) if len(parts) > 5 else parts[4]
        notes.append({"id": nid.strip(), "name": name.strip(), "mod": mod.strip(),
                      "folder": folder.strip(), "body": body})
    return notes


def classify(env: dict, note: dict) -> dict:
    """Haiku で {is_task, is_private, title} を判定。失敗時は skip 扱い。"""
    body = (note["body"] or "")[:1500]
    prompt = (
        "あなたはメモ分類器。次の Apple メモが『あとでやるタスク/依頼/要対応』か判定する。\n"
        "JSONのみ出力: {\"is_task\": true/false, \"is_private\": true/false, \"title\": \"タスクの短い要約(20字程度)\"}\n"
        "- is_private=true: 日記/感情の記録/パスワードや機密/個人的な内省。これらはタスクでもtask扱いしない。\n"
        "- is_task=true: 行動が要る(連絡/購入/手続き/調査/作成/予約 等)。単なる情報メモ/リンク集/完了済みは false。\n"
        f"メモタイトル: {note['name']}\nフォルダ: {note['folder']}\n本文:\n{body}\n"
    )
    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 120,
        "temperature": 0,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions", data=data,
        headers={"Authorization": f"Bearer {env['OPENROUTER_API_KEY']}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            j = json.loads(r.read().decode("utf-8"))
        content = j["choices"][0]["message"]["content"]
    except Exception as e:
        log(f"  classify 失敗 ({note['name'][:20]}): {e}"); return {"is_task": False}
    m = re.search(r"\{.*\}", content, re.S)
    if not m:
        return {"is_task": False}
    try:
        return json.loads(m.group(0))
    except Exception:
        return {"is_task": False}


def create_card(env: dict, note: dict, title: str, dry: bool) -> bool:
    excerpt = (note["body"] or "").strip().replace("\n", " ")[:300]
    props = {
        "Title": {"title": [{"text": {"content": title[:100] or note["name"][:100] or "(無題メモ)"}}]},
        "Status": {"select": {"name": "Inbox"}},
        "Source": {"select": {"name": "AppleNotes"}},
        "Owner": {"select": {"name": "AI"}},
        "RawSourceId": {"rich_text": [{"text": {"content": note["id"][:200]}}]},
        "Details": {"rich_text": [{"text": {"content": f"[Apple メモ/{note['folder']}] {excerpt}"}}]},
    }
    if dry:
        log(f"  DRY: カード作成予定 -> {title[:30]}"); return True
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


def main() -> None:
    days = 14
    dry = "--dry-run" in sys.argv
    if "--days" in sys.argv:
        try:
            days = int(sys.argv[sys.argv.index("--days") + 1])
        except Exception:
            pass
    env = load_env()
    state = load_state()
    notes = fetch_recent_notes(days)
    log(f"start days={days} dry={dry} 取得={len(notes)}件 既処理={len(state)}件")
    new_cnt = created = skipped = 0
    for note in notes:
        nid = note["id"]
        if not nid:
            continue
        if state.get(nid) == note["mod"]:
            continue  # 未変更 → skip
        new_cnt += 1
        verdict = classify(env, note)
        state[nid] = note["mod"]  # 分類結果に関わらず処理済みに(再分類しない)
        if not verdict.get("is_task") or verdict.get("is_private"):
            skipped += 1
            continue
        title = (verdict.get("title") or note["name"]).strip()
        if create_card(env, note, title, dry):
            created += 1
            log(f"  capture: {title[:30]}  (from {note['name'][:20]})")
    if not dry:
        save_state(state)
    log(f"done 新規/更新={new_cnt} 作成={created} skip(非task/private)={skipped}")


if __name__ == "__main__":
    main()
