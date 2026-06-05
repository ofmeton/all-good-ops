---
type: meta
title: "Hot Cache"
updated: 2026-06-05
---

# Recent Context

> セッション間で保持される ~500 words のコンテキストキャッシュ。セッション開始時に最優先で読む。詳細: [[SCHEMA]] §ホットキャッシュ。

## Last Updated
2026-06-05 — **定時実行の現状把握・棚卸し**。リポ起因で稼働中の定時実行は**ゼロ**と確定。①ローカルlaunchd 4本=全`.disabled`(crontab空/ロードなし) ②Vercel cron: money-bot(deployment0+route未実装=INACTIVE)・x-buzz-radar(未デプロイ=INACTIVE)・minpaku-cleaning(本番稼働の可能性・**クライアント側で不可侵**)。PR#95でvercel.json 2件に`_comment_status`でINACTIVE根拠を明示、memory [[project-cron-automation-disabled]] に棚卸し追記。残骸script は手動運用の手順本体(skills/agents参照)のため**削除せず残置**。
（前スレッド）git全整理+運用ハイジーン体制化(PR#91 沈殿アラート/CLAUDE.md「運用ハイジーン」節)。xad 工程可視化ダッシュボード本番稼働 [[project-xad-observability-dashboard]]。

## Current Focus
- **運用ハイジーン残課題**: cron復活 or ops成果物の SessionEnd/Stop hook 化（対策3）/ monthly-audit に branch・worktree・origin 棚卸し組込（対策6）。cron系統は棚卸し完了=安全網再建は未着手。
- **xad observability 次フェーズ**: dlp/optimizer 独立trace / posterior可視化 / コスト推移 / UIから工程再実行。
- **🔴 ミナト広告設定（再開待ち）**: chrome-devtools MCP 接続待ち。[[project-minato-ad-settings]]
- **money-bot（未デプロイ）**: route未実装でcron不稼働。稼働させるには route実装+deployが前提。

## Recently Touched
- [[../outputs/retrospectives/2026-06-05-2009-cron-inventory-cleanup]] / PR#95(vercel.json INACTIVE明示)
- memory [[project-cron-automation-disabled]](Vercel cron棚卸し追記) / 新規 [[feedback_verify_orphan_before_delete]] / [[feedback_worktree_remove_from_main]](項5追記)
- `money-bot/vercel.json` / `x-buzz-radar/vercel.json`(`_comment_status`)
- [[../outputs/retrospectives/2026-06-05-1849-git-cleanup-and-ops-hygiene]] / `scripts/session-start-banner.sh`（前スレッド）

## Open Questions / Frontiers
- 運用ハイジーン: cron復活 vs hook化どちらで安全網を再建するか（cron系統は INACTIVE で棚卸し済）
- x-buzz-radar: 認証/SSRF（取込WIP既知課題）対処 + デプロイするか否か（現状未デプロイ）
- money-bot: route実装+deployして cron 稼働させるか / writer の事実捏造抑制（X6警告のみ）

## Conventions
- 500 words 以内 / declarative present tense / 全置換更新（古い項目は間引く）
- 更新タイミング: ingest 後 / 大きな query 合成後 / 戦略変更 commit 後 / 振り返り完了時
