---
type: meta
title: "Hot Cache"
updated: 2026-05-27
---

# Recent Context

> セッション間で保持される ~500 words のコンテキストキャッシュ。LLM はセッション開始時に最優先でこれを読む。詳細仕様: [[SCHEMA]] §ホットキャッシュ。

## Last Updated
2026-05-27 — **x-account-design Phase 0.5 駆け抜け完了** (11 PR merged、main HEAD 384740c)。launch-roadmap + PR-A〜PR-E 全実装 (~12,000 LOC / 182 tests pass) + content drafts + handson + note 有料 #1 + Phase 1 Day 1 runbook。残: ofmeton ハンズオン (H-1〜H-10) のみで X+note soft launch (6/8 目標) 可能。

## Current Focus
- **ofmeton ハンズオン H-1〜H-10 進行待ち** — handson-h1-to-h10.md の Day A 〜 Day E に従い 2-3h で完了 (X Developer + Supabase + Anthropic/OpenAI + Cloudflare or launchd + LINE + note 購読 + budget 確認)
- **Phase 1 Day 1 (2026-06-08) X+note soft launch** — phase1-day1-runbook.md §1 前日チェックリストを 6/7 実行
- money-bot Phase 1 残タスク (Supabase / LINE / Meta / Vercel 人間タスク、別 session で着手予定)
- ai-radar v2 安定運用観測 (Phase 1-8 + 7day 窓 + X 5 アカ稼働中)
- terra-isshiki / minpaku-cleaning 個人案件は 2026-06 末完納

## Recently Touched
- [[../outputs/improvements/x-account-design-consolidated/launch-roadmap]] (PR #30)
- [[../outputs/improvements/x-account-design-consolidated/handson-h1-to-h10]] (PR #33、855 行)
- [[../outputs/improvements/x-account-design-consolidated/phase1-day1-runbook]] (PR #39、390 行)
- [[../outputs/improvements/x-account-design-consolidated/content-drafts/phase1-month1-initial-content]] (PR #31)
- [[../outputs/improvements/x-account-design-consolidated/content-drafts/note-paid-1-draft]] (PR #35、4,200 字)
- [[../apps/x-account-system/lib/editor/pipeline]] (PR #34、Editor 6+5)
- [[../apps/x-account-system/lib/publisher/x-publisher]] (PR #36)
- [[../apps/x-account-system/lib/optimizer/thompson]] (PR #37)
- [[../apps/x-account-system/lib/safety/kill-switch]] (PR #38)
- [[../apps/x-account-system/lib/visualizer/codex-image]] (PR #40)
- [[../outputs/retrospectives/2026-05-27-1500-phase05-driven-complete]] (本セッション振り返り)

## Open Questions / Frontiers
- ofmeton 側 H-1〜H-10 完了タイミング (6/7 前日チェックリスト着手の trigger)
- H-2 Supabase Free tier 2 project 上限 (民泊清掃と x-account-system 同居 → Phase 0.5 in-memory fallback で 6/7 直前 provision の方針確認)
- H-4 Cloudflare Workers Paid vs mac launchd の最終判断
- Phase 1 Month 1 末 (7/31) note 有料 #1 公開時の価格 (¥980 vs ¥500) と公開日確定
- Optimizer Phase 1 起動後 30 投稿/60 投稿 posterior 反映の精度実測 (E-46 / E-47 / E-52)

## Conventions
- ファイルサイズ目安: 500 words 以内
- 文体: declarative present tense
- 更新タイミング: ingest 完了後 / 大きな query 合成完了後 / 戦略変更 commit 後 / セッション振り返り完了時
- 全置換更新（追記しない・古い項目は間引く）
