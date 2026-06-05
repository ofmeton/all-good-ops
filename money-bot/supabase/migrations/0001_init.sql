-- ============================================================================
-- money-bot 初期 schema (ofmeton-apps project に集約、schema 分離方式)
-- spec: docs/superpowers/specs/2026-05-22-money-bot-design.md §5 §6 §9
--
-- 配置: ofmeton-apps Supabase project (hofvvcvhjslevymhbcqj) の money_bot schema 配下
-- 適用日: 2026-05-27 (旧 jzlhzfdvaculblgwlkxz は list_projects から消失のため新規 project へ)
-- 理由: Supabase Free tier の 2 project 制限により 1 project per-app schema 集約方式採用
--
-- 設計方針:
--   - money_bot schema 配下にすべて閉じ込め、他 schema (xad, public) には触らない
--   - RLS は初版 OFF (server-only access のみ。Phase 2 で公開ダッシュボード作る時に ON)
--   - timestamptz + default now() で UTC 統一
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 拡張 & schema
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()
create schema if not exists money_bot;

-- ---------------------------------------------------------------------------
-- publish_queue
--   workflow が生成した記事 + visual + sns を承認待ち / 公開済として管理
-- ---------------------------------------------------------------------------
create table if not exists money_bot.publish_queue (
  id               uuid primary key default gen_random_uuid(),
  workflow_run_id  text not null,
  draft            jsonb not null,        -- { title, body, topicSlug, references[] }
  visuals          jsonb not null,        -- { headerImageUrl, figures[] }
  sns_content      jsonb not null,        -- { tweet, tweetImageUrl, carousel[] }
  status           text not null
                   check (status in ('pending', 'approved', 'rejected', 'published', 'failed')),
  note_url         text,                  -- 公開後に埋める
  x_url            text,
  instagram_url    text,
  error_message    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists publish_queue_status_idx
  on money_bot.publish_queue (status, created_at desc);
create index if not exists publish_queue_run_id_idx
  on money_bot.publish_queue (workflow_run_id);

-- updated_at 自動更新 trigger (money_bot schema 配下に閉じ込め)
create or replace function money_bot.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on money_bot.publish_queue;
create trigger set_updated_at
  before update on money_bot.publish_queue
  for each row execute function money_bot.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- approvals
--   人間の承認 / 却下 の決定ログ。publish_queue.workflow_run_id と紐づく
-- ---------------------------------------------------------------------------
create table if not exists money_bot.approvals (
  id          uuid primary key default gen_random_uuid(),
  run_id      text not null,
  approved    boolean not null,
  edits       jsonb,                       -- { title?, body?, snsTweet? } 修正指示
  decided_by  text,                        -- LINE userId or "auto-reject" 等
  decided_at  timestamptz not null default now()
);

create index if not exists approvals_run_id_idx
  on money_bot.approvals (run_id, decided_at desc);

-- ---------------------------------------------------------------------------
-- kpi_daily
--   日次 KPI 集計。spec §9.1
--   channel = 'note' | 'x' | 'instagram' | 'stock' | 'kdp' (将来)
--   PK は (date, channel) で UPSERT 運用
-- ---------------------------------------------------------------------------
create table if not exists money_bot.kpi_daily (
  date          date not null,
  channel       text not null
                check (channel in ('note', 'x', 'instagram', 'stock', 'kdp')),
  posts         int  not null default 0,
  views         bigint not null default 0,
  likes         bigint not null default 0,
  revenue       numeric(12,2) not null default 0,  -- JPY
  cost          numeric(12,2) not null default 0,  -- JPY (API cost 等)
  gross_profit  numeric(12,2) generated always as (revenue - cost) stored,
  notes         text,
  updated_at    timestamptz not null default now(),
  primary key (date, channel)
);

drop trigger if exists set_updated_at_kpi on money_bot.kpi_daily;
create trigger set_updated_at_kpi
  before update on money_bot.kpi_daily
  for each row execute function money_bot.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- ai_radar_signals_cache
--   ai-radar 改修完了前の暫定キャッシュ。改修後も短期メモ用途で残す。
--   spec §6.4
--   注: ai-radar 本体のテーブルは ai-radar project の public schema にある。
--       これは money-bot 側のキャッシュなので money_bot schema 配下。
-- ---------------------------------------------------------------------------
create table if not exists money_bot.ai_radar_signals_cache (
  signal_id   text primary key,
  content     jsonb not null,
  fetched_at  timestamptz not null default now()
);

create index if not exists ai_radar_signals_cache_fetched_idx
  on money_bot.ai_radar_signals_cache (fetched_at desc);

-- ---------------------------------------------------------------------------
-- 完了。
-- ai-radar の public schema には一切触らない。すべて money_bot schema 配下。
-- TODO(Phase 1):
--   - RLS を on にする時の policy 設計 (公開ダッシュボード作るタイミングで)
--   - kpi_daily に A/B テスト用 dimension を生やす想定
-- ---------------------------------------------------------------------------
