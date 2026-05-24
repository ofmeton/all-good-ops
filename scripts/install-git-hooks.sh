#!/usr/bin/env bash
# scripts/git-hooks/ の hook を .git/hooks/ に symlink で配置する。
# `.git/hooks/` は gitignore されるので、リポジトリに hook 実体を残しつつ
# 各 clone で install スクリプト 1 発でセットアップできるようにしている。

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
# worktree でも main repo の .git/hooks/ を共有するため git-common-dir を使う
git_common_dir="$(git rev-parse --git-common-dir)"
case "$git_common_dir" in
  /*) ;;  # 絶対パス → そのまま
  *) git_common_dir="$repo_root/$git_common_dir" ;;
esac
src_dir="$repo_root/scripts/git-hooks"
dst_dir="$git_common_dir/hooks"

if [[ ! -d "$src_dir" ]]; then
  echo "❌ $src_dir が見つかりません" >&2
  exit 1
fi

mkdir -p "$dst_dir"

for hook_path in "$src_dir"/*; do
  hook_name="$(basename "$hook_path")"
  dst="$dst_dir/$hook_name"

  if [[ -e "$dst" && ! -L "$dst" ]]; then
    echo "⚠️  $dst が既存（symlink ではない）。バックアップ → $dst.bak" >&2
    mv "$dst" "$dst.bak"
  fi

  ln -sf "$hook_path" "$dst"
  chmod +x "$hook_path"
  echo "✅ installed: $hook_name → $hook_path"
done

echo ""
echo "完了。pre-commit hook が有効化されました。"
echo "緊急時は ALLOW_MAIN_COMMIT=1 git commit ... で bypass できます。"
