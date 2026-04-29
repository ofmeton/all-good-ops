# scripts/lib/env.sh
# 全スクリプトの先頭で `source` して使う共通環境ヘルパ。
# 直接実行しない。chmod +x も不要（source 用）。

# zsh と bash の両方で動くよう $0 ではなく BASH_SOURCE / 0:A を使う
# zsh: ${(%):-%x} で現在の script 自身のパスを取得できる
if [ -n "${ZSH_VERSION:-}" ]; then
  _BSA_SELF="${(%):-%x}"
else
  _BSA_SELF="${BASH_SOURCE[0]:-$0}"
fi

export BSA_PA_BASE="$(cd "$(dirname "$_BSA_SELF")/.." && pwd)"
export BSA_PA_APPDATA="$HOME/Library/Application Support/bsa-pa"
export BSA_PA_DB="$BSA_PA_APPDATA/data.db"
export BSA_PA_VENV="$HOME/.venvs/bsa-pa"

# Claude Code CLI (~/.local/bin)
if [ -x "$HOME/.local/bin/claude" ] && [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
  export PATH="$HOME/.local/bin:$PATH"
fi

# Node (nvm v24.14.1)
if [ -x "$HOME/.nvm/versions/node/v24.14.1/bin/node" ] && [[ ":$PATH:" != *":$HOME/.nvm/versions/node/v24.14.1/bin:"* ]]; then
  export PATH="$HOME/.nvm/versions/node/v24.14.1/bin:$PATH"
fi
