#!/usr/bin/env python3
"""Phase 3拡張 cc-auto 自走コード実行ランナー（Mac 専用）

Notion Ready×Autonomy=cc-auto を拾い、対象リポの worktree で Codex がコード実装→
test/build→Codexレビュー→機械ガードを通れば squash merge、そうでなければ PR/Blocked。
Telegram は重要停止点だけを短い Notion リンク付き即時通知にし、完了/PR は nudge digest に委ねる。
read-only の draft-only(autorun_executor.py)とは別物。

設計=docs/superpowers/specs/2026-06-21-hermes-ccauto-phase3-design.md
手動: python3 ccauto_executor.py [--dry-run] [--projects-root PATH]
"""
import re
import json as _json
import os
import subprocess
import shutil, tempfile
import sys, argparse
import urllib.request, urllib.parse, urllib.error
from pathlib import Path
try:
    from typing import Optional
except Exception:
    Optional = None  # py3.9 にはあるが保険

# 硬ゲート denylist（自律でも越えられない絶対則）
_DENY_PATH_PATTERNS = [
    r"(^|/)migrations?/", r"\.sql$",
    r"\.env", r"secret", r"credential", r"\.pem$", r"\.key$",
    r"\.github/workflows/",
]
_DENY_TEXT_KEYWORDS = [
    "送信", "メール送", "line送", "請求", "支払", "送金", "課金",
    "deploy", "wrangler", "migration", "本番反映",
]


def hard_gate_hit(card_text, changed_files):
    """カード本文 or 変更ファイルが硬ゲート denylist に触れたら (True, 理由)。"""
    for f in changed_files or []:
        low = f.lower()
        for pat in _DENY_PATH_PATTERNS:
            if re.search(pat, low):
                return True, f"denylist path: {f} ({pat})"
    text = (card_text or "").lower()
    for kw in _DENY_TEXT_KEYWORDS:
        if kw.lower() in text:
            return True, f"denylist keyword: {kw}"
    return False, ""


def diff_too_big(changed_line_count, limit=400):
    return changed_line_count > limit


def decide_exit(review_ok, hard_gate, diff_ok, test_ok, author_ok):
    """出口を返す。merge は全条件クリア時のみ。"""
    if not test_ok or not review_ok:
        return "blocked"
    if hard_gate or not diff_ok or not author_ok:
        return "pr"
    return "merge"


def resolve_repo_from_text(details, projects_root):
    """本文に 'repo: <name>' があれば絶対パスを返す。"""
    m = re.search(r"repo:\s*([A-Za-z0-9._\-/]+)", details or "")
    if not m:
        return None
    return os.path.join(projects_root, m.group(1).strip())


def detect_verify_cmd(repo_path):
    """リポの test 実行コマンドを検出。検出不能なら None。"""
    pj = Path(repo_path, "package.json")
    if pj.exists():
        try:
            data = _json.loads(pj.read_text(encoding="utf-8"))
            if (data.get("scripts") or {}).get("test"):
                return ["npm", "test"]
        except Exception:
            pass
    has_pytest_cfg = Path(repo_path, "pytest.ini").exists() or (
        Path(repo_path, "pyproject.toml").exists()
        and "pytest" in Path(repo_path, "pyproject.toml").read_text(encoding="utf-8", errors="ignore")
    )
    if has_pytest_cfg and Path(repo_path, "tests").exists():
        return ["python3", "-m", "pytest", "-q"]
    return None


HOME = Path.home()
ENV_PATH = HOME / ".hermes" / ".env"
NOTION_DB_ID = "2159405e11a84e7f90a8b6252bb43d38"
NOTION_VER = "2022-06-28"
ALLOWED_GIT_EMAILS = ["off.me.ton@gmail.com"]  # 既定 author
DIFF_LIMIT = 400
BINARY_DIFF_LINES = DIFF_LIMIT + 1
CODE_EXTENSIONS = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs", ".rb", ".java",
    ".kt", ".kts", ".swift", ".c", ".cc", ".cpp", ".h", ".hpp", ".cs",
    ".php", ".sh", ".bash", ".zsh", ".sql",
}


