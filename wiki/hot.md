---
type: meta
title: "Hot Cache"
updated: 2026-06-05
---

# Recent Context

> セッション間で保持される ~500 words のコンテキストキャッシュ。セッション開始時に最優先で読む。詳細: [[SCHEMA]] §ホットキャッシュ。

## Last Updated
2026-06-05 — **git 全整理 + 運用ハイジーン体制化**。メイン本体に149件が2週間沈殿しVSCodeバッジ194(全リポ合算)に膨張→全リポ整理(バッジ→0、全成果物をmainへ、worktree/branch大掃除)。根因=**運用副産物(raw/outputs/wiki)の着地レール欠如 × cron安全網の沈黙死 × 検知シグナル不在**の三重不全。対策 PR#91=SessionStart沈殿アラート(`scripts/session-start-banner.sh`、repo family -uall合算>20で🧹) + CLAUDE.md「運用ハイジーン」節(終了儀式/main復帰/全リポ走査/月次棚卸し) + 根因分析doc。github plugin無効化(gh CLIで代替)。
（前スレッド）xad 工程可視化ダッシュボード本番稼働 [[project-xad-observability-dashboard]]。hidamari-cms / x-account-system 本番運用中 [[project-x-account-phase05]]。

## Current Focus
- **運用ハイジーン残課題**: cron復活 or ops成果物の SessionEnd/Stop hook 化（対策3）/ monthly-audit に branch・worktree・origin 棚卸し組込（対策6）。
- **xad observability 次フェーズ**: dlp/optimizer 独立trace / posterior可視化 / コスト推移 / UIから工程再実行。
- **x-account 運用**: LINE承認カード→投稿、cron巡回稼働。
- **🔴 ミナト広告設定（再開待ち）**: chrome-devtools MCP 接続待ち。[[project-minato-ad-settings]]
- **money-bot 不調（保留）**: dailyPublishWorkflow `publish_queue upsert: fetch failed`。

## Recently Touched
- [[../outputs/retrospectives/2026-06-05-1849-git-cleanup-and-ops-hygiene]]
- `scripts/session-start-banner.sh`(沈殿アラート) / `scripts/wt-done-merged.sh`(新規) / [[git-repo-cleanup-protocol]]
- memory [[feedback_vscode_badge_multi_repo_diagnosis]] / [[feedback_branch_divergence_check_before_merge]]
- 取込: skill [[remotion-best-practices]]/create-onboarding-video / `x-buzz-radar/`(認証/SSRF課題=SECURITY-TODO.md)
- [[project-xad-observability-dashboard]]（前スレッド）

## Open Questions / Frontiers
- 運用ハイジーン: cron復活 vs hook化どちらで安全網を再建するか
- x-buzz-radar の認証/SSRF（取込WIP既知課題）をいつ対処するか
- writer の事実捏造抑制（X6警告のみ）/ money-bot `fetch failed` 原因

## Conventions
- 500 words 以内 / declarative present tense / 全置換更新（古い項目は間引く）
- 更新タイミング: ingest 後 / 大きな query 合成後 / 戦略変更 commit 後 / 振り返り完了時
