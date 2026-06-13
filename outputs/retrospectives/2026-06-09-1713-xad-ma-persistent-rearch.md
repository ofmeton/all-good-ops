# セッション振り返り — 2026-06-09 17:13

**対象**: X発信システムを**永続 Managed Agents 化**（段階1-1A）し本番出荷したセッション。計画承認 → 1A 実装（P1〜P4＋ant変換）→ migration適用 → bootstrap → compose/check 本番 smoke → deploy → PR#145 merge。

## §0.5 前回フォローアップ（再計測）
- **prod-lib-diag スキル** → ✅ applied（smoke で手書きせずスキル起動）
- **計画段階の公式 docs ファクトチェック** → ✅ verified（claude-api skill で MA 仕様確認＋ant を `--help` で確定。使い捨て agent アンチパターンを設計段階で発見）
- **TaskCreate 閾値** → ✅ applied（序盤に5タスク登録）
- **squash merge 後の worktree 手動片付け** → ❌ **再発**（`gh pr merge --squash --delete-branch` が worktree 衝突で fatal。既存 feedback がむしろ --delete-branch を推奨していたのが原因 → feedback 訂正）

## §0 raw 保存漏れ
なし（全て開発作業。発話は依頼／方針決定／確認で people/contracts/situations の事実なし）。

## §1 良かった点
1. agent teams を規律通り（architect 設計 → system-engineer が SendMessage で文脈継続して P1〜P4＋ant変換 → 本番実走検証）。各フェーズ commit で revert 可能。
2. 「本番実走で実証」を省略しなかった。654 緑で止めず prod-lib-diag で compose→check を実走、opus draft を haiku checker が事実誤り検出して差し戻すところまで確認。
3. 推測せず裏取り（MA 永続パターン／Console 可視性／ant フラグ確定）。
4. 人間ゲートを正しく刻んだ（migration 前に実スキーマ Inspect、bootstrap は dry-run→本番、deploy は npm ci 後、opus コスト先出し）。
5. 方針転換（ant CLI）に手戻り最小（機構非依存の工程移行は完走、bootstrap だけ1パス変換）。

## §2 詰まった瞬間
| # | 事象 | 原因 | 本来すべき |
|---|---|---|---|
| 1 | `gh pr merge --delete-branch` がローカルで fatal（main worktree 衝突） | 既存 feedback が --delete-branch を推奨していた通りにやった＝2回目の再発。worktree 運用中は gh の merge 後ローカル処理が main checkout を誘発 | --delete-branch を付けず API merge → 手動で remote 削除＋worktree remove |
| 2 | compose smoke 空振り（processed:0）→ 素材フラグ clear で1往復 | eligible を `selection_status='queued'` だけで判定（実は全件 composed_at セット済） | lib が読む実 WHERE で eligible 数を先に確認 |

## §5 観点レンズ
- 🔧 未活用資産: `wt-done.sh`/`wt-done-merged.sh` を使わず手動 `gh pr merge` で #2-1 の罠。merge〜片付けを wt-done 系に通すべき。
- ⚡ Claude機能: plan mode / background agents / SendMessage 文脈継続 / ToolSearch / skill群 を概ね活用。

## §6 反映（SAFE 3件・適用済）
- A `feedback_squash_merge_manual_worktree_remove.md` 訂正: worktree 運用中は `gh pr merge` に **`--delete-branch` を付けない**（fatal の正しい手順に書き換え）。
- B `prod-lib-diag/SKILL.md` 追記: 対象 eligibility は **lib が読む実 WHERE** で事前確認（status だけで判断しない）。
- C `improvement-log.jsonl` 追記: 今回の再計測（3 applied / 1 再発→強化）。

新規 memory/skill は作らず（全て既存追記で代替）。
