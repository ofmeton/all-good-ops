-- 0013_run_trace.sql — 観測ダッシュボード用 run/trace + 承認相関
-- 適用: MCP apply_migration（既存 0006〜0012 と同経路）

create table if not exists xad.run (
  id            uuid primary key,
  job           text not null,
  trigger       text not null,                    -- cron | manual | webhook
  date          text not null,
  status        text not null default 'running',  -- running | ok | error | skipped
  attempt       int  not null default 1,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  error         text
);

create table if not exists xad.run_trace (
  id            bigint generated always as identity primary key,
  run_id        uuid not null references xad.run(id) on delete cascade,
  stage_id      text not null,
  attempt       int  not null default 1,
  status        text not null,                    -- ok | error | skipped
  outcome       text,                             -- approved|rejected|warned|requested|brownout 等
  started_at    timestamptz not null default now(),
  duration_ms   int,
  input_json    jsonb,
  output_json   jsonb,
  prompt_text   text,
  model         text,
  tokens_in     int,
  tokens_out    int,
  cost_jpy      numeric,
  error         text,
  created_at    timestamptz not null default now()
);

create index if not exists run_trace_run_order_idx on xad.run_trace (run_id, started_at, id);
create index if not exists run_trace_stage_recent_idx on xad.run_trace (stage_id, started_at desc);

alter table xad.post_drafts add column if not exists run_id uuid;

alter table xad.run enable row level security;
alter table xad.run_trace enable row level security;
-- policy は付与しない（service role 専用、anon は読めない）
