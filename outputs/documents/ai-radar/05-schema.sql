-- ================================================================
-- ai-radar Supabase DDL
-- Migration: 0001_init
-- Created:   2026-04-21
-- ================================================================
-- 実行手順:
--   1. Supabase ダッシュボード → SQL Editor → New query
--   2. 以下を全部貼って RUN
--   3. テーブル作成確認: Table Editor で sources / articles / ... が見える
-- ================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ----------------------------------------------------------------
-- sources: 情報源定義
-- ----------------------------------------------------------------
create table sources (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  tier int check (tier in (1, 2, 3)),
  pipeline text not null check (pipeline in ('opportunity', 'business_defense', 'both')),
  url text not null,
  source_type text not null check (source_type in ('rss', 'github_releases', 'scraping', 'api')),
  trust_score int default 5 check (trust_score >= 0 and trust_score <= 10),
  enabled boolean default true,
  last_crawled_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  meta jsonb,  -- ソース固有メタ（GitHub owner/repo、スクレイピングのセレクタ等）
  created_at timestamptz default now()
);

create index sources_enabled_tier_idx on sources(enabled, tier);

-- ----------------------------------------------------------------
-- articles: 記事本体＋全分析結果
-- ----------------------------------------------------------------
create table articles (
  id uuid primary key default uuid_generate_v4(),
  source_id uuid references sources(id) on delete cascade,
  external_id text,  -- URL or GUID（ソース内一意）
  url text not null,
  title_original text,
  title_ja text,
  summary_1line text,
  summary_3line text,
  body_raw text,
  body_hash text,  -- 重複除外用（URLが違っても同一内容検知）
  entities jsonb,  -- ["Anthropic", "Claude Skills"]
  primary_language text,
  published_at timestamptz,
  detected_at timestamptz default now(),

  -- パイプライン分類
  pipeline text check (pipeline in ('opportunity', 'business_defense', 'both', 'noise')),

  -- ===== 機会発見パイプライン =====
  opportunity_tag text,  -- 'Skills/Workflow市場' etc
  score_marketplace_fit int check (score_marketplace_fit >= 0 and score_marketplace_fit <= 10),
  score_japan_entry_fit int check (score_japan_entry_fit >= 0 and score_japan_entry_fit <= 10),
  score_wedge int check (score_wedge >= 0 and score_wedge <= 10),
  tam_size text check (tam_size in ('Small', 'Mid', 'Large')),
  entry_barrier text check (entry_barrier in ('Low', 'Mid', 'High')),
  novelty_score int check (novelty_score >= 0 and novelty_score <= 10),
  engagement_hint int check (engagement_hint >= 0 and engagement_hint <= 10),
  similar_jp_services_count int,
  similar_jp_services jsonb,  -- [{name, url, note}]
  opportunity_reasoning text,
  opportunity_score int check (opportunity_score >= 0 and opportunity_score <= 100),

  -- ===== 事業防衛パイプライン =====
  business_tier int check (business_tier in (1, 2, 3)),
  business_axis text,  -- 'anthropic_official' etc
  business_trigger_flag text check (business_trigger_flag in ('R1_risk', 'D_opportunity', 'vertical_surge', 'bm_shift') or business_trigger_flag is null),
  business_impact text check (business_impact in ('headwind', 'tailwind', 'neutral')),
  business_impact_strength int check (business_impact_strength >= 0 and business_impact_strength <= 10),
  business_recommended_action text,
  business_reasoning text,
  business_impact_score int check (business_impact_score >= 0 and business_impact_score <= 100),

  -- クラスタリング
  cluster_id uuid,

  -- 深掘り
  deep_dive_status text default 'idle' check (deep_dive_status in ('idle', 'queued', 'running', 'done', 'failed')),
  deep_dive_requested_at timestamptz,
  deep_dive_completed_at timestamptz,
  deep_dive_result_markdown text,

  -- メタ
  confidence float check (confidence >= 0 and confidence <= 1),
  starred boolean default false,
  read_at timestamptz,

  -- エラー時のリトライ支援
  processing_error text,
  retry_count int default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index articles_source_external_idx on articles(source_id, external_id);
create index articles_opportunity_score_idx on articles(opportunity_score desc nulls last);
create index articles_business_impact_score_idx on articles(business_impact_score desc nulls last);
create index articles_detected_at_idx on articles(detected_at desc);
create index articles_body_hash_idx on articles(body_hash);
create index articles_cluster_idx on articles(cluster_id);
create index articles_trigger_idx on articles(business_trigger_flag) where business_trigger_flag is not null;

-- ----------------------------------------------------------------
-- notifications_sent: 送信履歴（重複防止）
-- ----------------------------------------------------------------
create table notifications_sent (
  id uuid primary key default uuid_generate_v4(),
  article_id uuid references articles(id) on delete cascade,
  kind text not null check (kind in ('tier1_immediate', 'morning_digest', 'evening_digest', 'weekly', 'monthly')),
  sent_at timestamptz default now(),
  recipient text,
  subject text
);

create index notifications_article_kind_idx on notifications_sent(article_id, kind);

-- ----------------------------------------------------------------
-- scraping_states: スクレイピング系の前回コンテンツハッシュ
-- ----------------------------------------------------------------
create table scraping_states (
  id uuid primary key default uuid_generate_v4(),
  source_id uuid references sources(id) on delete cascade,
  content_hash text,
  raw_snapshot text,  -- デバッグ用、週次で truncate
  last_checked_at timestamptz default now()
);

create index scraping_states_source_idx on scraping_states(source_id);

-- ----------------------------------------------------------------
-- deep_dive_queue: Codex 深掘りキュー
-- ----------------------------------------------------------------
create table deep_dive_queue (
  id uuid primary key default uuid_generate_v4(),
  article_id uuid references articles(id) on delete cascade,
  requested_at timestamptz default now(),
  picked_at timestamptz,
  completed_at timestamptz,
  status text default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  result_markdown text,
  error_message text,
  worker_host text  -- どのマシンが処理したか
);

create index deep_dive_queue_status_idx on deep_dive_queue(status, requested_at);

-- ----------------------------------------------------------------
-- crawl_runs: クロール実行履歴（監視用）
-- ----------------------------------------------------------------
create table crawl_runs (
  id uuid primary key default uuid_generate_v4(),
  kind text not null check (kind in ('tier1_hourly', 'biannual', 'manual')),
  started_at timestamptz default now(),
  finished_at timestamptz,
  sources_processed int,
  articles_ingested int,
  articles_new int,
  errors jsonb,
  status text default 'running' check (status in ('running', 'success', 'partial', 'failed'))
);

create index crawl_runs_started_at_idx on crawl_runs(started_at desc);

-- ----------------------------------------------------------------
-- updated_at 自動更新トリガー
-- ----------------------------------------------------------------
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger articles_updated_at
  before update on articles
  for each row
  execute function update_updated_at_column();

-- ----------------------------------------------------------------
-- RLS（認証なし運用なので anon 読み取り可、書き込みは service_role のみ）
-- ----------------------------------------------------------------
alter table articles enable row level security;
alter table sources enable row level security;

create policy "Public read articles"
  on articles for select
  using (true);

create policy "Public read sources"
  on sources for select
  using (true);

-- 書き込みは service_role（サーバーサイドのみ）で行うので、policyは作らない
-- → anon では insert/update/delete 不可

-- ----------------------------------------------------------------
-- 初期シード（04-sources.md と同期）は seed.sql に別出し
-- ----------------------------------------------------------------
