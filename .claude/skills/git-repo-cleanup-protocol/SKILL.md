---
name: git-repo-cleanup-protocol
description: "コミットしてないものの整理・リポジトリ最新化依頼を、初動スキャン→方針合意→.gitignore 投入→Phase 分割→commit→push まで1セッションで完結させる標準フロー。「git整理して」「push してないやつ片付けて」「最新化して」依頼時に使う。"
---

# Git リポジトリ整理プロトコル（Git Repo Cleanup Protocol）

## 概要

「コミット・プッシュしてないものを整理」「リポジトリ最新化したい」等の Git整理依頼を受けた時の標準フロー。初動スキャン → 方針合意 → .gitignore 一括投入 → Phase 分割計画 → sub-repo 判断 → コミット実行 → push までを1セッションで完結させる。

- **誰が**: メインセッション or system-engineer
- **いつ**: ユーザーが「整理して」「コミットしてないもの片付けて」「最新化して」等と依頼した時
- **何のために**: 着手後の手戻り（方針再確認・.gitignore 後追い拡張・Phase 再分割・sub-repo 検出後の停止）を予防し、1回の合意で最後まで走り切る

## トリガー（自然文例）

- 「git整理しよう」「コミットしてないもの整理」
- 「リモート最新化したい」「pushしてないやつ片付けて」
- 「ブランチが汚い」「working tree がぐちゃぐちゃ」

## 5フェーズ構成

```
Phase 1: 初動スキャン（情報を1〜2ショットで全部取る）
   ↓
Phase 2: 方針合意（AskUserQuestion で全方針を1回で確定）
   ↓
Phase 3: .gitignore 一括投入（build artifacts + scratch dirs を最初に全部入れる）
   ↓
Phase 4: 論理単位コミット計画（サイズ概算してから提示）
   ↓
Phase 5: コミット実行 → push
```

## Phase 1: 初動スキャン

最初の Bash で以下を 1〜2ショットにまとめて実行する。

```bash
# A. 基本情報
git status
git log --oneline -10
git remote -v
git branch -a

# A2. 複数リポ走査（必須）— VSCode バッジは workspace 全 git リポを「ファイル単位」で合算する。
#     cwd の git status が少ないのにバッジが大きい時は、本体以外（兄弟 worktree + 隣接リポ）に沈殿している。
#     -uall で未追跡ディレクトリを展開し、各リポをファイル単位で数える（--short の畳み込み行数と混同しない）。
git worktree list                                                                                # 兄弟 worktree
for d in /Users/rikukudo/Projects/*/ /Users/rikukudo/Projects/private-agents/*/; do \
  [ -e "$d/.git" ] && n=$(git -C "$d" status --porcelain -uall 2>/dev/null | wc -l | tr -d ' ') && \
  [ "$n" != "0" ] && echo "  $n : $d"; done                                                      # 全リポの未コミット数
# 詳細: memory feedback_vscode_badge_multi_repo_diagnosis.md

# B. 隠れた要素の検出（ここを抜くと後段で詰まる）
git ls-files -o --exclude-standard | wc -l                                                      # untracked ファイル数
git ls-files -o --exclude-standard | xargs du -ch 2>/dev/null | tail -1                         # untracked 総サイズ
find . -type d \( -name node_modules -o -name .next -o -name dist -o -name build \
  -o -name .turbo -o -name .vercel \) -not -path "./.git/*" 2>/dev/null | head                  # build artifacts
find . -type d -name .git -not -path "./.git/*" 2>/dev/null                                     # sub-repo
ls *.png *.jpg *.jpeg *.tmp 2>/dev/null | wc -l                                                 # ルート散らばり

# C. .gitignore 既存内容
cat .gitignore 2>/dev/null
```

これで「ビルド生成物・サブrepo・ルート散らばりファイル」が初動で全部見える。

## Phase 2: 方針合意（AskUserQuestion）

Phase 1 の結果に応じて、必要な方針を**1回の AskUserQuestion で全部聞く**。聞き漏れがあると後段で再確認が発生する。

