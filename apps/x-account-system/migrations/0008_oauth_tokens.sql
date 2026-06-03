-- migrations/0008_oauth_tokens.sql
-- FILE ONLY — do NOT apply to live DB.
-- Human-confirmation gate: apply via Supabase MCP or CLI after review.

create table if not exists xad.oauth_tokens (
  provider text primary key check (provider in ('x','meta')),
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  updated_at timestamptz not null default now()
);
alter table xad.oauth_tokens enable row level security;

create table if not exists xad.auth_blocked (
  provider text primary key check (provider in ('x','meta')),
  blocked boolean not null default false,
  reason text,
  updated_at timestamptz not null default now()
);
alter table xad.auth_blocked enable row level security;
