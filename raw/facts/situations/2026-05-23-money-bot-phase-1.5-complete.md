---
date: 2026-05-23
category: situations
source: session
---

# money-bot Phase 1.5 完走 + Phase 1 設計大幅変更

ユーザー指示 (2026-05-23 セッション後半) で Phase 1 設計を再編成:

## 設計変更点

1. **情報源**: ai-radar.articles → **twitterapi.io 直接 (x-buzz-radar MVP 移植)**
2. **生成**: writer / note を **一旦停止**、SNS (X / IG) 集中
3. **戦略意図**: SNS 攻略 (フォロワー獲得) → その後 note 着手の段階分け
4. **承認 UI**: 各生成物 (visual / reviewer / sns / general) に FB コメント欄
5. **FB 蓄積**: `approvals.feedback` jsonb に保存、各 agent prompt に直近 5 件を user message inject

## 実装完了 (commit 0fe1308 + 7073511)

- `lib/buzz-source.ts`: twitterapi.io advanced search + Haiku 関連度判定 (reviewer agent 流用)
- `lib/feedback-history.ts`: approvals.feedback から fetch + prompt context 整形
- `lib/agents.ts`: buzzToDraft / visualDesignerAgent / contentReviewerAgent / snsGeneratorAgent 全てに fetchRecentFeedback inject
- `lib/publishers.ts`: recordApprovalDecision に feedback 引数
- `workflows/daily-publish.ts`: buzz → draft → visual → sns → reviewer → approval → X/IG chain (note 除外)
- `app/approval-queue/[runId]/approval-form.tsx`: visual / sns / reviewer / general の 4 FB textarea
- `app/api/approval-hook/route.ts`: feedback validate + persist
- Supabase migration 0002: approvals.feedback jsonb + buzz_tweets テーブル apply 済

## E2E 動作確認

- cron trigger `wrun_01KSA9TQQKMVYMFSES3QY9TRJF` 起動 → LINE 通知到達 → 承認 UI で FB 入力動作確認
- ユーザー報告: 「きた。FB もできた。現状はまずまず」

## 残人間タスク (次)

- twitterapi.io アカウント作成 + API key 取得 → `.env.local` + Vercel env に投入
- 投入後の cron trigger で実 X バズの日本語化 SNS 投稿生成を確認

## Managed Agents の archive

- writer agent (agent_01AHPWqQrnzaNSHRq7acWaju) は Phase 1.5 で未使用
- Anthropic Managed Agents は PATCH / DELETE が API 経由でできない (HTTP 405) ため archive 状態のまま残存
- 害はない (workflow から呼ばれない)

## 統合設計書からの逸脱

- `docs/superpowers/specs/2026-05-23-publishing-engine-integration-design.md` では Phase 2 で x-buzz-radar 統合 + note 継続予定だった
- 実装着手中にユーザーが「情報源を x-buzz-radar のみに、note 一旦停止、SNS 集中」と再判断
- 設計書は次セッションで更新する (Phase 1.5 が事実上の Phase 2 早期統合の MVP)
