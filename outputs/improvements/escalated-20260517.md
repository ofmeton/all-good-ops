# 改善提案エスカレーション 2026-05-17 (Iteration 6 / 翌週分)

> 秘書による審査結果。SAFE 1件は `improve/iteration-6-20260517` ブランチで適用済み。本ファイルは RISKY または適用環境制約で保留となった2件を記録する。

## 適用済み（参考）

- **提案3: monthly-audit.sh に外部スポーク鮮度モニタ追加** → SAFE / applied
  - 読み取り + ログ出力のみ。既存挙動を変更しない
  - branch: `improve/iteration-6-20260517`

---

## エスカレーション 1: 提案1（system-engineer.md / rapid-hp-operator.md への「よくある失敗」追記）

### 対象提案
proposal-20260517-it6.md §「提案1: 5/17 retrospective の根本原因 pivot 規律を system-engineer.md と rapid-hp-operator.md に反映」

### 対象ファイル
- `.claude/agents/dev-automation/system-engineer.md` （L98-101 の「よくある失敗」セクション拡張）
- `.claude/agents/business-ops/rapid-hp-operator.md` （L267-273 の「よくある失敗」相当節に最大3行追記）

### 秘書の SAFE/RISKY 判定
**SAFE**（agent 定義の文言追記のみ・既存挙動破壊なし・memory 参照を残す構造）。

判定基準上は自動承認可能だが、**適用環境制約でブロック**された。

### エスカレーション理由
`.claude/agents/` 配下は Claude Code harness 側で **sensitive file** として保護されており、Edit ツールが秘書の自動承認権限とは独立したレイヤーで毎回 permission prompt を要求する。本セッション中に 3 回試行したがすべてブロックされた（user の対話的承認なしには突破不能）。

### 推奨アクション
**承認**（人間トリガーで手動適用）

人間が以下のいずれかの方法で適用してください:
1. このセッションで permission prompt に承認を出す → 秘書が Edit を再試行
2. proposal-20260517-it6.md §「提案1」の diff をそのまま手動で 2 ファイルに反映してコミット
3. `.claude/settings.json` の permissions に `.claude/agents/**/*.md` への Edit 許可を恒久追加（人間確認ルール側との整合性レビューが必要）

### 適用時の補足
- 提案1-a（system-engineer.md）は diff が明示済み。そのまま反映可
- 提案1-b（rapid-hp-operator.md）は「最大3行・既存『よくある失敗』節の末尾に追記」のみ指定で具体行は秘書/エージェント判断。Vercel デプロイ文脈の3行（迂回連鎖 / `.env.local` バックアップ / Hobby cron 確認）を推奨

### 人間への質問事項
- Q1: 上記 1〜3 のどの適用方法を採りますか？
  - （回答欄）

- Q2: `.claude/agents/**/*.md` への Edit 自動許可は将来サイクルでも有効にしますか？
  - （回答欄）

---

## エスカレーション 2: 提案2（usage-log.jsonl 廃止 + improvement-log を SSOT に統合）

### 対象提案
proposal-20260517-it6.md §「提案2: usage-log.jsonl の運用方針確定（廃止 + improvement-log を SSOT に統合）」

### 対象ファイル
- `CLAUDE.md`（パイプライン Step 4 の記述修正・人間確認ルール内 `data/usage-log.jsonl` 参照行）
- `scripts/self-improve.sh`（usage-log 読み取り箇所を improvement-log に切り替え）
- `scripts/monthly-audit.sh`（同上 + 末尾 cycle ログの書き込み先も影響）
- `.claude/agents/secretary.md`（「起動時に必ず行うこと」内の `data/usage-log.jsonl` 参照を `improvement-log.jsonl` に置換）
- `data/usage-log.jsonl`（末尾に deprecated 行追記）

### 秘書の SAFE/RISKY 判定
**RISKY**。

### エスカレーション理由（該当ルール）
1. **運用基盤の方針確定（SSOT 切替）** で、影響範囲が複数ファイル横断。提案文自身が「SSOT 切替で参照箇所の取りこぼしがあると monthly-audit が静かに壊れる可能性」と明記している
2. **秘書自身の定義ファイル（secretary.md）の変更を含む** → secretary.md の「改善提案審査モード」§「RISKY 判定」リスト該当
3. **CLAUDE.md パイプライン Step 4 の記述変更**を含む。CLAUDE.md 内「確認不要の操作」リストには `data/usage-log.jsonl` への追記も明記されており、この行も同期修正が必要 → secretary.md の RISKY 判定リスト「CLAUDE.md のルーティングテーブルの大幅変更」ほど大きくないが、「人間確認ルール」セクションに隣接する記述の変更で、判定境界として RISKY 寄り
4. **`scripts/self-improve.sh` のロジック変更**を含む（バグ修正ではなく読み取り対象の切替）

### 推奨アクション
**修正して再提案**

理由:
- 廃止方針自体は妥当（6週間データなしの実態と整合）だが、複数ファイル横断のため 1 サイクル 3 件枠の 1 件として扱うには影響範囲が大きい
- 次サイクルで「参照箇所網羅リスト」を先に成果物として出してもらい、それを別途レビューしてから差分適用するのが安全
- もしくは提案2を「Step A: usage-log.jsonl の deprecated 行追記のみ」「Step B: 参照書き換え」の2サイクルに分割する

### 人間への質問事項
- Q1: 提案2の取り扱いはどれを選びますか？（A. このセッションで一括適用承認 / B. 次サイクルで分割再提案 / C. 却下 / D. usage-log を残し自動 append フックを実装する方向に転換）
  - （回答欄）

- Q2: 仮に B（分割）を選ぶ場合、Step A（deprecated 行のみ）は本サイクル内で先行適用してよいですか？
  - （回答欄）

---

## サマリー

| 提案 | 判定 | 状態 |
|---|---|---|
| 1. 根本原因 pivot 規律を agent 定義へ反映 | SAFE | escalated（harness 環境制約） |
| 2. usage-log.jsonl 廃止 + improvement-log 統合 | RISKY | escalated（影響範囲・SSOT 切替） |
| 3. monthly-audit.sh に外部スポーク鮮度モニタ追加 | SAFE | applied（improve/iteration-6-20260517） |

人間判断待ちで作業ブロック中の提案はありません（提案1はブロックされても運用は継続可能。次サイクルで持ち越し可）。
