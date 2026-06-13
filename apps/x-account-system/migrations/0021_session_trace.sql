-- 1B 観測: MA session のイベント実体と run→session ブリッジ
-- session_event: drain 中に worker が永続化（fail-open）。1 session = N event。
create table if not exists xad.session_event (
  id          bigint generated always as identity primary key,
  session_id  text not null,
  seq         int  not null,
  type        text not null,           -- thinking|text|custom_tool_use|custom_tool_result|model_request_end
  agent_key   text,                    -- collector|writer|checker
  payload     jsonb not null,          -- redactForTrace 済
  created_at  timestamptz not null default now(),
  unique (session_id, seq)
);
create index if not exists session_event_session_idx on xad.session_event (session_id, seq);

-- run_session: 1 run が起こした MA session 群（compose/check は 1 run = N session）
create table if not exists xad.run_session (
  id          bigint generated always as identity primary key,
  run_id      uuid not null,
  stage_id    text not null,           -- collect|compose|check
  session_id  text not null,
  agent_key   text,
  created_at  timestamptz not null default now()
);
create index if not exists run_session_run_idx on xad.run_session (run_id);
create index if not exists run_session_session_idx on xad.run_session (session_id);

-- checker→draft 相関（writer_session_id と対称）
alter table xad.post_drafts add column if not exists checker_session_id text;