聞くべき方針（該当するもののみ）:
1. **ルート散らばりファイル**（画像・tmp等が大量にある時）: gitignore追加+移動 / gitignore追加+削除 / 放置
2. **大量変更のコミット粒度**: 論理単位で複数 / WIP 1コミット / 一部だけ先にコミット
3. **ブランチ位置づけ**: 長命ブランチ pushして保管 / main へマージ / push 保留
4. **build artifacts**（node_modules等が混入していた時）: 一括 gitignore / 該当ディレクトリごと gitignore / そのまま
5. **sub-repo 検出時**（外部 git repo がネストしていた時）: gitignore して別管理 / submodule 登録 / .git 削除して取り込み
6. **大型バイナリ**（mp4/PDF/PPTX 等が含まれる時）: コミット / Git LFS / gitignore でローカル保管のみ

## Phase 3: .gitignore 一括投入

Phase 2 で合意した方針に従い、`.gitignore` を**1回の編集で全部入り**にする。標準テンプレ（`feedback_gitignore_initial_template.md`）参照。

編集直後の検証:
```bash
git check-ignore -v <代表サンプル>      # 2〜3パターン
git ls-files -o --exclude-standard | xargs du -ch | tail -1   # 総サイズ再確認
```

サンプル検証で漏れが見つかったら、次フェーズに進む前にここで補修する。

## Phase 4: 論理単位コミット計画

提示前に各 Phase のサイズ・ファイル数を概算する（`feedback_phase_size_estimate.md` 参照）。**閾値超なら計画段階で分割**:
- 50ファイル超 / 50MB 超 / 2サブテーマ以上

計画提示は ExitPlanMode or Markdown で「Phase A〜N: 〇〇 (Nファイル / XMB)」のように脚注つきで。

## Phase 5: コミット実行 → push

各 Phase で:
1. `git add <該当>` でステージ
2. `git diff --cached --stat | tail` で実態確認（混入なし確認）
3. `git commit -m "..."` を HEREDOC で実行
4. `git log --oneline -3` で確認

最後に upstream 設定して push:
```bash
git push -u origin <branch>
```

大量バイナリを含む場合は `Bash` の `timeout` を 600000ms に伸ばす。

## 絶対にやらないこと

1. **Phase 1 の隠れた要素検出をスキップして git status だけで動き出す**
   → sub-repo / build artifacts を後段で発見して詰まる
2. **方針合意の AskUserQuestion を分割する**
   → ユーザーの確認回数が増える。1回に集約
3. **.gitignore を後追いで段階的に拡張する**
   → コミット履歴に「ignore追加」が分散して読みにくくなる
4. **sub-repo を検出したのに自分で勝手に処理する（.git 削除等）**
   → ユーザー確認必須。リモート repo を破棄するかどうかは判断が分かれる
5. **巨大ファイル（>50MB）を黙ってコミット**
   → GitHub 制限（100MB/file）に注意。Git LFS or gitignore を選択肢として提示
6. **`-u` を付けずに新規ブランチを push**
   → upstream 未設定だと次回以降の `git pull` / `git push` で都度指定が必要に

## 既存仕組みとの関係

| 既存 | 関係 |
|---|---|
| `local-file-organization.md` | ローカルファイル整理プロトコル。Git整理とは別文脈だが初動スキャン手法は共通 |
| `vercel-team-deploy-checklist.md` | push 前の git author email 確認。Vercel team プロジェクトの場合は併用必須 |
| `feedback_file_organization_init_scan.md` | 初動スキャンの memory 化（Git整理モード含む） |
| `feedback_gitignore_initial_template.md` | .gitignore 標準テンプレ |
| `feedback_phase_size_estimate.md` | Phase 計画時のサイズ概算ルール |

## 関連リソース

- 標準テンプレ memory: `~/.claude/projects/.../memory/feedback_*.md`
- ローカル整理: `.claude/skills/local-file-organization.md`
- Vercel team push: `.claude/skills/vercel-team-deploy-checklist.md`
