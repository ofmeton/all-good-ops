---
date: 2026-05-24
time: 23:14
topic: worktree-enforcement
scope: HEAD 概念質問 → worktree 徹底状況確認 → 徹底実装（hook + script + CLAUDE.md + memory）→ PR merge → 後片付け
---

# セッション振り返り — worktree 運用ポリシー強制化

## §0. 事実情報の raw 保存漏れチェック

- 1 件補完: `raw/facts/situations/2026-05-24-worktree-enforcement-merged.md`（PR #13 merge + cleanup 状況）
- 漏れた理由: 「実装作業の延長」と感じて状況変化として明示認識しなかった。§2 #6 に記録

## §1. 良かった点

1. **質問段階で git の実態を観測してから返した** — 「徹底されてる？」に対して `git worktree list` + `git branch -a` で 3 並列 worktree を提示し、抽象論ではなく数字で答えた
2. **AskUserQuestion で強度 3 段階 + preview** — 「徹底させて」を勝手に「中」で実装せず、弱／中／強を preview 付きで選ばせた。ユーザーは強を選択
3. **TaskCreate を実装前に 9 件立てた** — Phase 跨ぎ閾値（2+ phase / 8+ files）に該当する規模を着手前に判定
4. **walk the talk: worktree 隔離で実装** — 既存 self-improve-it6 の mid-work に一切触らず、`/Users/rikukudo/Projects/all-good-ops-wt-enforce/` で完結
5. **push 前 `git log --oneline @{u}..HEAD` で 1 commit 確認** — 並列セッション混入なし確認の防波堤を機械的に踏んだ

## §2. 詰まった瞬間・二度手間

| # | 事象 | 原因 | 先回りできたポイント | 本来すべき動き |
|---|---|---|---|---|
| 1 | worktree 内の 3 ファイル並列 Edit が全部「File has not been read yet」で fail | main repo cwd で Read しただけで「同パス別 working dir」を読まずに Edit 投げた | worktree 切替直後の Edit は「Read 再要必須」を機械的に判定 | worktree 切替後、最初に触るファイルを並列 Read で全部読み込む |
| 2 | `install-git-hooks.sh` が worktree から実行で `mkdir: .git: Not a directory` で fail | 既存スクリプトが `$repo_root/.git/hooks` を組み立てており、worktree では `.git` がファイルなので破綻 | 既存 sysadmin スクリプトを worktree から叩く時点で「.git 取扱い違うかも」と先読み | install-git-hooks.sh の `git-common-dir` 対応を最初の commit に同梱（後追い修正にしない） |
| 3 | `wt-done.sh` の merged 判定が squash merge を検出できず手動 cleanup | `git branch --merged origin/main` は squash 後の commit と元 commit の親子関係が切れて拾えない | squash merge は GitHub の default の 1 つ。設計時に複数判定経路を用意すべき | wt-done.sh に「commit message に PR # 含む / `git diff origin/main` が空」など複数経路の判定 |
| 4 | `Shell cwd was reset` 警告が頻発 | Bash tool の cwd が all-good-ops プロジェクトの hook で各 call ごとに main repo にリセットされる。`cd` 単発実行が無効 | memory `feedback_bash_cwd_persistence.md` を hook 仕様前提に更新すべきだった | worktree 内作業時は全 Bash を `cd <abs path> && ...` プレフィクス統一 |
| 5 | Read 済みファイルを別 working dir で Edit すると「未読」になる挙動の発見 | Claude harness が path 単位で track。worktree 別 cwd は別エンティティ扱い | #1 と同根。worktree 切替時の Read 再実行ルーチン化が未策 | （#1 と同じ対応） |
| 6 | raw/facts/situations/ に PR #13 merge 状況を保存し忘れ | 「実装の延長」と感じて「状況変化」として明示認識しなかった | merge 完了報告は明確な状況変化。即保存対象 | merge 完了/失敗/cleanup 完了は raw/facts/situations/ 保存対象として default 化 |

## §3. 自動化・効率化の余地

- **wt-done.sh の squash merge 検知**: スクリプト改修で型化（次回 PR 候補）
- **worktree 切替時の Read 再実行**: feedback memory として型化（#1, #5 共通）
- **Bash 全呼び出しの `cd <abs> &&` プレフィクス**: 既存 feedback に worktree 文脈追記

## §4. 次回への改善提案

1. worktree 切替直後の **最初の編集対象を並列 Read で全部読み込む** をルーチン化
2. `wt-done.sh` に squash merge 検知（`git log origin/main --grep="(#<PR>)"` または `git diff origin/main` 空）を追加
3. merge / push / cleanup 完了は raw/facts/situations/ 保存の default 対象に格上げ
4. worktree 内の sysadmin スクリプト改修は **「worktree 配下から叩いた時に動くか」を実装時に頭の中でシミュレート** を初動ステップに

## §5. 反映実装（承認済み）

### SAFE — 反映済み
- ✅ [memory 新規] `feedback_worktree_file_reread.md`: worktree 切替後の Read 再実行ルール
- ✅ [memory 更新] `feedback_bash_cwd_persistence.md`: all-good-ops の cwd reset hook 仕様反映 + worktree 内 `cd <abs> &&` プレフィクスルール追加
- ✅ [memory 追記] `feedback_one_session_one_branch.md`: merge / push / cleanup 完了は raw/facts/situations/ 保存対象
- ✅ [improvement-log] `wt-done.sh squash merge 検知改修` を次回 task 候補としてキュー

### SAFE — RISKY 却下
- ❌ [CLAUDE.md 微修正] §事実情報の自動 raw 保存ルール の situations 例追加 — ユーザー判断でスキップ（既存 memory への追記で十分とのこと）

### RISKY — キュー入り（別 PR）
- 📋 `wt-done.sh` の squash merge 検知ロジック実装（複数判定経路）

## 振り返り対象の主な commit

- `5e22edc feat(ops): worktree-default + hook-enforced parallel session discipline` (squash merged as `0ae09ca` on main, PR #13)

## 関連メモリ更新

- [[feedback-worktree-file-reread]] (新規)
- [[feedback-bash-cwd-persistence]] (更新)
- [[feedback-one-session-one-branch]] (追記)
