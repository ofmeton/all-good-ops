# 振り返り 2026-06-21 — hermes Phase2b カレンダー＋Phase3拡張 cc-auto

対象: hermes「あとでやる」パートナーを1セッションで Phase2b(カレンダー捕捉)＋Phase3拡張(cc-auto 自走コード実行)まで完成・本番稼働させたセッション。worktree=`worktree-hermes-todo-partner-spec`。

## §0.5 前回フォローアップ（再計測）
- `1 worktree 使い回し`（前回 open）→ **applied**: calendar も cc-auto も終始1 worktree で完結
- `worktree-file-reread`（4連続 open）→ **再発**: Edit 前 Read 漏れ複数（都度 Read→再Edit で吸収・実害小）
- `codex 委任` → **verified**: cc-auto を Codex 実装＋Claude二重レビューで回し fail-open 10件検出まで確認
- `AskUserQuestion 封印` → **applied**: genuine fork のみ確認、「go」は即実行

## §1 良かった点
- 出荷前に自分で実証し、codex exec フラグ誤り・verdict 解析の詐称穴・race をスモークと事前検証で自力発見→ go-live 前に全潰し
- 二重レビュー（code-reviewer + silent-failure-hunter）を並列起動し、半信頼入力×自動merge の fail-open を体系摘出→全ガード fail-closed 化
- 一括 import 停滞（134/1892）で待たず 200件チャンク分割にピボットし全量移行をやり切った

## §2 詰まった/二度手間
| # | 事象 | 原因 | 本来すべき動き |
|---|---|---|---|
| 1 | `codex exec --ask-for-approval` 不在で wrapper 無効 | 外部 CLI 実フラグ未確認で実装 | コード化前に `codex exec --help` 確認 |
| 2 | codex_review が stdout 解析で詐称に脆弱 | codex 出力形式を未検証で先頭行前提 | 出力を1回実機確認→`-o`最終メッセージ解析 |
| 3 | repo解決が NeedInfo（直下前提） | `~/Projects` 直下と仮定（実はネスト） | パス前提を実環境で確認 |
| 4 | race で二重merge→Blocked上書き | launchd と手動を同時稼働／間隔超過 | launchd unload してから手動／最初から flock |
| 5 | ドキュメントが読めない | remote-control でローカルパス提示 | 最初から GitHub URL で渡す |
| 6 | Edit 前 Read 漏れ複数 | 長セッションで read 状態を見失う | 実害小・自己修正されるので低優先 |

## §3 自動化・効率化
- 外部 CLI wrapper は実装前に `--help`/出力形式を実機確認（`feedback_factcheck_external_specs` に追記）
- launchd/cron は既定で flock 単一フライト（`feedback_cron_singleflight_lock` 新規作成）

## §5 レンズ
- 🪙 トークン: AskUserQuestion のツール呼び出し malformed 多発でリトライ浪費／doc 提示でローカルパス→再 push の二度手間
- ⚡ Claude機能: 二重レビューの parallel agents を適切活用

## §6 反映（SAFE・即反映済み）
1. `feedback_always_full_absolute_path` に「remote-control では最初から GitHub URL」追記
2. `feedback_factcheck_external_specs` に「外部 CLI wrapper は実装前に --help/出力形式実機確認」追記
3. `feedback_cron_singleflight_lock`（新規・セッション中に作成）
4. improvement-log にエントリ（remeasure 付き）
5. project_hermes_todo_partner / notion-task-db.md に cc-auto 稼働＋学び反映

RISKY なし（全て既存への追記 or セッション中に合意済みの実装）。

## 次回監視
- worktree-file-reread は 5+連続だが実害小→低優先で寝かせ（hook 強制は過剰）
- cc-auto: repo解決の glob 化、autonomy 提案 UX の hermes 側配線が未実装（次に hermes を触る時）
