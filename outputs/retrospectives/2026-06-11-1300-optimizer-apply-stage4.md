# セッション振り返り — 2026-06-11 13:00 / optimizer Stage4 + 4B-2 apply-code runner（本番実証まで）

対象: X optimizer 自己改善ループの最終段。Stage4(4A レビューUI + 4B-1 apply-engine tier-T) を実装→本番実証、続けて Stage4-B2(apply-code runner = nested `claude -p` で config/prompt を自動コード適用) を spec→実装→本番フル実証。間に main repo 整理。PR #153〜#161。

## §0 raw 保存漏れ
ユーザー発話は全て作業指示・設定操作（モデル切替等）。people/contracts/situations の新規事実なし → raw 保存対象なし。

## §0.5 前回フォローアップ（再計測）
- `optimizer-stage4`（前回「次回 writing-plans から」）→ **verified**: Stage4 + 4B-1 + 4B-2 すべて本番出荷・実証完了。
- `feature-factory-first`（3連続 open）→ **closed**: 今回 brainstorm→writing-plans→subagent-driven を意図的に選択（CLAUDE.md で等価と明記）＝gap でなく選択。
- `taskcreate-threshold`（5→**6連続 open**）→ **retired**: 構造化トリガー後も harness reminder も効かず行動不変。根本原因＝メインループは TodoWrite を持たず、subagent-driven の逐次 dispatch + prose 追跡で順序見失い・確認漏れは実際に起きていない（症状なし）＝ワークフロー不適合。強制ルールから降格・索引除去・再計測打切。

## §1 良かった点
- 安全クリティカル工程に敵対的レビューを当て、4B-1 で実バグ（失敗時 rollback 未実装・guard fail-open）を摘出→即修正。
- 本番実証を throwaway＋rollback で正味ゼロ設計にしたことで、初回実走が 4 実バグを安全に摘出（1つずつ直して再走）。
- セキュリティ指摘（bypassPermissions）を妥当と認め acceptEdits へ即是正（receiving-code-review）。

## §2 詰まった/二度手間
| # | 事象 | 構造的原因 | 本来すべき動き |
|---|---|---|---|
| 1 | claude -p が plan-mode 起動→編集ゼロ | headless で `--permission-mode` 未指定 | nested agent 起動は permission-mode 明示を設計時点で |
| 2 | tsx / claude が spawn PATH に無い（2回） | 自動Bash環境は .zshenv 条件PATHを持たない | subprocess 起動は PATH 明示／絶対パス |
| 3 | .env.local secret を全 subprocess 継承→claude課金化＆gate偽陰性 | env を global process.env に積む | secret は必要な操作だけに（最小権限） |
| 4 | 本番実証を9回再走（毎回 apply_status/remote branch 残骸リセット） | pr_pending/error が apply_status セット→除外＋squash merge が remote branch 残す | 再走前提のクリーンアップ＋起動経路を先に smoke |
| 5 | PR#157 閉じ忘れ→#158 衝突 | 連続再走で PR 番号追跡が雑 | 再走ごとに直前生成物を確実にクローズ |

## §5 観点レンズ
- 🔧 未活用資産: `systematic-debugging` を明示起動せず（plan-mode/secret 究明は実質デバッグ）。次回 nested-agent／本番バグ究明は起動。
- 🪙 トークンコスパ: 9回再走は高コスト。runner の dry-run は claude を呼ばないため起動経路が未検証で実走初発覚。外部CLI を含む経路は単発 smoke を先に。
- ⚡ Claude機能: TaskCreate 不使用（6連続→retire 判断）。

## §6 反映（承認済み）
- **SAFE**: ① 新規 memory `feedback_headless_claude_subprocess.md`（permission-mode acceptEdits / secret unset / PATH）② wiki `engineering-principles.md` 原則7（最小権限×初回安全弁×起動経路smoke）③ improvement-log 追記。
- **RISKY**: ④ `feedback_taskcreate_scope_threshold.md` を降格（6連続open・ワークフロー不適合・索引除去・再計測打切）。

## Open（次回監視）
- apply-code runner hardening 未実装: `mergePr --delete-branch` / 実行時 PATH 明示 / Docker sandbox（acceptEdits の worktree 外 Write 残存リスク）。次回 apply-code 運用時に対応。
- 外部CLI 起動経路は dry-run と別に単発 smoke を先に。
