# 2026-05-22 14:25 セッション振り返り — Remotion 環境構築 + 並列衝突 2 回

## セッション概要

ofmeton 発信用の text→video パイプライン（Claude × Remotion）を立ち上げ。
1. 話題共有 → memory に reference 記録
2. 「使えるようにだけしておいて」→ Remotion 4 + React 19 + Tailwind v4 + TS の blank scaffold を `outputs/publishing/remotion/` に設置、動作確認、README 整備、commit + push
3. 「作ってみて」→ 5 シーン構成の Before-After 動画を実装 + レンダー + 静止画キーフレーム抽出
4. 「使いそうなエージェントに教えて」→ brand-publisher / visual-designer / CLAUDE.md / Remotion README を周知更新、commit + push

並列セッション衝突を **1 セッション内で 2 回**踏み、毎回救出した。

## §0 事実情報の raw 保存漏れチェック

走査結果: **保存漏れなし**。
- 外部 AI 業界動向（Claude × Remotion）は事実情報の対象外（人物・契約・状況のいずれにも該当せず）→ memory `reference_claude_remotion_video_gen.md` で記録 → 適切

## §1 良かった点

1. `create-video --yes` が git repo 内で fail する仕様を WebFetch で先に確認 → /tmp スキャフォールド + mv の回避策を一発で実行
2. blank scaffold の null Composition に意図的に最小アニメを書いて render verify → 視覚的妥当性まで確認
3. MP4 はチャット内で見られない制約に対し `npx remotion still` で 4 シーン PNG 抽出してビジュアル証拠を提示
4. 「使いそうなエージェントに教えて」要求に対し SSOT 分離を採用 — README を SSOT、エージェント定義は「README を読む」だけ
5. system reminder の "File modified" 通知に違和感を持って git diff の規模で実体確認（既存学習 `feedback_file_modified_notification.md` を活用）

## §2 詰まった瞬間・二度手間

| # | 事象 | 原因 | 先回りできたポイント | 本来すべき動き |
|---|---|---|---|---|
| 1 | **並列セッション衝突を 2 回踏んだ** (commit が他ブランチに乗った) | Step 0 で branch だけ切り worktree を切らなかった。初回衝突後も同じパターン | SessionStart hook 出力に既に他主題 task branch 多数 = 並列徴候 | セッション開始 + 実装系判定時に `git worktree list` で `+` 付き branch チェック → 並列徴候があれば worktree 隔離 |
| 2 | `cd outputs/publishing/remotion && ...` が Bash cwd persistence で fail | Bash tool の cwd persist 仕様を一瞬忘れた | memory `feedback_bash_cwd_persistence.md` 既出 | 重要 path 操作は絶対パス、または冒頭 `cd <abs root>` |
| 3 | `git stash push -- <pathspec>` が pathspec 外の `raw/facts/*` (A 状態) も巻き込んだ | git stash と staged-ADD の挙動を完全把握せず実行 | docs 事前確認 + status の "A " 行を pathspec の前に処理 | A 状態のファイルがある時は事前 `git reset HEAD --` で un-stage してから stash push |
| 4 | 動画 Composition.tsx の「user が scaffold に戻した」を system reminder の表示だけで信じかけた | system reminder の "File modified" は cache 通知で実態とズレあり | `feedback_file_modified_notification.md` 既出 | 編集 / 判断前に actual ファイルを Read 再確認（今回は git diff 規模で気付けた） |

## §3 自動化・効率化の余地

1. SessionStart hook に `git worktree list` 追加 — `+` 付きを即視認
2. 「実装系依頼」検出時の worktree 提案ルーチン化 — task ブランチ切替の上位手順
3. Remotion 動画レシピが増えてきたら `recipes/<name>.md` に分離

## §4 次回への改善提案

1. **実装系・新規ファイル系依頼と判定したら `git worktree list` を即実行**。`+` 付きあれば `git worktree add ../<repo>-<topic> task/<branch>` で隔離してから着手
2. **`git stash push -- <pathspec>` 前に `git status --short` で staged 一覧確認**。pathspec 外に `A ` があれば事前 un-stage
3. **system reminder の "File modified" → 次の Edit/Write/判断前に Read 必須**（機械的ルール化）

## §5 反映（SAFE 全件実行済）

| カテゴリ | 反映先 | 状態 |
|---|---|---|
| memory | `feedback_parallel_session_branch_check.md` 追記 | ✅ 並列徴候シグナル 4 つ |
| memory | `feedback_one_session_one_branch.md` 追記 | ✅ Step 0 で `git worktree list` 必須化 |
| memory (new) | `feedback_git_stash_pathspec_pitfall.md` | ✅ pathspec 外の A を巻き込む挙動 |
| memory index | `MEMORY.md` | ✅ git_stash_pathspec_pitfall を Feedback セクション末尾に追加 |
| improvement-log | `data/improvement-log.jsonl` | ✅ 4 件追記 (process_failure 1 + feedback_added 1 + feedback_updated 2) |

RISKY: なし（新規スキル化や CLAUDE.md ルーティング表変更は不要、既存ルールの徹底で十分）

## 関連 commit

- `task/260522-remotion-setup` d54dc39 — Remotion 環境初期化
- `task/260522-remotion-setup` 67d63b3 — エージェント周知 + サンプルレシピ

## 保留事項

- `stash@{0}` に別セッションの `raw/facts/*` staged ADD 10 件が含まれる。drop せず保持中（別セッションが index 復元したい時に `git stash apply` で戻せる）
- BeforeAfter 動画コード本体は worktree force remove で消失。再生成は README レシピ A から 1 分
