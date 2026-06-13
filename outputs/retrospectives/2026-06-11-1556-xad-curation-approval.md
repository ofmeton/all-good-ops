# 振り返り — 2026-06-11 15:56 / xad キュレ・承認・投稿 7機能（設計→並列実装→本番反映）

対象: X発信システム(apps/xad-dashboard + apps/x-account-system)のキュレーション/承認/投稿に7機能追加。
設計=architect(Fable 5)、実装=system-engineer 4並列、レビュー=pr-review-toolkit、PR#162 merge、本番反映(migration 0025-27 apply / worker deploy / dashboard deploy / DB層smoke)まで1セッション完遂。

## 前回フォローアップ（再計測）
- `db-migration-pre-inspect` → **verified**（apply前に pg_constraint/information_schema/pg_get_viewdef で制約名・列・view drift を確認し無修正適用）
- `wrangler-npm-ci` / `deploy前wrangler whoami` / `deploy-verify-all-secrets` → **applied**（smoke後にDB層実クエリ + SUPABASE_SCHEMA確認）
- `taskcreate-threshold`（前回 retired）→ plan doc + Phase構造で追跡し脱落なし＝**降格判断の妥当性を確認**
- `feature-factory-first`（前回 closed）→ ユーザーが並列チーム明示指定のため agent-teams体制を選択＝適切

## 良かった点
- 設計段階で既存資産を file:line 洗い出し → `recommend.ts`・`markPublished` が既実装と判明し要件①②は配線のみで実装量削減
- 並列をファイル排他(W1-W4 disjoint)に分解 + 並列agentはcommitさせずrootが集約 → 4並列が同一worktreeで index.lock 競合ゼロ完了。検証も vitest+tsc にスコープし `.next` 競合回避
- 本番DDLを Inspect→apply→検証の3段で安全適用
- 環境問題とコード問題を切り分け（Turbopack panic→`--webpack`／smokeは 401(SSO) と 500 を切り分け DB層実クエリで確証）

## 詰まった / 二度手間
| # | 事象 | 原因 | 本来 |
|---|---|---|---|
| 1 | `npm ci` が main root で空振り（worker dir未cd） | cwd reset hook を失念＝**既存 `feedback_bash_cwd_persistence` の未適用** | deploy系の連続コマンドも毎回 `cd <abs> && ...` |
| 2 | `next build`(Turbopack) symlink panic | wt-new の node_modules symlink × Next16 Turbopack既定 | 最初から `--webpack`（memory化で対応） |
| 3 | AskUserQuestion 1回 reject | 選択肢に長い前置きを併記し重複的に見えた | 質問は簡潔単体で |

## 観点レンズ
- 🔧 未活用資産: なし（architect/system-engineer/pr-review-toolkit/finishing 適切活用）。むしろ既存 bash_cwd memory の未適用が反省
- ⚡ Claude機能: Phase0直列→4並列→統合 は Workflow tool(pipeline/parallel)が嵌る形。今回は非ultracode＆素朴指示で Agent手動並列で十分。次回さらに大規模 or ultracode時に検討

## 反映（SAFE一括・承認済み）
- A: `memory/feedback_worktree_next16_turbopack_symlink.md` 新規（セッション中作成・維持承認）+ MEMORY.md 索引
- B: `wiki/dev/agent-teams-playbook.md` に並列実装tactic追記（共有基盤先行Phase0/並列agentはcommitさせずlead集約/検証スコープ・フルbuild統合1回/統合で継ぎ目レビュー、2名→条件付き4名可）
- C: `data/improvement-log.jsonl` 追記（再計測 + bash_cwd regression 監視）

## 監視（open）
- bash_cwd-regression: deploy系連続コマンドで既知memoryを再び未適用しないか
- AskUserQuestion 簡潔化
