#!/usr/bin/env python3
"""Google カレンダー読み取り用 refresh token を一回だけ取得するヘルパー (Mac 専用)

既存の Sheets MCP の OAuth クライアント(Desktop型)を流用して、calendar.readonly スコープで
ユーザー同意 → refresh token を取得し、~/.hermes/.env に 3 値を追記する。
(GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_CALENDAR_REFRESH_TOKEN)

前提: 対象プロジェクト(ai-radar-494017)で Calendar API を有効化済みであること。
依存なし(標準ライブラリのみ)。ローカルにブラウザが要る(同意画面)。

手順: python3 gcal_oauth_setup.py  → 表示URLをブラウザで開く → 同意 → localhost に戻る → 完了。
"""
import json
import sys
import urllib.parse
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

HOME = Path.home()
CRED_PATH = HOME / ".config" / "google-sheets-mcp" / "credentials.json"
ENV_PATH = HOME / ".hermes" / ".env"
SCOPE = "https://www.googleapis.com/auth/calendar.readonly"
REDIRECT_PORT = 8765
REDIRECT_URI = f"http://localhost:{REDIRECT_PORT}/"

_code_holder = {}


class _Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        q = urllib.parse.urlparse(self.path).query
        params = urllib.parse.parse_qs(q)
        _code_holder["code"] = (params.get("code") or [None])[0]
        _code_holder["error"] = (params.get("error") or [None])[0]
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        msg = "認可完了。ターミナルに戻ってください。" if _code_holder.get("code") else "認可失敗。"
        self.wfile.write(f"<html><body><h2>{msg}</h2></body></html>".encode("utf-8"))

    def log_message(self, *a):
        pass


def main():
    if not CRED_PATH.exists():
        print(f"ERROR: {CRED_PATH} が無い(Sheets MCP の OAuth クライアント)。"); sys.exit(1)
    cred = json.loads(CRED_PATH.read_text())
    node = cred.get("installed") or cred.get("web")
    client_id = node["client_id"]
    client_secret = node["client_secret"]

    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
        "client_id": client_id,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",
        "prompt": "consent",
    })
    print("\n▼ 次の URL をブラウザで開いて Google アカウントで同意してください:\n")
    print(auth_url + "\n")
    try:
        webbrowser.open(auth_url)
    except Exception:
        pass

    srv = HTTPServer(("localhost", REDIRECT_PORT), _Handler)
    print(f"localhost:{REDIRECT_PORT} で認可コードを待機中...")
    srv.handle_request()  # 1リクエストだけ受ける
    srv.server_close()

    if _code_holder.get("error") or not _code_holder.get("code"):
        print(f"ERROR: 認可失敗 {_code_holder.get('error')}"); sys.exit(1)
    code = _code_holder["code"]

    # code → refresh token 交換
    data = urllib.parse.urlencode({
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": REDIRECT_URI,
        "grant_type": "authorization_code",
    }).encode("utf-8")
    req = urllib.request.Request("https://oauth2.googleapis.com/token", data=data)
    with urllib.request.urlopen(req, timeout=40) as r:
        tok = json.loads(r.read().decode("utf-8"))
    refresh = tok.get("refresh_token")
    if not refresh:
        print(f"ERROR: refresh_token が返らなかった: {tok}"); sys.exit(1)

    # .env に追記/更新
    lines = ENV_PATH.read_text(encoding="utf-8").splitlines() if ENV_PATH.exists() else []
    kv = {"GOOGLE_OAUTH_CLIENT_ID": client_id,
          "GOOGLE_OAUTH_CLIENT_SECRET": client_secret,
          "GOOGLE_CALENDAR_REFRESH_TOKEN": refresh}
    out, seen = [], set()
    for ln in lines:
        k = ln.split("=", 1)[0].strip() if "=" in ln else None
        if k in kv:
            out.append(f"{k}={kv[k]}"); seen.add(k)
        else:
            out.append(ln)
    for k, v in kv.items():
        if k not in seen:
            out.append(f"{k}={v}")
    ENV_PATH.write_text("\n".join(out) + "\n", encoding="utf-8")
    print(f"\n✅ ~/.hermes/.env に 3 値を書き込みました。calendar_capture.py が使えます。")


if __name__ == "__main__":
    main()
