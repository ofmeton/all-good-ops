-- 0001_mf_finance_schema.sql
create schema if not exists mf_finance;

create table mf_finance.transactions (
  id text primary key,
  included boolean not null default true,
  date date not null,
  description text,
  amount integer not null,
  account text,
  category_major text,
  category_middle text,
  memo text,
  is_transfer boolean not null default false,
  is_internal_move boolean not null default false,
  classification text,
  source_type text,
  llm_labeled boolean not null default false,
  source text not null default 'mf_cf',
  ingested_at timestamptz not null default now()
);
create index on mf_finance.transactions (date);
create index on mf_finance.transactions (classification);

create table mf_finance.recurring_items (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('income','expense')),
  name text not null,
  match_pattern text,
  amount integer not null,
  day integer,
  source_type text,
  active boolean not null default true,
  confirmed text not null default 'auto' check (confirmed in ('auto','user')),
  created_at timestamptz not null default now()
);

create table mf_finance.account_status (
  id bigint generated always as identity primary key,
  account text not null,
  status text,
  last_fetched_at timestamptz,
  captured_at timestamptz not null default now()
);

create table mf_finance.asset_history (
  date date primary key,
  total integer,
  deposit_cash_crypto integer,
  points integer
);

create table mf_finance.liability_snapshots (
  snapshot_date date primary key,
  total integer,
  breakdown jsonb,
  captured_at timestamptz not null default now()
);

create table mf_finance.manual_liabilities (
  id bigint generated always as identity primary key,
  name text not null,
  lender text,
  balance integer,
  rate numeric,
  monthly_payment integer,
  as_of_date date
);

create table mf_finance.category_rules (
  id bigint generated always as identity primary key,
  pattern text not null,
  match_type text,
  category_major text,
  category_middle text,
  classification text,
  source_type text,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);
