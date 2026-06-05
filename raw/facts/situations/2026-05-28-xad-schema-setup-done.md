---
date: 2026-05-28
category: situations
source: session
---
x-account-system の Supabase セットアップ (Phase 0.5 H-2) を MCP 経由で完了。

- PR #43 MERGED (squash → main `2e378da`)
- ofmeton-apps project (`hofvvcvhjslevymhbcqj`) の **xad schema** に live 適用済
  - tables 14 / views 3 / functions 2 / roles 4
- `apps/x-account-system/.env.local` 作成済 (gitignore 済)
- SERVICE_ROLE_KEY は money-bot/.env.local から流用 → **人間タスク発生せず**

migration 書き換え点:
- `public.` → `xad.` schema 切替
- `pgvector` → `vector WITH SCHEMA extensions` + `vector(1536)` → `extensions.vector(1536)`
- 0003 で POLICY 作成前に ROLE 先行作成へ順序変更

既知の宿題 (本 task スコープ外):
- `xad.style_guide` / `optimizer_proposal` / `cost_ledger` / `daily_digest_log` の RLS 無効 (元 migration 0003 でも policy 未定義)
- `money_bot.publish_queue` / `approvals` / `kpi_daily` / `ai_radar_signals_cache` の RLS 無効
