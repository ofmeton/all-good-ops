# 振り返り 2026-06-14 19:00 — web-ui-bridge 複数選択 / 連続射影 / dynamic workflow バグ狩り

対象: 1継続セッションで web-ui-bridge を6PR（#208–213）。複数選択（修飾クリック＋まとめてプロンプト/D&D group/スタイル一括/複製削除・案Bアトミックバッチ）＋ドック被りガター＋UX微修正＋装飾の連続射影リアーキ＋スクロール二重青枠修正＋dynamic workflow でユーザー操作バグ一掃4件＋操作プローブパック。実装=Codex委任＋Claude設計/レビュー/実機 chrome-devtools 検証。

## 前回フォローアップ（再計測）
- codex-delegation: ✅ verified（前回 open→今回 Codex 多用）
- worktree-file-reread: ⚠️ 再発（5連続・都度 Read で吸収）
- 1 worktree 使い回し: ❌ 未適用（5 worktree／daemon 再起動＋npm install ×5）
- askuserquestion-fuuin: ✅ verified
- empirical-verify: ✅ verified（実機発見多数＋workflow 偽陽性を到達不能と確認して除外）

## 良かった点
- 経験的検証の徹底。dedup二重適用・選択モード切れ・子掴み・transitionラグ・ホバー二重枠を実機で発見。workflow の primaryIdx バグを「primary は常に最後＝到達不能」と実機確認し偽陽性除外。
- 構造的修正の判断。スクロール取り残しを連続射影 reproject で根絶＋回帰プローブ化。
- ユーザーのオプトインに沿った道具選択（dynamic workflow / Codex / plan mode）。

## 詰まった瞬間
| # | 事象 | 原因 | 本来 |
|---|---|---|---|
| 1 | daemon が古い server.mjs を配信（Task3 payloads 欠落の実バグ） | overlay.js はホット配信だが server.mjs は起動時ロード。Task3 前起動のまま放置 | daemon コード変更後はブラウザ検証前に再起動 |
| 2 | daemon 再起動＋npm install ×5 | 各改修で新 worktree（worktree daemon は独自 node_modules） | 1 worktree 使い回し or daemon を main から起動し worktree overlay を絶対パス配信 |
| 3 | プローブハーネス3 churn | Codex sandbox は Chrome 不可＝盲目実装→脆い exact セレクタ/TypeError | 構造セレクタ指定＋自分で実走＋skip 許容を最初から |
| 4 | worktree 切替後 File-not-read（複数・5連続課題） | 既読状態は worktree 単位 | 初回 Edit 前に Read |

## 改善提案（アクション）
1. daemon コード（server.mjs/apply/reorder）変更後はブラウザ検証前に必ず再起動（overlay.js はホット・server.mjs はコールド）。
2. ブラウザ駆動テストの Codex 委任は「構造セレクタ＋自分で実走検証＋skip 許容」前提で配線。
3. dynamic workflow の ROI 改善＝敵対反証段に再現プローブ実走を内包し `real` を経験で裏取り（今回 2.4M token / 実バグ4件）。

## レンズ
- ⚡ 機能: Workflow/plan mode/Codex/並列/ToolSearch を適切起用。ただし workflow 反証が reasoning 止まりで甘く、経験確認を workflow 内に入れるべきだった。
- 🪙 コスパ: reasoning だけの多数決は ROI 低。高レバー＝経験確認の前倒し。

## 反映（SAFE・即適用）
- wiki/self/engineering-principles.md: 「多エージェントの仮説は reasoning でなく実システムで確定する」原則を新設。
- .claude/skills/codex-implement/SKILL.md: 「Codex sandbox はブラウザ起動不可＝ブラウザ駆動テストは盲目実装→構造セレクタ＋自分で実走＋skip 許容」ガードレール追記。
- data/improvement-log.jsonl: 本エントリ（再計測＋open items）。
- 本体の学び（連続射影アーキ・複数選択・プローブパック）は PR 内で HANDOFF/memory に反映済み。
