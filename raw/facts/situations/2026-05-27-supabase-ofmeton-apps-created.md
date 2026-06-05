---
date: 2026-05-27
category: situations
source: session
---

# Supabase 集約 project (ofmeton-apps) 作成 + money-bot 移行完了

## 作成内容

- **Project**: ofmeton-apps
- **Project ID**: `hofvvcvhjslevymhbcqj`
- **Region**: ap-northeast-1
- **Organization**: 個人用 (`fdnnkupzreecvohadeib`)
- **Cost**: $0/月 (Free tier 2 枠目)
- **URL**: `https://hofvvcvhjslevymhbcqj.supabase.co`

## 作成 schema

- `money_bot` (commented: money-bot app)
- `xad` (commented: x-account-design app)

## 適用 migration

- `money_bot.publish_queue` (4 columns + 2 indexes + trigger)
- `money_bot.approvals` (6 columns + 1 index)
- `money_bot.kpi_daily` (10 columns + trigger)
- `money_bot.ai_radar_signals_cache` (3 columns + 1 index)
- function: `money_bot.tg_set_updated_at()`

## 旧 project の処遇

- 旧 ID `jzlhzfdvaculblgwlkxz` は 2026-04-20 に keys が発行されていた（実在した）
- 2026-05-27 時点で **deleted（ユーザー確認済）**
- money-bot は実運用前だったためデータ消失なし、新規作成で対応

## ファイル更新

- `money-bot/.env.local`: SUPABASE_URL / ANON_KEY を新値に更新、SERVICE_ROLE_KEY は dashboard 取得待ち (placeholder `__SET_FROM_DASHBOARD__`)
- `money-bot/supabase/migrations/0001_init.sql`: コメント header を新 project 用に更新

## 残タスク

- ユーザー側で SERVICE_ROLE_KEY 投入済（2026-05-27 確認）
- 旧 project は deleted 確認済

## tools

- supabase CLI 2.101.0 を brew で導入完了 (`/opt/homebrew/bin/supabase`)
