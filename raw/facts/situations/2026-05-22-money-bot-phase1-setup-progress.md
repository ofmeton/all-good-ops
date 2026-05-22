---
date: 2026-05-22
category: situations
source: session
---

# money-bot Phase 1 セットアップ進捗 (2026-05-22)

セッション「mcp で代行」モードで Instagram / Supabase / Vercel / LINE まで一気に進めた結果の事実記録。

## Instagram Graph API

- Meta Developers アプリ作成: **`all-good-studio-publisher`** (ユーザーアプリ名)
- 長期アクセストークン (60日有効) 取得済 / 期限: **2026-07-21 頃**
- 取得権限: `instagram_basic` + `instagram_content_publish` + `pages_show_list` + `pages_read_engagement`
- 保管: `money-bot/.env.local` の `INSTAGRAM_GRAPH_API_TOKEN` (172 chars) + Vercel production env

## Supabase (採用方針: A 案 / ai-radar 同居)

- 既存 ai-radar project (**`jzlhzfdvaculblgwlkxz`**) の **`money_bot` schema** に同居
- 採用理由: Free tier の **1 organization あたり active project 2 個制限** に当たったため
  - 既存 active: `minpaku-cleaning` + `ai-radar`
- spec §6.4 「ai-radar 連携: α direct Supabase」と整合的
- migration `0001_init.sql` 適用済 (Supabase MCP `apply_migration` 経由):
  - `money_bot.publish_queue` / `money_bot.approvals` / `money_bot.kpi_daily` / `money_bot.ai_radar_signals_cache`
- ai-radar 側の `public` schema には一切触っていない
- env: `SUPABASE_URL=https://jzlhzfdvaculblgwlkxz.supabase.co` / `SUPABASE_ANON_KEY=sb_publishable_...` (新 publishable key 採用)
- `SUPABASE_SERVICE_ROLE_KEY` は MCP では取れず Dashboard 手動取得待ち

## LINE Messaging API

- Provider: **`ofmeton`** (推定、明示確認なし)
- Channel name: **`ofmeton-money-bot`** (Messaging API channel)
- Channel access token (172 chars, 長期) + Channel secret (32 chars) 取得済
- Bot を自身の LINE で友だち追加済
- `LINE_TO_USER_ID` は webhook 実装段階で取得予定 (未取得)

## Vercel

- CLI **v54.3.0** install + login + link
- team: **`ofmeton's projects`** (`team_Le012XqeShXuAuHdkQuyPGRO`)
- Project: **`ofmetons-projects/money-bot`**
- root directory: `money-bot/`
- `vercel.json` で cron `0 5 * * *` (JST 14:00) 設定済 (Agent 作成時)
- `.gitignore` に `.vercel` 自動追加 (CLI 動作、未 commit)
- 環境変数 8 個 production に Encrypted で投入済:
  - `INSTAGRAM_GRAPH_API_TOKEN`
  - `SUPABASE_URL` / `SUPABASE_ANON_KEY`
  - `AI_RADAR_SUPABASE_URL` / `AI_RADAR_SUPABASE_ANON_KEY` (ai-radar 同居なので Supabase 系と同じ値)
  - `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_CHANNEL_SECRET`
  - `CRON_SECRET` (openssl rand -hex 32 / 64 chars / セッション内で自動生成)

## GitHub

- PR **#6 MERGED** (mergeCommit: `5bc834a`): money-bot/supabase/migrations/0001_init.sql を `money_bot` schema 配下に修正
- PR #2 (計画書 + scaffold) は前セッションで merged 済 (mergeCommit: `ecd9dee`)
- local main は別セッションの untracked file 競合で pull abort 状態 (要別セッションで整理)

## 残タスク (次セッション以降)

- `SUPABASE_SERVICE_ROLE_KEY` 取得 (Supabase Dashboard 手動)
- `VERCEL_AI_GATEWAY_API_KEY` 取得 (Vercel Dashboard)
- `OPENAI_API_KEY` 取得 (or Codex MCP 経由案)
- `LINE_TO_USER_ID` 取得 (webhook 実装後)
- `CLAUDE_PROJECT_ROOT` 設定 (実装着手時)
- Adobe Stock コントリビューター登録 (後回し可)
- `money-bot/.gitignore` の `.vercel` 追加を commit (別 task ブランチ)
- 実装本体着手 (system-engineer 別セッション)
