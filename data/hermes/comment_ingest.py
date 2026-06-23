#!/usr/bin/env python3
"""Hermes Notion コメント取り込みポーラ（Mac 専用）

NeedInfo と分解承認待ちカードの Notion コメントを読み、本人返信を検知して
ConversationLog / ApproveBreakdown へ橋渡しする。即時 Telegram は送らず、
確認コメントと nudge digest に委ねる。

設定/秘密は ~/.hermes/.env（NOTION_TOKEN / OPENROUTER_API_KEY / HERMES_BOT_USER_ID）。
キルスイッチ: ~/.hermes/comment_ingest_enabled が "1" の時だけ稼働（fail-closed）。
単一フライト: ~/.hermes/comment_ingest.lock。
手動: python3 comment_ingest.py [--dry-run] [--max N]
"""
import argparse
import json
import re
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

HOME = Path.home()
ENV_PATH = HOME / ".hermes" / ".env"
KILL_PATH = HOME / ".hermes" / "comment_ingest_enabled"
LOCK_PATH = HOME / ".hermes" / "comment_ingest.lock"
STATE_PATH = HOME / ".hermes" / "comment_state.json"
LOG_PATH = HOME / ".hermes" / "logs" / "comment_ingest.log"

NOTION_DB_ID = "2159405e11a84e7f90a8b6252bb43d38"
NOTION_VER = "2022-06-28"
TRIAGE_MODEL = "anthropic/claude-haiku-4.5"
MAX_PER_RUN = 10
JST = timezone(timedelta(hours=9))
VALID_INTENTS = {"answer", "approve_breakdown", "reject", "unclear"}


def now() -> str:
    return datetime.now(JST).strftime("%Y-%m-%d %H:%M:%S")


def log(msg: str) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    line = f"{now()} {msg}"
    print(line)
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except OSError:
        pass


def load_env() -> dict:
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


