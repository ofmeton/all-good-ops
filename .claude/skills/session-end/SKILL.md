---
name: session-end
description: セッション終わりの後片付けを標準化する。git 状態確認→副産物(raw/facts・outputs・wiki・振り返り・新スキル)のコミット完了→task ブランチの merge/PR/discard 決定と main 復帰→dev/build プロセス停止・一時ファイル/スクショ掃除→workspace 全リポの未コミット確認→「main・未コミット0・残プロセス0」を報告 までを行う。ユーザーが「セッション終了」「session end」「終わりにする」「店じまい」等と終了を宣言したとき起動する。session-retrospective の最終フェーズからも呼ばれる。
---

# セッション終了処理（Session End）

## 概要

セッションの幕引きを「main クリーン・副産物コミット済み・後片付け済み」の状態へ収束させる。CLAUDE.md「## GitHub 運用規律 → 終了時 / 運用ハイジーン（沈殿防止）」の方針を、毎回実行できるチェックリストに具体化したもの。書いた副産物が宙に浮いたまま終わる・task ブランチに居座る・dev プロセスが残るのを防ぐ。

- **いつ**: ユーザーが「セッション終了」「session end」「終わりにする」「店じまい」「おつかれ」等で終了を宣言したとき。または `session-retrospective` の最終フェーズから連続で。
- **何のために**: 次セッション開始時に「main 上・未コミット 0」から始められる状態を担保する。

## 中核原則

1. **副産物はそのセッション内でコミットまで完了**: raw/facts・outputs・wiki・振り返り・新スキルは着地レールが無く沈殿しやすい。宙に浮かせない。
2. **task ブランチに居座らない**: 完了したら必ず main に戻す。long-lived task ブランチ禁止。
3. **人間確認ルールは終了処理でも不変**: 送信系・金銭・migration・raw/ 上書き削除は終了処理に紛れても確認必須。

## フェーズ（順に実行）

### 1. 状態把握
```bash
pwd && git branch --show-current && git status --short -uall && git worktree list
```
- 今どこにいるか（main か task か worktree か）、未コミットは何か、worktree は何が残っているかを一望する。黙判定せず1行で現状を述べる。

### 2. 副産物コミット
- 未コミットの副産物（raw/facts・outputs・wiki・retrospectives・新スキル・memory 索引など）を確認し、**そのセッション内で commit まで完了**する。
- `main` 上なら `ALLOW_MAIN_COMMIT=1 git commit ...`（retro 副産物等の定番）。task ブランチなら通常 commit。
- **据え置き（確認必須のまま）**: 送信系（メール/LINE/SNS）・金銭・DB migration を含む変更は、終了処理に紛れ込んでも人間確認を取る。`raw/` の上書き・削除はしない。
- staged 一覧を先出ししてから commit する（[[feedback_git_commit_diff_check]]）。

### 3. ブランチ後始末
- 作業 task ブランチが完了済みなら `superpowers:finishing-a-development-branch` で **merge / PR / discard を必ず決定**する（未決のまま放置しない）。
- PR 運用なら push 前 verify（`git log --oneline @{u}..HEAD` or `main..HEAD`）で誤 commit/並列混入を最終検知。auto-merge 既定。
- **squash merge した worktree は `wt-done.sh` で検知できない**（branch --merged 非一致）。main repo の cwd から手動で: `git worktree remove <path> --force && git branch -D <branch> && git push origin --delete <branch>`（[[feedback_squash_merge_manual_worktree_remove]] / [[feedback_worktree_remove_from_main]]）。
- 終わったら `main` に戻り、PR merge 済みなら `git pull` で作業ツリー同期（[[feedback_pull_after_merge]]）。

### 4. プロセス / 一時物の掃除
- このセッションで起動したバックグラウンド dev/build/watch を停止（例 `pkill -f "next dev"`）。`pgrep -fl "next dev"` 等で残存ゼロを確認。
- デバッグ用スクリーンショット・一時ファイル・`.playwright-mcp/` 等の作業残骸を削除（コミット対象の成果物は消さない）。
- 認証トークン等を一時ファイルに書いた場合は削除する（[[feedback_credential_disclosure_warning]]）。

### 5. workspace 横断確認
- cwd だけでなく workspace 全 git リポを走査し、沈殿（VSCode バッジ肥大の元）が無いか確認:
```bash
for d in <workspace の各 git リポ>; do echo "== $d =="; git -C "$d" status --porcelain -uall | head; done
```
- 大量に溜まっていたら `git-repo-cleanup-protocol` スキルへ委譲する（[[feedback_vscode_badge_multi_repo_diagnosis]]）。本セッションで触っていない他リポの未コミットは、勝手に commit せず存在だけ報告する。

### 6. 最終報告
- 「`main` 上・未コミット 0・残プロセス 0・worktree 整理済み」を1行で報告する。
- 落とした verify・スキップした手順があれば正直に述べる（[[feedback_communication_style]]）。
- **持ち越し（open items / 未修正バグ / 次回監視）があれば明示**して終える。

## 絶対にやらないこと

1. **確認なしで送信系/金銭/migration を含むコミットをしない** — 終了処理の流れに紛れても人間確認は不変。
2. **`raw/` を上書き・削除しない** — immutable。
3. **task ブランチに居座ったまま終わらない** — merge/PR/discard を決めて main に戻る。
4. **起動したバックグラウンドプロセスの停止を忘れない** — dev サーバ等を残すと次セッションでポート衝突。
5. **未コミットの副産物を「次回やる」で先送りしない** — 沈殿の温床。そのセッション内で着地させる。
6. **他リポの未コミットを勝手に commit しない** — 存在を報告し、整理は `git-repo-cleanup-protocol` で別途。

## 関連リソース

- CLAUDE.md「## GitHub 運用規律」（終了時 / 運用ハイジーン）= 本スキルの上位方針 SSOT
- `superpowers:finishing-a-development-branch`（ブランチの merge/PR/discard 決定）
- `git-repo-cleanup-protocol`（workspace 全体の大掃除が要る時の委譲先）
- `session-retrospective`（振り返り→反映の後、最終フェーズで本スキルを実行）
- memory: [[feedback_squash_merge_manual_worktree_remove]] / [[feedback_worktree_remove_from_main]] / [[feedback_git_push_log_verify]] / [[feedback_vscode_badge_multi_repo_diagnosis]]
