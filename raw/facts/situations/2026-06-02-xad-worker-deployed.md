---
date: 2026-06-02
category: situations
source: session
---

# x-account-system Worker を Cloudflare に本番 deploy (2026-06-02)

ユーザー判断「今フル deploy」で、Phase 1 soft launch (6/8) 前倒しの慣らし運用として本番デプロイ実行。

## deploy 結果

- Worker 名: `ofmeton-x-account`
- URL: `https://ofmeton-x-account.off-me-ton.workers.dev`
- Cloudflare account: `Off.me.ton@gmail.com's Account` (`54d47d061d117ab07871f3826c1d07ca`)
- 認証: `CLOUDFLARE_API_TOKEN`（H-4 取得済）で headless deploy。**wrangler login (OAuth) は不要**（既に API token がある場合は login 不可・token 優先）
- cron 10 本登録済（buzz ingest / 朝昼夕 draft 生成 / 引用RT / Daily Digest / Optimizer / inspirations / rotation）→ **deploy 時点から稼働開始**
- 安全フラグ: `PHASE=1` / `AUTONOMOUS_PUBLISH=false`（自動 live 投稿はしない。draft → LINE 承認）
- secret 14 件投入済（code が読む process.env.* に厳密一致。SUPABASE_SCHEMA=xad 含む）
- smoke: `/health` → 200 `{"ok":true,"phase":"1","autonomousPublish":false}` / `/line/webhook` POST → 200

## 残（人間タスク）

1. **LINE Webhook URL 設定**: LINE Developers Console → Messaging API → Webhook URL に
   `https://ofmeton-x-account.off-me-ton.workers.dev/line/webhook` を設定 + 検証 ON
2. **Supabase Exposed schemas に `xad` 追加**: Dashboard → Settings → API。
   未設定だと SUPABASE_SCHEMA=xad でも PostgREST が xad を返さず DB 操作が空振り（in-memory fallback）

## 注意

- worker 名は `ofmeton-x-account` のまま（内部インフラ ID。webhook URL に影響するため改称せず。env `LINE_USER_ID_OFMETON` も同様に維持）
- 予算: 月 ¥10,000 上限 / brownout ¥11,500。cron 稼働で 6/8 前から API 消費が始まる（慣らし運用として承知済）
