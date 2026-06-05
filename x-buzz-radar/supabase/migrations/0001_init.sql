-- x-buzz-radar 初期スキーマ
create extension if not exists "uuid-ossp";

-- ========== 検索クエリ pool ==========
create table query_pool (
  query_id uuid primary key default uuid_generate_v4(),
  query_string text not null,
  active boolean not null default true,
  total_hits integer not null default 0,
  total_adoptions integer not null default 0,
  last_30d_adoption_rate numeric(5,4),
  parent_query_id uuid references query_pool(query_id),
  created_at timestamptz not null default now(),
  retired_at timestamptz
);

-- ========== バズツイート ==========
create table x_buzz_tweets (
  id uuid primary key default uuid_generate_v4(),
  tweet_id text unique not null,
  author_screen_name text not null,
  author_id text,
  body text not null,
  lang text,
  posted_at timestamptz not null,
  likes integer not null default 0,
  retweets integer not null default 0,
  replies integer not null default 0,
  source_query_id uuid references query_pool(query_id),
  category text check (category in ('tips','news','compare','case','other')),
  claude_relevance integer check (claude_relevance between 0 and 100),
  buzz_pattern text,
  hook_structure text,
  visual_hint text,
  status text not null default 'pending_review'
    check (status in ('pending_review','adopted','rejected','saved_for_later','archived')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_buzz_status on x_buzz_tweets(status);
create index idx_buzz_relevance on x_buzz_tweets(claude_relevance);
create index idx_buzz_posted_at on x_buzz_tweets(posted_at);

-- ========== 発信ドラフト variant pool ==========
create table prompt_variants (
  variant_id uuid primary key default uuid_generate_v4(),
  platform text not null check (platform in ('x','instagram','note')),
  type text not null check (type in ('thread','single','carousel','outline','title')),
  hook_template text not null,
  tone text not null,
  format text not null,
  prompt_template text not null,
  active boolean not null default true,
  parent_variant_id uuid references prompt_variants(variant_id),
  created_at timestamptz not null default now(),
  retired_at timestamptz
);

-- ========== 自投稿 ==========
create table our_posts (
  post_id text primary key,
  source_buzz_tweet_id uuid references x_buzz_tweets(id),
  variant_id uuid references prompt_variants(variant_id),
  platform text not null check (platform in ('x','instagram','note')),
  post_url text,
  posted_at timestamptz not null,
  is_paid boolean not null default false,
  created_at timestamptz not null default now()
);

-- ========== engagement snapshots ==========
create table post_engagement_snapshots (
  id uuid primary key default uuid_generate_v4(),
  post_id text not null references our_posts(post_id),
  platform text not null,
  snapshot_at timestamptz not null default now(),
  hours_since_post integer not null,
  likes integer,
  retweets integer,
  replies integer,
  impressions integer,
  bookmarks integer,
  saves integer,
  reach integer,
  shares integer,
  comments integer,
  views integer,
  paid_purchases integer,
  source text not null check (source in ('api','scrape','manual_entry'))
);

create index idx_engagement_post on post_engagement_snapshots(post_id);

-- ========== variant_weights (Track B output) ==========
create table variant_weights (
  weight_id uuid primary key default uuid_generate_v4(),
  platform text not null,
  category text not null,
  variant_id uuid not null references prompt_variants(variant_id),
  avg_engagement_z numeric,
  n_observations integer not null default 0,
  exploration_weight numeric not null default 1.5,
  last_updated_at timestamptz not null default now(),
  unique(platform, category, variant_id)
);

-- ========== config ==========
create table config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into config (key, value) values
  ('adoption_threshold', '{"value": 60}'::jsonb),
  ('notify_threshold', '{"value": 80}'::jsonb),
  ('per_query_limit', '{"value": 50}'::jsonb);

-- ========== enrichment cache (draft) ==========
create table enrichment_drafts (
  draft_id uuid primary key default uuid_generate_v4(),
  buzz_tweet_id uuid not null references x_buzz_tweets(id),
  variant_id uuid not null references prompt_variants(variant_id),
  platform text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index idx_drafts_buzz on enrichment_drafts(buzz_tweet_id);
