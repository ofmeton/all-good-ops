---
date: 2026-05-22
category: situations
source: session
---

# ai-radar 改修と money-bot の情報収集連携方針

ユーザー発話 (2026-05-22):

- 現在 ai-radar を改修中
- 改修完了後、money-bot の情報収集パイプラインを ai-radar と連携させたい意向
- money-bot 側は ai-radar の DB / API から AI 動向シグナルを受け取って note 記事ネタとして使う想定
- money-bot 計画書 (`docs/superpowers/specs/2026-05-22-money-bot-design.md`) では §5 cron pipeline の冒頭ステップ「AI 動向シグナル収集」を ai-radar 連携前提で書く

ai-radar 改修完了タイミングは未確定。完了通知を受けてから money-bot Phase 1 で接続テスト。