def load_env():
    env = {}
    for raw in ENV_PATH.read_text(encoding="utf-8").splitlines():
        raw = raw.strip()
        if raw and not raw.startswith("#") and "=" in raw:
            k, v = raw.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def notion(env, method, path, body=None):
    data = _json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(
        f"https://api.notion.com/v1/{path}", data=data, method=method,
        headers={"Authorization": f"Bearer {env['NOTION_TOKEN']}", "Notion-Version": NOTION_VER,
                 "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return _json.loads(r.read().decode("utf-8"))


def telegram(env, text):
    chat = env.get("TELEGRAM_HOME_CHANNEL") or env.get("TELEGRAM_ALLOWED_USERS", "").split(",")[0]
    if not chat:
        return
    data = urllib.parse.urlencode({"chat_id": chat, "text": text[:3800]}).encode()
    try:
        urllib.request.urlopen(urllib.request.Request(
            f"https://api.telegram.org/bot{env['TELEGRAM_BOT_TOKEN']}/sendMessage", data=data), timeout=20)
    except Exception:
        pass


def card_url(card):
    return card.get("url") or ""


def short_reason(text, limit=80):
    one_line = " ".join((text or "").split())
    return one_line[:limit] if one_line else "詳細はNotionコメント"


def ccauto_notice(kind, title, url, reason=""):
    if kind == "merge_pr_failed":
        return f"⚠️ merge/PR失敗・要対応: {title}\n→ {url}"
    if kind == "blocked":
        return f"🚧止まった: {title} — {short_reason(reason)}\n→ {url}"
    if kind == "hard_gate":
        return f"⚠️硬ゲート停止: {title} — {short_reason(reason)}\n→ {url}"
    if kind == "repo_unknown":
        return f"❓リポ不明: {title} — 'repo: <name>' を教えて\n→ {url}"
    if kind == "interrupted":
        return f"🚧中断: {title} — {short_reason(reason)}\n→ {url}"
    return f"⚠️要対応: {title}\n→ {url}"


def query_ccauto(env):
    body = {"filter": {"and": [
        {"property": "Status", "select": {"equals": "Ready"}},
        {"property": "Autonomy", "select": {"equals": "cc-auto"}},
    ]}, "page_size": 25}
    return notion(env, "POST", f"databases/{NOTION_DB_ID}/query", body).get("results", [])


def author_ok(repo_path):
    try:
        email = subprocess.run(["git", "-C", repo_path, "config", "user.email"],
                               capture_output=True, text=True, timeout=10).stdout.strip()
    except Exception:
        return False
    if not email:
        return False
    return email in ALLOWED_GIT_EMAILS


CODEX = shutil.which("codex") or str(HOME / ".local" / "bin" / "codex")
CODEX_TIMEOUT = 1800  # 30分


def default_branch(repo_path):
    r = subprocess.run(["git", "-C", repo_path, "symbolic-ref", "refs/remotes/origin/HEAD"],
                       capture_output=True, text=True)
    if r.returncode == 0 and r.stdout.strip():
        return r.stdout.strip().rsplit("/", 1)[-1]
    return "main"


def _git_checked(args, cwd=None, timeout=None, text=True):
    r = subprocess.run(args, cwd=cwd, capture_output=True, text=text, timeout=timeout)
    if r.returncode != 0:
        err = (r.stderr or r.stdout or "").strip()
        raise RuntimeError(f"git command failed: {' '.join(args)} {err[:300]}")
    return r


def make_worktree(repo_path, slug):
    base = default_branch(repo_path)
    branch = f"ccauto/{slug}"
    _git_checked(["git", "-C", repo_path, "fetch", "origin", base], timeout=120)
    subprocess.run(["git", "-C", repo_path, "worktree", "prune"], capture_output=True, text=True, timeout=60)
    existing = subprocess.run(["git", "-C", repo_path, "branch", "--list", branch],
                              capture_output=True, text=True, timeout=30)
    if existing.returncode == 0 and existing.stdout.strip():
        _git_checked(["git", "-C", repo_path, "branch", "-D", branch], timeout=60)
    wt = tempfile.mkdtemp(prefix="ccauto_wt_")
    try:
        _git_checked(["git", "-C", repo_path, "worktree", "add", "-b", branch, wt, f"origin/{base}"], timeout=120)
    except Exception:
        shutil.rmtree(wt, ignore_errors=True)
        raise
    return wt, branch


def cleanup_worktree(repo_path, worktree_path):
    subprocess.run(["git", "-C", repo_path, "worktree", "remove", "--force", worktree_path],
                   capture_output=True, text=True)


def run_codex(worktree, task_text):
    """Codex を sandbox=workspace-write で worktree 内に閉じて実装させる。"""
    prompt = (
        "次の『あとでやる』タスクを実装してください。worktree 内のコードのみ変更可。\n"
        "厳守: 外部送信・git push/merge・課金・migration 実行・secret 書換えは一切しない。\n"
        "実装後、変更点を簡潔に要約して終了。\n\n" + task_text
    )
    try:
        res = subprocess.run(
            [CODEX, "exec", "-s", "workspace-write", "-c", "approval_policy=never", prompt],
            cwd=worktree, capture_output=True, text=True, timeout=CODEX_TIMEOUT)
        ok = res.returncode == 0
        return ok, (res.stdout or "")[-2000:] + (("\nERR:" + res.stderr[-500:]) if res.stderr else "")
    except subprocess.TimeoutExpired:
        return False, f"codex timeout {CODEX_TIMEOUT}s"


def git_diff_stat(worktree):
    _git_checked(["git", "-C", worktree, "add", "-A"])
    names = _git_checked(["git", "-c", "core.quotepath=false", "-C", worktree,
                          "diff", "--cached", "-z", "--name-only"]).stdout
    files = [x for x in names.split("\0") if x]
    numstat = _git_checked(["git", "-c", "core.quotepath=false", "-C", worktree,
                            "diff", "--cached", "--numstat"]).stdout.strip().splitlines()
    lines = 0
    for ln in numstat:
        parts = ln.split("\t")
        if len(parts) >= 2 and (parts[0] == "-" or parts[1] == "-"):
            return files, BINARY_DIFF_LINES
        for n in parts[:2]:
            if n.isdigit():
                lines += int(n)
    return files, lines


def code_changes_present(changed_files):
    for f in changed_files or []:
        p = Path(f)
        if str(p).startswith("docs/") or p.suffix.lower() in (".md", ".txt"):
            continue
        if p.suffix.lower() in CODE_EXTENSIONS:
            return True
    return False


def verify(worktree, changed_files=None):
    cmd = detect_verify_cmd(worktree)
    if not cmd:
        if code_changes_present(changed_files):
            return False, "(検証コマンド未検出かつコード変更あり→merge不可)"
        return True, "(検証コマンド検出なし→skip)"  # テスト無しは緑扱い（docs等）
    try:
        res = subprocess.run(cmd, cwd=worktree, capture_output=True, text=True, timeout=900)
        return res.returncode == 0, (res.stdout or "")[-1500:] + (res.stderr or "")[-500:]
    except subprocess.TimeoutExpired:
        return False, "verify timeout"


def codex_review(worktree, diff_text):
    """別 Codex パスで diff の安全性/正しさを判定。

    詐称防止のため verdict は **最終メッセージのみ**を `-o <file>`(--output-last-message)
    で取得して解析する（codex の stdout はバナー＋プロンプト echo＝diff 本文を含むため
    stdout を parse すると diff 内の偽 VERDICT 行に騙される）。先頭行が VERDICT: SAFE の時のみ safe。
    """
    prompt = (
        "次の git diff をレビューし、安全に main へ自動マージしてよいか判定。\n"
        "破壊的変更・秘密混入・意図不明な広範囲変更・送信/課金/migration があれば不可。\n"
        "**最終メッセージの先頭行に 'VERDICT: SAFE' または 'VERDICT: UNSAFE: <理由>' のみ**を書くこと。\n\n"
        + diff_text[:12000]
    )
    out_file = tempfile.mktemp(prefix="ccauto_verdict_")
    try:
        res = subprocess.run(
            [CODEX, "exec", "-s", "read-only", "-c", "approval_policy=never", "-o", out_file, prompt],
            cwd=worktree, capture_output=True, text=True, timeout=600)
        if res.returncode != 0:
            return False, (res.stderr or res.stdout or "codex review failed")[-400:]
        try:
            last = Path(out_file).read_text(encoding="utf-8", errors="replace")
        except Exception:
            last = res.stdout or ""
            if not last:
                return False, "codex review: 最終メッセージ取得失敗"
        first = ""
        for line in last.splitlines():
            if line.strip():
                first = line.strip()
                break
        m = re.match(r"^VERDICT:\s*(SAFE|UNSAFE)\b(?::\s*(.*))?$", first)
        safe = bool(m and m.group(1) == "SAFE")
        reason = "" if safe else ((m.group(2) if m else last) or "codex review unsafe/ambiguous")[-400:]
        return safe, reason
    except subprocess.TimeoutExpired:
        return False, "codex review timeout"
    finally:
        try:
            os.remove(out_file)
        except OSError:
            pass


def set_status(env, page_id, status):
    notion(env, "PATCH", f"pages/{page_id}", {"properties": {"Status": {"select": {"name": status}}}})


def add_comment(env, page_id, text):
    notion(env, "POST", "comments",
           {"parent": {"page_id": page_id}, "rich_text": [{"text": {"content": text[:1900]}}]})


def push_branch(worktree, branch):
    c = subprocess.run(["git", "-C", worktree, "commit", "-m",
                        f"feat(cc-auto): {branch}\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"],
                       capture_output=True, text=True)
    if c.returncode != 0:
        return False
    r = subprocess.run(["git", "-C", worktree, "push", "-u", "origin", branch], capture_output=True, text=True)
    return r.returncode == 0


def open_pr(repo_path, worktree, branch, title):
    r = subprocess.run(["gh", "pr", "create", "--head", branch, "--title", title,
                        "--body", "🤖 cc-auto 自動生成。レビューしてください。\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)"],
                       cwd=worktree, capture_output=True, text=True)
    if r.returncode == 0:
        return r.stdout.strip().splitlines()[-1]
    return None


def squash_merge(repo_path, worktree, branch, base):
    # PR 経由 squash merge（main 直 commit 保護を回避）
    if not push_branch(worktree, branch):
        return False
    pr = open_pr(repo_path, worktree, branch, f"cc-auto: {branch}")
    if not pr:
        return False
    r = subprocess.run(["gh", "pr", "merge", branch, "--squash", "--delete-branch"],
                       cwd=worktree, capture_output=True, text=True)
    return r.returncode == 0


def finalize(env, card, decision, ctx):
    pid = card["id"]; title = ctx["title"]; summary = ctx.get("summary", "")
    url = ctx.get("url") or card_url(card)
    if decision == "merge":
        ok = squash_merge(env and ctx["repo_path"], ctx["worktree"], ctx["branch"], ctx["base"])
        if ok:
            set_status(env, pid, "Done")
            add_comment(env, pid, f"✅ cc-auto 完了→main反映\n\n{summary}")
            return
        set_status(env, pid, "Blocked")
        add_comment(env, pid, f"⚠️ cc-auto merge/PR作成失敗・要対応\n\n{summary}")
        telegram(env, ccauto_notice("merge_pr_failed", title, url))
        return
    if decision == "pr":
        if not push_branch(ctx["worktree"], ctx["branch"]):
            set_status(env, pid, "Blocked")
            add_comment(env, pid, f"⚠️ cc-auto PR作成失敗・要対応（push失敗）\n\n{summary}")
            telegram(env, ccauto_notice("merge_pr_failed", title, url))
            return
        pr = open_pr(ctx["repo_path"], ctx["worktree"], ctx["branch"], f"cc-auto: {title}")
        if not pr:
            set_status(env, pid, "Blocked")
            add_comment(env, pid, f"⚠️ cc-auto PR作成失敗・要対応\n\n{summary}")
            telegram(env, ccauto_notice("merge_pr_failed", title, url))
            return
        set_status(env, pid, "Review")
        add_comment(env, pid, f"📝 cc-auto PR作成（要レビュー）\n{pr or '(PR作成失敗)'}\n\n{summary}")
        return
    # blocked
    pushed = push_branch(ctx["worktree"], ctx["branch"])
    set_status(env, pid, "Blocked")
    push_note = "" if pushed else "\n\nPR作成失敗・要対応（push失敗）"
    add_comment(env, pid, f"⚠️ cc-auto 中断: {ctx.get('reason','')}{push_note}\n\n{summary}")
    telegram(env, ccauto_notice("blocked", title, url, ctx.get("reason", "")))


KILL_PATH = HOME / ".hermes" / "ccauto_enabled"
LOG_PATH = HOME / ".hermes" / "logs" / "ccauto_executor.log"
FAIL_BACKSTOP = 3


def log(msg):
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    line = f"{subprocess.run(['date','+%Y-%m-%d %H:%M:%S'],capture_output=True,text=True).stdout.strip()} {msg}"
    print(line)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def ccauto_enabled():
    try:
        return KILL_PATH.read_text(encoding="utf-8").strip() == "1"
    except Exception:
        return False


def _title(card):
    return "".join(x.get("plain_text", "") for x in card["properties"].get("Title", {}).get("title", []))


def _details(card):
    return "".join(x.get("plain_text", "") for x in card["properties"].get("Details", {}).get("rich_text", []))


def _slug(title):
    s = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return (s or "task")[:32]


def process_card(env, card, projects_root, dry):
    pid = card["id"]; title = _title(card); details = _details(card)
    url = card_url(card)
    log(f"  pickup: {title[:40]}")
    # pre-flight 硬ゲート（カード本文）
    hit, reason = hard_gate_hit(details + " " + title, [])
    if hit:
        log(f"    pre-flight 硬ゲート: {reason} → Blocked")
        if not dry:
            set_status(env, pid, "Blocked"); add_comment(env, pid, f"⚠️ 硬ゲート: {reason}")
            telegram(env, ccauto_notice("hard_gate", title, url, reason))
        return False
    repo = resolve_repo_from_text(details, projects_root)
    if not repo or not Path(repo, ".git").exists():
        log("    リポ解決不能 → NeedInfo")
        if not dry:
            set_status(env, pid, "NeedInfo")
            telegram(env, ccauto_notice("repo_unknown", title, url))
        return False
    if dry:
        log(f"    DRY: repo={repo} まで解決。Codex実行/merge はskip"); return True
    set_status(env, pid, "InProgress"); log(f"    着手: {title[:60]}")
    wt = None
    try:
        wt, branch = make_worktree(repo, _slug(title))
        ok, clog = run_codex(wt, f"{title}\n\n{details}")
        files, lines = git_diff_stat(wt)
        diff_text = _git_checked(["git", "-c", "core.quotepath=false", "-C", wt, "diff", "--cached"]).stdout
        hit2, reason2 = hard_gate_hit(diff_text, files)
        test_ok, vlog = verify(wt, files) if ok else (False, clog)
        safe, sreason = codex_review(wt, diff_text) if ok and test_ok else (False, "実装/検証失敗")
        decision = decide_exit(safe, hit2, not diff_too_big(lines), test_ok, author_ok(repo))
        ctx = {"repo_path": repo, "worktree": wt, "branch": branch, "base": default_branch(repo),
               "title": title, "summary": clog[-600:], "reason": reason2 or sreason or vlog[-300:], "url": url}
        finalize(env, card, decision, ctx)
        log(f"    decision={decision} files={len(files)} lines={lines}")
        return decision != "blocked"
    except Exception as e:
        reason = f"cc-auto fail-closed: {e}"
        log(f"    {reason}")
        set_status(env, pid, "Blocked")
        add_comment(env, pid, f"⚠️ cc-auto 中断: {reason}")
        telegram(env, ccauto_notice("interrupted", title, url, reason))
        return False
    finally:
        if wt:
            cleanup_worktree(repo, wt)


LOCK_PATH = HOME / ".hermes" / "ccauto.lock"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--projects-root", default=str(HOME / "Projects"))
    args = ap.parse_args()
    if not ccauto_enabled():
        log("kill-switch disabled → 何もしない"); return
    # 単一フライト: 別インスタンス(launchd の重なり/手動併走)が稼働中なら即終了
    # (race で同一カードを二重 merge するのを防ぐ)
    import fcntl
    LOCK_PATH.parent.mkdir(parents=True, exist_ok=True)
    lock_fp = open(LOCK_PATH, "w")
    try:
        fcntl.flock(lock_fp, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        log("別インスタンス稼働中 → skip"); return
    try:
        _run(args)
    finally:
        fcntl.flock(lock_fp, fcntl.LOCK_UN)
        lock_fp.close()


def _run(args):
    env = load_env()
    cards = query_ccauto(env)
    log(f"start dry={args.dry_run} Ready×cc-auto={len(cards)}件")
    fails = 0
    for card in cards:
        try:
            ok = process_card(env, card, args.projects_root, args.dry_run)
            fails = 0 if ok else fails + 1
        except Exception as e:
            fails += 1; log(f"    例外: {e}")
        if fails >= FAIL_BACKSTOP:
            log(f"連続失敗 {fails} → バックストップ停止"); telegram(env, "⚠️ cc-auto 連続失敗で一時停止"); break
    log("done")


if __name__ == "__main__":
    main()
