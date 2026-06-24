#!/usr/bin/env python3
"""Hermes Breakdown 自動分割適用ポーラ（Mac 専用）

Notion「あとでやるタスク」で BreakdownProposal 非空の親カードを拾い、提案行を子カードとして
作成する（**承認ゲート廃止＝承認済み前提で自動分割**。ただし質問中=Status:NeedInfo/
BriefStatus:enriching は brief 確定まで保留し、質問の枝分かれ増殖を防ぐ）。親自身は実行しない。
適用結果は Notion コメントに残し、Telegram への即時通知は送らない（nudge digest 対象）。
適用後は BreakdownProposal をクリアして再分割を防ぐ（冪等・既存子は canonical_title で重複排除）。

設定/秘密は ~/.hermes/.env（NOTION_TOKEN）。
キルスイッチ: ~/.hermes/breakdown_enabled が "1" の時だけ稼働（fail-closed）。
単一フライト: ~/.hermes/breakdown.lock。
手動: python3 breakdown_apply.py [--dry-run] [--max N]
"""
import argparse
import json
import re
import unicodedata
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

HOME = Path.home()
ENV_PATH = HOME / ".hermes" / ".env"
KILL_PATH = HOME / ".hermes" / "breakdown_enabled"
LOCK_PATH = HOME / ".hermes" / "breakdown.lock"
LOG_PATH = HOME / ".hermes" / "logs" / "breakdown_apply.log"

NOTION_DB_ID = "2159405e11a84e7f90a8b6252bb43d38"
NOTION_VER = "2022-06-28"
MAX_PER_RUN = 5
JST = timezone(timedelta(hours=9))


def now() -> str:
    return datetime.now(JST).strftime("%Y-%m-%d %H:%M:%S")


def log(msg: str) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    line = f"{now()} {msg}"
    print(line)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")


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


def breakdown_enabled() -> bool:
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


def rich_text_of(props: dict, name: str) -> str:
    return "".join(x.get("plain_text", "") for x in props.get(name, {}).get("rich_text", []))


def title_of(props: dict) -> str:
    return "".join(x.get("plain_text", "") for x in props.get("Title", {}).get("title", []))


def rich_text_prop(text: str) -> dict:
    text = (text or "").strip()
    return {"rich_text": [{"text": {"content": text[:1900]}}]} if text else {"rich_text": []}


def normalize_page_id(v: str) -> str:
    raw = str(v or "")
    matches = re.findall(r"[0-9a-fA-F]{32}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}", raw)
    if not matches:
        return raw
    h = matches[-1].replace("-", "").lower()
    return f"{h[:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}"


def canonical_title(s: str) -> str:
    text = re.sub(r"^\s*[\u2460-\u2473]\s*", "", str(s or ""))  # ①-⑳ before NFKC
    text = unicodedata.normalize("NFKC", text).strip()
    text = re.sub(r"^[\u2460-\u2473]\s*", "", text)  # ①-⑳
    text = re.sub(r"^\s*\d+\s+", "", text)
    text = re.sub(r"^\s*\(?\d+\)?[\.\)、:：\-]\s*", "", text)
    text = re.sub(r"^\s*[-*・]\s*", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:100]


def query_proposals(env: dict) -> list:
    # 承認ゲート廃止: BreakdownProposal が非空なら自動分割。ただし「まだ質問中」
    # (Status=NeedInfo / BriefStatus=enriching)は brief 未確定なので分割しない
    # =回答→ready 後に分割し、質問の枝分かれ増殖を防ぐ。適用後 proposal クリアで冪等。
    base_body = {"filter": {"and": [
        {"property": "BreakdownProposal", "rich_text": {"is_not_empty": True}},
        {"property": "Status", "select": {"does_not_equal": "NeedInfo"}},
        {"property": "BriefStatus", "select": {"does_not_equal": "enriching"}},
    ]}, "page_size": 100}
    results = []
    cursor = None
    while True:
        body = dict(base_body)
        if cursor:
            body["start_cursor"] = cursor
        page = notion(env, "POST", f"databases/{NOTION_DB_ID}/query", body)
        results.extend(page.get("results", []))
        if not page.get("has_more"):
            break
        cursor = page.get("next_cursor")
        if not cursor:
            break
    return results


def query_existing_child_titles(env: dict, parent_id: str) -> set:
    parent_id = normalize_page_id(parent_id)
    body = {"filter": {"property": "Parent", "relation": {"contains": parent_id}}, "page_size": 100}
    titles = set()
    cursor = None
    while True:
        q = dict(body)
        if cursor:
            q["start_cursor"] = cursor
        page = notion(env, "POST", f"databases/{NOTION_DB_ID}/query", q)
        for child in page.get("results", []):
            t = canonical_title(title_of(child.get("properties", {})))
            if t:
                titles.add(t)
        if not page.get("has_more"):
            break
        cursor = page.get("next_cursor")
        if not cursor:
            break
    return titles


