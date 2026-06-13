# 振り返り: web-ui-bridge（STUDIO風ビジュアルWeb編集ツール）構築

- 日時: 2026-06-13〜06-14
- 対象: 動いている実 Next.js+Tailwind サイト上の overlay で、要素をクリック/ドラッグして**決定的に実コードを編集**＋複雑なものは Claude 橋渡し。STUDIO を参照に UI を寄せる。
- 出荷: PR #195〜#204（Phase0 橋渡し → B/B.2 直接調整 → C 構造編集(並べ替え/reparent/複製/削除) → undo/redo → STUDIO実機調査タブ式 → セキュリティ硬化 → 色ライト化+永続化 → トークン0o600）

## 良かった点
- build-vs-buy を先に調査（Onlook=Apache2.0 だがクラウド結合で不適合）→ フルクローンの無駄build回避。
- Spike 0 で「React19 は fiber に file:line 無・App Router SC は名前出ず」を実装前に発見 → className/text/route を locator にする方針に。
- 全編集を**決定的な純コード操作**（className literal 置換 / @babel/parser の範囲入替）で実装＝陸さんの「非決定的(プロンプト→Claude)が嫌」に合致。
- Sonnet サブエージェントを**並列レビュー**に投入し実バグ5件検出（border-red-500 巻き込み等）。
- 指摘後、STUDIO を実機 devtools で計測して色（ライト）・構造を是正、undo 不可を**履歴+トークン永続化で根治**。

## 詰まった / 二度手間
| # | 事象 | 構造的原因 | 本来の動き |
|---|---|---|---|
| 1 | ダークUIで作り「色が全然違う」と再作業 | STUDIO が終始ブラウザで開いていたのに実機を見ず一般知識で推測 | 模倣対象が手元にあれば設計前に devtools 実測 |
| 2 | 9 worktree + terra 6回 clean reinstall の重複 | 同一機能の反復改善で増分ごとに新 worktree（squash→fresh-branch を増分単位で過剰適用） | 同一feature連続は1 worktree 使い回し + merge後 git pull |
| 3 | 「File has not been read」3連続再発 | 新 worktree で別worktree同名ファイル内容に引きずられ Edit 直行 | wt-new 直後は全未読扱い・初回 Read 先行 |
| 4 | Codex 未使用（活用指示あり） | 大改修を Opus main で実施 | まとまった実装は codex-implement 委任 |
| 5 | 「全ボタンテスト済」後に D&D/undo 破綻 | click-dispatch のみで実D&D・再起動後undo未検証 | 実操作（実ドラッグ/再起動後undo/壊れ復帰）を実機+目視で検証（恒久ルール化） |

## 改善提案（→反映済み）
- A 同一機能反復は1 worktree使い回し（[[feedback_one_session_one_branch]]）
- B UI模倣は参照が開いていれば設計前 devtools 実測（[[feedback_browser_test_all_user_ops]]）
- C 新 worktree 初回編集は Read 先行（[[feedback_worktree_file_reread]] 3連続→強化）
- D まとまった実装は Codex 委任（improvement-log open で監視）
- E dev daemon の依存状態は永続化（wiki 原則8）

## 残（次回）
- STUDIO 95% パリティ続き: ボックスモデルwidget・状態(hover)スタイル・下部bpバー位置・AI(✨)等
- Codex 委任の実践（次のまとまった実装で）
