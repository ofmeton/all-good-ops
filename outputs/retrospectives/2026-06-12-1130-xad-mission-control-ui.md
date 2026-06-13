# セッション振り返り — 2026-06-12 11:30

対象: xad-dashboard 全8ページのミッションコントロール風ダーク UI フル刷新（PR#173）＋「執筆へ送る」モーダル不可視バグの調査・修正（PR#174）。いずれも本番デプロイ済。

## 前回フォローアップ（再計測）
- `deploy-no-confirm`: **verified** — デプロイまで確認なしで自走
- `squash-merge 手動remove`: **verified** — 2ブランチとも `--delete-branch` 付けず手動 remove + branch -D + push --delete 成功
- `bash_cwd-regression`: **再発（3連続）** — dev サーバを repo root から起動して空振り
- `taskcreate-threshold`(retired) / `feature-factory-first`(closed): 維持

## 良かった点
1. ライト固定→ダーク化の方針転換を AskUserQuestion で確認してから着手
2. クラス sweep を 1ファイル試験→diff→全適用（既存 feedback 準拠）。1ページ=1コミット
3. 各フェーズで lint/test/build + Playwright スクショ目視
4. バグ調査2周目で systematic-debugging を厳格適用。computed style の `transform: matrix(1,0,0,1,0,0)` を発見→JS で transform を消して再現確認（最小テスト）→根本原因を一発特定
5. React #418 を発見したが今回の原因でないと切り分け、スコープ外と明示

## 詰まった瞬間・二度手間
| # | 事象 | 原因 | 本来すべき動き |
|---|---|---|---|
| A | 初回バグ調査で「コード正常・古いタブ説」と誤結論→ユーザーに再発される | DOM count(dialogOpened:1)だけ見てスクショ未目視。evidence before assertions 違反 | UIバグは「見える位置に描画」を座標/computed style/スクショで実証してから結論 |
| B | dev を repo root から起動し空振り（bash_cwd 3連続） | サブディレクトリ前提の npx を親dirから実行 | npm/npx 前に package.json 所在確認・絶対パス cd を同一行に |
| C | Turbopack symlink panic | 既知だが worktree 前提の記憶。main repo の apps も symlink | 最初から `--webpack` |
| D | violet クラスの sweep 取りこぼし（light のまま本番へ） | 写像テーブル作成時に全色を grep 集計しなかった | 置換テーブルは対象の全色を grep してから作る |

## 観点レンズ
- 🔧 未活用: `web-perf` スキル / performance trace を省略。派手モーション案件では次回 web-perf で定量化
- 💬 プロンプト改善: 「背景が雲がかるだけ」を初回でもらえれば一発で containing block を疑えたが、初回スクショ目視していれば不要だったのでユーザー要求にはしない

## 反映（SAFE 5件・承認済み）
1. memory 新規 `feedback_css_fixed_containing_block.md` — transform/filter/backdrop-filter が fixed の containing block を奪う。fill:both の identity matrix が罠
2. memory 追記 `feedback_visual_diff_check_after_edit.md` — UIバグは DOM count でなく実描画で実証
3. memory 追記 `feedback_bash_bulk_replace_one_file_first.md` — 置換テーブルは全色 grep 集計してから
4. memory 追記 `feedback_worktree_next16_turbopack_symlink.md` — worktree 限定でなく symlink 全般へ一般化
5. improvement-log 追記 — bash_cwd 3連続 / UIバグ実証ハーネス保留 / web-perf 未活用 を記録

RISKY: なし（新規スキル・CLAUDE.md ルーティング・permissions 変更なし）

## 持ち越し（open）
- bash_cwd-regression 4回目で別手段検討（hook は過剰のため見送り継続）
- React #418 hydration（/curation 日時 UTC/JST ズレ）は実害軽微で未修正