def parse_proposal(text: str) -> list:
    tasks = []
    seen = set()
    for raw in (text or "").splitlines():
        line = canonical_title(raw)
        if not line:
            continue
        if line in seen:
            continue
        seen.add(line)
        tasks.append(line)
    return tasks


def create_child(env: dict, parent_id: str, title: str, purpose: str, dry: bool) -> bool:
    parent_id = normalize_page_id(parent_id)
    title = canonical_title(title)
    props = {
        "Title": {"title": [{"text": {"content": title}}]},
        "Status": {"select": {"name": "Inbox"}},
        "Source": {"select": {"name": "manual"}},
        "Owner": {"select": {"name": "AI"}},
        "BriefStatus": {"select": {"name": "draft"}},
        "Parent": {"relation": [{"id": parent_id}]},
    }
    if purpose:
        props["Purpose"] = rich_text_prop(purpose)
    if dry:
        log(f"    DRY: 子カード作成 -> {title[:60]} Parent={parent_id[:8]}")
        return True
    notion(env, "POST", "pages", {"parent": {"database_id": NOTION_DB_ID}, "properties": props})
    return True


def patch_parent_done(env: dict, parent_id: str, created_count: int, skipped_count: int, dry: bool) -> None:
    parent_id = normalize_page_id(parent_id)
    props = {
        "ApproveBreakdown": {"checkbox": False},
        "BreakdownProposal": {"rich_text": []},
    }
    if dry:
        log(f"    DRY: 親後処理 comment created={created_count} skipped={skipped_count} → ApproveBreakdown=false BreakdownProposal=clear")
        return
    notion(env, "POST", "comments",
           {"parent": {"page_id": parent_id},
            "rich_text": [{"text": {"content": f"分解実行: {created_count}子作成 / {skipped_count}既存skip"}}]})
    notion(env, "PATCH", f"pages/{parent_id}", {"properties": props})


def process_parent(env: dict, parent: dict, dry: bool) -> bool:
    parent_id = normalize_page_id(parent["id"])
    props = parent.get("properties", {})
    parent_title = title_of(props) or "(無題)"
    proposal_text = rich_text_of(props, "BreakdownProposal")
    tasks = parse_proposal(proposal_text)
    if not tasks:
        log(f"  skip proposal空: {parent_title[:40]}")
        return True
    try:
        existing = query_existing_child_titles(env, parent_id)
    except Exception as e:
        log(f"  既存子照会失敗→skip: {parent_title[:40]} {e}")
        return False
    purpose = rich_text_of(props, "Purpose")
    log(f"  apply: {parent_title[:40]} proposals={len(tasks)} existing={len(existing)}")
    created = 0
    skipped = 0
    all_ok = True
    for title in tasks:
        if title in existing:
            skipped += 1
            log(f"    skip existing: {title[:60]}")
            continue
        try:
            create_child(env, parent_id, title, purpose, dry)
            existing.add(title)
            created += 1
        except Exception as e:
            all_ok = False
            log(f"    子作成失敗: {title[:60]} {e}")
    if not all_ok:
        log("    一部失敗 → 親ApproveBreakdown維持")
        return False
    try:
        patch_parent_done(env, parent_id, created, skipped, dry)
    except Exception as e:
        log(f"    親後処理失敗: {e}")
        return False
    log(f"    done created={created} skipped_existing={skipped}")
    return True


def _run(args) -> None:
    env = load_env()
    if not env.get("NOTION_TOKEN"):
        log("ERROR: .env 必須キー不足: NOTION_TOKEN")
        return
    try:
        parents = query_proposals(env)
    except Exception as e:
        log(f"ERROR: Notion query失敗: {e}")
        return
    log(f"start dry={args.dry_run} proposals={len(parents)}件 max={args.max}")
    done = 0
    attempts = 0
    for parent in parents:
        if done >= args.max:
            log(f"  上限 {args.max} 到達 → 残りは次回")
            break
        attempts += 1
        try:
            ok = process_parent(env, parent, args.dry_run)
            if ok:
                done += 1
        except Exception as e:
            log(f"  例外→当該親skip: {e}")
    log(f"done attempts={attempts} applied={done}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--max", type=int, default=MAX_PER_RUN)
    args = ap.parse_args()
    if not breakdown_enabled():
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
