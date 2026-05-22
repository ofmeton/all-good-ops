---
date: 2026-05-23
category: situations
source: session
---

# money-bot Phase 1 Claude 担当部分 実装完了

`task/260523-money-bot-phase1` ブランチで money-bot Phase 1 のうち「人間作業以外」の範囲を実装完了。

## 完了内容

- Next.js 16 App Router 化。`next build` success / `tsc --noEmit` 0 error
- 依存 pin: next 16.2.6 / workflow 4.2.4 / @workflow/ai 4.1.2 / @anthropic-ai/claude-agent-sdk 0.3.148 / @line/bot-sdk 11.0.0 / @supabase/supabase-js 2.106.1 / zod 4.1.8 / resend 6.12.3
- `workflows/daily-publish.ts` — WDK `"use workflow"` + `defineHook` + signal→topic→writer→visual→review→sns→approval→publish→kpi の 9 step chain
- `lib/agents.ts` — Claude Agent SDK `query()` + `settingSources: ['project']` + `cwd: CLAUDE_PROJECT_ROOT` + zod schema 出力安全パース + ANTHROPIC_API_KEY 欠如時 mock fallback
- `lib/ai-radar.ts` — α (direct Supabase read) + β (API endpoint) 両対応。両方未設定で MOCK
- `lib/notify.ts` — LINE messagingApi.MessagingApiClient (v11 API) + Resend fallback
- `lib/publishers.ts` — Instagram Graph API publish (v22.0, 4-step) + note/X は publish_queue queued
- `lib/budget.ts` — recordKpi / checkBudgetOrAbort / KillSwitchError / BudgetExceededError
- `app/api/cron/daily-publish/route.ts` — CRON_SECRET 認証 + `start(dailyPublishWorkflow)`
- `app/api/approval-hook/route.ts` — `approvalHook.resume(token, decision)` で workflow 再開
- `app/api/line-webhook/route.ts` — LINE signature 検証 + userId capture → ai_radar_signals_cache
- `app/approval-queue/[runId]/page.tsx` + `approval-form.tsx` — モバイル最適化軽量 Web 承認 UI
- `next.config.ts` — `outputFileTracingRoot: workspaceRoot` + `outputFileTracingIncludes: { "/api/cron/daily-publish": [".claude/**"] }`

## 残る人間タスク

1. Supabase project 作成 + `0001_init.sql` 適用
2. LINE Messaging API channel 作成 + bot 友だち追加 + userId 控え
3. Meta for Developers > Instagram Graph API app + 60日トークン取得
4. Vercel project link (Root Directory = `money-bot/`) + env 投入
5. `git config user.email` を Vercel team authorized email と一致確認
6. Adobe Stock コントリビューター登録 (Phase 2 から運用)

## ai-radar 連携

改修完了通知 (`raw/facts/situations/2026-05-22-ai-radar-money-bot-integration.md`) を受領した時点で `AI_RADAR_SUPABASE_URL` / `AI_RADAR_SUPABASE_ANON_KEY` (α 方式) を env に投入するか、`AI_RADAR_API_ENDPOINT` / `AI_RADAR_API_KEY` (β 方式) を投入する。両方欠ければ MOCK で `lib/ai-radar.ts::MOCK_SIGNALS` が返る。

## 承認 UI 方式判断

軽量 Web (Next.js page) を default 採用。LIFF は将来検討（Phase 2 以降）。LINE 通知から URL でブラウザに飛ぶ運用。