def load_state() -> dict:
    if STATE_PATH.exists():
        try:
            return json.loads(STATE_PATH.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def save_state(state: dict) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def comment_ingest_enabled() -> bool:
    try:
        return KILL_PATH.read_text(encoding="utf-8").strip() == "1"
    except Exception:
        return False


def notion(env: dict, method: str, path: str, body=None) -> dict:
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(
        f"https://api.notion.com/v1/{path}", data=data, method=method,
        headers={"Authorization": f"Bearer {env['NOTION_TOKEN']}", "Notion-Version": NOTION_VER,
                 "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read().decode("utf-8"))


def telegram(env: dict, text: str) -> bool:
    """既存パターン互換のため保持。comment ingest からは即時送信しない。"""
    chat = env.get("TELEGRAM_HOME_CHANNEL") or env.get("TELEGRAM_ALLOWED_USERS", "").split(",")[0]
    if not chat:
        return True
    data = urllib.parse.urlencode({"chat_id": chat, "text": text[:3500]}).encode()
    try:
        urllib.request.urlopen(urllib.request.Request(
            f"https://api.telegram.org/bot{env['TELEGRAM_BOT_TOKEN']}/sendMessage", data=data), timeout=20)
        return True
    except Exception as e:
        log(f"  telegram通知失敗: {e}")
        return False


def title_of(props: dict) -> str:
    return "".join(x.get("plain_text", "") for x in props.get("Title", {}).get("title", []))


def rich_text_of(props: dict, name: str) -> str:
    return "".join(x.get("plain_text", "") for x in props.get(name, {}).get("rich_text", []))


def select_of(props: dict, name: str):
    return (props.get(name, {}).get("select") or {}).get("name")


def checked(props: dict, name: str) -> bool:
    return bool(props.get(name, {}).get("checkbox"))


def rich_text_prop(text: str) -> dict:
    text = (text or "").strip()
    return {"rich_text": [{"text": {"content": text[:1900]}}]} if text else {"rich_text": []}


def patch_page(env: dict, page_id: str, props: dict) -> None:
    notion(env, "PATCH", f"pages/{page_id}", {"properties": props})


def add_comment(env: dict, page_id: str, text: str) -> None:
    notion(env, "POST", "comments",
           {"parent": {"page_id": page_id}, "rich_text": [{"text": {"content": text[:1900]}}]})


def query_target_cards(env: dict) -> list:
    body = {"filter": {"or": [
        {"property": "Status", "select": {"equals": "NeedInfo"}},
        {"and": [
            {"property": "BreakdownProposal", "rich_text": {"is_not_empty": True}},
            {"property": "ApproveBreakdown", "checkbox": {"equals": False}},
        ]},
    ]}, "page_size": 100}
    results = []
    cursor = None
    while True:
        q = dict(body)
        if cursor:
            q["start_cursor"] = cursor
        page = notion(env, "POST", f"databases/{NOTION_DB_ID}/query", q)
        results.extend(page.get("results", []))
        if not page.get("has_more"):
            break
        cursor = page.get("next_cursor")
        if not cursor:
            break
    return results


def list_comments(env: dict, page_id: str) -> list:
    comments = []
    cursor = None
    while True:
        params = {"block_id": page_id, "page_size": 100}
        if cursor:
            params["start_cursor"] = cursor
        page = notion(env, "GET", "comments?" + urllib.parse.urlencode(params))
        comments.extend(page.get("results", []))
        if not page.get("has_more"):
            break
        cursor = page.get("next_cursor")
        if not cursor:
            break
    return comments


def comment_plain_text(comment: dict) -> str:
    return "".join(x.get("plain_text", "") for x in comment.get("rich_text", []))


def extract_user_comments(comments: list, bot_user_id: str, last_seen_iso: str = "") -> list:
    if not bot_user_id:
        return []
    out = []
    for comment in comments:
        created = comment.get("created_time") or ""
        author = (comment.get("created_by") or {}).get("id")
        if author == bot_user_id:
            continue
        if last_seen_iso and created <= last_seen_iso:
            continue
        text = comment_plain_text(comment).strip()
        if not text:
            continue
        out.append({"created_time": created, "text": text, "raw": comment})
    return sorted(out, key=lambda x: x["created_time"])


def latest_comment_created_time(comments: list) -> str:
    created = [c.get("created_time") or "" for c in comments if c.get("created_time")]
    return max(created) if created else ""


def _extract_json_dict(text: str) -> dict:
    m = re.search(r"\{.*\}", text or "", re.S)
    if not m:
        raise ValueError("JSON object not found")
    data = json.loads(m.group(0))
    if not isinstance(data, dict):
        raise ValueError("JSON is not an object")
    return data


def fallback_intent(text: str, is_breakdown_waiting: bool) -> dict:
    t = (text or "").strip()
    low = t.lower()
    approval_words = ("ok", "ｏｋ", "おk", "承認", "いいよ", "お願い", "yes")
    approve = bool(re.fullmatch(r"\d+", t)) or any(w in low for w in approval_words)
    if approve and is_breakdown_waiting:
        return {"intent": "approve_breakdown", "note": "keyword approval"}
    return {"intent": "answer", "note": "keyword fallback"}


def classify_intent(env: dict, title: str, card_kind: str, latest_bot_comment: str, user_text: str) -> dict:
    if not env.get("OPENROUTER_API_KEY"):
        return fallback_intent(user_text, card_kind == "breakdown")
    prompt = (
        "Notionカードへの本人コメントの意図を分類してください。JSONのみ出力。\n"
        "{\"intent\":\"answer|approve_breakdown|reject|unclear\",\"note\":\"短い要約\"}\n\n"
        f"カード種別: {card_kind}\n"
        f"Title: {title}\n"
        f"直近のhermesコメント: {latest_bot_comment[:1000]}\n"
        f"本人コメント: {user_text[:1400]}\n"
    )
    payload = {"model": TRIAGE_MODEL,
               "messages": [{"role": "user", "content": prompt}],
               "max_tokens": 160, "temperature": 0}
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {env['OPENROUTER_API_KEY']}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            content = json.loads(r.read().decode("utf-8"))["choices"][0]["message"]["content"]
        data = _extract_json_dict(content)
        intent = data.get("intent") if data.get("intent") in VALID_INTENTS else "unclear"
        note = str(data.get("note") or "")[:200]
        return {"intent": intent, "note": note}
    except Exception as e:
        log(f"    intent分類失敗→fallback: {e}")
        return fallback_intent(user_text, card_kind == "breakdown")


def parse_iso_jst(value: str):
    if not value:
        return datetime.now(JST)
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(JST)


def append_conversation_log(existing: str, comment_text: str, created_time: str, limit: int = 1900) -> str:
    ts = parse_iso_jst(created_time).strftime("%Y-%m-%d %H:%M")
    entry = f"[{ts} 本人] {' '.join((comment_text or '').split())}"
    combined = ((existing or "").strip() + "\n" + entry).strip()
    if len(combined) <= limit:
        return combined
    return combined[-limit:].lstrip()


def latest_bot_comment_text(comments: list, bot_user_id: str) -> str:
    if not bot_user_id:
        return ""
    bot_comments = [c for c in comments if (c.get("created_by") or {}).get("id") == bot_user_id]
    if not bot_comments:
        return ""
    latest = sorted(bot_comments, key=lambda c: c.get("created_time") or "")[-1]
    return comment_plain_text(latest)


def card_kind(props: dict) -> str:
    has_breakdown = bool(rich_text_of(props, "BreakdownProposal").strip())
    needs_breakdown_approval = has_breakdown and not checked(props, "ApproveBreakdown")
    if needs_breakdown_approval:
        return "breakdown"
    return "needinfo"


def apply_intent(env: dict, card: dict, intent: dict, user_text: str, created_time: str, dry: bool) -> None:
    pid = card["id"]
    props = card["properties"]
    kind = card_kind(props)
    name = intent.get("intent")
    if dry:
        log(f"    DRY: apply intent={name} kind={kind} text={user_text[:60]}")
        return
    if name == "answer" and kind == "needinfo":
        conversation = append_conversation_log(rich_text_of(props, "ConversationLog"), user_text, created_time)
        patch_page(env, pid, {"ConversationLog": rich_text_prop(conversation),
                              "Status": {"select": {"name": "Inbox"}},
                              "BriefStatus": {"select": {"name": "draft"}}})
        add_comment(env, pid, "↩️ 回答を受け取りました。intake が反映します。")
        return
    if name == "approve_breakdown" and kind == "breakdown":
        patch_page(env, pid, {"ApproveBreakdown": {"checkbox": True}})
        add_comment(env, pid, "✅ 承認を受け取りました。分解します。")
        return
    if name == "reject":
        if kind == "breakdown":
            patch_page(env, pid, {"BreakdownProposal": {"rich_text": []},
                                  "ApproveBreakdown": {"checkbox": False}})
        add_comment(env, pid, "↩️ 見送り/修正意図として受け取りました。必要ならNotionコメントで追記してください。")
        return
    add_comment(env, pid, "🤔 すみません、OK か回答か判別できませんでした。もう一度教えてください。")


def process_card(env: dict, card: dict, state: dict, dry: bool) -> bool:
    pid = card["id"]
    props = card["properties"]
    title = title_of(props) or "(無題)"
    bot_user_id = env.get("HERMES_BOT_USER_ID", "").strip()
    if not bot_user_id:
        log("  HERMES_BOT_USER_ID 未設定 → コメント処理skip")
        return False
    comments = list_comments(env, pid)
    if pid not in state:
        baseline = latest_comment_created_time(comments)
        if baseline and not dry:
            state[pid] = baseline
            save_state(state)
            log(f"  baseline established: {title[:40]} last_comment={baseline}")
        return False
    user_comments = extract_user_comments(comments, bot_user_id, state.get(pid, ""))
    if not user_comments:
        return False
    text = "\n".join(c["text"] for c in user_comments)
    latest_created = user_comments[-1]["created_time"]
    kind = card_kind(props)
    intent = classify_intent(env, title, kind, latest_bot_comment_text(comments, bot_user_id), text)
    log(f"  comment: {title[:40]} kind={kind} intent={intent.get('intent')}")
    apply_intent(env, card, intent, text, latest_created, dry)
    state[pid] = latest_created
    if not dry:
        save_state(state)
    return True


def _run(args) -> None:
    env = load_env()
    if not env.get("NOTION_TOKEN"):
        log("ERROR: .env 必須キー不足: NOTION_TOKEN")
        return
    state = load_state()
    try:
        cards = query_target_cards(env)
    except Exception as e:
        log(f"ERROR: Notion query失敗: {e}")
        return
    log(f"start dry={args.dry_run} comment targets={len(cards)}件 max={args.max}")
    done = 0
    attempts = 0
    for card in cards:
        if done >= args.max:
            log(f"  上限 {args.max} 到達 → 残りは次回")
            break
        attempts += 1
        try:
            ok = process_card(env, card, state, args.dry_run)
            if ok:
                done += 1
        except Exception as e:
            log(f"  例外→当該カードskip: {e}")
    log(f"done attempts={attempts} processed={done}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--max", type=int, default=MAX_PER_RUN)
    args = ap.parse_args()
    if not comment_ingest_enabled():
        log("kill-switch disabled → 何もしない")
        return
    import fcntl
    LOCK_PATH.parent.mkdir(parents=True, exist_ok=True)
    lock_fp = open(LOCK_PATH, "w")
    try:
        fcntl.flock(lock_fp, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        log("別インスタンス稼働中 → skip")
        return
    try:
        _run(args)
    finally:
        fcntl.flock(lock_fp, fcntl.LOCK_UN)
        lock_fp.close()


if __name__ == "__main__":
    main()
