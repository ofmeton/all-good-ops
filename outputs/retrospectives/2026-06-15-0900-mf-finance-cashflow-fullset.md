# 振り返り: mf-finance 資金繰り強化フルセット（PR #214 反映まで）

- 日時: 2026-06-15
- 対象: mf-finance(個人用ローカル家計ダッシュボード) の資金繰り機能を一連で実装し main 反映
- スコープ: お金レーダーFV / 口座残高インライン編集 / 再取り込み full refresh / MF再取得 / 定期収入(毎週・変動・スキップ) / 期間選択・資金場所別カラム / 資金移動(振替・手数料・optimizer提案・アプリ内通知) → PR #214 squash merge

## 前回フォローアップ（再計測）
- `2026-06-13 codex-fallback-effort` / `2026-06-14 Codex委任+レビュー+chrome-devtools検証`: **applied/verified**。本セッションで Codex 委任を4回実施、毎回 `code-reviewer`+`silent-failure-hunter` ゲート→High級バグ検出修正→tsc/test/build→実機E2E。`git add <path>`(-A回避) も遵守。
- `2026-06-12 mf-finance-data-layer` の open 3件: 当該領域が非該当（Supabase→ローカルSQLite ピボット済）。superseded 扱い。

## 良かった点
- codex-implement ループを4機能で安定運用。レビューが毎回 Critical を実検出（expense day破棄・client error握り潰し・variable二重消失・migrateトランザクション欠如・total↔location乖離・口座存在チェック欠落）。
- Codex のサンドボックス由来逸脱（next/font 削除・`next build --webpack`）を毎回 revert。本番(next/font Lexend・`next build`)を壊さなかった。
- 実機 E2E で実挙動を実証（口座別カラム展開・振替の口座間移動&合計不変・残高反映・バリデーションエラー表示）。
- 大型2機能は plan mode＋AskUserQuestion で本質分岐をユーザーに委ね手戻り防止（メール実行方式=アプリ内通知のみ／適用範囲=収入のみ／未指定枠／振替=単発）。
- finishing-a-branch で worktree の gitignore 実DBに気づき削除回避（データ消失を防いだ）。

## 詰まった瞬間・二度手間
| # | 事象 | 原因 | 本来すべき動き |
|---|---|---|---|
| 1 | 振替フォーム日付が保存されず submit 2回空振り | chrome-devtools `fill` はネイティブ date 入力の React state を更新しない | controlled input は native setter+dispatch input/change を既定手法に |
| 2 | `npm run build` が Codex で毎回失敗→ローカル再検証 | Codex sandbox は network不可で next/font(Google Fonts) 取得不可 | Codex には build スキップ・tsc/test のみ報告させ build は Claude がローカル検証（ブリーフに明記） |
| 3 | ツール呼出が度々 malformed→retry 多発 | ツール呼出タグ生成の機械的崩れ | 機械的不具合・memory化不可（観測記録のみ） |

## 観点レンズ
- 🪙 トークンコスパ: `take_snapshot` 全ページ取得(1000+ uid) が高コスト。検証は `evaluate_script` の DOM 照会優先、snapshot は uid 取得時のみ。
- ⚡ plan mode / Codex / 並列レビュアー / chrome-devtools を適切活用。

## 反映（SAFE 4件・承認済み）
- A: `memory/feedback_browser_test_all_user_ops.md` 追記（React制御input は setter+event／検証は evaluate_script 優先）。
- B: `.claude/skills/codex-implement/SKILL.md` 追記（Next+next/font は Codex で build 不可→tsc/test のみ報告・Claude が build 検証）。
- C: `memory/project_mf_finance_dashboard.md` 追記（worktree gitignore 実DB→merge後も worktree 削除しない）。
- D: 本ファイル＋improvement-log entry。

## 監視（watch・次回再計測）
- take_snapshot のトークンコスト: chrome-devtools 多用セッションで evaluate_script 優先が定着したか。
- malformed tool-call 多発: 改善するか観測継続（機械的要因）。
