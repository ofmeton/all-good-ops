#!/bin/zsh
# scripts/setup.sh - 初回セットアップ
# 1. データディレクトリ作成
# 2. SQLite DB 初期化
# 3. Python venv 作成 + 依存インストール + chromium ダウンロード
# 4. Node.js プロジェクト群の依存インストール (generator / dashboard / notifier)
# 5. terminal-notifier の存在確認 (なければ警告)
# 6. Lancers 初回ログイン (Playwright headed) → cookie 保存
# 7. デスクトップアイコン配置

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib/env.sh"

echo "🔧 BSA Proposal Automation - Setup"
echo ""

# 1. データディレクトリ
mkdir -p "$BSA_PA_APPDATA"
chmod 700 "$BSA_PA_APPDATA"
echo "✅ data dir: $BSA_PA_APPDATA"

# 2. DB 初期化
"$SCRIPT_DIR/init-db.sh"

# 3. Python venv
if [ ! -d "$BSA_PA_VENV" ]; then
  python3 -m venv "$BSA_PA_VENV"
  echo "✅ created venv: $BSA_PA_VENV"
fi
# venv 内 pip install
source "$BSA_PA_VENV/bin/activate"
pip install --upgrade pip >/dev/null
cd "$BSA_PA_BASE/src/collector"
pip install -e ".[dev]" >/dev/null
python -m playwright install chromium
deactivate
echo "✅ Python venv ready"

# 4. Node deps
echo "📦 Installing Node deps..."
(cd "$BSA_PA_BASE/src/generator" && npm install --silent)
(cd "$BSA_PA_BASE/src/dashboard"  && npm install --silent)
(cd "$BSA_PA_BASE/src/notifier"   && npm install --silent)
echo "✅ Node deps installed"

# 5. terminal-notifier
if ! command -v terminal-notifier >/dev/null 2>&1; then
  echo "⚠️  terminal-notifier 未インストール。"
  echo "   通知を有効にするには: brew install terminal-notifier"
fi

# 6a. Lancers 初回ログイン
echo ""
echo "📣 Lancers に手動でログインします。"
echo "   Playwright がブラウザを開きます。Google ログインだと弾かれるので"
echo "   メールアドレス + パスワードでログインしてください。"
echo "   ログイン完了後（2FA も含む）、ターミナルで Enter を押してください。"
read -r "_?Press Enter to start LANCERS login..."

source "$BSA_PA_VENV/bin/activate"
# heredoc 経由だと stdin が input() で読めないため、独立スクリプトを呼ぶ
python "$SCRIPT_DIR/lib/_lancers_login.py"

# 6b. CrowdWorks 初回ログイン
echo ""
echo "📣 CrowdWorks に手動でログインします。"
echo "   Playwright がブラウザを開きます。"
echo "   ログイン完了後、ターミナルで Enter を押してください。"
read -r "_?Press Enter to start CROWDWORKS login..."
python "$SCRIPT_DIR/lib/_crowdworks_login.py"
deactivate

# 7. デスクトップアイコン
DESKTOP_LINK="$HOME/Desktop/📥 BSA 案件収集.command"
ln -sf "$BSA_PA_BASE/scripts/run.command" "$DESKTOP_LINK"
chmod +x "$BSA_PA_BASE/scripts/run.command"
echo "✅ デスクトップに「📥 BSA 案件収集.command」を配置: $DESKTOP_LINK"

echo ""
echo "🎉 セットアップ完了！"
echo "デスクトップの「📥 BSA 案件収集」をダブルクリックして実行してください。"
