---
date: 2026-05-23
category: situations
source: session
---

# money-bot 既存セットアップ状態 (Phase 1 着手前の人間タスク完了状況)

`money-bot/.env.local` および `.vercel/project.json` を確認した結果、以下の人間タスクが既に完了していた。

## 既に完了している人間タスク (Phase 1 着手前)

- Supabase project: **ai-radar project (`jzlhzfdvaculblgwlkxz`) を money-bot と共用**する方針。`.env.local` の `SUPABASE_URL` と `AI_RADAR_SUPABASE_URL` は同一値
- Supabase 認証: `SUPABASE_ANON_KEY` 設定済み (ただし `SUPABASE_SERVICE_ROLE_KEY` は空 — server 書き込み用が未投入)
- LINE Messaging API channel: 作成済み (`LINE_CHANNEL_ACCESS_TOKEN` `LINE_CHANNEL_SECRET` set)
- Instagram Graph API: 長期トークン取得済み (`INSTAGRAM_GRAPH_API_TOKEN` set)
- AI Radar 連携 env (α 方式 / direct supabase read): `AI_RADAR_SUPABASE_URL` `AI_RADAR_SUPABASE_ANON_KEY` set
- Vercel project link: 完了 (`money-bot/.vercel/project.json` 存在)
  - projectId: `prj_TSG2lo4LeJs0D8mGKLEPz73MnfEZ`
  - orgId: `team_Le012XqeShXuAuHdkQuyPGRO`
  - projectName: `money-bot`
- Cron secret: `CRON_SECRET` set

## まだ残っている人間タスク

- `SUPABASE_SERVICE_ROLE_KEY` 投入 (Supabase dashboard > Project Settings > API > service_role)
- `0001_init.sql` を ai-radar project (jzlhzfdvaculblgwlkxz) に apply (money-bot 4 テーブル追加)
- LINE bot を ofmeton 個人アカウントで友だち追加 → webhook で userId capture → `LINE_TO_USER_ID` 投入
- `INSTAGRAM_BUSINESS_ACCOUNT_ID` 取得 (Graph API `/me/accounts` 経由) → 投入
- `ANTHROPIC_API_KEY` or `VERCEL_AI_GATEWAY_API_KEY` 投入 (Claude Agent SDK 駆動のため)
- `CLAUDE_PROJECT_ROOT` を all-good-ops worktree root の絶対パスで投入
- Vercel env (production / preview) への投入 (`vercel env add` or Web UI)
- `git config user.email` が Vercel team authorized email と一致しているか確認
- Adobe Stock コントリビューター登録 (Phase 2 で運用)

## ai-radar 連携の方針確定 (2026-05-23 ユーザー判断)

- ai-radar 改修完了を待たず、現在の `articles` テーブルを直接読みに行く方式に切り替え
- `lib/ai-radar.ts::fetchAiRadarSignals()` のクエリを `signals` → `articles` に書き換え
- フィルタ: `detected_at >= 24h ago` AND `pipeline IN ('content_seed', 'claude_tip', 'both')`
- order: `content_seed_score DESC NULLS LAST`、limit 20
- signal の `content` には `title_ja + \n\n + summary_3line` を投入、`relevanceScore` は `max(content_seed_score, claude_tip_score, score_note) / 100`
