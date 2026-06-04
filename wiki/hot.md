---
type: meta
title: "Hot Cache"
updated: 2026-06-05
---

# Recent Context

> セッション間で保持される ~500 words のコンテキストキャッシュ。セッション開始時に最優先で読む。詳細: [[SCHEMA]] §ホットキャッシュ。

## Last Updated
2026-06-05 — **x-account-system（はぐりん名義 X 自動投稿）が W1-W5 フル実装 → 本番 deploy → 実運用入り**。2026-06-04 に実投稿4件が LINE 承認経由で X に出た（実ツイートID付き、AUTONOMOUS_PUBLISH=false で全て人間承認）。PR #63〜#81（約19本）で配線+backend+Queues+投稿/承認/webhook + 全自動化(ingest/ideation/digest/optimizer/rollback/brownout4段階/oauth) + LINE UX(Flexボタン/修正・覚えて/引用リプライ/自由文意図) + コスト実数ダイジェスト。実走で本番バグを多数修正（token失効→自動refresh / スレッド連結投稿 / judge欠落crash / ideation orphan / DLP誤検出soft化 / max_tokens形式別 / 手動slot分離）。Worker `ofmeton-x-account` 最新 v9f95ca2b。詳細 SSOT: memory [[project-x-account-phase05]] + raw `2026-06-04-xad-operational-and-money-bot-down.md`。振り返り反映: wiki [[self/engineering-principles]] 新設 + memory feedback 5件 + improvement-log 4件。

## Current Focus
- **x-account 運用**: LINE で承認カード（本文コピー可 + 形式/品質メモ/[承認][却下]）を承認→投稿。cron 自動巡回（06:00 buzz→06:30 ideation→07/12/19 post→21:00 digest）稼働。手動投稿は manual-slot で標準スロットと分離。
- **writer ハルシネーション**: X6 出典グラウンディング警告で人間が弾く網。将来 writer 側で捏造抑制が候補。
- **🔴 ミナト広告設定 案件（再開待ち）**: chrome-devtools MCP 接続待ち。memory [[project-minato-ad-settings]]
- **money-bot 不調（保留）**: dailyPublishWorkflow が `publish_queue upsert: fetch failed`。ユーザー判断で一旦放置。

## Recently Touched
- [[self/engineering-principles]] (2026-06-05 新設・連結学びノート)
- [[../apps/x-account-system/]] (W1-W5 + 多数 runtime fix, v9f95ca2b)
- [[../raw/facts/situations/2026-06-04-xad-operational-and-money-bot-down]]
- [[../outputs/retrospectives/2026-06-05-0030-x-account-full-build-and-live-ops]]
- [[index]] / [[log]] (engineering-principles 反映)

## Open Questions / Frontiers
- writer の事実捏造（具体値ハルシネーション）を生成側で抑える方法（現状 X6 警告のみ）
- ideation の1日産出数 vs 3投稿/日の在庫バランス（現状 limit20→~5件/run）
- prod-lib-diag スキル化（queue/cron 診断ハーネスの型化）の是非
- money-bot `fetch failed` の原因調査（Supabase通信 or 設定）
- X soft launch 後の non_public_metrics 検証 / 投稿テーマ配分

## Conventions
- 500 words 以内 / declarative present tense / 全置換更新（古い項目は間引く）
- 更新タイミング: ingest 後 / 大きな query 合成後 / 戦略変更 commit 後 / 振り返り完了時
